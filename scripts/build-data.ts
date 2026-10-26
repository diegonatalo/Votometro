import { mkdir, stat, writeFile } from "node:fs/promises";
import { UFS } from "../src/lib/meta";
import type { Candidato, Estado, Tally, MunicipioTuple, MunicipiosFile, NationalFile, Nota, SourceMeta, StatesFile, Turno1Row } from "../src/lib/types";
import { ELE_T1, ELE_T2, getJson, parseUnit, pool, toTurno1, unitPath } from "./lib/tse";
import { buildGeo } from "./build-geo";
import { buildOvertime } from "./build-overtime";
import { runValidation } from "./validate";

interface MunConfig {
  abr: { cd: string; mu?: { cd: string; cdi: string; nm: string }[] }[];
}

const OUT = "public/data";

interface RawCand { n: string; sqcand: string; nm: string; nmu: string; st: string; vs?: { sqcand: string; nm: string; nmu: string; sgp: string }[] }
interface RawNat { carg: { agr: { nm: string; com?: string; par: { sg: string; nm: string; cand?: RawCand[] }[] }[] }[] }

const FOTO_BASE = "https://resultados.tse.jus.br/oficial/ele2026/6258/fotos/br";

async function baixarFoto(sq: string): Promise<string> {
  const rel = `img/candidatos/${sq}.jpeg`;
  const dest = `public/${rel}`;
  try { if ((await stat(dest)).size > 0) return `/${rel}`; } catch { /* baixar */ }
  await mkdir("public/img/candidatos", { recursive: true });
  const res = await fetch(`${FOTO_BASE}/${sq}.jpeg`);
  if (!res.ok) throw new Error(`Foto ${sq}: HTTP ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return `/${rel}`;
}

const nomeProprio = (s: string) => titleCase(s);

async function buildCandidatos(): Promise<Candidato[]> {
  const raw = (await getJson(unitPath(ELE_T2, "br"))) as RawNat;
  const out: Candidato[] = [];
  for (const agr of raw.carg[0]?.agr ?? []) {
    for (const par of agr.par) {
      for (const c of par.cand ?? []) {
        const id = c.n === "13" ? "lula" : c.n === "22" ? "flavio" : null;
        if (!id) continue;
        const v = c.vs?.[0];
        if (!v) throw new Error(`Vice não encontrado para ${c.nmu}`);
        out.push({
          id, sq: c.sqcand, numero: c.n, nome: nomeProprio(c.nm), nomeUrna: nomeProprio(c.nmu), partido: par.sg, partidoNome: nomeProprio(par.nm),
          coligacao: agr.com ?? par.sg, situacao: c.st, foto: await baixarFoto(c.sqcand),
          vice: { sq: v.sqcand, nome: nomeProprio(v.nm), nomeUrna: nomeProprio(v.nmu), partido: v.sgp, foto: await baixarFoto(v.sqcand) },
        });
      }
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function brasiliaNow(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function main() {
  await mkdir(`${OUT}/geo`, { recursive: true });
  const geradoEm = brasiliaNow();
  const url2 = `https://resultados.tse.jus.br/oficial/ele2026/${ELE_T2}/dados/br/br-c0001-e00${ELE_T2}-u.json`;
  const url1 = `https://resultados.tse.jus.br/oficial/ele2026/${ELE_T1}/dados/br/br-c0001-e00${ELE_T1}-u.json`;

  console.log("2º turno: nacional, UFs e exterior…");
  const nacional = parseUnit(await getJson(unitPath(ELE_T2, "br")));
  const ufCodes = [...UFS.map((u) => u.uf), "ZZ"];
  const ufUnits = await pool(ufCodes, 8, (uf) => getJson(unitPath(ELE_T2, uf)).then((j) => parseUnit(j as never)));
  const exterior = ufUnits[ufUnits.length - 1]!;

  const estados: Estado[] = UFS.map((u, i) => ({ uf: u.uf, nome: u.nome, regiao: u.regiao, codIbge: u.cod, ...ufUnits[i]!.tally }));

  console.log("2º turno: municípios…");
  const cfg = (await getJson(`${ELE_T2}/config/mun-e00${ELE_T2}-cm.json`)) as MunConfig;
  const jobs: { uf: string; cd: string; ibge: string; nome: string }[] = [];
  for (const a of cfg.abr) {
    if (a.cd === "zz") continue;
    for (const m of a.mu ?? []) jobs.push({ uf: a.cd.toUpperCase(), cd: m.cd, ibge: m.cdi, nome: m.nm });
  }
  let done = 0;
  const rows = await pool(jobs, 10, async (j): Promise<MunicipioTuple> => {
    const p = parseUnit((await getJson(unitPath(ELE_T2, j.uf, j.cd))) as never);
    if (++done % 500 === 0) console.log(`  ${done}/${jobs.length}`);
    const t = p.tally;
    return [j.ibge, titleCase(j.nome), j.uf, t.lula, t.flavio, t.brancos, t.nulos, t.aptos, t.comparecimento, t.abstencoes, t.secoes, t.secoesTotalizadas, t.naoInstalados];
  });
  rows.sort((a, b) => a[2].localeCompare(b[2]) || a[1].localeCompare(b[1], "pt-BR"));

  console.log("1º turno…");
  const t1Nat = toTurno1(parseUnit((await getJson(unitPath(ELE_T1, "br"))) as never));
  const t1Units = await pool(ufCodes, 8, (uf) => getJson(unitPath(ELE_T1, uf)).then((j) => parseUnit(j as never)));
  const t1Estados: Record<string, Turno1Row> = {};
  UFS.forEach((u, i) => (t1Estados[u.uf] = toTurno1(t1Units[i]!)));
  const t1Ext = toTurno1(t1Units[t1Units.length - 1]!);

  const meta2: SourceMeta = { fonte: "TSE — Resultados (2º turno)", url: url2, referencia: nacional.geracao, geradoEm };
  const meta1: SourceMeta = { fonte: "TSE — Resultados (1º turno)", url: url1, referencia: toTurno1Ref(t1Units[0]!.geracao), geradoEm };

  const geoIds = await buildGeo();
  const semGeo = rows.filter((r) => !geoIds.has(r[0])).map((r) => `${r[1]} (${r[2]})`);
  const notas = buildNotes(nacional.tally, exterior.tally, nacional.totalizacao, rows.length, geoIds.size, semGeo);
  const national: NationalFile = {
    candidatos: await buildCandidatos(),
    meta: meta2, nacional: nacional.tally, exterior: exterior.tally,
    turno1: { meta: meta1, nacional: t1Nat, exterior: t1Ext, estados: t1Estados }, notas,
  };
  const states: StatesFile = { meta: meta2, estados };
  const munis: MunicipiosFile = { meta: meta2, rows };

  await writeFile(`${OUT}/national.json`, JSON.stringify(national));
  await writeFile(`${OUT}/states.json`, JSON.stringify(states));
  await writeFile(`${OUT}/municipios.json`, JSON.stringify(munis));
  for (const u of UFS) await writeFile(`${OUT}/municipios-${u.uf}.json`, JSON.stringify({ meta: meta2, rows: rows.filter((r) => r[2] === u.uf) } satisfies MunicipiosFile));
  console.log(`Escritos: national.json, states.json, municipios.json (${rows.length} municípios)`);

  await buildOvertime(geradoEm);

  console.log("\nValidação dos totais:");
  const ok = await runValidation();
  if (!ok) process.exit(1);
}

const toTurno1Ref = (s: string) => s;

function titleCase(s: string): string {
  const small = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);
  return s
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((w, i) => (i > 0 && small.has(w.toUpperCase()) ? w : w.replace(/(^|['\-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toLocaleUpperCase("pt-BR"))))
    .join(" ");
}

function buildNotes(t: Tally, ext: Tally, totalizacao: string, nMunis: number, nGeo: number, semGeo: string[]): Nota[] {
  const pct = ((t.abstencoes / t.aptos) * 100).toFixed(2).replace(".", ",");
  const f = (n: number) => n.toLocaleString("pt-BR");
  const notas: Nota[] = [
    {
      id: "abstencao",
      titulo: `Abstenção: ${pct}% no arquivo do TSE`,
      texto: `O arquivo oficial do TSE registra ${f(t.abstencoes)} abstenções entre ${f(t.aptos)} eleitores aptos (${pct}%). Veículos de imprensa citam valores arredondados entre 19% e 19,2%. Este site exibe o valor calculado a partir do arquivo do TSE.`,
    },
    {
      id: "nao-instaladas",
      titulo: "Eleitores em seções não instaladas",
      texto: `${f(t.naoInstalados)} eleitores aptos (${f(ext.naoInstalados)} no exterior) estavam em seções não instaladas. Eles contam como aptos, mas não entram em comparecimento nem em abstenção; por isso aptos = comparecimento + abstenção + ${f(t.naoInstalados)}.`,
    },
    {
      id: "nulos",
      titulo: "Votos nulos",
      texto: "Votos nulos incluem os nulos técnicos. Brancos e nulos não entram no cálculo de percentual dos votos válidos.",
    },
    {
      id: "referencia",
      titulo: "Data/hora de referência",
      texto: `Os números vêm do arquivo de totalização do TSE com última totalização em ${totalizacao}. Cada seção do site indica a fonte e a referência.`,
    },
    {
      id: "exterior",
      titulo: "Exterior",
      texto: "O voto no exterior é contado como território próprio, já somado ao total nacional, e não aparece no mapa.",
    },
  ];
  if (nMunis !== nGeo) {
    notas.push({
      id: "geometria",
      titulo: `Municípios: ${f(nMunis)} com resultado, ${f(nGeo)} no mapa`,
      texto: `A malha do IBGE usada no mapa não traz geometria para: ${semGeo.join(", ")}. Esses municípios têm resultado no TSE, estão nos totais do estado e aparecem na busca e na lista, mas não são desenhados no mapa.`,
    });
  }
  return notas;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

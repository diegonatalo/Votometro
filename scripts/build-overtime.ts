/**
 * Votos em seções que encerraram após o horário regular (17h de Brasília).
 *
 * Fonte: Boletim de Urna (BU) do TSE, dados abertos. Cada BU traz DT_ABERTURA e DT_ENCERRAMENTO da urna
 * (hora local da urna) e os votos da seção. O arquivo NÃO traz a hora de cada voto: o que se mede é o
 * resultado das seções cujo encerramento ocorreu depois do horário regular, nunca os votos dados depois das 17h.
 *
 * Uso: tsx scripts/build-overtime.ts [--turno 2] [--uf AC] [--out caminho.json]
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { Open } from "unzipper";
import type { OvertimeFile, OvertimeGroup } from "../src/lib/types";
import { ELE_T2, getJson } from "./lib/tse";

const CKAN = "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2026-boletim-de-urna";
/** Tolerância (min) após as 17h: o encerramento do BU costuma ocorrer minutos depois do horário, sem fila. */
export const CORTE_MIN = 15;
const LIMIARES = [1, 5, 15, 30, 60];

const emptyGroup = (): OvertimeGroup => ({ secoes: 0, lula: 0, flavio: 0, brancos: 0, nulos: 0, comparecimento: 0 });

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === ";" && !q) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}

interface Sec { mun: string; uf: string; abre: number; fecha: number; comp: number; lula: number; flavio: number; brancos: number; nulos: number }

/** "2026-10-04 15:01:05" → minutos do dia (hora local da urna) */
function minutosDoDia(s: string | undefined): number {
  if (!s || s.length < 16) return NaN;
  return Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16)) + Number(s.slice(17, 19) || 0) / 60;
}

async function readSections(zipPath: string, uf: string): Promise<Sec[]> {
  const dir = await Open.file(zipPath);
  const entry = dir.files.find((f) => f.path.toLowerCase().endsWith(".csv"));
  if (!entry) throw new Error(`CSV não encontrado em ${zipPath}`);
  const stream = entry.stream();
  stream.setEncoding("latin1");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let header: Record<string, number> | null = null;
  const secs = new Map<string, Sec>();
  for await (const line of rl) {
    if (!header) {
      header = Object.fromEntries(splitCsv(line).map((h, i) => [h.replace(/"/g, ""), i]));
      continue;
    }
    if (!line.includes("Presidente")) continue;
    const c = splitCsv(line);
    const g = (k: string) => c[header![k] ?? -1] ?? "";
    if (g("DS_CARGO_PERGUNTA") !== "Presidente") continue;
    const key = `${g("CD_MUNICIPIO")}|${g("NR_ZONA")}|${g("NR_SECAO")}`;
    let s = secs.get(key);
    if (!s) {
      s = { mun: g("CD_MUNICIPIO"), uf, abre: minutosDoDia(g("DT_ABERTURA")), fecha: minutosDoDia(g("DT_ENCERRAMENTO")), comp: Number(g("QT_COMPARECIMENTO")), lula: 0, flavio: 0, brancos: 0, nulos: 0 };
      secs.set(key, s);
    }
    const votos = Number(g("QT_VOTOS"));
    const tipo = g("DS_TIPO_VOTAVEL");
    const nr = g("NR_VOTAVEL");
    if (tipo === "Nominal") { if (nr === "13") s.lula += votos; else if (nr === "22") s.flavio += votos; }
    else if (tipo === "Branco") s.brancos += votos;
    else if (tipo === "Nulo") s.nulos += votos;
  }
  return [...secs.values()];
}

async function download(url: string, dest: string): Promise<void> {
  try { if ((await stat(dest)).size > 0) return; } catch { /* baixar */ }
  await mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} em ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

interface CkanRes { name: string; url: string; format: string }

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export async function buildOvertime(geradoEm: string): Promise<void> {
  const turno = Number(arg("turno") ?? 2);
  const onlyUf = arg("uf")?.toUpperCase();
  const outFile = arg("out") ?? "public/data/overtime.json";
  const baseMeta = { fonte: "TSE — Boletim de Urna (dados abertos)", url: "https://dadosabertos.tse.jus.br/dataset/resultados-2026-boletim-de-urna", referencia: "—", geradoEm };

  const pkg = (await (await fetch(CKAN)).json()) as { result: { resources: CkanRes[]; metadata_modified: string } };
  const label = turno === 2 ? /Segundo turno/i : /Primeiro turno/i;
  const files = pkg.result.resources.filter((r) => /Boletim de Urna/i.test(r.name) && label.test(r.name) && !/Hash/i.test(r.name));
  const wanted = onlyUf ? files.filter((f) => f.name.startsWith(`${onlyUf} -`)) : files;

  if (wanted.length === 0) {
    const out: OvertimeFile = {
      status: "indisponivel",
      meta: { ...baseMeta, referencia: `catálogo consultado em ${geradoEm}` },
      corteBrasilia: "17:00",
      motivo: `Até a consulta (${geradoEm}), o TSE ainda não publicou nos dados abertos os Boletins de Urna do ${turno}º turno. Esse é o único arquivo público com a hora de encerramento de cada seção. Nenhum número foi estimado.`,
    };
    await writeFile(outFile, JSON.stringify(out));
    console.log(`Horário de encerramento: BUs do ${turno}º turno ainda não publicados. overtime.json marcado como indisponível.`);
    return;
  }

  // TSE → IBGE (a chave do mapa)
  const cfg = (await getJson(`${ELE_T2}/config/mun-e00${ELE_T2}-cm.json`)) as { abr: { cd: string; mu?: { cd: string; cdi: string }[] }[] };
  const ibgeOf = new Map<string, string>();
  for (const a of cfg.abr) for (const m of a.mu ?? []) ibgeOf.set(`${a.cd.toUpperCase()}|${m.cd.replace(/^0+/, "")}`, m.cdi);

  const total = { apos: emptyGroup(), ate: emptyGroup(), semHorario: 0 };
  const porUf: NonNullable<OvertimeFile["porUf"]> = {};
  const porMunicipio: NonNullable<OvertimeFile["porMunicipio"]> = {};
  const limiares = LIMIARES.map((m) => ({ minutos: m, secoes: 0 }));
  let ref = "";

  for (const f of wanted) {
    const uf = f.name.slice(0, 2).toUpperCase();
    if (uf === "ZZ") continue;
    const zip = path.join(".cache", "bu", path.basename(new URL(f.url).pathname));
    console.log(`BU ${uf}: baixando/lendo…`);
    await download(f.url, zip);
    const secs = await readSections(zip, uf);
    ref = ref || (f.name.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] ?? "");

    // Horário-padrão de abertura por município (moda, em hora cheia): a urna registra hora local.
    const modaAbre = new Map<string, number>();
    const cont = new Map<string, Map<number, number>>();
    for (const s of secs) {
      if (Number.isNaN(s.abre)) continue;
      const h = Math.floor(s.abre / 60);
      const m = cont.get(s.mun) ?? new Map<number, number>();
      m.set(h, (m.get(h) ?? 0) + 1);
      cont.set(s.mun, m);
    }
    for (const [mun, m] of cont) modaAbre.set(mun, [...m.entries()].sort((a, b) => b[1] - a[1])[0]![0]);

    const g = (porUf[uf] ??= { apos: emptyGroup(), ate: emptyGroup() });
    for (const s of secs) {
      const abre = modaAbre.get(s.mun);
      if (abre === undefined || Number.isNaN(s.fecha)) { total.semHorario++; continue; }
      const atraso = s.fecha - (abre + 9) * 60; // minutos após as 17h de Brasília (8h + 9h)
      for (const l of limiares) if (atraso > l.minutos) l.secoes++;
      const grp = atraso > CORTE_MIN ? "apos" : "ate";
      for (const dst of [total[grp], g[grp]]) {
        dst.secoes++; dst.lula += s.lula; dst.flavio += s.flavio; dst.brancos += s.brancos; dst.nulos += s.nulos; dst.comparecimento += s.comp;
      }
      if (grp === "apos") {
        const ibge = ibgeOf.get(`${uf}|${s.mun.replace(/^0+/, "")}`);
        if (ibge) {
          const m = (porMunicipio[ibge] ??= [0, 0, 0, 0]);
          m[0]++; m[1] += s.lula; m[2] += s.flavio; m[3] += s.comp;
        }
      }
    }
  }

  const out: OvertimeFile = {
    status: "disponivel", turno, corteBrasilia: "17:00",
    meta: { ...baseMeta, referencia: `BU ${ref}` },
    total, limiares, porUf, porMunicipio,
  };
  await writeFile(outFile, JSON.stringify(out));
  console.log(`overtime: ${total.apos.secoes} seções após o corte (> ${CORTE_MIN} min depois das 17h), ${total.ate.secoes} dentro; ${total.semHorario} sem horário.`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/build-overtime.ts")) {
  buildOvertime(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

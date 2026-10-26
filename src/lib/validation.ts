import { EXPECTED } from "./meta";
import { somar, vencedor } from "./stats";
import type { MunicipiosFile, NationalFile, StatesFile, Tally } from "./types";

export interface Check {
  nivel: "ok" | "erro" | "info";
  texto: string;
}

const eq = (a: number, b: number) => a === b;
const n = (x: number) => x.toLocaleString("pt-BR");

/** Valida os arquivos gerados contra os totais nacionais conferidos. */
export function validateAll(national: NationalFile, states: StatesFile, munis: MunicipiosFile): Check[] {
  const out: Check[] = [];
  const check = (cond: boolean, ok: string, err: string) => out.push(cond ? { nivel: "ok", texto: ok } : { nivel: "erro", texto: err });
  const info = (texto: string) => out.push({ nivel: "info", texto });

  const nat = national.nacional;
  const soma = somar([...states.estados, national.exterior]);

  for (const k of ["lula", "flavio", "brancos", "nulos", "aptos", "comparecimento", "abstencoes", "naoInstalados", "secoes"] as const) {
    check(eq(soma[k], nat[k]), `Estados + exterior = nacional (${k}: ${n(nat[k])})`, `Soma estados + exterior (${k}) = ${n(soma[k])} ≠ nacional ${n(nat[k])}`);
  }

  check(eq(nat.lula, EXPECTED.turno2.lula), `Lula = ${n(EXPECTED.turno2.lula)}`, `Lula ${n(nat.lula)} ≠ esperado ${n(EXPECTED.turno2.lula)}`);
  check(eq(nat.flavio, EXPECTED.turno2.flavio), `Flávio = ${n(EXPECTED.turno2.flavio)}`, `Flávio ${n(nat.flavio)} ≠ esperado ${n(EXPECTED.turno2.flavio)}`);
  check(eq(nat.lula - nat.flavio, EXPECTED.turno2.diferenca), `Diferença = ${n(EXPECTED.turno2.diferenca)}`, `Diferença ${n(nat.lula - nat.flavio)} ≠ ${n(EXPECTED.turno2.diferenca)}`);
  check(eq(nat.secoes, EXPECTED.turno2.secoes) && nat.secoesTotalizadas === nat.secoes, `Seções: ${n(nat.secoes)} (100% totalizadas)`, `Seções ${n(nat.secoesTotalizadas)}/${n(nat.secoes)} (esperado ${n(EXPECTED.turno2.secoes)} totalizadas)`);
  check(eq(national.exterior.lula, EXPECTED.exterior.lula) && eq(national.exterior.flavio, EXPECTED.exterior.flavio), `Exterior: Lula ${n(EXPECTED.exterior.lula)} / Flávio ${n(EXPECTED.exterior.flavio)}`, `Exterior ${n(national.exterior.lula)}/${n(national.exterior.flavio)} ≠ ${n(EXPECTED.exterior.lula)}/${n(EXPECTED.exterior.flavio)}`);
  check(national.turno1.nacional.lula === EXPECTED.turno1.lula && national.turno1.nacional.flavio === EXPECTED.turno1.flavio, "1º turno: Lula 53.879.538 / Flávio 56.104.503", `1º turno ${n(national.turno1.nacional.lula)}/${n(national.turno1.nacional.flavio)} diverge do esperado`);

  const ident = (t: Tally) => t.lula + t.flavio + t.brancos + t.nulos === t.comparecimento && t.aptos === t.comparecimento + t.abstencoes + t.naoInstalados;
  const bad = [...states.estados, national.exterior].filter((t) => !ident(t));
  check(ident(nat) && bad.length === 0, "Identidade: válidos + brancos + nulos = comparecimento; aptos = comparecimento + abstenção + eleitores de seções não instaladas", `Identidade de contagem falhou em ${bad.length} territórios`);

  check(states.estados.length === 27, "27 UFs", `${states.estados.length} UFs (esperado 27)`);

  let ufsBad = 0;
  for (const e of states.estados) {
    const ms = munis.rows.filter((r) => r[2] === e.uf);
    const s = ms.reduce((a, r) => ({ l: a.l + r[3], f: a.f + r[4], b: a.b + r[5], nu: a.nu + r[6], ap: a.ap + r[7], c: a.c + r[8] }), { l: 0, f: 0, b: 0, nu: 0, ap: 0, c: 0 });
    if (s.l !== e.lula || s.f !== e.flavio || s.b !== e.brancos || s.nu !== e.nulos || s.ap !== e.aptos || s.c !== e.comparecimento) {
      ufsBad++;
      out.push({ nivel: "erro", texto: `${e.uf}: soma dos ${ms.length} municípios (Lula ${n(s.l)}, Flávio ${n(s.f)}) ≠ total da UF (Lula ${n(e.lula)}, Flávio ${n(e.flavio)})` });
    }
  }
  if (ufsBad === 0) out.push({ nivel: "ok", texto: `Soma dos municípios = total de cada UF (27 UFs, ${n(munis.rows.length)} municípios)` });

  const wins = { lula: 0, flavio: 0, empate: 0 };
  for (const e of states.estados) wins[vencedor(e)]++;
  info(`Estados vencidos: Lula ${wins.lula}, Flávio ${wins.flavio}, empate ${wins.empate}`);
  info(`Aptos ${n(nat.aptos)}; comparecimento ${n(nat.comparecimento)} (${((nat.comparecimento / nat.aptos) * 100).toFixed(2).replace(".", ",")}%)`);
  return out;
}

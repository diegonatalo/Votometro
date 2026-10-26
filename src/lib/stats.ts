import type { Tally } from "./types";

type Pair = Pick<Tally, "lula" | "flavio">;

export const validos = (t: Pair): number => t.lula + t.flavio;

export function pctValidos(t: Pair): { lula: number; flavio: number } {
  const v = validos(t);
  if (v === 0) return { lula: 0, flavio: 0 };
  return { lula: (t.lula / v) * 100, flavio: (t.flavio / v) * 100 };
}

/** Margem em votos (positivo = Lula na frente). */
export const margemVotos = (t: Pair): number => t.lula - t.flavio;

export function margemPp(t: Pair): number {
  const p = pctValidos(t);
  return p.lula - p.flavio;
}

export type Vencedor = "lula" | "flavio" | "empate";
export function vencedor(t: Pair): Vencedor {
  return t.lula === t.flavio ? "empate" : t.lula > t.flavio ? "lula" : "flavio";
}

export const pctComparecimento = (t: Tally): number => (t.aptos ? (t.comparecimento / t.aptos) * 100 : 0);
export const pctAbstencao = (t: Tally): number => (t.aptos ? (t.abstencoes / t.aptos) * 100 : 0);

export function somar(list: Tally[]): Tally {
  const z: Tally = { lula: 0, flavio: 0, brancos: 0, nulos: 0, aptos: 0, comparecimento: 0, abstencoes: 0, naoInstalados: 0, secoes: 0, secoesTotalizadas: 0 };
  for (const t of list) {
    z.lula += t.lula; z.flavio += t.flavio; z.brancos += t.brancos; z.nulos += t.nulos;
    z.aptos += t.aptos; z.comparecimento += t.comparecimento; z.abstencoes += t.abstencoes; z.naoInstalados += t.naoInstalados;
    z.secoes += t.secoes; z.secoesTotalizadas += t.secoesTotalizadas;
  }
  return z;
}

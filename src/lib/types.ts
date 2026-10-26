export type Region = "N" | "NE" | "CO" | "SE" | "S";
export type CandidateId = "lula" | "flavio";

export interface Tally {
  lula: number;
  flavio: number;
  brancos: number;
  nulos: number;
  aptos: number;
  comparecimento: number;
  abstencoes: number;
  /** Eleitores aptos em seções não instaladas (não entram em comparecimento nem em abstenção). */
  naoInstalados: number;
  secoes: number;
  secoesTotalizadas: number;
}

export interface SourceMeta {
  fonte: string;
  url: string;
  /** Data/hora de referência do arquivo TSE (dd/mm/aaaa hh:mm:ss, Brasília). */
  referencia: string;
  geradoEm: string;
}

export interface Estado extends Tally {
  uf: string;
  nome: string;
  regiao: Region;
  codIbge: string;
}

export interface Municipio extends Tally {
  ibge: string;
  nome: string;
  uf: string;
}

/** Resultado de um território (Brasil, UF, município ou exterior). */
export type Resultado = Tally & { id: string; nome: string };

export interface Turno1Row {
  lula: number;
  flavio: number;
  outros: number;
  brancos: number;
  nulos: number;
  aptos: number;
  comparecimento: number;
}

export interface Nota {
  id: string;
  titulo: string;
  texto: string;
}

export interface Pessoa {
  sq: string;
  nome: string;
  nomeUrna: string;
  partido: string;
  /** Caminho da foto (arquivo do TSE) dentro de public/. */
  foto: string;
}

export interface Candidato extends Pessoa {
  id: "lula" | "flavio";
  numero: string;
  partidoNome: string;
  /** Coligação ou federação como registrada no TSE. */
  coligacao: string;
  /** Situação no TSE (ex.: Eleito, Não eleito). */
  situacao: string;
  vice: Pessoa;
}

export interface NationalFile {
  candidatos: Candidato[];
  meta: SourceMeta;
  nacional: Tally;
  exterior: Tally;
  turno1: { meta: SourceMeta; nacional: Turno1Row; exterior: Turno1Row; estados: Record<string, Turno1Row> };
  notas: Nota[];
}

export interface StatesFile {
  meta: SourceMeta;
  estados: Estado[];
}

export type MunicipioTuple = [
  ibge: string, nome: string, uf: string,
  lula: number, flavio: number, brancos: number, nulos: number,
  aptos: number, comparecimento: number, abstencoes: number,
  secoes: number, secoesTotalizadas: number, naoInstalados: number,
];

export interface MunicipiosFile {
  meta: SourceMeta;
  rows: MunicipioTuple[];
}

export interface OvertimeGroup {
  secoes: number;
  lula: number;
  flavio: number;
  brancos: number;
  nulos: number;
  comparecimento: number;
}

export interface OvertimeFile {
  status: "disponivel" | "indisponivel";
  meta: SourceMeta;
  motivo?: string;
  corteBrasilia: string;
  turno?: number;
  total?: { apos: OvertimeGroup; ate: OvertimeGroup; semHorario: number };
  limiares?: { minutos: number; secoes: number }[];
  porUf?: Record<string, { apos: OvertimeGroup; ate: OvertimeGroup }>;
  /** ibge → [secoesApos, lula, flavio, comparecimento] */
  porMunicipio?: Record<string, [number, number, number, number]>;
}

export function tallyFromTuple(t: MunicipioTuple): Municipio {
  return {
    ibge: t[0], nome: t[1], uf: t[2], lula: t[3], flavio: t[4], brancos: t[5], nulos: t[6],
    aptos: t[7], comparecimento: t[8], abstencoes: t[9], secoes: t[10], secoesTotalizadas: t[11], naoInstalados: t[12],
  };
}

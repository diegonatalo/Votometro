import type { Region } from "./types";

export const UFS: { uf: string; nome: string; regiao: Region; cod: string }[] = [
  { uf: "AC", nome: "Acre", regiao: "N", cod: "12" },
  { uf: "AL", nome: "Alagoas", regiao: "NE", cod: "27" },
  { uf: "AP", nome: "Amapá", regiao: "N", cod: "16" },
  { uf: "AM", nome: "Amazonas", regiao: "N", cod: "13" },
  { uf: "BA", nome: "Bahia", regiao: "NE", cod: "29" },
  { uf: "CE", nome: "Ceará", regiao: "NE", cod: "23" },
  { uf: "DF", nome: "Distrito Federal", regiao: "CO", cod: "53" },
  { uf: "ES", nome: "Espírito Santo", regiao: "SE", cod: "32" },
  { uf: "GO", nome: "Goiás", regiao: "CO", cod: "52" },
  { uf: "MA", nome: "Maranhão", regiao: "NE", cod: "21" },
  { uf: "MT", nome: "Mato Grosso", regiao: "CO", cod: "51" },
  { uf: "MS", nome: "Mato Grosso do Sul", regiao: "CO", cod: "50" },
  { uf: "MG", nome: "Minas Gerais", regiao: "SE", cod: "31" },
  { uf: "PA", nome: "Pará", regiao: "N", cod: "15" },
  { uf: "PB", nome: "Paraíba", regiao: "NE", cod: "25" },
  { uf: "PR", nome: "Paraná", regiao: "S", cod: "41" },
  { uf: "PE", nome: "Pernambuco", regiao: "NE", cod: "26" },
  { uf: "PI", nome: "Piauí", regiao: "NE", cod: "22" },
  { uf: "RJ", nome: "Rio de Janeiro", regiao: "SE", cod: "33" },
  { uf: "RN", nome: "Rio Grande do Norte", regiao: "NE", cod: "24" },
  { uf: "RS", nome: "Rio Grande do Sul", regiao: "S", cod: "43" },
  { uf: "RO", nome: "Rondônia", regiao: "N", cod: "11" },
  { uf: "RR", nome: "Roraima", regiao: "N", cod: "14" },
  { uf: "SC", nome: "Santa Catarina", regiao: "S", cod: "42" },
  { uf: "SP", nome: "São Paulo", regiao: "SE", cod: "35" },
  { uf: "SE", nome: "Sergipe", regiao: "NE", cod: "28" },
  { uf: "TO", nome: "Tocantins", regiao: "N", cod: "17" },
];

export const REGIOES: { id: Region; nome: string }[] = [
  { id: "N", nome: "Norte" },
  { id: "NE", nome: "Nordeste" },
  { id: "CO", nome: "Centro-Oeste" },
  { id: "SE", nome: "Sudeste" },
  { id: "S", nome: "Sul" },
];

export const CANDIDATES = {
  lula: { id: "lula", nome: "Lula", nomeCompleto: "Luiz Inácio Lula da Silva", partido: "PT", numero: "13" },
  flavio: { id: "flavio", nome: "Flávio Bolsonaro", nomeCompleto: "Flávio Nantes Bolsonaro", partido: "PL", numero: "22" },
} as const;

/** Totais nacionais de referência (imprensa, a partir do TSE) usados na validação do build. */
export const EXPECTED = {
  turno2: { lula: 64_256_232, flavio: 59_826_041, diferenca: 4_430_191, secoes: 499_248 },
  exterior: { lula: 200_154, flavio: 171_497 },
  turno1: { lula: 53_879_538, flavio: 56_104_503 },
} as const;

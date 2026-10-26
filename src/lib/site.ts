/** URL pública do site. Para outro domínio, defina NEXT_PUBLIC_SITE_URL no build. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://votometrobr.vercel.app").replace(/\/+$/, "");
export const SITE_NAME = "Votômetro";
export const SITE_TITLE = "Votômetro — Apuração do 2º turno 2026";
export const SITE_DESCRIPTION =
  "Resultado do 2º turno da eleição presidencial de 25/10/2026 por estado e município, em mapa interativo, com dados oficiais do TSE e fonte e horário de referência em cada número.";

import { interpolateLab, piecewise } from "d3-interpolate";

export type ThemeName = "light" | "dark";

/**
 * Escala divergente: cinza neutro em 50%, mais saturado conforme cresce o percentual do mais votado.
 * Vermelho = Lula na frente, azul = Flávio na frente. Satura em SATURA_PP pontos acima de 50%.
 */
export const SATURA_PP = 30;

const STOPS: Record<ThemeName, { neutral: string; lula: string[]; flavio: string[] }> = {
  light: {
    neutral: "#d6d3c8",
    lula: ["#e9ada1", "#c64a3d", "#8c1912"],
    flavio: ["#a3c0e8", "#4177c6", "#123d7c"],
  },
  dark: {
    neutral: "#2f3644",
    lula: ["#c4505a", "#e85a52", "#ff8272"],
    flavio: ["#4a72c4", "#4e88e6", "#8cb9ff"],
  },
};

const ramps = new Map<string, (t: number) => string>();

function ramp(theme: ThemeName, who: "lula" | "flavio"): (t: number) => string {
  const key = `${theme}:${who}`;
  let r = ramps.get(key);
  if (!r) {
    const s = STOPS[theme];
    r = piecewise(interpolateLab, [s.neutral, ...s[who]]);
    ramps.set(key, r);
  }
  return r;
}

/** Cor para o percentual de Lula (0–100) entre os votos válidos. */
export function colorForPctLula(pctLula: number, theme: ThemeName): string {
  const m = pctLula - 50;
  const t = Math.min(1, Math.abs(m) / SATURA_PP) ** 0.65; // realça margens pequenas e moderadas
  return ramp(theme, m >= 0 ? "lula" : "flavio")(t);
}

/** Amostras da escala para legenda: de 80% Flávio (esquerda) a 80% Lula (direita). */
export function legendStops(theme: ThemeName, n = 33): { offset: number; color: string }[] {
  const out: { offset: number; color: string }[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1); // 0 → Flávio forte, 1 → Lula forte
    const pctLula = 50 - SATURA_PP + f * 2 * SATURA_PP;
    out.push({ offset: f, color: colorForPctLula(pctLula, theme) });
  }
  return out;
}

export const NEUTRAL_FILL: Record<ThemeName, string> = { light: STOPS.light.neutral, dark: STOPS.dark.neutral };

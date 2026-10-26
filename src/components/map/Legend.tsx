"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { legendStops, SATURA_PP, type ThemeName } from "@/lib/colors";

export function useThemeName(): ThemeName {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && resolvedTheme === "dark" ? "dark" : "light";
}

/** Legenda da escala: 80% Lula … 50% … 80% Flávio. */
export function Legend() {
  const theme = useThemeName();
  const gradient = useMemo(
    () =>
      `linear-gradient(90deg, ${legendStops(theme)
        .map((s) => `${s.color} ${((1 - s.offset) * 100).toFixed(1)}%`)
        .reverse()
        .join(", ")})`,
    [theme],
  );
  const edge = 50 + SATURA_PP;
  return (
    <figure className="w-full max-w-md" aria-label="Legenda do mapa: cor pelo percentual dos votos válidos do mais votado">
      <div className="h-3 w-full border border-line" style={{ background: gradient }} aria-hidden="true" />
      <figcaption className="font-data mt-1.5 flex justify-between text-[0.7rem] text-ink-2">
        <span>{edge}% Lula ou mais</span>
        <span>50%</span>
        <span>{edge}% Flávio ou mais</span>
      </figcaption>
      <p className="mt-1 text-xs text-ink-3">Cor = candidato à frente; intensidade = percentual dos votos válidos.</p>
    </figure>
  );
}

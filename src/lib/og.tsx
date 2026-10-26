import { ImageResponse } from "next/og";
import { fmtPct } from "./format";
import { loadNational } from "./data";
import { SITE_NAME } from "./site";
import { pctValidos } from "./stats";

export const OG_SIZE = { width: 1200, height: 630 };

/** Imagem de compartilhamento: percentuais lidos de national.json, dois lados com o mesmo tratamento. */
export function renderOg() {
  const d = loadNational();
  const p = pctValidos(d.nacional);
  const lados = [
    { nome: "Lula", pct: p.lula, cor: "#ff8576" },
    { nome: "Flávio Bolsonaro", pct: p.flavio, cor: "#7fb0ff" },
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#0a0d13", color: "#eef1f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
          <div style={{ width: 20, height: 20, borderRadius: 20, background: "#6ee7a8" }} />
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1 }}>Presidente, 2º turno</div>
          <div style={{ fontSize: 32, color: "#b0b9c8" }}>Resultado por estado e município · 25/10/2026</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 24 }}>
            {lados.map((l) => (
              <div key={l.nome} style={{ display: "flex", flexDirection: "column", flex: 1, padding: 24, borderRadius: 24, background: "#121721", border: "1px solid #263042" }}>
                <div style={{ fontSize: 30, color: "#b0b9c8" }}>{l.nome}</div>
                <div style={{ fontSize: 96, fontWeight: 800, color: l.cor, lineHeight: 1.1 }}>{fmtPct(l.pct)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#8c97a9" }}>
            Percentuais sobre votos válidos · Fonte: TSE · referência {d.meta.referencia}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

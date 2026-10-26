import { fmtPct } from "@/lib/format";

interface Props {
  lula: number;
  flavio: number;
  height?: number;
  label?: string;
}

/** Barra proporcional dos votos válidos. Os dois lados têm tratamento visual idêntico. */
export function SplitBar({ lula, flavio, height = 14, label }: Props) {
  const total = lula + flavio;
  const pl = total ? (lula / total) * 100 : 50;
  return (
    <div
      role="img"
      aria-label={label ?? `Lula ${fmtPct(pl)}, Flávio Bolsonaro ${fmtPct(100 - pl)} dos votos válidos`}
      className="relative flex w-full overflow-hidden rounded-full bg-surface-2"
      style={{ height }}
    >
      <div style={{ width: `${pl}%`, background: "var(--lula)" }} />
      <div style={{ width: `${100 - pl}%`, background: "var(--flavio)" }} />
      <div className="absolute inset-y-0 left-1/2 w-px bg-bg/70" aria-hidden="true" />
    </div>
  );
}

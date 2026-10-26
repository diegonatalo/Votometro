import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "lula" | "flavio";
  big?: boolean;
}

export function StatTile({ label, value, hint, tone, big }: Props) {
  const color = tone === "lula" ? "text-lula" : tone === "flavio" ? "text-flavio" : "text-ink";
  return (
    <div className="border-t border-line pt-3">
      <p className="section-eyebrow">{label}</p>
      <p className={`font-display mt-1 leading-none ${color} ${big ? "text-5xl sm:text-6xl" : "text-3xl"} font-semibold`}>{value}</p>
      {hint ? <p className="mt-2 text-sm text-ink-2">{hint}</p> : null}
    </div>
  );
}

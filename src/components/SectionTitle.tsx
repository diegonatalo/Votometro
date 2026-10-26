import type { ReactNode } from "react";

export function SectionTitle({ id, n, children }: { id: string; n: string; children: ReactNode }) {
  return (
    <div>
      <h2 id={id} className="font-display flex items-center gap-3 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
        <span className="font-data inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-accent px-2 text-xs font-bold text-bg" aria-hidden="true">{n}</span>
        {children}
      </h2>
    </div>
  );
}

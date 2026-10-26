"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const OPTIONS = [
  { id: "light", label: "Claro", icon: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
  { id: "dark", label: "Escuro", icon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" },
] as const;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? resolvedTheme : undefined;

  return (
    <div role="radiogroup" aria-label="Tema da interface" className="inline-flex rounded-full border border-line bg-surface p-0.5">
      {OPTIONS.map((o) => {
        const active = current === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => setTheme(o.id)}
            className={`flex h-8 w-8 items-center rounded-full justify-center transition-colors sm:w-auto sm:gap-1.5 sm:px-2.5 ${
              active ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"
            }`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={o.icon} />
            </svg>
            <span className="hidden text-xs font-medium sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

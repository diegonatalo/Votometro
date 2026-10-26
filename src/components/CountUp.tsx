"use client";

import { useEffect, useRef, useState } from "react";
import { fmtInt, fmtPct } from "@/lib/format";

interface Props {
  value: number;
  kind?: "int" | "pct";
  duration?: number;
}

/** Número com contagem animada ao entrar na tela. Sem animação com prefers-reduced-motion. */
export function CountUp({ value, kind = "int", duration = 1100 }: Props) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(value * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return <span ref={ref}>{kind === "pct" ? fmtPct(shown) : fmtInt(shown)}</span>;
}

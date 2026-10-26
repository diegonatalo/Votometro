"use client";

import { useId, useMemo, useState } from "react";
import { normalize } from "@/lib/format";
import type { Municipio } from "@/lib/types";

interface Props {
  municipios: Municipio[] | null;
  onWake: () => void;
  onPick: (m: Municipio) => void;
}

export function MunicipalitySearch({ municipios, onWake, onPick }: Props) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const index = useMemo(() => (municipios ?? []).map((m) => ({ m, n: normalize(m.nome) })), [municipios]);
  const results = useMemo(() => {
    const n = normalize(q);
    if (n.length < 2) return [];
    const exact: Municipio[] = [];
    const starts: Municipio[] = [];
    const contains: Municipio[] = [];
    for (const r of index) {
      if (r.n === n) exact.push(r.m);
      else if (r.n.startsWith(n)) starts.push(r.m);
      else if (r.n.includes(n)) contains.push(r.m);
    }
    return [...exact, ...starts, ...contains].slice(0, 8);
  }, [q, index]);

  const pick = (m: Municipio) => {
    onPick(m);
    setQ(`${m.nome} — ${m.uf}`);
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-sm">
      <label htmlFor={`${id}-in`} className="sr-only">Buscar município</label>
      <input
        id={`${id}-in`}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${id}-o-${active}` : undefined}
        autoComplete="off"
        placeholder={municipios ? "Buscar município…" : "Buscar município (carrega os municípios)…"}
        value={q}
        onFocus={() => { onWake(); setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(results.length - 1, a + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === "Enter" && open && results[active]) { e.preventDefault(); pick(results[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-3"
      />
      {open && q.trim().length >= 2 ? (
        <ul id={`${id}-list`} role="listbox" aria-label="Municípios encontrados" className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-3" role="option" aria-selected="false">
              {municipios ? "Nenhum município encontrado" : "Carregando municípios…"}
            </li>
          ) : (
            results.map((m, i) => (
              <li
                key={m.ibge}
                id={`${id}-o-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); pick(m); }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-baseline justify-between px-3 py-1.5 text-sm ${i === active ? "bg-ink text-bg" : ""}`}
              >
                <span>{m.nome}</span>
                <span className="font-data text-xs opacity-80">{m.uf}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

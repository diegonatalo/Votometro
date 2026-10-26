"use client";

import { useMemo, useState } from "react";
import { fmtInt, fmtPct, fmtPp, normalize } from "@/lib/format";
import { margemPp, margemVotos, pctAbstencao, pctComparecimento, pctValidos, vencedor } from "@/lib/stats";
import type { Municipio, Tally } from "@/lib/types";
import type { Candidato } from "@/lib/types";
import { Avatar } from "../Candidate";
import { SplitBar } from "../SplitBar";

export interface PanelEntity {
  kind: "br" | "uf" | "mun";
  nome: string;
  subtitulo?: string;
  tally: Tally;
}

interface Props {
  entity: PanelEntity;
  candidatos: Candidato[];
  municipios: Municipio[] | null;
  munisLoading: boolean;
  selectedIbge?: string;
  onBack: () => void;
  onPickMuni: (m: Municipio) => void;
  onBackToUf?: () => void;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 text-sm">
      <dt className="text-ink-2">{k}</dt>
      <dd className="font-data text-right">{v}</dd>
    </div>
  );
}

export function MapPanel({ entity, candidatos, municipios, munisLoading, selectedIbge, onBack, onPickMuni, onBackToUf }: Props) {
  const t = entity.tally;
  const p = pctValidos(t);
  const m = margemVotos(t);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<"nome" | "margem" | "votos">("nome");

  const lead = [
    { id: "lula", nome: "Lula", pct: p.lula, votos: t.lula, color: "var(--lula)" },
    { id: "flavio", nome: "Flávio Bolsonaro", pct: p.flavio, votos: t.flavio, color: "var(--flavio)" },
  ].sort((a, b) => b.votos - a.votos);

  const list = useMemo(() => {
    if (!municipios) return [];
    const f = normalize(filter);
    const rows = f ? municipios.filter((x) => normalize(x.nome).includes(f)) : municipios.slice();
    if (sort === "margem") rows.sort((a, b) => margemPp(b) - margemPp(a));
    else if (sort === "votos") rows.sort((a, b) => b.lula + b.flavio - (a.lula + a.flavio));
    else rows.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return rows;
  }, [municipios, filter, sort]);

  return (
    <aside aria-label={`Detalhes: ${entity.nome}`} className="card flex min-h-0 flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-eyebrow">{entity.kind === "br" ? "Brasil" : entity.kind === "uf" ? "Estado" : "Município"}</p>
          <h3 className="font-display text-2xl font-semibold leading-tight">{entity.nome}</h3>
          {entity.subtitulo ? <p className="text-sm text-ink-3">{entity.subtitulo}</p> : null}
        </div>
        {entity.kind !== "br" ? (
          <button
            type="button"
            onClick={entity.kind === "mun" && onBackToUf ? onBackToUf : onBack}
            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-ink hover:text-bg"
          >
            {entity.kind === "mun" && onBackToUf ? "← Estado" : "← Brasil"}
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {lead.map((c) => (
          <div key={c.id} className="flex items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                {candidatos.find((x) => x.id === c.id) ? <Avatar c={candidatos.find((x) => x.id === c.id) as Candidato} /> : <span className="inline-block h-2.5 w-2.5" style={{ background: c.color }} aria-hidden="true" />}
                {c.nome}
              </p>
              <p className="font-data text-xs text-ink-2">{fmtInt(c.votos)} votos</p>
            </div>
            <p className="font-display text-3xl font-semibold leading-none">{fmtPct(c.pct)}</p>
          </div>
        ))}
        <SplitBar lula={t.lula} flavio={t.flavio} height={12} />
        <p className="text-sm text-ink-2">
          {vencedor(t) === "empate"
            ? "Votos iguais."
            : `Diferença: ${fmtInt(Math.abs(m))} votos (${fmtPp(Math.abs(margemPp(t)))}) a favor de ${m > 0 ? "Lula" : "Flávio Bolsonaro"}.`}
        </p>
      </div>

      <dl className="mt-4">
        <Row k="Votos válidos" v={fmtInt(t.lula + t.flavio)} />
        <Row k="Brancos" v={`${fmtInt(t.brancos)} (${fmtPct(t.comparecimento ? (t.brancos / t.comparecimento) * 100 : 0)})`} />
        <Row k="Nulos" v={`${fmtInt(t.nulos)} (${fmtPct(t.comparecimento ? (t.nulos / t.comparecimento) * 100 : 0)})`} />
        <Row k="Abstenção" v={`${fmtInt(t.abstencoes)} (${fmtPct(pctAbstencao(t))})`} />
        <Row k="Comparecimento" v={`${fmtInt(t.comparecimento)} (${fmtPct(pctComparecimento(t))})`} />
        <Row k="Eleitores aptos" v={fmtInt(t.aptos)} />
        {t.naoInstalados > 0 ? <Row k="Em seções não instaladas" v={fmtInt(t.naoInstalados)} /> : null}
        <Row k="Seções totalizadas" v={`${fmtInt(t.secoesTotalizadas)} de ${fmtInt(t.secoes)}`} />
      </dl>

      {entity.kind !== "br" ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <h4 className="section-eyebrow">Municípios {municipios ? `(${fmtInt(municipios.length)})` : ""}</h4>
            <label className="sr-only" htmlFor="ord-mun">Ordenar municípios</label>
            <select
              id="ord-mun"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="border border-line bg-surface px-1.5 py-1 text-xs"
            >
              <option value="nome">A–Z</option>
              <option value="margem">Mais Lula → Flávio</option>
              <option value="votos">Mais votos válidos</option>
            </select>
          </div>
          <label className="sr-only" htmlFor="filtro-mun">Filtrar municípios</label>
          <input
            id="filtro-mun"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar municípios…"
            className="mt-2 w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm placeholder:text-ink-3"
          />
          {munisLoading && !municipios ? (
            <div className="mt-2 space-y-1.5" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-7" />
              ))}
            </div>
          ) : (
            <ul className="scroll-thin mt-2 max-h-72 overflow-y-auto border-t border-line" tabIndex={0} aria-label="Lista de municípios">
              {list.map((x) => {
                const pc = pctValidos(x);
                const win = vencedor(x);
                return (
                  <li key={x.ibge} style={{ contentVisibility: "auto", containIntrinsicSize: "0 32px" }}>
                    <button
                      type="button"
                      onClick={() => onPickMuni(x)}
                      aria-current={selectedIbge === x.ibge}
                      className={`flex w-full items-center justify-between gap-2 border-b border-line px-1.5 py-1.5 text-left text-sm hover:bg-surface-2 ${selectedIbge === x.ibge ? "bg-surface-2 font-semibold" : ""}`}
                    >
                      <span className="truncate">{x.nome}</span>
                      <span className="font-data flex shrink-0 items-center gap-1.5 text-xs">
                        <span className="inline-block h-2 w-2" style={{ background: win === "lula" ? "var(--lula)" : win === "flavio" ? "var(--flavio)" : "var(--ink-3)" }} aria-hidden="true" />
                        L {fmtPct(pc.lula, 1)} · F {fmtPct(pc.flavio, 1)}
                      </span>
                    </button>
                  </li>
                );
              })}
              {list.length === 0 ? <li className="px-1.5 py-3 text-sm text-ink-3">Nenhum município encontrado.</li> : null}
            </ul>
          )}
        </div>
      ) : null}
    </aside>
  );
}

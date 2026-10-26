import { fmtInt, fmtPct, fmtPp } from "@/lib/format";
import { SectionTitle } from "@/components/SectionTitle";
import { REGIOES } from "@/lib/meta";
import { margemPp, margemVotos, pctValidos, somar, vencedor } from "@/lib/stats";
import type { Estado, SourceMeta } from "@/lib/types";
import { SourceNote } from "../SourceNote";
import { SplitBar } from "../SplitBar";

export function Regions({ estados, meta }: { estados: Estado[]; meta: SourceMeta }) {
  const wins = { lula: 0, flavio: 0 };
  for (const e of estados) {
    const w = vencedor(e);
    if (w !== "empate") wins[w]++;
  }
  const dfWinner = vencedor(estados.find((e) => e.uf === "DF") ?? estados[0]!);

  return (
    <section id="regioes" aria-labelledby="h-regioes" className="pt-16">
      <SectionTitle id="h-regioes" n="02">Quem ficou na frente em cada estado</SectionTitle>
      <p className="mt-3 max-w-2xl text-ink-2">
        Entre as 27 unidades da federação (26 estados e o Distrito Federal), Lula ficou à frente em {wins.lula} e Flávio Bolsonaro em {wins.flavio}
        {dfWinner === "flavio" ? ", incluindo o Distrito Federal" : dfWinner === "lula" ? ", sem contar o Distrito Federal" : ""}.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {REGIOES.map((r) => {
          const es = estados.filter((e) => e.regiao === r.id);
          const t = somar(es);
          const p = pctValidos(t);
          const m = margemVotos(t);
          return (
            <div key={r.id} className="card p-4">
              <h3 className="font-display text-xl font-semibold">{r.nome}</h3>
              <p className="font-data text-xs text-ink-3">{es.length} UFs</p>
              <div className="mt-3 space-y-0.5 text-sm">
                <p className="flex justify-between"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lula" aria-hidden="true" />Lula</span><strong className="font-data">{fmtPct(p.lula)}</strong></p>
                <p className="flex justify-between"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-flavio" aria-hidden="true" />Flávio</span><strong className="font-data">{fmtPct(p.flavio)}</strong></p>
              </div>
              <div className="mt-2"><SplitBar lula={t.lula} flavio={t.flavio} height={8} /></div>
              <p className="font-data mt-3 text-xs font-semibold text-ink">
                +{fmtInt(Math.abs(m))} {m > 0 ? "Lula" : "Flávio"} <span className="font-normal text-ink-3">({fmtPp(Math.abs(margemPp(t)), 1)})</span>
              </p>
              <p className="font-data text-xs text-ink-3">
                {fmtInt(t.lula)} × {fmtInt(t.flavio)}
              </p>
              <p className="font-data mt-1 text-xs text-ink-3">UFs: Lula {es.filter((e) => vencedor(e) === "lula").length} · Flávio {es.filter((e) => vencedor(e) === "flavio").length}</p>
            </div>
          );
        })}
      </div>
      <SourceNote meta={meta} extra="Totais regionais somam as UFs; o exterior fica fora das regiões" />
    </section>
  );
}

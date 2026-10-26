import { CANDIDATES } from "@/lib/meta";
import type { Candidato, Pessoa } from "@/lib/types";

/** Nome de exibição com acentuação correta (os arquivos do TSE vêm sem acento). */
export const displayName = (c: Pick<Candidato, "id">): string => CANDIDATES[c.id].nome;

/** Número do candidato em caixas, como no visor da urna. */
export function NumberBoxes({ numero, size = "md" }: { numero: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-5 text-sm" : "h-9 w-7 text-xl";
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`Número ${numero}`}>
      {numero.split("").map((d, i) => (
        <span key={i} className={`font-data inline-flex items-center justify-center rounded-md border border-ink/70 bg-surface-2 font-semibold ${dim}`}>
          {d}
        </span>
      ))}
    </span>
  );
}

/** Selo tipográfico do partido (o TSE não publica logos). */
export function PartyBadge({ sigla, title }: { sigla: string; title?: string }) {
  return (
    <abbr
      title={title}
      className="font-data inline-block rounded-md bg-ink px-2 py-1 text-xs font-bold leading-none tracking-wider text-bg no-underline"
    >
      {sigla}
    </abbr>
  );
}

/** Foto do arquivo do TSE com faixa na cor do candidato. */
export function Photo({ pessoa, tone, width = 112 }: { pessoa: Pick<Pessoa, "foto" | "nomeUrna">; tone?: "lula" | "flavio"; width?: number }) {
  const height = Math.round((width * 226) / 161);
  return (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-2xl bg-surface-2" style={{ width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pessoa.foto} alt={`Foto de ${pessoa.nomeUrna}`} width={width} height={height} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      {tone ? <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: `var(--${tone})` }} aria-hidden="true" /> : null}
    </span>
  );
}

/** Foto pequena redonda, para listas e painéis. */
export function Avatar({ c }: { c: Pick<Candidato, "id" | "foto" | "nomeUrna"> }) {
  return (
    <span className="relative inline-block h-8 w-8 shrink-0 overflow-hidden rounded-full border-2" style={{ borderColor: `var(--${c.id})` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.foto} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
    </span>
  );
}

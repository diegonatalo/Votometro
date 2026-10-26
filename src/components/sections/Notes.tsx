import type { NationalFile } from "@/lib/types";
import { SectionTitle } from "@/components/SectionTitle";
import { SourceNote } from "../SourceNote";

export function Notes({ data }: { data: NationalFile }) {
  return (
    <section id="notas" aria-labelledby="h-notas" className="pt-16">
      <SectionTitle id="h-notas" n="06">Notas e diferenças entre fontes</SectionTitle>
      <ul className="mt-4 border-t border-line">
        {data.notas.map((n) => (
          <li key={n.id} className="border-b border-line">
            <details className="group py-2.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                {n.titulo}
                <span aria-hidden="true" className="text-ink-3 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">{n.texto}</p>
            </details>
          </li>
        ))}
      </ul>
      <SourceNote meta={data.meta} />
    </section>
  );
}

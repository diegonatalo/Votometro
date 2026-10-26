import { readFileSync } from "node:fs";
import { SectionTitle } from "@/components/SectionTitle";
import path from "node:path";
import { BrazilMap } from "@/components/map/BrazilMap";
import { Hero } from "@/components/sections/Hero";
import { Notes } from "@/components/sections/Notes";
import { Overtime } from "@/components/sections/Overtime";
import { Regions } from "@/components/sections/Regions";
import { RoundCompare } from "@/components/sections/RoundCompare";
import { StatesTable } from "@/components/StatesTable";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SourceNote } from "@/components/SourceNote";
import { loadNational, loadOvertime, loadStates, loadStatesTopo } from "@/lib/data";
import type { MunicipiosFile } from "@/lib/types";

const NAV = [
  { href: "#resultado", label: "Resultado" },
  { href: "#mapa", label: "Mapa" },
  { href: "#regioes", label: "Regiões" },
  { href: "#turnos", label: "Turnos" },
  { href: "#17h", label: "Após 17h" },
  { href: "#notas", label: "Notas" },
];

export default function Page() {
  const national = loadNational();
  const states = loadStates();
  const overtime = loadOvertime();
  const topo = loadStatesTopo();
  const munis = JSON.parse(readFileSync(path.join(process.cwd(), "public", "data", "municipios.json"), "utf8")) as MunicipiosFile;

  return (
    <>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6">
          <a href="#resultado" className="font-display flex shrink-0 items-center gap-2 text-lg font-extrabold uppercase leading-none tracking-tight">
            <span className="led h-2.5 w-2.5 bg-accent" aria-hidden="true" />
            Votômetro <span className="font-data text-xs font-medium normal-case tracking-normal text-ink-3">2026 · 2º turno</span>
          </a>
          <nav aria-label="Seções" className="scroll-thin ml-2 hidden flex-1 gap-1 overflow-x-auto text-sm text-ink-2 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="whitespace-nowrap py-1 rounded-full px-3 hover:bg-surface-2 hover:text-ink">{n.label}</a>
            ))}
          </nav>
          <div className="ml-auto md:ml-0"><ThemeToggle /></div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Hero data={national} />

        <section id="mapa" aria-labelledby="h-mapa" className="pt-16">
          <SectionTitle id="h-mapa" n="01">Onde cada candidato ficou na frente</SectionTitle>
          <p className="mt-3 mb-6 max-w-2xl text-ink-2">Cor por candidato à frente e intensidade pela margem. Passe o mouse ou toque para ver os números; clique em um estado para aproximar e listar os municípios.</p>
          <BrazilMap
            estados={states.estados}
            topo={topo}
            nacional={national.nacional}
            meta={states.meta}
            candidatos={national.candidatos}
          />
        </section>

        <Regions estados={states.estados} meta={states.meta} />
        <RoundCompare data={national} />
        <Overtime data={overtime} munis={munis} />

        <section id="tabela" aria-labelledby="h-tabela" className="pt-16">
          <SectionTitle id="h-tabela" n="05">Todos os estados</SectionTitle>
          <div className="mt-6"><StatesTable estados={states.estados} /></div>
          <SourceNote meta={states.meta} />
        </section>

        <Notes data={national} />
      </main>

      <footer className="border-t border-line">
        <div className="font-data mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-ink-2 sm:px-6">
          <p>Dados: Tribunal Superior Eleitoral (resultados.tse.jus.br). Geometrias: IBGE, API de malhas. Referência dos dados: {national.meta.referencia}. Atualizado em {national.meta.geradoEm}.</p>
          <p className="mt-1">Site informativo e independente, sem vínculo com o TSE. Os valores exibidos vêm dos arquivos oficiais, sem estimativas.</p>
        </div>
      </footer>
    </>
  );
}

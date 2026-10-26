import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/#resultado", label: "Resultado" },
  { href: "/#mapa", label: "Mapa por estado" },
  { href: "/#turnos", label: "Entre os turnos" },
];

export default function NotFound() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-display flex items-center gap-2 text-lg font-extrabold uppercase leading-none tracking-tight">
        <span className="led h-2.5 w-2.5 bg-accent" aria-hidden="true" />
        Votômetro
      </p>

      <div className="card mt-8 overflow-hidden p-6 sm:p-10">
        <svg viewBox="0 0 64 40" className="h-16 w-28" role="img" aria-label="Medidor sem leitura">
          <path d="M10 38A22 22 0 0 1 32 16" fill="none" stroke="var(--lula)" strokeWidth="8" opacity="0.35" />
          <path d="M32 16A22 22 0 0 1 54 38" fill="none" stroke="var(--flavio)" strokeWidth="8" opacity="0.35" />
          <path d="M32 38 20 24" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="32" cy="38" r="4.5" fill="var(--ink)" />
        </svg>

        <p className="font-data mt-6 text-sm font-semibold text-ink-3">Erro 404</p>
        <h1 className="font-display mt-1 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Essa página <span className="text-ink-3">não foi apurada</span>
        </h1>
        <p className="mt-4 max-w-xl text-ink-2">
          O endereço pode ter sido digitado errado ou a página não existe mais. O resultado do 2º turno continua na página inicial.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90">
            Voltar ao resultado
          </Link>
          <nav aria-label="Atalhos" className="flex flex-wrap gap-1 text-sm text-ink-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 hover:bg-surface-2 hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </main>
  );
}

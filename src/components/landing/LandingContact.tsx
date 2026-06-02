import { MAPS_URL } from "./constants";
import { WhatsAppButton } from "./WhatsAppButton";

export function LandingContact() {
  return (
    <section
      id="contact"
      className="landing-cta-frame landing-section mb-8 flex flex-col items-center px-4 py-10 text-center sm:mb-12 sm:px-8 sm:py-14"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c29b62] sm:text-xs sm:tracking-[0.28em]">
        Pronto para transformar suas
      </p>
      <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-zinc-50 sm:mt-3 sm:text-3xl lg:text-4xl">
        Metas em{" "}
        <span className="bg-gradient-to-r from-[#f0d9a0] via-[#c29b62] to-[#8a6535] bg-clip-text text-transparent">
          realidade?
        </span>
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400 sm:mt-4">
        Venha treinar com quem leva o boxe a sério — do aquecimento ao último
        round.
      </p>

      <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:mt-10 sm:max-w-2xl sm:flex-row sm:items-stretch sm:justify-center sm:gap-4">
        <WhatsAppButton className="w-full sm:flex-1 sm:max-w-xs">
          Agendar aula experimental
        </WhatsAppButton>

        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex min-h-[48px] w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-900/70 px-4 py-3.5 text-left transition-all hover:border-[#c29b62]/50 hover:bg-zinc-800/90 hover:-translate-y-0.5 active:scale-[0.98] sm:flex-1 sm:max-w-md sm:px-6 sm:py-4"
        >
          <div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#c29b62]/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
            aria-hidden
          />
          <span className="text-xl shrink-0 sm:text-2xl" aria-hidden>
            📍
          </span>
          <div className="relative min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#c29b62] sm:text-[10px] sm:tracking-[0.2em]">
              Como chegar
            </span>
            <span className="block truncate text-sm font-semibold text-white sm:text-base sm:whitespace-normal">
              Av. Mauá, 959 — Maringá, PR
            </span>
          </div>
          <svg
            className="relative ml-auto h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-[#c29b62] sm:h-5 sm:w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            width={20}
            height={20}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}

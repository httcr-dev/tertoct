import Image from "next/image";
import { NAV_LINKS } from "./constants";

const navLinkClass =
  "rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-[#c29b62]/40 hover:text-[#c29b62] sm:px-4 sm:py-2 sm:text-sm";

const desktopNavLinkClass =
  "text-sm font-medium text-zinc-300 transition hover:text-[#c29b62]";

export function LandingHeader({
  onSignIn,
}: {
  onSignIn: () => void;
}) {
  return (
    <header className="sticky top-2 z-20 flex flex-col gap-3 rounded-2xl border border-zinc-800/60 bg-black/60 px-3 py-3 backdrop-blur-xl sm:top-4 sm:gap-4 sm:px-5 sm:py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#c29b62]/30 bg-zinc-900/80 shadow-[0_0_20px_-4px_rgba(194,155,98,0.35)] sm:h-11 sm:w-11">
            <Image
              src="/logo-academy.png"
              alt="TertoCT"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-base font-black tracking-wide text-zinc-50 sm:text-xl">
              TertoCT
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#c29b62] sm:text-[10px] sm:tracking-[0.22em]">
              Boxe · Maringá
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignIn}
          className="flex shrink-0 cursor-pointer items-center rounded-full bg-[#c29b62] px-3.5 py-2 text-xs font-semibold text-black shadow-[0_0_15px_rgba(194,155,98,0.4)] transition-all hover:bg-[#d4b075] active:scale-[0.98] md:hidden"
        >
          Entrar
        </button>

        <nav
          className="hidden items-center gap-5 text-sm font-medium md:flex lg:gap-6"
          aria-label="Principal"
        >
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={desktopNavLinkClass}>
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={onSignIn}
            className="ml-1 cursor-pointer rounded-full bg-[#c29b62] px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_15px_rgba(194,155,98,0.4)] transition-all hover:bg-[#d4b075] hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(194,155,98,0.6)] active:scale-[0.98] lg:px-6"
          >
            Entrar com Google
          </button>
        </nav>
      </div>

      <nav
        className="flex flex-wrap items-center justify-center gap-2 md:hidden"
        aria-label="Seções"
      >
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} className={navLinkClass}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

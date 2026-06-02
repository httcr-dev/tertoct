import { Heart, Shield, Zap, type LucideIcon } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { WhatsAppButton } from "./WhatsAppButton";

const PILLARS: {
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  {
    label: "Saúde",
    description: "Condicionamento e bem-estar com técnica segura",
    Icon: Heart,
  },
  {
    label: "Desempenho",
    description: "Força, ritmo e evolução a cada round",
    Icon: Zap,
  },
  {
    label: "Disciplina",
    description: "Rotina, foco e respeito dentro do ringue",
    Icon: Shield,
  },
];

const iconClass = "h-5 w-5 shrink-0 text-[#c29b62] sm:h-6 sm:w-6";

export function LandingHero({
  onSignIn,
  authError,
}: {
  onSignIn: () => void;
  authError: string | null;
}) {
  return (
    <section className="mt-8 flex flex-1 flex-col items-center pb-6 text-center sm:mt-12 sm:pb-8 lg:mt-16 lg:pb-12">
      <p className="mb-4 inline-flex max-w-[min(100%,20rem)] items-center justify-center gap-2 rounded-full border border-[#c29b62]/30 bg-[#c29b62]/10 px-3 py-1.5 text-[10px] font-bold uppercase leading-snug tracking-[0.16em] text-[#e6c687] sm:mb-5 sm:max-w-none sm:px-4 sm:text-[11px] sm:tracking-[0.2em]">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c29b62] shadow-[0_0_8px_rgba(194,155,98,1)]"
          aria-hidden
        />
        Academia de boxe · Maringá, PR
      </p>

      <h1 className="max-w-4xl px-1 text-[1.75rem] font-black leading-[1.1] tracking-tight text-zinc-50 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] min-[400px]:text-4xl sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
        Treino de boxe focado em{" "}
        <span className="bg-gradient-to-r from-[#f0d9a0] via-[#c29b62] to-[#8a6535] bg-clip-text text-transparent">
          saúde, desempenho
        </span>{" "}
        e{" "}
        <span className="text-zinc-100">disciplina</span>
      </h1>

      <p className="mt-4 max-w-2xl px-2 text-sm leading-relaxed text-zinc-300 sm:mt-6 sm:text-base lg:text-lg">
        Entre em forma de maneira intensa e focada. Agende uma aula experimental.
      </p>

      <ul className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
        {PILLARS.map(({ label, description, Icon }) => (
          <li
            key={label}
            className="landing-pillar flex flex-row items-start gap-3 px-4 py-4 text-left sm:flex-col sm:items-center sm:gap-2 sm:text-center md:items-start md:text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#c29b62]/10">
              <Icon className={iconClass} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-black uppercase tracking-wider text-[#c29b62]">
                {label}
              </span>
              <p className="mt-0.5 text-xs leading-snug text-zinc-400 sm:mt-1">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10 sm:max-w-lg sm:flex-row sm:justify-center sm:gap-4 lg:max-w-none">
        <WhatsAppButton className="w-full sm:w-auto">Aula experimental</WhatsAppButton>
        <GoogleSignInButton
          onClick={onSignIn}
          testId="landing-login-google"
        />
      </div>

      {authError && (
        <p
          role="alert"
          className="mt-4 w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100"
        >
          {authError}
        </p>
      )}

      <a
        href="#plans"
        className="landing-scroll-hint mt-10 flex flex-col items-center gap-1 text-zinc-500 transition hover:text-[#c29b62] sm:mt-14"
        aria-label="Ver planos"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.25em]">
          Conheça os planos
        </span>
        <svg
          className="h-5 w-5 shrink-0"
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
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </a>
    </section>
  );
}

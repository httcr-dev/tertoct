"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Heart, Shield, Zap } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageLoader } from "@/components/ui/PageLoader";
import type { Plan } from "@/lib/types";
import { PlansSection } from "@/components/landing/PlansSection";
import { CoachesSection } from "@/components/landing/CoachesSection";
import { FeedbackWall } from "@/components/landing/FeedbackWall";
import type { CoachCardData } from "@/services/landingService";

const PILLARS = [
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
] as const;

const iconClass = "h-6 w-6 shrink-0 text-[#c29b62]";

export function HomeClient({
  initialPlans,
  initialCoaches,
}: {
  initialPlans: Plan[];
  initialCoaches: CoachCardData[];
}) {
  const router = useRouter();
  const { firebaseUser, authError, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, router]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black font-sans text-zinc-50">
      {firebaseUser && <PageLoader message="Redirecionando..." />}

      {!firebaseUser && (
        <>
          <div className="fixed inset-0 z-0" aria-hidden>
            <Image
              src="/BlessTraining_Boxe_2026-03-15_532.jpg"
              alt=""
              fill
              priority
              quality={100}
              unoptimized
              className="object-cover object-center opacity-55 saturate-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/55 to-black" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-black/35" />
            <div className="absolute -right-20 top-0 h-[min(520px,75vh)] w-[min(520px,75vw)] rounded-full bg-[radial-gradient(circle,rgba(194,155,98,0.14)_0%,transparent_70%)] blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 landing-rope-line" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.72)_100%)]" />
          </div>

          <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-8 pt-4 sm:pt-6 lg:px-8">
            <header className="sticky top-3 z-20 flex flex-col gap-3 rounded-2xl border border-zinc-800/60 bg-black/55 px-4 py-3 backdrop-blur-xl sm:top-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c29b62]/30 bg-zinc-900/80 shadow-[0_0_20px_-4px_rgba(194,155,98,0.35)]">
                    <Image
                      src="/logo-academy.png"
                      alt="TertoCT Logo"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-lg font-black tracking-wide text-zinc-50 sm:text-xl">
                      TertoCT
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c29b62]">
                      Boxe · Maringá
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#c29b62] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_15px_rgba(194,155,98,0.4)] transition-all hover:bg-[#d4b075] hover:-translate-y-0.5 active:scale-95 md:hidden"
                >
                  Entrar
                </button>
              </div>

              <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-300 md:flex">
                <a href="#plans" className="transition hover:text-[#c29b62]">
                  Planos
                </a>
                <a href="#coaches" className="transition hover:text-[#c29b62]">
                  Professores
                </a>
                <a href="#contact" className="transition hover:text-[#c29b62]">
                  Contato
                </a>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="ml-2 cursor-pointer rounded-full bg-[#c29b62] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_15px_rgba(194,155,98,0.4)] transition-all hover:bg-[#d4b075] hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(194,155,98,0.6)] active:scale-95"
                >
                  Entrar com conta Google
                </button>
              </nav>

              <nav className="flex flex-wrap items-center justify-center gap-2 md:hidden">
                {[
                  { href: "#plans", label: "Planos" },
                  { href: "#coaches", label: "Professores" },
                  { href: "#contact", label: "Contato" },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-zinc-700/80 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-[#c29b62]/40 hover:text-[#c29b62]"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </header>

            {authError && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-100 md:hidden">
                {authError}
              </p>
            )}

            <section className="mt-12 flex flex-1 flex-col items-center pb-8 text-center sm:mt-16 lg:mt-20 lg:pb-12">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c29b62]/30 bg-[#c29b62]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#e6c687]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c29b62] shadow-[0_0_8px_rgba(194,155,98,1)]" />
                Academia de boxe · Maringá, PR
              </p>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.08] tracking-tight text-zinc-50 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] sm:text-5xl lg:text-[3.5rem]">
                Treino de boxe focado{" "}
                <span className="bg-gradient-to-r from-[#f0d9a0] via-[#c29b62] to-[#8a6535] bg-clip-text text-transparent">
                  em saúde, desempenho!
                </span>{" "}
                <span className="text-zinc-100">E disciplina</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                Entre em forma de maneira intensa e focada.
                <br className="hidden sm:block" /> Agende uma aula experimental!
              </p>

              <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {PILLARS.map(({ label, description, Icon }) => (
                  <div
                    key={label}
                    className="landing-pillar flex flex-col items-center gap-2 px-4 py-4 text-center sm:items-start sm:text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#c29b62]/10">
                      <Icon className={iconClass} strokeWidth={1.75} aria-hidden />
                    </div>
                    <span className="text-sm font-black uppercase tracking-wider text-[#c29b62]">
                      {label}
                    </span>
                    <span className="text-xs leading-snug text-zinc-400">
                      {description}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex w-full max-w-lg flex-col items-stretch gap-4 sm:max-w-none sm:flex-row sm:justify-center">
                <a
                  href="https://wa.me/554499771761?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20de%20boxe."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#c29b62] px-8 py-4 text-sm font-bold uppercase tracking-wider text-black shadow-[0_0_24px_rgba(194,155,98,0.35)] transition-all hover:bg-[#d4b075] hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(194,155,98,0.5)] active:scale-95"
                >
                  <svg
                    className="h-5 w-5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    width={20}
                    height={20}
                    aria-hidden
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Aula experimental
                </a>

                <button
                  type="button"
                  data-testid="landing-login-google"
                  onClick={signInWithGoogle}
                  className="flex cursor-pointer items-center justify-center gap-3 rounded-full border border-zinc-600/80 bg-zinc-900/80 px-8 py-4 text-sm font-semibold text-zinc-100 shadow-[0_0_20px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-all hover:border-zinc-500 hover:bg-zinc-800 hover:-translate-y-0.5 active:scale-95"
                >
                  <Image
                    src="/google-logo.svg"
                    alt="Google"
                    width={20}
                    height={20}
                  />
                  <span>Login com Google</span>
                </button>
              </div>

              {authError && (
                <p className="mt-4 max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
                  {authError}
                </p>
              )}

              <a
                href="#plans"
                className="landing-scroll-hint mt-14 flex flex-col items-center gap-1 text-zinc-500 transition hover:text-[#c29b62]"
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

            <div
              className="landing-rope-line mx-auto mb-4 w-full max-w-md opacity-80"
              aria-hidden
            />

            <PlansSection plans={initialPlans} loadingLandingData={false} />

            <div
              className="landing-rope-line mx-auto my-8 w-full max-w-md opacity-60"
              aria-hidden
            />

            <CoachesSection coaches={initialCoaches} />

            <div
              className="landing-rope-line mx-auto my-8 w-full max-w-md opacity-60"
              aria-hidden
            />

            <FeedbackWall />

            <section
              id="contact"
              className="landing-cta-frame mb-12 mt-24 flex flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-14"
            >
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#c29b62]">
                Pronto para transformar suas
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-zinc-50 sm:text-4xl lg:text-5xl">
                Metas em{" "}
                <span className="bg-gradient-to-r from-[#f0d9a0] via-[#c29b62] to-[#8a6535] bg-clip-text text-transparent">
                  realidade?
                </span>
              </h2>
              <p className="mt-4 max-w-lg text-sm text-zinc-400">
                Venha treinar com quem leva o boxe a sério — do aquecimento ao
                último round.
              </p>

              <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
                <a
                  href="https://wa.me/554499771761?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20de%20boxe."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#c29b62] px-10 py-5 text-sm font-bold uppercase tracking-wider text-black shadow-[0_0_24px_rgba(194,155,98,0.35)] transition-all hover:bg-[#d4b075] hover:-translate-y-1 hover:shadow-[0_0_36px_rgba(194,155,98,0.5)] active:scale-95"
                >
                  Agendar Aula Experimental
                </a>

                <a
                  href="https://maps.app.goo.gl/search/Avenida+Maua+959+Maringa+PR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center justify-center gap-4 overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-900/70 px-8 py-4 text-sm font-medium text-zinc-300 transition-all hover:border-[#c29b62]/50 hover:bg-zinc-800/90 hover:-translate-y-1 active:scale-95"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#c29b62]/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  <span className="text-2xl" aria-hidden>
                    📍
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c29b62]">
                      Como Chegar
                    </span>
                    <span className="font-semibold text-white">
                      Avenida Mauá, 959 — Maringá, PR
                    </span>
                  </div>
                  <svg
                    className="ml-2 h-5 w-5 shrink-0 text-zinc-500 transition-colors group-hover:text-[#c29b62]"
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
          </main>
        </>
      )}
    </div>
  );
}

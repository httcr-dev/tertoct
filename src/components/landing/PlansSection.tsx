"use client";

import { useEffect, useRef } from "react";
import type { Plan } from "@/lib/types";

interface PlansSectionProps {
  plans: Plan[];
  loadingLandingData: boolean;
}

export function PlansSection({ plans, loadingLandingData }: PlansSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (plans.length === 0 || loadingLandingData) return;

    let intervalId: NodeJS.Timeout;

    const startScroll = () => {
      intervalId = setInterval(() => {
        if (!scrollRef.current) return;
        const container = scrollRef.current;

        // Verifica se chegou ao final (adicionando uma pequena margem de erro)
        const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 20;

        if (isAtEnd) {
          // Volta para o primeiro plano
          container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Avança aproximadamente um cartão, o snap resolve o resto
          container.scrollBy({ left: 300, behavior: "smooth" });
        }
      }, 3000);
    };

    startScroll();

    const handlePause = () => clearInterval(intervalId);
    const handleResume = () => startScroll();

    const el = scrollRef.current;
    if (el) {
      el.addEventListener("mouseenter", handlePause);
      el.addEventListener("mouseleave", handleResume);
      el.addEventListener("touchstart", handlePause, { passive: true });
      el.addEventListener("touchend", handleResume, { passive: true });
    }

    return () => {
      clearInterval(intervalId);
      if (el) {
        el.removeEventListener("mouseenter", handlePause);
        el.removeEventListener("mouseleave", handleResume);
        el.removeEventListener("touchstart", handlePause);
        el.removeEventListener("touchend", handleResume);
      }
    };
  }, [plans.length, loadingLandingData]);

  return (
    <section id="plans" className="mt-32 flex w-full flex-col items-center">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-[#c29b62]">
        Escolha seu plano
      </p>
      <h2 className="mb-4 text-3xl font-black text-zinc-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] sm:text-4xl">
        Nossos Planos
      </h2>
      <p className="mb-14 max-w-md text-center text-sm text-zinc-400">
        Planos flexíveis para todos os níveis. Treino de boxe com foco em saúde
        e desempenho.
      </p>

      <div
        ref={scrollRef}
        className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto pb-12 pt-4 px-4 sm:gap-8 sm:px-8 max-w-7xl mx-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {loadingLandingData ? (
          <div className="flex w-full items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c29b62] border-t-transparent" />
          </div>
        ) : plans.length > 0 ? (
          plans.map((plan, index) => (
            <div
              key={plan.id}
              className="group relative flex w-[85vw] shrink-0 snap-center sm:w-[360px] flex-col rounded-2xl border border-[#c29b62]/20 bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-black/90 p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-[#c29b62]/60 hover:shadow-[0_0_40px_rgba(194,155,98,0.15)]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Glow effect */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#c29b62]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Header */}
              <div className="relative">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#c29b62]/80">
                  {plan.classesPerWeek}x na semana
                </p>
                <h3 className="text-2xl font-black tracking-tight text-zinc-100">
                  {plan.name}
                </h3>
              </div>

              {/* Price */}
              <div className="relative mb-6 mt-6 border-b border-zinc-800/80 pb-6">
                <p className="flex items-baseline gap-1">
                  <span className="mt-2 self-start text-sm font-semibold text-[#c29b62]">
                    R$
                  </span>
                  <span className="text-5xl font-black text-[#c29b62]">
                    {Math.floor(plan.price || 0)}
                  </span>
                  <span className="text-base font-medium text-zinc-500">
                    /mês
                  </span>
                </p>
              </div>

              {/* Description */}
              {plan.description && (
                <div className="relative mt-auto flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#c29b62]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {plan.description}
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          /* Fallback estático */
          <>
            {[
              {
                title: "Planos Acessíveis",
                desc: "Escolha um plano adequado ao seu nível e agenda. Treine até 5x por semana.",
                icon: (
                  <path
                    d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ),
              },
              {
                title: "Professores Especializados",
                desc: "Treine com instrutores experientes e focados em sua evolução.",
                icon: (
                  <>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </>
                ),
              },
              {
                title: "Resultados Comprovados",
                desc: "Acompanhe seu progresso semanalmente com check-ins e relatórios.",
                icon: (
                  <>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative flex w-[85vw] shrink-0 snap-center sm:w-[360px] flex-col items-center rounded-2xl border border-[#c29b62]/15 bg-gradient-to-br from-zinc-900/80 to-black/80 p-10 text-center backdrop-blur-xl transition-all duration-500 hover:border-[#c29b62]/40 hover:shadow-[0_0_30px_rgba(194,155,98,0.1)]"
              >
                <div className="mb-6 rounded-full border border-[#c29b62]/30 bg-[#c29b62]/10 p-4 text-[#c29b62]">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    {item.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-zinc-100">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

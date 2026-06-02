"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { Plan } from "@/lib/types";
import { LandingSectionHeading } from "./LandingSectionHeading";

interface PlansSectionProps {
  plans: Plan[];
  loadingLandingData: boolean;
}

type SortOrder = "asc" | "desc" | "none";

const CARD_CLASS =
  "group relative flex w-[min(100%,320px)] shrink-0 snap-center flex-col rounded-2xl border border-[#c29b62]/20 bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-black/90 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#c29b62]/60 hover:shadow-[0_0_40px_rgba(194,155,98,0.15)] sm:w-[340px] sm:p-8";

export function PlansSection({ plans, loadingLandingData }: PlansSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const sortedPlans = useMemo(() => {
    if (sortOrder === "none") return plans;
    return [...plans].sort((a, b) => {
      if (sortOrder === "asc") return a.price - b.price;
      return b.price - a.price;
    });
  }, [plans, sortOrder]);

  useEffect(() => {
    if (plans.length === 0 || loadingLandingData) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let intervalId: ReturnType<typeof setInterval>;

    const startScroll = () => {
      intervalId = setInterval(() => {
        const container = scrollRef.current;
        if (!container) return;

        const isAtEnd =
          container.scrollLeft + container.clientWidth >=
          container.scrollWidth - 20;

        if (isAtEnd) {
          container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          const cardWidth =
            container.querySelector<HTMLElement>("[data-plan-card]")?.offsetWidth ??
            300;
          container.scrollBy({ left: cardWidth + 24, behavior: "smooth" });
        }
      }, 4000);
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
    <section id="plans" className="landing-section flex w-full flex-col items-center">
      <LandingSectionHeading
        eyebrow="Escolha seu plano"
        title="Nossos Planos"
        description="Planos flexíveis para todos os níveis. Treino de boxe com foco em saúde e desempenho."
        className="mb-8 sm:mb-10"
      />

      {plans.length > 0 && !loadingLandingData && (
        <div className="mb-6 flex w-full max-w-xs flex-col items-stretch gap-2 sm:mb-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <label
            htmlFor="sort-plans"
            className="text-center text-xs font-bold uppercase tracking-widest text-zinc-500 sm:text-left"
          >
            Ordenar por
          </label>
          <select
            id="sort-plans"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-all focus:border-[#c29b62]/50 focus:outline-none sm:w-auto sm:text-xs"
          >
            <option value="asc">Menor preço</option>
            <option value="desc">Maior preço</option>
            <option value="none">Padrão</option>
          </select>
        </div>
      )}

      <div
        ref={scrollRef}
        className="-mx-3 flex w-[calc(100%+1.5rem)] snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-3 pb-10 pt-2 [scrollbar-width:none] sm:-mx-4 sm:w-[calc(100%+2rem)] sm:gap-6 sm:px-4 sm:pb-12 [&::-webkit-scrollbar]:hidden"
      >
        {loadingLandingData ? (
          <div className="flex w-full items-center justify-center py-16">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[#c29b62] border-t-transparent"
              role="status"
              aria-label="Carregando planos"
            />
          </div>
        ) : sortedPlans.length > 0 ? (
          sortedPlans.map((plan) => (
            <article
              key={plan.id}
              data-plan-card
              className={CARD_CLASS}
            >
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#c29b62]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#c29b62]/80">
                  {plan.classesPerWeek}x na semana
                </p>
                <h3 className="text-xl font-black tracking-tight text-zinc-100 sm:text-2xl">
                  {plan.name}
                </h3>
              </div>

              <div className="relative mb-5 mt-5 border-b border-zinc-800/80 pb-5 sm:mb-6 sm:mt-6 sm:pb-6">
                <p className="flex items-baseline gap-1">
                  <span className="mt-2 self-start text-sm font-semibold text-[#c29b62]">
                    R$
                  </span>
                  <span className="text-4xl font-black text-[#c29b62] sm:text-5xl">
                    {Math.floor(plan.price || 0)}
                  </span>
                  <span className="text-sm font-medium text-zinc-500 sm:text-base">
                    /mês
                  </span>
                </p>
              </div>

              {plan.description && (
                <div className="relative mt-auto flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#c29b62]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden
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
            </article>
          ))
        ) : (
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
              <article
                key={i}
                data-plan-card
                className={`${CARD_CLASS} items-center text-center`}
              >
                <div className="mb-5 rounded-full border border-[#c29b62]/30 bg-[#c29b62]/10 p-4 text-[#c29b62] sm:mb-6">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden
                  >
                    {item.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-zinc-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {item.desc}
                </p>
              </article>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

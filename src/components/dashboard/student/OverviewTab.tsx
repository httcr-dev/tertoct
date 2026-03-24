import { List, CheckCircle } from "lucide-react";
import { BarChart } from "@/components/ui/BarChart";
import type { Plan, CheckIn } from "@/lib/types";

interface OverviewTabProps {
  isPaymentOverdue: boolean;
  plan: Plan | null;
  currentWeekInfo: {
    weekStart: Date;
    count: number;
    allowed: number;
    remaining: number;
  } | null;
  checkIns: CheckIn[];
}

export function OverviewTab({
  isPaymentOverdue,
  plan,
  currentWeekInfo,
  checkIns,
}: OverviewTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Payment Overdue Banner */}
      {isPaymentOverdue && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-4 backdrop-blur-sm">
          <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold">!</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-400">
              Mensalidade Pendente
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              Seu check-in está bloqueado. Procure seu professor para
              regularizar o pagamento.
            </p>
          </div>
        </div>
      )}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Current Plan Card */}
        <div className="rounded-3xl border border-amber-500/20 bg-zinc-900/30 p-6 backdrop-blur-md gold-glow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Seu Plano
            </h3>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <List className="h-5 w-5" />
            </div>
          </div>
          {plan ? (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                {plan.name}
                {!plan.active && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                    INATIVO
                  </span>
                )}
              </p>
              <p className="text-zinc-400 text-sm">
                {plan.classesPerWeek} aulas por semana
              </p>
            </div>
          ) : (
            <p className="text-zinc-500 italic text-sm">
              Nenhum plano ativo.
            </p>
          )}
        </div>

        {/* Weekly Status Card */}
        <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Status da Semana
            </h3>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          {currentWeekInfo ? (
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-zinc-100">
                  {currentWeekInfo.count}/{currentWeekInfo.allowed}
                </p>
                <p className="text-zinc-400 text-sm">
                  Aulas realizadas
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-emerald-400">
                  {currentWeekInfo.remaining}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Restantes
                </p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 italic text-sm">
              Sem dados semanais.
            </p>
          )}
        </div>
      </section>

      {/* Activity Chart */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Sua Atividade (14 dias)
        </h3>
        <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm shadow-inner shadow-amber-500/5">
          <BarChart dataItems={checkIns} ds={14} />
        </div>
      </section>

      {/* Recent History */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Atividade Recente
        </h3>
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 divide-y divide-zinc-800/40 overflow-hidden">
          {checkIns.slice(0, 5).map((checkIn) => (
            <div
              key={checkIn.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-zinc-200 capitalize">
                    {checkIn.createdAt.toLocaleDateString("pt-BR", {
                      weekday: "long",
                    })}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {checkIn.createdAt.toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <p className="text-sm font-mono text-amber-500/80">
                {checkIn.createdAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
          {checkIns.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-zinc-500 text-sm">
                Nenhuma atividade registrada.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

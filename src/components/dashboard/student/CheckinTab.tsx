import type { Plan } from "@/lib/types";

interface CheckinTabProps {
  currentWeekInfo: {
    weekStart: Date;
    count: number;
    allowed: number;
    remaining: number;
  } | null;
  handleCheckIn: () => Promise<void>;
  canCheckIn: boolean;
  creating: boolean;
  plan: Plan | null;
  isPaymentOverdue: boolean;
}

export function CheckinTab({
  currentWeekInfo,
  handleCheckIn,
  canCheckIn,
  creating,
  plan,
  isPaymentOverdue,
}: CheckinTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-zinc-100">
            Pronto para o treino?
          </h2>
          <p className="text-zinc-400">
            Confirme sua presença na aula de hoje abaixo.
          </p>
        </div>

        <div className="p-8 rounded-[40px] bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {currentWeekInfo && (
            <div className="relative z-10 space-y-6">
              <div className="flex justify-center gap-4">
                <div className="px-4 py-2 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    Disponíveis
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {currentWeekInfo.remaining}
                  </p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    Total Semanal
                  </p>
                  <p className="text-2xl font-bold text-zinc-300">
                    {currentWeekInfo.allowed}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCheckIn}
                disabled={!canCheckIn || creating}
                className={`w-full py-6 rounded-[30px] text-lg font-bold transition-all transform active:scale-95 shadow-2xl ${
                  canCheckIn && !creating
                    ? "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20 cursor-pointer"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </span>
                ) : !plan ? (
                  "Aguardando Plano"
                ) : !plan.active ? (
                  "Plano Inativo"
                ) : isPaymentOverdue ? (
                  "Mensalidade Pendente"
                ) : canCheckIn ? (
                  "REALIZAR CHECK-IN"
                ) : (
                  "Limite atingido"
                )}
              </button>

              {!canCheckIn && (
                <p className="text-red-400/80 text-xs font-medium bg-red-500/5 py-2 rounded-full border border-red-500/10">
                  {isPaymentOverdue
                    ? "Mensalidade pendente. Procure seu professor para regularizar."
                    : !plan
                      ? "Seu perfil não possui um plano associado."
                      : !plan.active
                        ? "Este plano está desativado pela administração."
                        : currentWeekInfo &&
                            currentWeekInfo.remaining <= 0
                          ? "Você atingiu o limite de check-ins para esta semana."
                          : "Não é possível fazer check-in no momento."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

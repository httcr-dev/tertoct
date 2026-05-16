"use client";

import type { GymClass, Plan } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ActionStatus } from "./checkinTypes";
import {
  dateKeyToLocalDate,
  formatCheckinDateLabel,
  getTodayDateKey,
  isAllowedCheckinDateKey,
} from "@/lib/utils/checkinDate";

export interface CheckinTabProps {
  currentWeekInfo: {
    count: number;
    allowed: number;
    remaining: number;
  } | null;
  plan: Plan | null;
  paymentOverdue: boolean;
  classes: GymClass[];
  selectedClassId: string;
  onSelectedClassIdChange: (classId: string) => void;
  allowedDateKeys: string[];
  selectedDateKey: string;
  onSelectedDateKeyChange: (dateKey: string) => void;
  classCounts: Map<string, number>;
  isSelectedDateToday: boolean;
  canCheckIn: boolean;
  canCheckInForClass: boolean;
  checkInStatus: ActionStatus;
  alreadyCheckedInThisClassOnDate: boolean;
  selectedClassWindowOpen: boolean;
  selectedClassRemaining: number | null;
  onCheckIn: () => Promise<void>;
}

export function CheckinTab({
  currentWeekInfo,
  plan,
  paymentOverdue,
  classes,
  selectedClassId,
  onSelectedClassIdChange,
  allowedDateKeys,
  selectedDateKey,
  onSelectedDateKeyChange,
  classCounts,
  isSelectedDateToday,
  canCheckIn,
  canCheckInForClass,
  checkInStatus,
  alreadyCheckedInThisClassOnDate,
  selectedClassWindowOpen,
  selectedClassRemaining,
  onCheckIn,
}: CheckinTabProps) {
  const todayKey = getTodayDateKey();
  const selectedDateAllowed = isAllowedCheckinDateKey(selectedDateKey, todayKey);
  const formattedSelectedDate = dateKeyToLocalDate(selectedDateKey).toLocaleDateString(
    "pt-BR",
  );

  return (
    <div className="flex min-w-0 flex-col items-center justify-center py-8 sm:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full min-w-0 max-w-lg space-y-6 px-1 text-center sm:space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-100 sm:text-3xl">
            Pronto para o treino?
          </h2>
          <p className="text-sm text-zinc-400 sm:text-base">
            {isSelectedDateToday
              ? "Confirme sua presença na aula de hoje abaixo."
              : `Faça seu check-in para ${formattedSelectedDate}.`}
          </p>
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-xl sm:rounded-[40px] sm:p-8 group">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          {currentWeekInfo && (
            <div className="relative z-10 min-w-0 space-y-5 sm:space-y-6">
              <div className="min-w-0 space-y-2 text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Data do check-in
                </p>
                {allowedDateKeys.length === 0 ? (
                  <p className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-400">
                    Check-in disponível de segunda a sexta. Volte na próxima
                    segunda-feira.
                  </p>
                ) : (
                  <div
                    className="grid min-w-0 grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3"
                    data-testid="student-checkin-date-options"
                  >
                    {allowedDateKeys.map((dateKey) => {
                      const isSelected = dateKey === selectedDateKey;
                      return (
                        <button
                          key={dateKey}
                          type="button"
                          data-testid={`student-checkin-date-${dateKey}`}
                          aria-pressed={isSelected}
                          onClick={() => onSelectedDateKeyChange(dateKey)}
                          className={`min-w-0 rounded-xl border px-3 py-3 text-left text-sm transition-colors sm:px-4 ${
                            isSelected
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                              : "border-zinc-800 bg-black/30 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          <span className="block truncate font-medium">
                            {formatCheckinDateLabel(dateKey, todayKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!isSelectedDateToday && selectedDateAllowed && (
                  <p className="text-xs text-amber-400">
                    Check-in para {formattedSelectedDate}
                  </p>
                )}
              </div>

              <div className="min-w-0 space-y-2 text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Escolha a turma
                </p>
                <select
                  className="w-full min-w-0 cursor-pointer rounded-xl border border-zinc-800 bg-black/30 px-3 py-3 text-base text-zinc-100 outline-none focus:border-amber-500/40 disabled:opacity-50 sm:px-4 sm:text-sm"
                  value={selectedClassId}
                  onChange={(e) => onSelectedClassIdChange(e.target.value)}
                  disabled={classes.length === 0}
                >
                  {classes.length === 0 ? (
                    <option value="">Nenhuma turma disponível</option>
                  ) : (
                    classes.map((c) => {
                      const remaining = Math.max(
                        c.capacity - (classCounts.get(c.id) ?? 0),
                        0,
                      );
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} • {c.startTime} (até {c.checkinDeadlineTime}) •{" "}
                          {remaining}/{c.capacity} vagas
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                <div className="min-w-[7rem] flex-1 rounded-2xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-2 sm:flex-none">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Disponíveis
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {currentWeekInfo.remaining}
                  </p>
                </div>
                <div className="min-w-[7rem] flex-1 rounded-2xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-2 sm:flex-none">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Total semanal
                  </p>
                  <p className="text-2xl font-bold text-zinc-300">
                    {currentWeekInfo.allowed}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="student-checkin-submit"
                onClick={onCheckIn}
                disabled={
                  !canCheckInForClass ||
                  checkInStatus === "loading" ||
                  allowedDateKeys.length === 0
                }
                className={`w-full rounded-[24px] py-5 text-base font-bold shadow-2xl transition-all active:scale-95 sm:rounded-[30px] sm:py-6 sm:text-lg ${
                  canCheckInForClass &&
                  checkInStatus !== "loading" &&
                  allowedDateKeys.length > 0
                    ? "cursor-pointer bg-amber-500 text-black shadow-amber-500/20 hover:bg-amber-400"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                }`}
              >
                {checkInStatus === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                    Processando...
                  </span>
                ) : allowedDateKeys.length === 0 ? (
                  "Indisponível no fim de semana"
                ) : !plan ? (
                  "Aguardando plano"
                ) : !selectedClassId ? (
                  "Selecione uma turma"
                ) : !selectedDateAllowed ? (
                  "Data indisponível"
                ) : alreadyCheckedInThisClassOnDate ? (
                  "Check-in já realizado"
                ) : !plan.active ? (
                  "Plano inativo"
                ) : paymentOverdue ? (
                  "Mensalidade pendente"
                ) : !selectedClassWindowOpen ? (
                  isSelectedDateToday
                    ? "Check-in encerrado"
                    : "Horário de check-in passou"
                ) : selectedClassRemaining != null && selectedClassRemaining <= 0 ? (
                  "Turma lotada"
                ) : canCheckInForClass ? (
                  "Realizar check-in"
                ) : (
                  "Limite atingido"
                )}
              </button>

              {!isSelectedDateToday && canCheckInForClass && (
                <p className="rounded-lg bg-zinc-800/20 px-3 py-2 text-xs text-zinc-500">
                  Check-in antecipado: sem validação de horário para datas futuras
                  nesta semana.
                </p>
              )}

              <div className="flex justify-center">
                <StatusBadge
                  status={checkInStatus}
                  successMessage="Check-in realizado!"
                  errorMessage="Falha no check-in, tente novamente."
                />
              </div>

              {!canCheckIn && checkInStatus === "idle" && (
                <p className="rounded-full border border-red-500/10 bg-red-500/5 py-2 text-xs font-medium text-red-400/80">
                  {paymentOverdue
                    ? "Mensalidade pendente. Procure seu professor para regularizar."
                    : !plan
                      ? "Seu perfil não possui um plano associado."
                      : !selectedClassId
                        ? "Selecione uma turma para fazer check-in."
                        : !plan.active
                          ? "Este plano está desativado pela administração."
                          : currentWeekInfo.remaining <= 0
                            ? "Você atingiu o limite de check-ins para esta semana."
                            : "Não é possível fazer check-in no momento."}
                </p>
              )}

              {canCheckIn && checkInStatus === "idle" && !canCheckInForClass && (
                <p className="rounded-full border border-red-500/10 bg-red-500/5 py-2 text-xs font-medium text-red-400/80">
                  {alreadyCheckedInThisClassOnDate
                    ? `Você já fez check-in nessa turma para ${formattedSelectedDate}.`
                    : !selectedDateAllowed
                      ? "Check-in permitido apenas de segunda a sexta."
                      : !selectedClassWindowOpen
                        ? "Passou do horário máximo de check-in."
                        : selectedClassRemaining != null && selectedClassRemaining <= 0
                          ? "Turma lotada (sem vagas)."
                          : "Não é possível fazer check-in agora."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

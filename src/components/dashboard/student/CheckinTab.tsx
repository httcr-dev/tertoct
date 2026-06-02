"use client";

import type { GymClass, Plan } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ActionStatus } from "./checkinTypes";
import {
  dateKeyToLocalDate,
  getTodayDateKey,
  isAllowedCheckinDateKey,
  localDateToDateKey,
} from "@/lib/utils/checkinDate";
import { startOfWeek } from "@/lib/utils/date";

const WEEKDAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex"] as const;

function getWorkWeekDateKeys(anchorDateKey: string): string[] {
  const monday = startOfWeek(dateKeyToLocalDate(anchorDateKey));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDateToDateKey(d);
  });
}

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
  const weekAnchorKey = allowedDateKeys[0] ?? todayKey;
  const workWeekDateKeys = getWorkWeekDateKeys(weekAnchorKey);
  const allowedDateKeySet = new Set(allowedDateKeys);
  const weekMonthLabel = dateKeyToLocalDate(weekAnchorKey).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

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

        <div className="dashboard-card dashboard-card-accent relative min-w-0 overflow-hidden p-5 sm:rounded-[40px] sm:p-8 group">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          {!currentWeekInfo && !plan ? (
            <div
              className="relative z-10 px-4 py-8 text-center sm:px-8 sm:py-12"
              data-testid="student-checkin-no-plan"
            >
              <p className="text-sm text-zinc-400">
                Seu perfil não possui um plano associado. Fale com seu professor
                para ativar seu plano e liberar o check-in.
              </p>
            </div>
          ) : null}

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
                    className="min-w-0 rounded-xl border border-zinc-800 bg-black/30 p-3 sm:p-4"
                    data-testid="student-checkin-date-options"
                  >
                    <p className="mb-3 text-center text-xs font-medium capitalize text-zinc-400">
                      {weekMonthLabel}
                    </p>
                    <div
                      className="grid grid-cols-5 gap-1"
                      role="row"
                      aria-hidden
                    >
                      {WEEKDAY_HEADERS.map((label) => (
                        <div
                          key={label}
                          className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500"
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-5 gap-1" role="group" aria-label="Data do check-in">
                      {workWeekDateKeys.map((dateKey) => {
                        const isSelected = dateKey === selectedDateKey;
                        const isAllowed = allowedDateKeySet.has(dateKey);
                        const isToday = dateKey === todayKey;
                        const dayNumber = dateKeyToLocalDate(dateKey).getDate();
                        return (
                          <button
                            key={dateKey}
                            type="button"
                            data-testid={`student-checkin-date-${dateKey}`}
                            aria-pressed={isSelected}
                            aria-label={dateKeyToLocalDate(dateKey).toLocaleDateString(
                              "pt-BR",
                              { weekday: "long", day: "numeric", month: "long" },
                            )}
                            disabled={!isAllowed}
                            onClick={() => onSelectedDateKeyChange(dateKey)}
                            className={`flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border py-2 text-sm transition-colors ${
                              isSelected
                                ? "border-amber-500/50 bg-amber-500/15 text-amber-200 shadow-sm shadow-amber-500/10"
                                : isAllowed
                                  ? "border-zinc-700/80 bg-zinc-900/50 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/60"
                                  : "cursor-not-allowed border-transparent bg-transparent text-zinc-600 opacity-40"
                            }`}
                          >
                            <span
                              className={`text-base font-semibold leading-none sm:text-lg ${
                                isToday && isAllowed ? "text-amber-300" : ""
                              }`}
                            >
                              {dayNumber}
                            </span>
                            {isToday && isAllowed && (
                              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400/90">
                                Hoje
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
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
                  className="dashboard-input w-full min-w-0 cursor-pointer px-3 py-3 text-base outline-none focus:border-amber-500/40 disabled:opacity-50 sm:px-4 sm:text-sm"
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
                <div className="dashboard-stat min-w-[7rem] flex-1 px-4 py-2 sm:flex-none">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Disponíveis
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {currentWeekInfo.remaining}
                  </p>
                </div>
                <div className="dashboard-stat min-w-[7rem] flex-1 px-4 py-2 sm:flex-none">
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

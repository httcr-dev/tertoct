"use client";

import Image from "next/image";
import { StudentSummary, CheckIn, GymClass } from "@/lib/types";
import { toDate } from "@/lib/utils/date";
import { useEffect, useMemo, useState } from "react";
import {
  buildCheckinHistoryPeriod,
  getCheckinHistoryPeriodLabel,
  getCurrentMonthKey,
  getMonthDateKeys,
  isMonthPeriod,
  parseDateKey,
  resolveCheckinHistoryQuery,
  type CheckinHistoryPeriodMode,
} from "@/lib/utils/checkinPeriod";
import {
  buildCheckinChartItems,
  countCheckinsByDateKeys,
} from "@/lib/utils/checkinChart";
import { formatDateKey } from "@/lib/utils/weekFilters";
import { fetchCheckinsForHistoryPeriod } from "@/services/dashboardService";
import { PageLoader } from "@/components/ui/PageLoader";

interface CheckinsTabProps {
  selectedStudentIdForCheckins: string;
  setSelectedStudentIdForCheckins: (id: string) => void;
  studentsWithCounts: StudentSummary[];
  classes: GymClass[];
}

const PERIOD_OPTIONS: { value: CheckinHistoryPeriodMode; label: string }[] = [
  { value: "current-week", label: "Semana atual" },
  { value: "current-month", label: "Mês atual" },
  { value: "pick-week", label: "Escolher semana" },
  { value: "pick-month", label: "Escolher mês" },
];

export function CheckinsTab({
  selectedStudentIdForCheckins,
  setSelectedStudentIdForCheckins,
  studentsWithCounts,
  classes,
}: CheckinsTabProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [periodMode, setPeriodMode] =
    useState<CheckinHistoryPeriodMode>("current-week");
  const [pickedWeekDate, setPickedWeekDate] = useState(() =>
    formatDateKey(new Date()),
  );
  const [pickedMonth, setPickedMonth] = useState(() => getCurrentMonthKey());
  const [historyCheckins, setHistoryCheckins] = useState<CheckIn[]>([]);
  const [loadedPeriodKey, setLoadedPeriodKey] = useState<string | null>(null);

  const period = useMemo(
    () =>
      buildCheckinHistoryPeriod(periodMode, {
        weekAnchor: pickedWeekDate,
        month: pickedMonth,
      }),
    [periodMode, pickedWeekDate, pickedMonth],
  );

  const periodLabel = useMemo(
    () => getCheckinHistoryPeriodLabel(period),
    [period],
  );

  const periodKey = useMemo(() => JSON.stringify(period), [period]);
  const historyLoading = loadedPeriodKey !== periodKey;

  useEffect(() => {
    let cancelled = false;
    const query = resolveCheckinHistoryQuery(period);

    void fetchCheckinsForHistoryPeriod(query)
      .then((items) => {
        if (!cancelled) {
          setHistoryCheckins(items);
          setLoadedPeriodKey(periodKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryCheckins([]);
          setLoadedPeriodKey(periodKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period, periodKey]);

  const filteredCheckins = useMemo(() => {
    return historyCheckins.filter((c) => {
      if (
        selectedStudentIdForCheckins !== "all" &&
        c.userId !== selectedStudentIdForCheckins
      ) {
        return false;
      }
      if (
        selectedClassId !== "all" &&
        (c.classId ?? null) !== selectedClassId
      ) {
        return false;
      }
      return true;
    });
  }, [historyCheckins, selectedStudentIdForCheckins, selectedClassId]);

  const chartDateKeys = useMemo(() => {
    if (isMonthPeriod(periodMode)) {
      const monthKey =
        period.mode === "pick-month"
          ? (period.month ?? getCurrentMonthKey())
          : getCurrentMonthKey();
      return getMonthDateKeys(monthKey);
    }
    const query = resolveCheckinHistoryQuery(period);
    return query.classDateKeys ?? [];
  }, [period, periodMode]);

  const chartItems = useMemo(() => {
    const counts = countCheckinsByDateKeys(filteredCheckins, chartDateKeys);
    return buildCheckinChartItems(chartDateKeys, counts, {
      weekView: !isMonthPeriod(periodMode),
    });
  }, [chartDateKeys, filteredCheckins, periodMode]);

  const chartMax = Math.max(1, ...chartItems.map((item) => item.count));

  const activityChartTitle = useMemo(() => {
    if (selectedStudentIdForCheckins === "all" && selectedClassId === "all") {
      return `Atividade Geral (${periodLabel.toLowerCase()})`;
    }
    const parts: string[] = [];
    if (selectedStudentIdForCheckins !== "all") {
      parts.push(
        studentsWithCounts.find((s) => s.id === selectedStudentIdForCheckins)?.name ??
          "Aluno",
      );
    }
    if (selectedClassId !== "all") {
      parts.push(classes.find((cl) => cl.id === selectedClassId)?.name ?? "Turma");
    }
    return `Atividade — ${parts.join(" · ")} (${periodLabel.toLowerCase()})`;
  }, [
    selectedStudentIdForCheckins,
    selectedClassId,
    studentsWithCounts,
    classes,
    periodLabel,
  ]);

  if (historyLoading) {
    return (
      <PageLoader message="Carregando check-ins..." fullScreen={false} />
    );
  }

  return (
    <section className="w-full min-w-0 space-y-5 overflow-x-hidden">
      <div className="dashboard-card animate-panel-in p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
              Histórico de Check-Ins
            </h2>
            <p className="mt-1 max-w-lg text-sm leading-5 text-zinc-400">
              Filtre por {periodLabel.toLowerCase()}, turma ou aluno.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select
              className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-zinc-800 bg-black/35 px-3 text-sm text-zinc-200 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10"
              value={periodMode}
              onChange={(e) =>
                setPeriodMode(e.target.value as CheckinHistoryPeriodMode)
              }
              aria-label="Período do histórico"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {periodMode === "pick-week" && (
              <input
                type="date"
                className="h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-black/35 px-3 text-sm text-zinc-200 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10
                  [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert"
                value={pickedWeekDate}
                onChange={(e) => setPickedWeekDate(e.target.value)}
                aria-label="Escolher semana"
              />
            )}

            {periodMode === "pick-month" && (
              <input
                type="month"
                className="h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-black/35 px-3 text-sm text-zinc-200 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10
                  [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert"
                value={pickedMonth}
                onChange={(e) => setPickedMonth(e.target.value)}
                aria-label="Escolher mês"
              />
            )}

            <select
              className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-zinc-800 bg-black/35 px-3 text-sm text-zinc-200 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              aria-label="Filtrar por turma"
            >
              <option value="all">Todas as Turmas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} • {c.startTime}
                </option>
              ))}
            </select>

            <select
              className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-zinc-800 bg-black/35 px-3 text-sm text-zinc-200 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10"
              value={selectedStudentIdForCheckins}
              onChange={(e) => setSelectedStudentIdForCheckins(e.target.value)}
              aria-label="Filtrar por aluno"
            >
              <option value="all">Todos os Alunos</option>
              {studentsWithCounts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-card animate-panel-in overflow-hidden p-4 sm:p-6 [animation-delay:80ms]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            <span className="min-w-0 truncate">{activityChartTitle}</span>
          </h3>
          <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
            {filteredCheckins.length}
          </span>
        </div>

        <div className="mt-5 -mx-1 overflow-x-auto overscroll-x-contain px-1 touch-pan-x">
          <div
            className={`flex min-h-[9.5rem] items-end gap-2 rounded-xl border border-zinc-800/50 bg-black/20 px-3 pb-2 pt-4 ${
              isMonthPeriod(periodMode) ? "min-w-max snap-x snap-mandatory" : ""
            }`}
          >
            {chartItems.map((item) => {
              const height = Math.max(
                item.count > 0 ? 12 : 4,
                (item.count / chartMax) * 100,
              );
              return (
                <div
                  key={item.key}
                  className={`flex flex-col items-center gap-1 ${
                    isMonthPeriod(periodMode)
                      ? "w-8 shrink-0 snap-start sm:w-7"
                      : "min-w-0 flex-1"
                  }`}
                >
                  <div className="flex h-20 w-full items-end justify-center">
                    <div
                      className="w-full max-w-7 rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.18)] transition-all duration-500"
                      style={{ height: `${height}%`, opacity: item.count > 0 ? 1 : 0.25 }}
                    />
                  </div>
                  <div className="flex w-full flex-col items-center gap-0 text-center">
                    <span className="truncate text-[10px] font-medium text-zinc-400">
                      {item.label}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-amber-300">
                      {item.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3">
        {filteredCheckins.length > 0 ? (
          filteredCheckins.map((c) => {
            const student = studentsWithCounts.find((s) => s.id === c.userId);
            const gymClass = classes.find((cl) => cl.id === c.classId);
            const date = toDate(c.createdAt) ?? c.createdAt;

            return (
              <div
                key={c.id}
                className="dashboard-card group animate-panel-in flex min-w-0 flex-col gap-4 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-amber-500/20 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/10 font-semibold text-amber-400 shadow-sm shadow-amber-500/20 transition-transform group-hover:scale-105">
                    {student?.photoURL ? (
                      <Image
                        src={student.photoURL}
                        alt={student.name || ""}
                        width={40}
                        height={40}
                        className="block h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        unoptimized
                      />
                    ) : student?.name ? (
                      student.name.charAt(0).toUpperCase()
                    ) : (
                      "U"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-amber-300">
                      {student?.name ?? "Aluno sem nome"}
                    </p>
                    <div className="flex flex-col gap-1">
                      <p className="truncate text-xs text-zinc-400">
                        {c.className
                          ? `${c.className}${c.classStartTime ? ` • ${c.classStartTime}` : ""}`
                          : gymClass
                            ? `${gymClass.name} • ${gymClass.startTime}`
                            : "Sem turma"}
                      </p>
                      {c.classDateKey && (
                        <p className="text-xs text-zinc-500">
                          {parseDateKey(c.classDateKey).toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3 text-left sm:block sm:border-t-0 sm:pt-0 sm:text-right">
                  <p className="mb-0.5 text-sm font-semibold text-emerald-400">
                    Realizado
                  </p>
                  <p className="text-xs text-zinc-500">
                    {date
                      ? date.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="dashboard-card px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-500">
              Nenhum check-in encontrado para {periodLabel.toLowerCase()}.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

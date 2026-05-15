"use client";

import Image from "next/image";
import { StudentSummary, CheckIn, GymClass } from "@/lib/types";
import { toDate } from "@/lib/utils/date";
import { useMemo, useState, useEffect } from "react";
import { 
  getWeekDateKeys, 
  formatDateKey, 
  isDateKeyInCurrentWeek,
  getWeekStart,
  getWeekEnd 
} from "@/lib/utils/weekFilters";
import { fetchCurrentWeekCheckins } from "@/services/dashboardService";

interface CheckinsTabProps {
  recentCheckins: CheckIn[];
  selectedStudentIdForCheckins: string;
  setSelectedStudentIdForCheckins: (id: string) => void;
  studentsWithCounts: StudentSummary[];
  classes: GymClass[];
}

type ViewMode = "day" | "week";

export function CheckinsTab({
  recentCheckins,
  selectedStudentIdForCheckins,
  setSelectedStudentIdForCheckins,
  studentsWithCounts,
  classes,
}: CheckinsTabProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const d = new Date();
    return formatDateKey(d);
  });
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [weekCheckins, setWeekCheckins] = useState<CheckIn[]>([]);
  const [isLoadingWeekData, setIsLoadingWeekData] = useState(false);

  // Semana atual (Seg–Sex): usada no gráfico em ambos os modos e na lista "Semana atual"
  useEffect(() => {
    let cancelled = false;
    setIsLoadingWeekData(true);
    const loadWeekData = async () => {
      try {
        const allWeekCheckins = await fetchCurrentWeekCheckins();
        const currentWeekKeys = getWeekDateKeys();
        const filteredWeekCheckins = allWeekCheckins.filter(
          (checkin) =>
            checkin.classDateKey && currentWeekKeys.includes(checkin.classDateKey),
        );
        if (!cancelled) setWeekCheckins(filteredWeekCheckins);
      } catch (error) {
        console.error("Failed to load week data:", error);
        if (!cancelled) setWeekCheckins([]);
      } finally {
        if (!cancelled) setIsLoadingWeekData(false);
      }
    };
    void loadWeekData();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayCheckins = viewMode === "week" ? weekCheckins : recentCheckins;

  /** Gráfico de atividade: sempre semana atual (Seg–Sex), filtros aluno/turma. */
  const checkinsForChart = useMemo(
    () =>
      weekCheckins.filter((c) => {
        if (
          selectedStudentIdForCheckins !== "all" &&
          c.userId !== selectedStudentIdForCheckins
        ) {
          return false;
        }
        if (selectedClassId !== "all" && (c.classId ?? null) !== selectedClassId) {
          return false;
        }
        return true;
      }),
    [weekCheckins, selectedStudentIdForCheckins, selectedClassId],
  );

  const filteredCheckins = useMemo(() => {
    return displayCheckins.filter((c) => {
      // Filter by student
      if (
        selectedStudentIdForCheckins !== "all" &&
        c.userId !== selectedStudentIdForCheckins
      ) {
        return false;
      }
      
      // Filter by class
      if (
        selectedClassId !== "all" &&
        (c.classId ?? null) !== selectedClassId
      ) {
        return false;
      }
      
      // Filter by date/period
      if (viewMode === "week") {
        // For week mode, show Monday to Friday of current week
        return c.classDateKey ? isDateKeyInCurrentWeek(c.classDateKey) : false;
      } else {
        // For day mode, show specific date
        return (c.classDateKey ?? null) === selectedDateKey;
      }
    });
  }, [
    displayCheckins,
    selectedStudentIdForCheckins,
    selectedClassId,
    selectedDateKey,
    viewMode,
  ]);

  const mobileChartItems = useMemo(() => {
    const currentWeekDays = getWeekDateKeys();
    const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex"];
    return currentWeekDays.map((key, index) => {
      const count = checkinsForChart.filter((c) => c.classDateKey === key).length;
      return {
        key,
        count,
        label: dayNames[index],
      };
    });
  }, [checkinsForChart]);

  const mobileChartMax = Math.max(
    1,
    ...mobileChartItems.map((item) => item.count),
  );

  const activityChartTitle = useMemo(() => {
    const period = "(semana atual)";
    if (selectedStudentIdForCheckins === "all" && selectedClassId === "all") {
      return `Atividade Geral ${period}`;
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
    return `Atividade — ${parts.join(" · ")} ${period}`;
  }, [selectedStudentIdForCheckins, selectedClassId, studentsWithCounts, classes]);

  return (
    <section className="w-full min-w-0 space-y-5 overflow-x-hidden">
      <div className="animate-panel-in rounded-2xl border border-zinc-800/60 bg-zinc-950/45 p-4 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
                Histórico de Check-Ins
              </h2>
              <p className="mt-1 max-w-lg text-sm leading-5 text-zinc-400">
                Acompanhe os check-ins {viewMode === "week" ? "da semana atual (segunda a sexta)" : "por data específica"}.
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-zinc-800 bg-black/35 p-1">
              <button
                onClick={() => setViewMode("day")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  viewMode === "day"
                    ? "bg-amber-500/20 text-amber-300 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Dia Específico
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  viewMode === "week"
                    ? "bg-amber-500/20 text-amber-300 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Semana Atual
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {/* Date picker - only show in day mode */}
            {viewMode === "day" && (
              <div className="relative">
                <input
                  type="date"
                  className="h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-black/35 px-3 text-sm text-zinc-200 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10
                    [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert
                    [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={selectedDateKey}
                  onChange={(e) => setSelectedDateKey(e.target.value)}
                />
              </div>
            )}
            
            {/* Week info - only show in week mode */}
            {viewMode === "week" && (
              <div className="flex items-center rounded-xl border border-zinc-800 bg-black/35 px-3 py-2.5">
                <span className="text-sm text-zinc-300">
                  {getWeekStart().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} - {" "}
                  {getWeekEnd().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </div>
            )}
            
            {/* Class filter */}
            <select
              className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-zinc-800 bg-black/35 px-3 text-sm text-zinc-200 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="all">Todas as Turmas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} • {c.startTime}
                </option>
              ))}
            </select>
            
            {/* Student filter */}
            <select
              className="h-11 w-full min-w-0 cursor-pointer rounded-xl border border-zinc-800 bg-black/35 px-3 text-sm text-zinc-200 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10"
              value={selectedStudentIdForCheckins}
              onChange={(e) => setSelectedStudentIdForCheckins(e.target.value)}
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

      {/* Activity chart */}
      <div className="animate-panel-in overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-950/45 p-4 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-6 [animation-delay:80ms]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            <span className="min-w-0 truncate">{activityChartTitle}</span>
          </h3>
          <div className="flex items-center gap-2">
            {isLoadingWeekData && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
            )}
            <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
              {checkinsForChart.length}
            </span>
          </div>
        </div>

        <div className="mt-5 md:hidden">
          <div className="flex min-h-[9.5rem] items-end gap-2 rounded-xl border border-zinc-800/50 bg-black/20 px-3 pb-2 pt-4">
            {mobileChartItems.map((item) => {
              const height = Math.max(
                item.count > 0 ? 12 : 4,
                (item.count / mobileChartMax) * 100,
              );
              return (
                <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
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

        <div className="mt-4 hidden overflow-x-auto md:block">
          <div className="min-w-[560px] sm:min-w-0">
            <div className="flex h-36 items-end gap-4 rounded-xl border border-zinc-800/50 bg-black/20 px-4 pb-4 pt-6">
              {getWeekDateKeys().map((dateKey, index) => {
                const count = checkinsForChart.filter((c) => c.classDateKey === dateKey).length;
                const maxCount = Math.max(
                  1,
                  ...getWeekDateKeys().map((key) =>
                    checkinsForChart.filter((c) => c.classDateKey === key).length,
                  ),
                );
                const height = Math.max(count > 0 ? 12 : 4, (count / maxCount) * 100);
                const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex"];

                return (
                  <div key={dateKey} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end justify-center">
                      <div
                        className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.18)] transition-all duration-500"
                        style={{ height: `${height}%`, opacity: count > 0 ? 1 : 0.25 }}
                      />
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] font-medium text-zinc-300">
                        {dayNames[index]}
                      </span>
                      <span className="block text-xs font-semibold text-amber-300">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3">
        {isLoadingWeekData && viewMode === "week" ? (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/30 px-6 py-12 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
              <p className="text-sm font-medium text-zinc-400">
                Carregando check-ins da semana...
              </p>
            </div>
          </div>
        ) : filteredCheckins.length > 0 ? (
          filteredCheckins.map((c) => {
            const student = studentsWithCounts.find((s) => s.id === c.userId);
            const gymClass = classes.find((cl) => cl.id === c.classId);
            const date = toDate(c.createdAt) ?? c.createdAt;

            return (
              <div
                key={c.id}
                className="group animate-panel-in flex min-w-0 flex-col gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/45 px-4 py-4 shadow-lg shadow-black/15 transition-all hover:-translate-y-0.5 hover:border-amber-500/20 hover:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
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
                          {new Date(c.classDateKey).toLocaleDateString("pt-BR", {
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
          <div className="rounded-2xl border border-dashed border-zinc-800/60 bg-zinc-950/30 px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-500">
              {viewMode === "week" 
                ? "Nenhum check-in encontrado para a semana atual."
                : "Nenhum check-in encontrado para este dia."
              }
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

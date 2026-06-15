"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  Flame,
  List,
  Sparkles,
  Users,
} from "lucide-react";
import { WeekChartFilter } from "@/components/ui/WeekChartFilter";
import { StudentSummary, Plan, CheckIn, GymClass } from "@/lib/types";
import { toDate } from "@/lib/utils/date";
import type { BusinessWeek } from "@/lib/utils/weekFilters";
import { getWeekDateKeysForWeek, getWeekLabel } from "@/lib/utils/weekFilters";

function getLocalDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return {
    day: date.toLocaleDateString("pt-BR", { day: "2-digit" }),
    label: date.toLocaleDateString("pt-BR", {
      weekday: "short",
      month: "short",
    }),
  };
}

function getClassLabel(checkin: CheckIn, classesById: Map<string, GymClass>) {
  const gymClass = checkin.classId ? classesById.get(checkin.classId) : null;
  const name = checkin.className ?? gymClass?.name ?? "Sem turma";
  const time = checkin.classStartTime ?? gymClass?.startTime ?? null;
  return time ? `${name} • ${time}` : name;
}

function buildClassDayRows(
  checkins: CheckIn[],
  classes: GymClass[],
  week: BusinessWeek,
) {
  const dateKeys = getWeekDateKeysForWeek(week);
  const dateKeySet = new Set(dateKeys);
  const classesById = new Map(classes.map((c) => [c.id, c]));
  const rows = new Map<
    string,
    { label: string; counts: Map<string, number>; total: number }
  >();

  for (const gymClass of classes) {
    rows.set(gymClass.id, {
      label: `${gymClass.name} • ${gymClass.startTime}`,
      counts: new Map(),
      total: 0,
    });
  }

  for (const checkin of checkins) {
    const createdAt = toDate(checkin.createdAt) ?? checkin.createdAt;
    const dateKey =
      checkin.classDateKey ??
      (createdAt instanceof Date ? getLocalDateKey(createdAt) : null);

    if (!dateKey || !dateKeySet.has(dateKey)) continue;

    const rowKey = checkin.classId ?? checkin.className ?? "unassigned";
    const existing = rows.get(rowKey);
    const row =
      existing ??
      {
        label: getClassLabel(checkin, classesById),
        counts: new Map<string, number>(),
        total: 0,
      };

    row.counts.set(dateKey, (row.counts.get(dateKey) ?? 0) + 1);
    row.total += 1;
    rows.set(rowKey, row);
  }

  return {
    dateKeys,
    rows: Array.from(rows.values())
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total),
  };
}

interface OverviewTabProps {
  students: StudentSummary[];
  plans: Plan[];
  recentCheckins: CheckIn[];
  classes: GymClass[];
}

export function OverviewTab({
  students,
  plans,
  recentCheckins,
  classes,
}: OverviewTabProps) {
  const [chartWeek, setChartWeek] = useState<BusinessWeek>("current");
  const now = new Date();
  const { dateKeys, rows: classDayRows } = useMemo(
    () => buildClassDayRows(recentCheckins, classes, chartWeek),
    [recentCheckins, classes, chartWeek],
  );
  const maxCellCount = Math.max(
    1,
    ...classDayRows.flatMap((row) =>
      dateKeys.map((dateKey) => row.counts.get(dateKey) ?? 0),
    ),
  );
  const todayKey = getLocalDateKey(now);
  const todayCount = recentCheckins.filter((checkin) => {
    const createdAt = toDate(checkin.createdAt) ?? checkin.createdAt;
    const dateKey =
      checkin.classDateKey ??
      (createdAt instanceof Date ? getLocalDateKey(createdAt) : null);
    return dateKey === todayKey;
  }).length;
  const busiestClass = classDayRows[0];

  const activePlansCount = plans.filter((p) => p.active).length;
  const recentCheckinsCount = recentCheckins.filter((c) => {
    const d = toDate(c.createdAt) ?? c.createdAt;
    if (!(d instanceof Date)) return false;
    const days = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;

  return (
    <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div className="dashboard-card animate-panel-in flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/25">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
            <Users className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Total de Alunos</p>
        </div>
        <p className="text-3xl font-semibold text-zinc-100">{students.length}</p>
      </div>

      <div className="dashboard-card animate-panel-in flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/25 [animation-delay:60ms]">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
            <List className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Planos Ativos</p>
        </div>
        <p className="text-3xl font-semibold text-zinc-100">{activePlansCount}</p>
      </div>

      <div className="dashboard-card animate-panel-in flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/25 sm:col-span-2 lg:col-span-1 [animation-delay:120ms]">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
            <CheckCircle className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Check-ins (7 dias)</p>
        </div>
        <p className="text-3xl font-semibold text-zinc-100">{recentCheckinsCount}</p>
      </div>

      <div className="dashboard-card dashboard-card-accent animate-panel-in overflow-hidden bg-gradient-to-br from-zinc-900/70 via-zinc-900/40 to-zinc-950/30 p-6 lg:col-span-3 [animation-delay:180ms]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-1">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Check-ins por turma e dia
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {getWeekLabel(chartWeek)} (segunda a sexta), por horário de aula.
              </p>
            </div>
            <WeekChartFilter value={chartWeek} onChange={setChartWeek} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="rounded-xl border border-zinc-800/60 bg-black/25 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-zinc-500">
                <CalendarDays className="h-3 w-3" />
                Hoje
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {todayCount}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800/60 bg-black/25 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-zinc-500">
                <Flame className="h-3 w-3" />
                Maior movimento
              </p>
              <p className="mt-1 max-w-[180px] truncate text-lg font-semibold text-zinc-100">
                {busiestClass ? busiestClass.label : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 md:hidden">
          {classDayRows.length > 0 ? (
            <div className="space-y-3">
              {classDayRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-zinc-800/60 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-zinc-100">
                      {row.label}
                    </p>
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300">
                      {row.total}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {dateKeys.map((dateKey) => {
                      const count = row.counts.get(dateKey) ?? 0;
                      const formatted = formatDateKey(dateKey);
                      const intensity = count / maxCellCount;
                      return (
                        <div key={dateKey} className="min-w-0 text-center">
                          <div
                            className="relative flex h-12 items-center justify-center overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950/70"
                            title={`${row.label}: ${count} check-in${count === 1 ? "" : "s"}`}
                          >
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-amber-500 to-emerald-400"
                              style={{
                                height: `${Math.max(count > 0 ? 18 : 0, intensity * 100)}%`,
                                opacity: count > 0 ? 0.35 + intensity * 0.55 : 0,
                              }}
                            />
                            <span className="relative z-10 text-sm font-bold text-zinc-100">
                              {count}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[9px] font-medium text-zinc-600">
                            {dateKey === todayKey ? "Hoje" : formatted.day}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800/70 py-12 text-center">
              <p className="text-sm text-zinc-500">
                Nenhum check-in na {getWeekLabel(chartWeek).toLowerCase()} (segunda a sexta).
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto md:block">
          {classDayRows.length > 0 ? (
            <div className="min-w-[560px] space-y-3">
              <div className="grid grid-cols-[180px_repeat(5,minmax(58px,1fr))_64px] items-end gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  Turma
                </span>
                {dateKeys.map((dateKey) => {
                  const formatted = formatDateKey(dateKey);
                  return (
                    <div key={dateKey} className="text-center">
                      <p className="text-xs font-semibold text-zinc-300">
                        {dateKey === todayKey ? "Hoje" : formatted.day}
                      </p>
                      <p className="text-[10px] capitalize text-zinc-600">
                        {formatted.label}
                      </p>
                    </div>
                  );
                })}
                <span className="text-right text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  Total
                </span>
              </div>

              {classDayRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[180px_repeat(5,minmax(58px,1fr))_64px] items-center gap-2 rounded-xl border border-zinc-800/60 bg-black/20 p-2 transition-all hover:border-amber-500/25 hover:bg-zinc-900/50"
                >
                  <p className="truncate px-2 text-xs font-semibold text-zinc-200">
                    {row.label}
                  </p>
                  {dateKeys.map((dateKey) => {
                    const count = row.counts.get(dateKey) ?? 0;
                    const intensity = count / maxCellCount;
                    return (
                      <div
                        key={dateKey}
                        className="relative flex h-12 items-end justify-center overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-950/60"
                        title={`${row.label}: ${count} check-in${count === 1 ? "" : "s"}`}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-amber-500 to-emerald-400 transition-all duration-500"
                          style={{
                            height: `${Math.max(count > 0 ? 18 : 0, intensity * 100)}%`,
                            opacity: count > 0 ? 0.35 + intensity * 0.55 : 0,
                          }}
                        />
                        <span className="relative z-10 text-sm font-bold text-zinc-100">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-right text-sm font-bold text-amber-300">
                    {row.total}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800/70 py-12 text-center">
              <p className="text-sm text-zinc-500">
                Nenhum check-in na {getWeekLabel(chartWeek).toLowerCase()} (segunda a sexta).
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

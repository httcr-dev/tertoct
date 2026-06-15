"use client";

import type { BusinessWeek } from "@/lib/utils/weekFilters";
import { getWeekLabel } from "@/lib/utils/weekFilters";

const OPTIONS: BusinessWeek[] = ["current", "previous"];

export function WeekChartFilter({
  value,
  onChange,
}: {
  value: BusinessWeek;
  onChange: (week: BusinessWeek) => void;
}) {
  return (
    <div
      className="flex w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-0.5 sm:inline-flex sm:w-auto"
      role="group"
      aria-label="Período do gráfico"
    >
      {OPTIONS.map((week) => {
        const active = value === week;
        return (
          <button
            key={week}
            type="button"
            onClick={() => onChange(week)}
            aria-pressed={active}
            className={`min-h-11 flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:min-h-0 sm:flex-none sm:py-1.5 ${
              active
                ? "bg-amber-500/15 text-amber-300 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {getWeekLabel(week)}
          </button>
        );
      })}
    </div>
  );
}

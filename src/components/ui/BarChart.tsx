"use client";

import { useState } from "react";
import { startOfWeek } from "@/lib/utils/date";

type ChartTimestampLike = {
  toDate?: () => Date;
  seconds?: number;
};

const CLASS_DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

type ChartDataItem = {
  createdAt?: Date | number | ChartTimestampLike | null;
  classDateKey?: string | null;
};

function parseItemDate(createdAt: ChartDataItem["createdAt"]): Date | null {
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === "number") return new Date(createdAt);
  if (createdAt && typeof createdAt.toDate === "function") {
    return createdAt.toDate();
  }
  if (createdAt && typeof createdAt.seconds === "number") {
    return new Date(createdAt.seconds * 1000);
  }
  return null;
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getBucketDateKey(item: ChartDataItem): string | null {
  const raw = item.classDateKey;
  if (typeof raw === "string") {
    const k = raw.trim();
    if (CLASS_DATE_KEY_RE.test(k)) return k;
  }
  const d = parseItemDate(item.createdAt);
  return d ? toLocalDateKey(d) : null;
}

export function BarChart({
  dataItems,
  ds = 14,
  range = "trailing",
}: {
  dataItems: ChartDataItem[];
  ds?: number;
  range?: "trailing" | "week";
}) {
  const now = new Date();

  let slotCount: number;
  let counts: number[];
  let days: string[];
  let todayLabelIndex: number;

  if (range === "week") {
    // Semana útil: segunda a sexta (weekStart já é segunda via startOfWeek).
    slotCount = 5;
    const weekStart = startOfWeek(now);
    counts = Array.from({ length: slotCount }, () => 0);
    const slotKeys: string[] = [];
    days = [];
    for (let i = 0; i < slotCount; i++) {
      const slot = new Date(weekStart);
      slot.setDate(weekStart.getDate() + i);
      slotKeys.push(toLocalDateKey(slot));
      days.push(
        slot.toLocaleDateString("pt-BR", { weekday: "short" }),
      );
    }
    const todayKey = toLocalDateKey(now);
    todayLabelIndex = slotKeys.indexOf(todayKey);

    for (const item of dataItems) {
      const key = getBucketDateKey(item);
      if (!key) continue;
      const idx = slotKeys.indexOf(key);
      if (idx >= 0) counts[idx]++;
    }
  } else {
    slotCount = ds;
    counts = Array.from({ length: slotCount }, () => 0);
    days = [];
    const slotKeys: string[] = [];
    for (let i = 0; i < slotCount; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (slotCount - 1 - i));
      slotKeys.push(toLocalDateKey(d));
      days.push(
        d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }),
      );
    }
    todayLabelIndex = slotCount - 1;

    for (const item of dataItems) {
      const key = getBucketDateKey(item);
      if (!key) continue;
      const idx = slotKeys.indexOf(key);
      if (idx >= 0) counts[idx]++;
    }
  }

  const max = Math.max(...counts, 3);
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barSpacing = 8;
  const rawBarWidth = chartWidth / slotCount;
  const barWidth = rawBarWidth - barSpacing;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const showXLabel = (i: number) =>
    range === "week" ||
    i % (slotCount > 7 ? 2 : 1) === 0 ||
    i === slotCount - 1;

  return (
    <div className="group/chart relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="mt-4 overflow-visible"
      >
        {/* Y-axis Grid Lines */}
        {[0, 0.5, 1].map((p, i) => (
          <g key={i} className="text-zinc-600 opacity-20">
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - p)}
              x2={width - padding.right}
              y2={padding.top + chartHeight * (1 - p)}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={padding.top + chartHeight * (1 - p) + 4}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
              className="font-medium"
            >
              {Math.round(max * p)}
            </text>
          </g>
        ))}

        {/* X-axis Labels */}
        {days.map(
          (day, i) =>
            showXLabel(i) && (
              <text
                key={i}
                x={padding.left + i * rawBarWidth + barWidth / 2}
                y={height - 15}
                textAnchor="middle"
                fontSize="10"
                fill="#71717a"
                className="font-medium"
              >
                {i === todayLabelIndex && todayLabelIndex >= 0
                  ? "Hoje"
                  : day}
              </text>
            ),
        )}

        {/* Bars */}
        {counts.map((c, i) => {
          const h = (c / max) * chartHeight;
          const x = padding.left + i * rawBarWidth;
          const y = padding.top + chartHeight - h;
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-default"
            >
              {/* Background hit area */}
              <rect
                x={x}
                y={padding.top}
                width={barWidth}
                height={chartHeight}
                fill="transparent"
              />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={6}
                fill={isHovered ? "#f59e0b" : "#c29b62"}
                className="transition-all duration-300"
                style={{
                  filter: isHovered
                    ? "drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))"
                    : "none",
                }}
              />

              {/* Tooltip implementation inside SVG */}
              {isHovered && (
                <g transform={`translate(${x + barWidth / 2}, ${y - 12})`}>
                  <rect
                    x="-25"
                    y="-24"
                    width="50"
                    height="20"
                    rx="6"
                    fill="#18181b"
                    stroke="#3f3f46"
                    strokeWidth="1"
                  />
                  <text
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#f4f4f5"
                    y="-10"
                  >
                    {c} {c === 1 ? "check-in" : "check-ins"}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

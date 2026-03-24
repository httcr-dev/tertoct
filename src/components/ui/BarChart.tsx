"use client";

import { useState } from "react";

export function BarChart({
  dataItems,
  ds = 14,
}: {
  dataItems: any[];
  ds?: number;
}) {
  const counts: number[] = Array.from({ length: ds }, () => 0);
  const now = new Date();

  const days: string[] = [];
  for (let i = 0; i < ds; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (ds - 1 - i));
    days.push(
      d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }),
    );
  }

  for (const item of dataItems) {
    const d =
      item.createdAt && item.createdAt.toDate
        ? item.createdAt.toDate()
        : item.createdAt
          ? new Date(
              (item.createdAt.seconds || item.createdAt.getTime?.() || item.createdAt) * (item.createdAt.seconds ? 1000 : 1),
            )
          : null;
    if (!d) continue;

    const diff = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff >= 0 && diff < ds) {
      counts[ds - 1 - diff]++;
    }
  }

  const max = Math.max(...counts, 3);
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barSpacing = 8;
  const rawBarWidth = chartWidth / ds;
  const barWidth = rawBarWidth - barSpacing;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
            (i % (ds > 7 ? 2 : 1) === 0 || i === ds - 1) && (
              <text
                key={i}
                x={padding.left + i * rawBarWidth + barWidth / 2}
                y={height - 15}
                textAnchor="middle"
                fontSize="10"
                fill="#71717a"
                className="font-medium"
              >
                {i === ds - 1 ? "Hoje" : day}
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

"use client";

import { useId, useState } from "react";
import { formatDuration } from "@/lib/format";

export type TrendPoint = {
  id: number;
  title: string;
  date: string;
  openRate: number;
  completionRate: number;
  avgReadTimeSeconds: number | null;
};

type Metric = "openRate" | "completionRate" | "readTime";

const METRICS: { value: Metric; label: string }[] = [
  { value: "openRate", label: "Open Rate" },
  { value: "completionRate", label: "Completion Rate" },
  { value: "readTime", label: "Reading Time" },
];

const WIDTH = 960;
const HEIGHT = 260;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

function metricValue(point: TrendPoint, metric: Metric): number | null {
  if (metric === "openRate") return point.openRate;
  if (metric === "completionRate") return point.completionRate;
  return point.avgReadTimeSeconds;
}

function formatMetric(value: number, metric: Metric): string {
  if (metric === "readTime") return formatDuration(value);
  return `${value}%`;
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const gradientId = useId();
  const [metric, setMetric] = useState<Metric>("openRate");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tableView, setTableView] = useState(false);

  const points = data
    .map((d) => ({ ...d, value: metricValue(d, metric) }))
    .filter((d): d is TrendPoint & { value: number } => d.value !== null);

  const hasEnoughData = points.length >= 2;
  const maxValue = metric === "readTime" ? Math.max(...points.map((p) => p.value), 1) * 1.15 : 100;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  function xFor(index: number) {
    if (points.length <= 1) return PAD_LEFT + plotWidth / 2;
    return PAD_LEFT + (index / (points.length - 1)) * plotWidth;
  }

  function yFor(value: number) {
    return PAD_TOP + plotHeight - (value / maxValue) * plotHeight;
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.value)}`).join(" ");
  const areaPath = hasEnoughData
    ? `${linePath} L${xFor(points.length - 1)},${PAD_TOP + plotHeight} L${xFor(0)},${PAD_TOP + plotHeight} Z`
    : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ borderColor: "var(--border-default)" }}>
          {METRICS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMetric(m.value)}
              className="px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{
                backgroundColor: metric === m.value ? "var(--accent-soft)" : "transparent",
                color: metric === m.value ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: metric === m.value ? 600 : 400,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setTableView((v) => !v)}
          className="text-xs underline"
          style={{ color: "var(--text-muted)" }}
        >
          {tableView ? "Show chart" : "Show as table"}
        </button>
      </div>

      {!hasEnoughData ? (
        <p className="text-sm py-10 text-center" style={{ color: "var(--text-muted)" }}>
          Not enough data yet to show a trend for this metric.
        </p>
      ) : tableView ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--gridline)" }}>
                <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Newsletter</th>
                <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Date</th>
                <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{METRICS.find((m) => m.value === metric)?.label}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id} className="border-b" style={{ borderColor: "var(--gridline)" }}>
                  <td className="py-2 pr-4" style={{ color: "var(--text-primary)" }}>{p.title}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{p.date}</td>
                  <td className="py-2 pr-4" style={{ color: "var(--text-primary)" }}>{formatMetric(p.value, metric)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label={`${METRICS.find((m) => m.value === metric)?.label} trend across recent newsletters`}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {gridLines.map((g) => {
              const y = PAD_TOP + plotHeight * (1 - g);
              return (
                <g key={g}>
                  <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y} y2={y} stroke="var(--gridline)" strokeWidth={1} />
                  <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
                    {metric === "readTime" ? formatMetric(maxValue * g, metric) : `${Math.round(maxValue * g)}%`}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {points.map((p, i) => (
              <g key={p.id}>
                <circle cx={xFor(i)} cy={yFor(p.value)} r={hoverIndex === i ? 5 : 3.5} fill="var(--series-1)" stroke="var(--surface-card)" strokeWidth={1.5} />
                {/* Larger, invisible hit target per the interaction spec */}
                <rect
                  x={xFor(i) - plotWidth / points.length / 2}
                  y={PAD_TOP}
                  width={plotWidth / points.length}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            ))}

            {hoverIndex !== null && (
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={PAD_TOP}
                y2={PAD_TOP + plotHeight}
                stroke="var(--border-strong)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
          </svg>

          {hoverIndex !== null && (
            <div
              className="absolute z-10 rounded-md px-2.5 py-1.5 text-xs pointer-events-none -translate-x-1/2"
              style={{
                left: `${(xFor(hoverIndex) / WIDTH) * 100}%`,
                top: 0,
                backgroundColor: "var(--surface-overlay)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-md)",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              <p className="font-semibold">{points[hoverIndex].title}</p>
              <p style={{ color: "var(--text-secondary)" }}>
                {points[hoverIndex].date} · {formatMetric(points[hoverIndex].value, metric)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

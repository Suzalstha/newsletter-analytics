"use client";

import { useState } from "react";

export type SlideEngagement = {
  slideNumber: number;
  viewCount: number;
  engagementPercentage: number;
};

function biggestDropOff(slides: SlideEngagement[]) {
  let worst: { from: SlideEngagement; to: SlideEngagement; percent: number } | null = null;

  for (let i = 1; i < slides.length; i++) {
    const prev = slides[i - 1];
    const curr = slides[i];
    if (prev.viewCount === 0) continue;
    const percent = ((prev.viewCount - curr.viewCount) / prev.viewCount) * 100;
    if (percent > 0 && (worst === null || percent > worst.percent)) {
      worst = { from: prev, to: curr, percent };
    }
  }

  return worst;
}

export default function SlideEngagementChart({
  slides,
  totalOpened,
}: {
  slides: SlideEngagement[];
  totalOpened: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (slides.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No slide views recorded yet.</p>;
  }

  const dropOff = biggestDropOff(slides);

  return (
    <div className="space-y-4">
      {dropOff && dropOff.percent >= 15 && (
        <div
          className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
          style={{
            backgroundColor: "var(--status-warning-bg)",
            borderColor: "var(--status-warning)",
            color: "var(--text-primary)",
          }}
        >
          <span aria-hidden="true" style={{ color: "var(--status-warning)" }}>
            ⚠
          </span>
          <span>
            <span className="font-semibold">Biggest drop-off:</span> Slide {dropOff.from.slideNumber} → Slide{" "}
            {dropOff.to.slideNumber} · <span className="font-semibold">{dropOff.percent.toFixed(0)}% decrease</span>
          </span>
        </div>
      )}

      <div className="space-y-3">
        {slides.map((slide) => (
          <div
            key={slide.slideNumber}
            className="relative flex items-center gap-3"
            onMouseEnter={() => setHovered(slide.slideNumber)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-16 text-sm shrink-0" style={{ color: "var(--text-secondary)" }}>
              Slide {slide.slideNumber}
            </span>

            {/* Track: recessive gray, never the series color */}
            <div className="flex-1 h-5 rounded-sm" style={{ backgroundColor: "var(--gridline)" }}>
              {/* Bar: 4px rounded data-end (the moving tip), square at the baseline */}
              <div
                className="h-5 rounded-r-[4px]"
                style={{
                  width: `${slide.engagementPercentage}%`,
                  backgroundColor: "var(--series-1)",
                }}
              />
            </div>

            <span
              className="w-14 text-sm text-right shrink-0"
              style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}
            >
              {slide.engagementPercentage}%
            </span>

            {hovered === slide.slideNumber && (
              <div
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-[calc(100%+8px)] whitespace-nowrap rounded px-2 py-1 text-xs"
                style={{
                  backgroundColor: "var(--surface-overlay)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                {slide.viewCount} of {totalOpened} openers viewed this slide (reach)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

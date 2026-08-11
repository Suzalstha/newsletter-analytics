"use client";

import { useState } from "react";

export type SlideEngagement = {
  slideNumber: number;
  viewCount: number;
  engagementPercentage: number;
};

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

  return (
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
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-[calc(100%+8px)] whitespace-nowrap rounded px-2 py-1 text-xs shadow"
              style={{
                backgroundColor: "var(--chart-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--gridline)",
              }}
            >
              {slide.viewCount} of {totalOpened} openers viewed this slide
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

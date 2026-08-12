"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const OPTIONS = [
  { value: "light", label: "Light", glyph: "☀" },
  { value: "dark", label: "Dark", glyph: "☾" },
  { value: "system", label: "System", glyph: "◐" },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid rendering the active state until mounted -- the server doesn't know
  // the visitor's saved preference, so a pre-mount guess would mismatch and
  // flicker on hydration. This is next-themes' documented pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-lg border p-0.5"
      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-page)" }}
    >
      {OPTIONS.map((opt) => {
        const active = mounted && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className="flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors"
            style={{
              backgroundColor: active ? "var(--surface-elevated)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              fontWeight: active ? 600 : 400,
            }}
          >
            <span aria-hidden="true">{opt.glyph}</span>
            <span className="sr-only">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

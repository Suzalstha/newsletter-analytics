export type StatDelta = {
  value: string;
  direction: "up" | "down" | "flat";
};

export default function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: StatDelta;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: "var(--surface-card)",
        borderColor: "var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      {(delta || hint) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {delta && <DeltaBadge delta={delta} />}
          {hint && !delta && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DeltaBadge({ delta }: { delta: StatDelta }) {
  const color =
    delta.direction === "up" ? "var(--status-good)" : delta.direction === "down" ? "var(--status-critical)" : "var(--text-muted)";
  const glyph = delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→";

  return (
    <span className="text-xs font-medium inline-flex items-center gap-1" style={{ color }}>
      <span aria-hidden="true">{glyph}</span>
      {delta.value}
    </span>
  );
}

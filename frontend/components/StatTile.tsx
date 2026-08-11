export default function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{ backgroundColor: "var(--chart-surface)", borderColor: "var(--gridline)" }}
    >
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

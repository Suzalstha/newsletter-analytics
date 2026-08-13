const STYLES: Record<string, { color: string; background: string; label: string }> = {
  Draft: { color: "var(--text-secondary)", background: "var(--surface-page)", label: "Draft" },
  Scheduled: { color: "var(--accent)", background: "var(--accent-soft)", label: "Scheduled" },
  Sending: { color: "var(--status-warning)", background: "var(--status-warning-bg)", label: "Sending" },
  Sent: { color: "var(--status-good)", background: "var(--status-good-bg)", label: "Sent" },
  Completed: { color: "var(--status-good)", background: "var(--status-good-bg)", label: "✓ Completed" },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { color: "var(--text-muted)", background: "var(--surface-page)", label: status };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
      style={{ color: style.color, backgroundColor: style.background, borderColor: style.color }}
    >
      {style.label}
    </span>
  );
}

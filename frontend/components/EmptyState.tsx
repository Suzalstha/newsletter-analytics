export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-dashed p-10 text-center"
      style={{ borderColor: "var(--border-strong)", backgroundColor: "var(--surface-page)" }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
      {action}
    </div>
  );
}

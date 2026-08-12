import { formatRelativeTime } from "@/lib/format";

export type ActivityItem = {
  type: string;
  description: string;
  timestamp: string;
};

const ICON_BY_TYPE: Record<string, string> = {
  NEWSLETTER_UPLOADED: "↑",
  NEWSLETTER_OPENED: "✓",
  NEWSLETTER_COMPLETED: "✓",
  EMPLOYEE_ADDED: "+",
};

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Nothing has happened yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]"
            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {ICON_BY_TYPE[item.type] ?? "•"}
          </span>
          <span>
            <span style={{ color: "var(--text-primary)" }}>{item.description}</span>
            <br />
            <span style={{ color: "var(--text-muted)" }}>{formatRelativeTime(item.timestamp)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

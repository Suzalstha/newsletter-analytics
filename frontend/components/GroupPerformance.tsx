import Link from "next/link";
import EmptyState from "@/components/EmptyState";

export type GroupPerformanceRow = {
  id: number;
  name: string;
  openRate: number;
  recipientCount: number;
};

export default function GroupPerformance({ groups }: { groups: GroupPerformanceRow[] }) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="No group data yet"
        description="Distribute a newsletter to at least one group to see performance by department."
      />
    );
  }

  const sorted = [...groups].sort((a, b) => b.openRate - a.openRate);

  return (
    <div>
      <div className="space-y-3">
        {sorted.map((g) => (
          <div key={g.id} className="flex items-center gap-3">
            <span className="w-28 text-sm shrink-0 truncate" style={{ color: "var(--text-secondary)" }} title={g.name}>
              {g.name}
            </span>
            <div className="flex-1 h-4 rounded-sm" style={{ backgroundColor: "var(--gridline)" }}>
              <div
                className="h-4 rounded-r-[4px]"
                style={{ width: `${g.openRate}%`, backgroundColor: "var(--accent)" }}
              />
            </div>
            <span
              className="w-12 text-sm text-right shrink-0"
              style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}
            >
              {g.openRate}%
            </span>
          </div>
        ))}
      </div>

      <Link href="/groups" className="inline-block mt-4 text-sm" style={{ color: "var(--accent)" }}>
        View all groups →
      </Link>
    </div>
  );
}

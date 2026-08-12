"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS } from "@/lib/dateRange";

const selectClass = "border rounded-md px-3 py-2 text-sm bg-transparent";

export default function DashboardFilters({
  newsletters,
  groups,
}: {
  newsletters: { id: number; title: string }[];
  groups: { id: number; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = searchParams.get("range") ?? "30d";
  const newsletterId = searchParams.get("newsletter") ?? "";
  const groupId = searchParams.get("group") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "range" && value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Date range"
        value={range}
        onChange={(e) => updateParam("range", e.target.value)}
        className={selectClass}
        style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
      >
        {RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {range === "custom" && (
        <>
          <input
            aria-label="From date"
            type="date"
            value={from}
            onChange={(e) => updateParam("from", e.target.value)}
            className={selectClass}
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          />
          <span style={{ color: "var(--text-muted)" }}>–</span>
          <input
            aria-label="To date"
            type="date"
            value={to}
            onChange={(e) => updateParam("to", e.target.value)}
            className={selectClass}
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          />
        </>
      )}

      <select
        aria-label="Newsletter"
        value={newsletterId}
        onChange={(e) => updateParam("newsletter", e.target.value)}
        className={selectClass}
        style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
      >
        <option value="">All newsletters</option>
        {newsletters.map((n) => (
          <option key={n.id} value={n.id}>
            {n.title}
          </option>
        ))}
      </select>

      <select
        aria-label="Group"
        value={groupId}
        onChange={(e) => updateParam("group", e.target.value)}
        className={selectClass}
        style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
      >
        <option value="">All groups</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </div>
  );
}

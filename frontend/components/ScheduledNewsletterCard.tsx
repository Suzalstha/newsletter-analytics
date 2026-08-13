"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatInTimeZone } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

type ScheduledNewsletter = {
  id: number;
  title: string;
  status: string;
  scheduledAt: string;
  scheduledAllEmployees: boolean;
  scheduledGroupNames: string[];
};

export default function ScheduledNewsletterCard({
  newsletter,
  timeZoneId,
}: {
  newsletter: ScheduledNewsletter;
  timeZoneId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/newsletters/${newsletter.id}/cancel-schedule`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to cancel the schedule.");
      setBusy(false);
    }
  }

  const audience = newsletter.scheduledAllEmployees
    ? "All Employees"
    : newsletter.scheduledGroupNames.length > 0
      ? newsletter.scheduledGroupNames.join(" + ")
      : "No groups selected";

  if (confirming) {
    return (
      <div
        className="border rounded-lg p-5"
        style={{ borderColor: "var(--status-critical)", backgroundColor: "var(--status-critical-bg)" }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Cancel scheduled newsletter?
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          &ldquo;{newsletter.title}&rdquo; is scheduled for {formatInTimeZone(newsletter.scheduledAt, timeZoneId)}.
          Cancelling returns it to Draft -- nothing is deleted.
        </p>
        {error && <p className="text-danger text-sm mb-3">{error}</p>}
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} disabled={busy} className="btn-primary">
            {busy ? "Cancelling…" : "Cancel"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Keep Scheduled
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border rounded-lg p-5 flex items-start justify-between gap-4 flex-wrap"
      style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
    >
      <div>
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{newsletter.title}</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Scheduled for{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {formatInTimeZone(newsletter.scheduledAt, timeZoneId)}
          </span>
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Recipients: {audience}</p>
        <div className="mt-2">
          <StatusBadge status={newsletter.status} />
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link href={`/analytics/${newsletter.id}`} className="text-sm" style={{ color: "var(--accent)" }}>
          View
        </Link>
        <Link href={`/newsletters/${newsletter.id}`} className="text-sm" style={{ color: "var(--accent)" }}>
          Edit schedule
        </Link>
        <button onClick={() => setConfirming(true)} className="text-sm text-danger">
          Cancel schedule
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatInTimeZone, toDateTimeInputParts } from "@/lib/format";

type Group = { id: number; name: string; employeeCount: number };

export default function DistributeForm({
  newsletterId,
  groups,
  status,
  scheduledAt,
  scheduledAllEmployees,
  scheduledGroupNames,
  timeZoneId,
}: {
  newsletterId: number;
  groups: Group[];
  status: string;
  scheduledAt: string | null;
  scheduledAllEmployees: boolean;
  scheduledGroupNames: string[];
  timeZoneId: string;
}) {
  const router = useRouter();
  const isScheduled = status === "Scheduled";
  const prefill = isScheduled && scheduledAt ? toDateTimeInputParts(scheduledAt, timeZoneId) : null;

  const [mode, setMode] = useState<"sendNow" | "schedule">(isScheduled ? "schedule" : "sendNow");
  const [allEmployees, setAllEmployees] = useState(isScheduled ? scheduledAllEmployees : true);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>(
    isScheduled ? groups.filter((g) => scheduledGroupNames.includes(g.name)).map((g) => g.id) : []
  );
  const [date, setDate] = useState(prefill?.date ?? "");
  const [time, setTime] = useState(prefill?.time ?? "");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleGroup(id: number) {
    setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function handleSendNow() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const created = await apiFetch<unknown[]>(`/api/newsletters/${newsletterId}/distribute`, {
        method: "POST",
        body: JSON.stringify({ allEmployees, groupIds: allEmployees ? [] : selectedGroupIds }),
      });

      setMessage(
        created.length === 0
          ? "Everyone in this audience already has a tracking link for this newsletter."
          : `Generated tracking links for ${created.length} employee${created.length === 1 ? "" : "s"}.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule() {
    if (!date || !time) {
      setError("Choose a date and time.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      await apiFetch(`/api/newsletters/${newsletterId}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          scheduledAtLocal: `${date}T${time}`,
          allEmployees,
          groupIds: allEmployees ? [] : selectedGroupIds,
        }),
      });
      setMessage(isScheduled ? "Schedule updated." : "Newsletter scheduled.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to schedule. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelSchedule() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/newsletters/${newsletterId}/cancel-schedule`, { method: "POST" });
      setShowCancelConfirm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to cancel the schedule.");
      setBusy(false);
    }
  }

  const audiencePicker = (
    <>
      <label className="flex items-center gap-2 mb-2 text-sm" style={{ color: "var(--text-primary)" }}>
        <input type="radio" checked={allEmployees} onChange={() => setAllEmployees(true)} />
        All Employees
      </label>

      <label className="flex items-center gap-2 mb-2 text-sm" style={{ color: "var(--text-primary)" }}>
        <input type="radio" checked={!allEmployees} onChange={() => setAllEmployees(false)} />
        Specific groups
      </label>

      {!allEmployees && (
        <div className="flex flex-col gap-1 ml-6 mb-3">
          {groups.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No groups yet.</p>
          ) : (
            groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                />
                {g.name} ({g.employeeCount})
              </label>
            ))
          )}
        </div>
      )}
    </>
  );

  if (showCancelConfirm) {
    return (
      <div
        className="border rounded-lg p-5"
        style={{ borderColor: "var(--status-critical)", backgroundColor: "var(--status-critical-bg)" }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Cancel scheduled newsletter?
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          This newsletter is scheduled for{" "}
          {scheduledAt ? formatInTimeZone(scheduledAt, timeZoneId) : "an unknown time"}. Cancelling returns it to
          Draft -- nothing is deleted.
        </p>
        {error && <p className="text-danger text-sm mb-3">{error}</p>}
        <div className="flex items-center gap-3">
          <button onClick={handleCancelSchedule} disabled={busy} className="btn-primary">
            {busy ? "Cancelling…" : "Cancel"}
          </button>
          <button
            onClick={() => setShowCancelConfirm(false)}
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
    <div className="border rounded-lg p-5" style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Send to
        </p>
        {isScheduled && (
          <button onClick={() => setShowCancelConfirm(true)} className="text-sm text-danger">
            Cancel schedule
          </button>
        )}
      </div>

      {isScheduled && scheduledAt && (
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Currently scheduled for <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatInTimeZone(scheduledAt, timeZoneId)}</span>.
          Editing below updates this schedule.
        </p>
      )}

      <div className="flex items-center gap-1 rounded-lg border p-0.5 mb-4 w-fit" style={{ borderColor: "var(--gridline)" }}>
        <button
          type="button"
          onClick={() => setMode("sendNow")}
          className="px-3 py-1.5 rounded-md text-sm"
          style={{
            backgroundColor: mode === "sendNow" ? "var(--accent-soft)" : "transparent",
            color: mode === "sendNow" ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: mode === "sendNow" ? 600 : 400,
          }}
        >
          Send Now
        </button>
        <button
          type="button"
          onClick={() => setMode("schedule")}
          className="px-3 py-1.5 rounded-md text-sm"
          style={{
            backgroundColor: mode === "schedule" ? "var(--accent-soft)" : "transparent",
            color: mode === "schedule" ? "var(--accent)" : "var(--text-secondary)",
            fontWeight: mode === "schedule" ? 600 : 400,
          }}
        >
          Schedule
        </button>
      </div>

      {audiencePicker}

      {mode === "schedule" && (
        <div className="flex flex-wrap items-end gap-3 mb-4 mt-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              style={{ borderColor: "var(--gridline)", color: "var(--text-primary)" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              style={{ borderColor: "var(--gridline)", color: "var(--text-primary)" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Timezone</span>
            <span
              className="border rounded px-3 py-2 text-sm"
              style={{ borderColor: "var(--gridline)", color: "var(--text-muted)", backgroundColor: "var(--surface-page)" }}
            >
              {timeZoneId}
            </span>
          </label>
        </div>
      )}

      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      {message && <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{message}</p>}

      {mode === "sendNow" ? (
        <button
          onClick={handleSendNow}
          disabled={busy || (!allEmployees && selectedGroupIds.length === 0)}
          className="btn-primary"
        >
          {busy ? "Sending…" : "Generate Tracking Links"}
        </button>
      ) : (
        <button
          onClick={handleSchedule}
          disabled={busy || (!allEmployees && selectedGroupIds.length === 0)}
          className="btn-primary"
        >
          {busy ? "Saving…" : isScheduled ? "Update Schedule" : "Schedule Newsletter"}
        </button>
      )}
    </div>
  );
}

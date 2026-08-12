"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

type Group = { id: number; name: string; employeeCount: number };

export default function DistributeForm({ newsletterId, groups }: { newsletterId: number; groups: Group[] }) {
  const router = useRouter();
  const [allEmployees, setAllEmployees] = useState(true);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleGroup(id: number) {
    setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function handleSend() {
    setSending(true);
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
      setSending(false);
    }
  }

  return (
    <div className="border rounded-lg p-5" style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}>
      <p className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        Send to
      </p>

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

      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      {message && <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{message}</p>}

      <button
        onClick={handleSend}
        disabled={sending || (!allEmployees && selectedGroupIds.length === 0)}
        className="btn-primary"
      >
        {sending ? "Sending…" : "Generate Tracking Links"}
      </button>
    </div>
  );
}

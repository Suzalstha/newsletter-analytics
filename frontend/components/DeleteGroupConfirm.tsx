"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

type GroupSummary = { id: number; name: string; employeeCount: number };
type GroupOption = { id: number; name: string };

type GroupMember = {
  id: number;
  name: string;
  email: string;
  department: string | null;
  isActive: boolean;
  groups: string[];
};

export default function DeleteGroupConfirm({
  group,
  groups,
  onDeleted,
  onCancel,
}: {
  group: GroupSummary;
  groups: GroupOption[];
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const otherGroups = groups.filter((g) => g.id !== group.id);

  const [mode, setMode] = useState<"remove" | "move">("remove");
  const [targetGroupId, setTargetGroupId] = useState<string>(otherGroups[0]?.id.toString() ?? "");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function moveMembersThenDelete() {
    const targetId = Number(targetGroupId);
    const targetGroup = groups.find((g) => g.id === targetId);
    if (!targetGroup) {
      throw new Error("Choose a group to move these employees to.");
    }

    const members = await apiFetch<GroupMember[]>(`/api/groups/${group.id}/employees`);
    const nameToId = new Map(groups.map((g) => [g.name, g.id]));

    await Promise.all(
      members.map((m) => {
        const currentIds = m.groups.map((name) => nameToId.get(name)).filter((v): v is number => v !== undefined);
        const nextIds = currentIds.filter((gid) => gid !== group.id);
        if (!nextIds.includes(targetId)) nextIds.push(targetId);

        return apiFetch(`/api/employees/${m.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: m.name,
            email: m.email,
            department: m.department,
            isActive: m.isActive,
            groupIds: nextIds,
          }),
        });
      })
    );
  }

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      if (mode === "move" && group.employeeCount > 0) {
        await moveMembersThenDelete();
      }
      await apiFetch(`/api/groups/${group.id}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Unable to delete group.");
      setDeleting(false);
    }
  }

  return (
    <div
      className="border rounded-lg p-4 flex flex-col gap-3"
      style={{ borderColor: "var(--status-critical)", backgroundColor: "var(--status-critical-bg)" }}
    >
      <div>
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Delete &ldquo;{group.name}&rdquo;?
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          This group contains {group.employeeCount} employee{group.employeeCount === 1 ? "" : "s"}. Deleting the group
          will not delete {group.employeeCount === 1 ? "this employee" : "these employees"}.
        </p>
      </div>

      {group.employeeCount > 0 && (
        <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
          <p style={{ color: "var(--text-secondary)" }}>Choose what happens to their group assignment:</p>
          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === "remove"} onChange={() => setMode("remove")} />
            Remove group assignment
          </label>
          {otherGroups.length > 0 && (
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "move"} onChange={() => setMode("move")} />
              Move to another group
              {mode === "move" && (
                <select
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                  style={{ borderColor: "var(--gridline)" }}
                >
                  {otherGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            </label>
          )}
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={handleConfirm} disabled={deleting} className="btn-primary">
          {deleting ? "Deleting…" : "Delete Group"}
        </button>
        <button onClick={onCancel} disabled={deleting} className="text-sm" style={{ color: "var(--text-muted)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

type Group = { id: number; name: string; employeeCount: number };
type Employee = { id: number; name: string; email: string; department: string | null };

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [g, members, employees] = await Promise.all([
          apiFetch<Group>(`/api/groups/${id}`),
          apiFetch<Employee[]>(`/api/groups/${id}/employees`),
          apiFetch<Employee[]>(`/api/employees?includeInactive=false`),
        ]);
        setGroup(g);
        setRenameValue(g.name);
        setMemberIds(members.map((m) => m.id));
        setAllEmployees(employees);
      } catch {
        setError("Unable to load group.");
      }
    }
    load();
  }, [id]);

  function toggleMember(employeeId: number) {
    setMemberIds((prev) =>
      prev.includes(employeeId) ? prev.filter((m) => m !== employeeId) : [...prev, employeeId]
    );
  }

  async function handleSaveMembers() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/groups/${id}/employees`, {
        method: "PUT",
        body: JSON.stringify({ employeeIds: memberIds }),
      });
    } catch {
      setError("Unable to save group members.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRename() {
    if (!renameValue.trim() || !group) return;
    try {
      await apiFetch(`/api/groups/${id}`, { method: "PUT", body: JSON.stringify({ name: renameValue }) });
      setGroup({ ...group, name: renameValue });
    } catch {
      setError("Unable to rename group.");
    }
  }

  async function handleDelete() {
    try {
      await apiFetch(`/api/groups/${id}`, { method: "DELETE" });
      router.push("/groups");
    } catch {
      setError("Unable to delete group.");
    }
  }

  if (!group) {
    return <main className="max-w-3xl mx-auto p-8"><p style={{ color: "var(--text-muted)" }}>Loading…</p></main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRename}
          className="text-2xl font-bold border-b bg-transparent"
          style={{ color: "var(--text-primary)", borderColor: "var(--gridline)" }}
        />
        <button onClick={handleDelete} className="text-sm text-danger ml-auto">
          Delete group
        </button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
        {memberIds.length} of {allEmployees.length} employees selected
      </p>

      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto mb-4" style={{ borderColor: "var(--gridline)" }}>
        {allEmployees.map((e) => (
          <label
            key={e.id}
            className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer"
            style={{ borderColor: "var(--gridline)", color: "var(--text-primary)" }}
          >
            <input type="checkbox" checked={memberIds.includes(e.id)} onChange={() => toggleMember(e.id)} />
            <span>{e.name}</span>
            <span style={{ color: "var(--text-muted)" }}>{e.email}</span>
          </label>
        ))}
      </div>

      <button onClick={handleSaveMembers} disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save Members"}
      </button>
    </main>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import DeleteGroupConfirm from "@/components/DeleteGroupConfirm";

type Group = { id: number; name: string; employeeCount: number };
type Employee = { id: number; name: string; email: string; department: string | null };

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [g, groups, members, employees] = await Promise.all([
          apiFetch<Group>(`/api/groups/${id}`),
          apiFetch<Group[]>("/api/groups"),
          apiFetch<Employee[]>(`/api/groups/${id}/employees`),
          apiFetch<Employee[]>(`/api/employees?includeInactive=false`),
        ]);
        setGroup(g);
        setAllGroups(groups);
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
    setRenaming(true);
    setError(null);
    try {
      // Updates the existing group in place -- this never creates a new group,
      // so every employee already linked to it stays linked after the rename.
      await apiFetch(`/api/groups/${id}`, { method: "PUT", body: JSON.stringify({ name: renameValue }) });
      setGroup({ ...group, name: renameValue });
      setEditingName(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to rename group.");
    } finally {
      setRenaming(false);
    }
  }

  if (!group) {
    return <main className="max-w-3xl mx-auto p-8"><p style={{ color: "var(--text-muted)" }}>Loading…</p></main>;
  }

  const filteredEmployees = allEmployees.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
  });

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-1">
        {editingName ? (
          <>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="text-2xl font-bold border-b bg-transparent"
              style={{ color: "var(--text-primary)", borderColor: "var(--gridline)" }}
            />
            <button onClick={handleRename} disabled={renaming} className="btn-primary">
              {renaming ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setRenameValue(group.name);
                setEditingName(false);
              }}
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{group.name}</h1>
            <button onClick={() => setEditingName(true)} className="text-sm" style={{ color: "var(--accent)" }}>
              Edit
            </button>
            <button onClick={() => setShowDelete((v) => !v)} className="text-sm text-danger ml-auto">
              Delete group
            </button>
          </>
        )}
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        {group.employeeCount} employee{group.employeeCount === 1 ? "" : "s"}
      </p>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {showDelete && (
        <div className="mb-6">
          <DeleteGroupConfirm
            group={group}
            groups={allGroups}
            onDeleted={() => router.push("/groups")}
            onCancel={() => setShowDelete(false)}
          />
        </div>
      )}

      <input
        placeholder="Search employees…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-3 py-2 text-sm w-full mb-3"
        style={{ borderColor: "var(--gridline)" }}
      />

      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
        {memberIds.length} of {allEmployees.length} employees selected
      </p>

      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto mb-4" style={{ borderColor: "var(--gridline)" }}>
        {filteredEmployees.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            No employees match &ldquo;{search}&rdquo;.
          </p>
        ) : (
          filteredEmployees.map((e) => (
            <label
              key={e.id}
              className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer"
              style={{ borderColor: "var(--gridline)", color: "var(--text-primary)" }}
            >
              <input type="checkbox" checked={memberIds.includes(e.id)} onChange={() => toggleMember(e.id)} />
              <span>{e.name}</span>
              <span style={{ color: "var(--text-muted)" }}>{e.email}</span>
            </label>
          ))
        )}
      </div>

      <button onClick={handleSaveMembers} disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save Members"}
      </button>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import EmptyState from "@/components/EmptyState";
import BulkImportPanel from "@/components/BulkImportPanel";

type Employee = {
  id: number;
  name: string;
  email: string;
  department: string | null;
  isActive: boolean;
  groups: string[];
};

type Group = { id: number; name: string };

type FormState = { mode: "create" } | { mode: "edit"; employee: Employee };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [department, setDepartment] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [removingHasActivity, setRemovingHasActivity] = useState<boolean | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (groupId) params.set("groupId", groupId);
    if (department) params.set("department", department);

    try {
      const data = await apiFetch<Employee[]>(`/api/employees?${params.toString()}`);
      setEmployees(data);
    } catch {
      setError("Unable to load employees. Please try again.");
    }
  }

  useEffect(() => {
    apiFetch<Group[]>("/api/groups").then(setGroups).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(load, 200); // debounce typing
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, groupId, department]);

  const departments = Array.from(
    new Set((employees ?? []).map((e) => e.department).filter((d): d is string => !!d))
  );

  async function startRemove(id: number) {
    setRemoveError(null);
    setRemovingId(id);
    setRemovingHasActivity(null); // null = still checking
    try {
      const analytics = await apiFetch<{ newslettersReceived: number }>(`/api/employees/${id}/analytics`);
      setRemovingHasActivity(analytics.newslettersReceived > 0);
    } catch {
      setRemovingHasActivity(false);
    }
  }

  async function handleRemove(id: number) {
    setRemoveError(null);
    try {
      await apiFetch(`/api/employees/${id}`, { method: "DELETE" });
      setRemovingId(null);
      await load();
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "Unable to remove employee.");
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Employees
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowBulkImport(false);
              setForm((f) => (f?.mode === "create" ? null : { mode: "create" }));
            }}
            className="btn-primary"
          >
            + Add Employee
          </button>
          <button
            onClick={() => {
              setForm(null);
              setShowBulkImport((v) => !v);
            }}
            className="btn-secondary"
          >
            Bulk Import
          </button>
        </div>
      </div>

      <p className="text-sm mb-6">
        <Link href="/groups" style={{ color: "var(--accent)" }}>
          Groups →
        </Link>
      </p>

      {form && (
        <EmployeeForm
          key={form.mode === "edit" ? form.employee.id : "create"}
          form={form}
          groups={groups}
          onDone={() => {
            setForm(null);
            load();
          }}
          onCancel={() => setForm(null)}
        />
      )}

      {showBulkImport && (
        <BulkImportPanel
          onDone={() => {
            setShowBulkImport(false);
            load();
            apiFetch<Group[]>("/api/groups").then(setGroups).catch(() => {});
          }}
          onCancel={() => setShowBulkImport(false)}
        />
      )}

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          placeholder="Search employees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
          style={{ borderColor: "var(--gridline)" }}
        />
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
          style={{ borderColor: "var(--gridline)" }}
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
          style={{ borderColor: "var(--gridline)" }}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}
      {removeError && <p className="text-danger text-sm mb-4">{removeError}</p>}

      {employees === null ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Add your first employee to start distributing newsletters."
        />
      ) : (
        <div
          className="rounded-xl border overflow-x-auto"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--gridline)" }}>
                <th className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>Name</th>
                <th className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>Email</th>
                <th className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>Department</th>
                <th className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>Groups</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b last:border-b-0" style={{ borderColor: "var(--gridline)" }}>
                  <td className="py-3 px-4">
                    <Link href={`/employees/${e.id}`} className="hover:underline" style={{ color: "var(--text-primary)" }}>
                      {e.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{e.email}</td>
                  <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{e.department ?? "—"}</td>
                  <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{e.groups.join(", ") || "—"}</td>
                  <td className="py-3 px-4">
                    {removingId === e.id ? (
                      <div className="flex flex-col items-end gap-1 whitespace-nowrap">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          Remove {e.name}?
                        </span>
                        {removingHasActivity === null ? (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Checking activity…</span>
                        ) : removingHasActivity ? (
                          <span className="text-xs" style={{ color: "var(--status-warning)" }}>
                            Has existing newsletter activity — history will be kept.
                          </span>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRemove(e.id)} className="text-xs text-danger font-medium">
                            Confirm
                          </button>
                          <button onClick={() => setRemovingId(null)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => setForm({ mode: "edit", employee: e })}
                          className="text-xs"
                          style={{ color: "var(--accent)" }}
                        >
                          Edit
                        </button>
                        <button onClick={() => startRemove(e.id)} className="text-xs text-danger">
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function EmployeeForm({
  form,
  groups,
  onDone,
  onCancel,
}: {
  form: FormState;
  groups: Group[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = form.mode === "edit" ? form.employee : null;

  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [department, setDepartment] = useState(editing?.department ?? "");
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>(
    editing ? groups.filter((g) => editing.groups.includes(g.name)).map((g) => g.id) : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleGroup(id: number) {
    setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/api/employees/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            email,
            department: department || null,
            isActive: editing.isActive,
            groupIds: selectedGroupIds,
          }),
        });
      } else {
        await apiFetch("/api/employees", {
          method: "POST",
          body: JSON.stringify({ name, email, department: department || null, groupIds: selectedGroupIds }),
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Unable to ${editing ? "save changes" : "add employee"}.`);
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-lg p-4 mb-6 flex flex-col gap-3"
      style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
    >
      <div className="flex gap-3">
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1" style={{ borderColor: "var(--gridline)" }} />
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1" style={{ borderColor: "var(--gridline)" }} />
        <input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1" style={{ borderColor: "var(--gridline)" }} />
      </div>

      {groups.length > 0 && (
        <div className="flex gap-3 flex-wrap text-sm" style={{ color: "var(--text-primary)" }}>
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-1">
              <input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} />
              {g.name}
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="self-start btn-primary">
          {saving ? (editing ? "Saving…" : "Adding…") : editing ? "Save Changes" : "Add Employee"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm" style={{ color: "var(--text-muted)" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

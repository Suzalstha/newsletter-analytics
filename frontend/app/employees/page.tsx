"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import EmptyState from "@/components/EmptyState";

type Employee = {
  id: number;
  name: string;
  email: string;
  department: string | null;
  isActive: boolean;
  groups: string[];
};

type Group = { id: number; name: string };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [department, setDepartment] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
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

  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Employees
        </h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="px-4 py-2 bg-black text-white rounded text-sm"
        >
          + Add Employee
        </button>
      </div>

      {showAddForm && (
        <AddEmployeeForm
          groups={groups}
          onDone={() => {
            setShowAddForm(false);
            load();
          }}
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

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {employees === null ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Add your first employee to start distributing newsletters."
        />
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: "var(--gridline)" }}>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Name</th>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Email</th>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Department</th>
              <th className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>Groups</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b" style={{ borderColor: "var(--gridline)" }}>
                <td className="py-2 pr-4">
                  <Link href={`/employees/${e.id}`} className="hover:underline" style={{ color: "var(--text-primary)" }}>
                    {e.name}
                  </Link>
                </td>
                <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{e.email}</td>
                <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{e.department ?? "—"}</td>
                <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{e.groups.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function AddEmployeeForm({ groups, onDone }: { groups: Group[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
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
      await apiFetch("/api/employees", {
        method: "POST",
        body: JSON.stringify({ name, email, department: department || null, groupIds: selectedGroupIds }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to add employee.");
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

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button type="submit" disabled={saving} className="self-start px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50">
        {saving ? "Adding…" : "Add Employee"}
      </button>
    </form>
  );
}

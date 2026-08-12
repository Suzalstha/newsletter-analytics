"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import EmptyState from "@/components/EmptyState";

type Group = { id: number; name: string; employeeCount: number };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setGroups(await apiFetch<Group[]>("/api/groups"));
    } catch {
      setError("Unable to load groups.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiFetch("/api/groups", { method: "POST", body: JSON.stringify({ name: newName }) });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create group.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/api/groups/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Unable to delete group.");
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Groups
      </h1>

      <form onSubmit={handleCreate} className="flex gap-3 mb-6">
        <input
          placeholder="New group name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1"
          style={{ borderColor: "var(--gridline)" }}
        />
        <button type="submit" disabled={creating} className="btn-primary">
          {creating ? "Creating…" : "Create Group"}
        </button>
      </form>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {groups === null ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : groups.length === 0 ? (
        <EmptyState title="No groups yet" description="Create a group to organize employees for newsletter distribution." />
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between border rounded-lg p-4"
              style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
            >
              <div>
                <Link href={`/groups/${g.id}`} className="font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
                  {g.name}
                </Link>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{g.employeeCount} employees</p>
              </div>
              <button onClick={() => handleDelete(g.id)} className="text-sm text-danger">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

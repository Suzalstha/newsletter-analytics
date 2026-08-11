"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Settings = { companyName: string; logoUrl: string | null };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<Settings>("/api/settings").then(setSettings).catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <main className="max-w-2xl mx-auto p-8"><p style={{ color: "var(--text-muted)" }}>Loading…</p></main>;
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Settings
      </h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Company
        </h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3 max-w-sm">
          <label className="flex flex-col gap-1">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Company name</span>
            <input
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="border rounded px-3 py-2 text-sm"
              style={{ borderColor: "var(--gridline)" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Logo URL (optional)</span>
            <input
              value={settings.logoUrl ?? ""}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value || null })}
              className="border rounded px-3 py-2 text-sm"
              style={{ borderColor: "var(--gridline)" }}
            />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="self-start px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Saved</span>}
          </div>
        </form>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Recipients
        </h2>
        <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
          Manage departments (set per employee) and groups from their own pages.
        </p>
        <div className="flex gap-4 text-sm">
          <Link href="/employees" className="underline" style={{ color: "var(--text-primary)" }}>Manage employees</Link>
          <Link href="/groups" className="underline" style={{ color: "var(--text-primary)" }}>Manage groups</Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Tracking
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Open tracking, slide tracking, and completion tracking are always on for every
          published newsletter — this version doesn&rsquo;t support disabling them per
          newsletter.
        </p>
      </section>
    </main>
  );
}

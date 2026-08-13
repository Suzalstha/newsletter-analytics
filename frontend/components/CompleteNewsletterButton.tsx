"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

export default function CompleteNewsletterButton({ newsletterId }: { newsletterId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/newsletters/${newsletterId}/complete`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to mark this newsletter completed.");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleComplete} disabled={busy} className="text-sm underline" style={{ color: "var(--accent)" }}>
        {busy ? "Marking…" : "Mark as Completed"}
      </button>
      {error && <span className="text-danger text-xs">{error}</span>}
    </div>
  );
}

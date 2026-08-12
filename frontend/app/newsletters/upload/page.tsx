"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadResult = { id: number; title: string; slideCount: number };

export default function UploadNewsletterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    if (f && f.type !== "application/pdf") {
      setStatus("error");
      setErrorMessage("Only PDF files are accepted.");
      return;
    }
    setStatus("idle");
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;

    setStatus("uploading");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);
    if (description) formData.append("description", description);

    try {
      const res = await fetch(apiUrl("/api/newsletters/upload"), { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Unable to upload newsletter. Please check that the file is a valid PDF and try again.");
      }

      const created = await res.json();
      setResult({ id: created.id, title: created.title, slideCount: created.slideCount });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unable to upload newsletter. Please try again.");
    }
  }

  if (status === "success" && result) {
    return (
      <main className="max-w-xl mx-auto p-8">
        <div
          className="rounded-lg border p-8 text-center"
          style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
        >
          <p className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            ✓ Newsletter uploaded successfully
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            {result.slideCount} slide{result.slideCount === 1 ? "" : "s"} created from &ldquo;{result.title}&rdquo;
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={`/newsletters/${result.id}`} className="btn-secondary">
              View Newsletter
            </Link>
            <Link href={`/analytics/${result.id}`} className="btn-primary">
              View Analytics
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Upload Newsletter
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Upload the finished, designed PDF. Each page becomes one slide automatically — there is
        no editor.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer mb-4"
        style={{
          borderColor: dragging ? "var(--accent)" : "var(--gridline)",
          backgroundColor: dragging ? "var(--accent-soft)" : "var(--chart-surface)",
        }}
      >
        <p style={{ color: "var(--text-primary)" }}>Drop PDF here</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>or choose a file</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="mb-4 text-sm" style={{ color: "var(--text-primary)" }}>
          {file.name} <span style={{ color: "var(--text-muted)" }}>· {formatFileSize(file.size)}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-4">
        <input
          placeholder="Title (optional — defaults to the PDF filename)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border rounded px-3 py-2"
          style={{ borderColor: "var(--gridline)" }}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="border rounded px-3 py-2"
          style={{ borderColor: "var(--gridline)" }}
        />
      </div>

      {status === "error" && (
        <p className="text-danger text-sm mb-4">{errorMessage}</p>
      )}

      <button onClick={handleUpload} disabled={!file || status === "uploading"} className="btn-primary">
        {status === "uploading" ? "Processing…" : "Upload Newsletter"}
      </button>
    </main>
  );
}

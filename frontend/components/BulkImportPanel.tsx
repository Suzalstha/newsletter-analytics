"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { downloadEmployeeCsvTemplate, downloadEmployeeImportErrors } from "@/lib/csvTemplate";

type ImportRow = {
  rowNumber: number;
  name: string | null;
  email: string | null;
  department: string | null;
  group: string | null;
  status: "Valid" | "Duplicate" | "Invalid";
  reason: string | null;
  duplicateType: "InFile" | "InDatabase" | null;
};

type ImportSummary = {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  importedCount: number;
  rows: ImportRow[];
};

type Stage = "idle" | "validating" | "preview" | "importing" | "done";

async function postCsv(path: string, file: File): Promise<ImportSummary> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(apiUrl(path), { method: "POST", body: formData });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return body;
}

function isCsvFile(f: File) {
  return f.name.toLowerCase().endsWith(".csv");
}

function ProblemRow({ row }: { row: ImportRow }) {
  return (
    <div className="px-3 py-2 text-sm">
      <p style={{ color: "var(--text-primary)" }}>
        <span className="font-semibold">Row {row.rowNumber}</span>
        <span style={{ color: "var(--text-muted)" }}>
          {" · "}
          {row.name || "—"} · {row.email || "—"} · {row.department || "—"} · {row.group || "—"}
        </span>
      </p>
      <p className="mt-0.5" style={{ color: row.status === "Invalid" ? "var(--status-critical)" : "var(--status-warning)" }}>
        <span className="font-medium">Reason: </span>
        {row.reason}
      </p>
    </div>
  );
}

export default function BulkImportPanel({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setError(null);
    setStage("validating");
    try {
      const result = await postCsv("/api/employees/import/preview", f);
      setSummary(result);
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to validate this file.");
      setStage("idle");
    }
  }

  function pickFile(f: File | null) {
    if (!f) return;
    if (!isCsvFile(f)) {
      setError("Please choose a CSV file (.csv).");
      return;
    }
    handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setError(null);
    setStage("importing");
    try {
      const result = await postCsv("/api/employees/import/confirm", file);
      setSummary(result);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import this file.");
      setStage("preview");
    }
  }

  function reset() {
    setFile(null);
    setSummary(null);
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  function changeFile() {
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }

  const invalidRows = summary?.rows.filter((r) => r.status === "Invalid") ?? [];
  const duplicateRows = summary?.rows.filter((r) => r.status === "Duplicate") ?? [];
  const inDbDuplicates = duplicateRows.filter((r) => r.duplicateType === "InDatabase");
  const inFileDuplicates = duplicateRows.filter((r) => r.duplicateType === "InFile");
  const hasProblems = invalidRows.length + duplicateRows.length > 0;
  const locked = stage === "importing";

  return (
    <div
      className="border rounded-lg p-4 mb-6 flex flex-col gap-4"
      style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Bulk Import Employees
        </p>
        <div className="flex items-center gap-4">
          <Link href="/employees/import-history" className="text-sm underline" style={{ color: "var(--accent)" }}>
            View Import History →
          </Link>
          <button
            type="button"
            onClick={downloadEmployeeCsvTemplate}
            className="text-sm underline"
            style={{ color: "var(--accent)" }}
          >
            Download CSV Template
          </button>
        </div>
      </div>

      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        CSV columns must be exactly: <code style={{ color: "var(--text-primary)" }}>Name,Email,Department,Group</code>
      </p>

      {stage !== "done" && (
        <>
          {file ? (
            <div
              className="border rounded-lg min-h-[180px] flex flex-col items-center justify-center text-center gap-2 px-4"
              style={{ borderColor: "var(--gridline)", backgroundColor: "var(--surface-page)" }}
            >
              <p className="font-medium break-all" style={{ color: "var(--text-primary)" }}>
                <span aria-hidden="true" style={{ color: "var(--status-good)" }}>✓</span> {file.name}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {stage === "validating"
                  ? "Validating…"
                  : `${summary?.totalRows ?? 0} employee${summary?.totalRows === 1 ? "" : "s"} ready to import`}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
                <button
                  type="button"
                  onClick={changeFile}
                  disabled={locked}
                  className="text-sm underline disabled:opacity-50"
                  style={{ color: "var(--accent)" }}
                >
                  Change file
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={locked}
                  className="text-sm underline text-danger disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload CSV file. Drag and drop a file here, or activate to choose one."
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className="border-2 border-dashed rounded-lg min-h-[180px] flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              style={{
                borderColor: dragging ? "var(--accent)" : "var(--gridline)",
                backgroundColor: dragging ? "var(--accent-soft)" : "var(--surface-page)",
              }}
            >
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                {dragging ? "Drop your CSV file here" : "Upload CSV file"}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Drag &amp; drop your CSV here or
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="btn-secondary mt-3"
              >
                Choose File
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      {(stage === "preview" || stage === "importing") && summary && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-4 text-sm">
              <span style={{ color: "var(--status-good)" }}>✓ {summary.validCount} valid</span>
              {summary.duplicateCount > 0 && (
                <span style={{ color: "var(--status-warning)" }}>⚠ {summary.duplicateCount} duplicate{summary.duplicateCount === 1 ? "" : "s"}</span>
              )}
              {summary.invalidCount > 0 && (
                <span className="text-danger">✕ {summary.invalidCount} invalid</span>
              )}
            </div>
            {hasProblems && (
              <button
                type="button"
                onClick={() =>
                  downloadEmployeeImportErrors(
                    summary.rows.filter((r) => r.status !== "Valid").map((r) => ({
                      rowNumber: r.rowNumber,
                      name: r.name,
                      email: r.email,
                      department: r.department,
                      group: r.group,
                      reason: r.reason,
                    }))
                  )
                }
                className="text-xs underline"
                style={{ color: "var(--accent)" }}
              >
                Download Error CSV
              </button>
            )}
          </div>

          {duplicateRows.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--status-warning)" }}>
                Duplicates
              </p>
              <div
                className="rounded border max-h-56 overflow-y-auto divide-y"
                style={{ borderColor: "var(--gridline)" }}
              >
                {inDbDuplicates.map((row) => <ProblemRow key={row.rowNumber} row={row} />)}
                {inFileDuplicates.map((row) => <ProblemRow key={row.rowNumber} row={row} />)}
              </div>
            </div>
          )}

          {invalidRows.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1.5 text-danger">Invalid</p>
              <div
                className="rounded border max-h-56 overflow-y-auto divide-y"
                style={{ borderColor: "var(--gridline)" }}
              >
                {invalidRows.map((row) => <ProblemRow key={row.rowNumber} row={row} />)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={summary.validCount === 0 || stage === "importing"}
              className="btn-primary"
            >
              {stage === "importing" ? "Importing…" : `Import ${summary.validCount} Employee${summary.validCount === 1 ? "" : "s"}`}
            </button>
            <button type="button" onClick={onCancel} className="text-sm" style={{ color: "var(--text-muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "done" && summary && (
        <div className="flex flex-col gap-3">
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: "var(--status-good)", backgroundColor: "var(--status-good-bg)" }}
          >
            <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Import Complete
            </p>
            <div className="flex flex-col gap-1 text-sm">
              <span style={{ color: "var(--status-good)" }}>
                ✓ {summary.importedCount} employee{summary.importedCount === 1 ? "" : "s"} imported
              </span>
              {summary.duplicateCount > 0 && (
                <span style={{ color: "var(--status-warning)" }}>
                  ⚠ {summary.duplicateCount} duplicate row{summary.duplicateCount === 1 ? "" : "s"} skipped
                </span>
              )}
              {summary.invalidCount > 0 && (
                <span className="text-danger">
                  ✕ {summary.invalidCount} invalid row{summary.invalidCount === 1 ? "" : "s"} skipped
                </span>
              )}
              <span className="mt-1" style={{ color: "var(--text-secondary)" }}>
                Total processed: {summary.totalRows}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onDone} className="self-start btn-primary">
              Done
            </button>
            <Link href="/employees/import-history" className="text-sm underline" style={{ color: "var(--accent)" }}>
              View Import History →
            </Link>
          </div>
        </div>
      )}

      {stage === "idle" && (
        <button type="button" onClick={onCancel} className="self-start text-sm" style={{ color: "var(--text-muted)" }}>
          Cancel
        </button>
      )}
    </div>
  );
}

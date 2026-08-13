import Link from "next/link";
import { apiFetch } from "@/lib/api";
import EmptyState from "@/components/EmptyState";

type ImportBatch = {
  id: number;
  fileName: string;
  importedAt: string;
  totalRows: number;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  status: string;
  errorMessage: string | null;
};

async function getHistory(): Promise<ImportBatch[]> {
  return apiFetch<ImportBatch[]>("/api/employees/import/history");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ImportHistoryPage() {
  const history = await getHistory();

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Import History
        </h1>
        <Link href="/employees" className="text-sm underline" style={{ color: "var(--accent)" }}>
          ← Back to Employees
        </Link>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Every CSV bulk import that was actually run, newest first. Previews that were never confirmed aren&rsquo;t recorded.
      </p>

      {history.length === 0 ? (
        <EmptyState title="No imports yet" description="Bulk-imported CSV files will show up here once you run one." />
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((h) => (
            <div
              key={h.id}
              className="border rounded-lg p-4"
              style={{ borderColor: "var(--gridline)", backgroundColor: "var(--chart-surface)" }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <p className="font-semibold break-all" style={{ color: "var(--text-primary)" }}>
                  {h.fileName}
                </p>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                  style={{
                    color: h.status === "Completed" ? "var(--status-good)" : "var(--status-critical)",
                    backgroundColor: h.status === "Completed" ? "var(--status-good-bg)" : "var(--status-critical-bg)",
                    borderColor: h.status === "Completed" ? "var(--status-good)" : "var(--status-critical)",
                  }}
                >
                  {h.status}
                </span>
              </div>
              <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                {formatDateTime(h.importedAt)}
              </p>

              {h.status === "Failed" ? (
                <p className="text-sm text-danger">{h.errorMessage}</p>
              ) : (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Total: {h.totalRows}</span>
                  <span style={{ color: "var(--status-good)" }}>Imported: {h.importedCount}</span>
                  {h.duplicateCount > 0 && (
                    <span style={{ color: "var(--status-warning)" }}>Duplicates: {h.duplicateCount}</span>
                  )}
                  {h.invalidCount > 0 && <span className="text-danger">Invalid: {h.invalidCount}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

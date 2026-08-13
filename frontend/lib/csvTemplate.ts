export const EMPLOYEE_CSV_HEADER = "Name,Email,Department,Group";

function triggerCsvDownload(rows: string[], fileName: string) {
  const blob = new Blob([rows.join("\n") + "\n"], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadEmployeeCsvTemplate() {
  triggerCsvDownload([EMPLOYEE_CSV_HEADER], "employee-import-template.csv");
}

// Quotes a field only if it needs it (contains a comma, quote, or newline) -- standard
// CSV escaping so names/reasons with commas in them don't corrupt the columns.
function csvField(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export type ErrorCsvRow = {
  rowNumber: number;
  name: string | null;
  email: string | null;
  department: string | null;
  group: string | null;
  reason: string | null;
};

// Builds and downloads a CSV containing only the problem rows from an import preview/result
// -- never touches or re-generates the file the admin originally uploaded.
export function downloadEmployeeImportErrors(rows: ErrorCsvRow[]) {
  const lines = [
    "Row,Name,Email,Department,Group,Error",
    ...rows.map((r) =>
      [
        String(r.rowNumber),
        csvField(r.name),
        csvField(r.email),
        csvField(r.department),
        csvField(r.group),
        csvField(r.reason),
      ].join(",")
    ),
  ];
  triggerCsvDownload(lines, "employee-import-errors.csv");
}

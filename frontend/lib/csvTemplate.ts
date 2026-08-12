export const EMPLOYEE_CSV_HEADER = "Name,Email,Department,Group";

export function downloadEmployeeCsvTemplate() {
  const blob = new Blob([`${EMPLOYEE_CSV_HEADER}\n`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "employee-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

namespace NewsletterAnalytics.API.Models;

// One row per confirmed CSV import attempt (not previews). Only metadata is kept --
// the uploaded file itself is never stored.
public class EmployeeImportBatch
{
    public int Id { get; set; }
    public required string FileName { get; set; }
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
    public int TotalRows { get; set; }
    public int ImportedCount { get; set; }
    public int DuplicateCount { get; set; }
    public int InvalidCount { get; set; }

    // "Completed" | "Failed" (e.g. bad header / empty file)
    public required string Status { get; set; }
    public string? ErrorMessage { get; set; }
}

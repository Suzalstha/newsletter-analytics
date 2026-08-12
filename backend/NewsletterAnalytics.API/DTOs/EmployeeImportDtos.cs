namespace NewsletterAnalytics.API.DTOs;

public class EmployeeImportRowDto
{
    public int RowNumber { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Department { get; set; }
    public string? Group { get; set; }

    // "Valid" | "Duplicate" | "Invalid"
    public required string Status { get; set; }
    public string? Reason { get; set; }
}

public class EmployeeImportSummaryDto
{
    public int TotalRows { get; set; }
    public int ValidCount { get; set; }
    public int DuplicateCount { get; set; }
    public int InvalidCount { get; set; }

    // Only meaningful on the confirm/import call -- 0 for a preview.
    public int ImportedCount { get; set; }

    public List<EmployeeImportRowDto> Rows { get; set; } = new();
}

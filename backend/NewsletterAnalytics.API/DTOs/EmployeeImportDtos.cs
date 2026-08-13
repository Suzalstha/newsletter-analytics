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

    // Only set when Status == "Duplicate": "InFile" (repeated within this CSV) or
    // "InDatabase" (email already belongs to an existing employee). Lets the UI group
    // the two duplicate kinds without parsing the Reason text.
    public string? DuplicateType { get; set; }
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

public class EmployeeImportHistoryDto
{
    public int Id { get; set; }
    public required string FileName { get; set; }
    public DateTime ImportedAt { get; set; }
    public int TotalRows { get; set; }
    public int ImportedCount { get; set; }
    public int DuplicateCount { get; set; }
    public int InvalidCount { get; set; }
    public required string Status { get; set; }
    public string? ErrorMessage { get; set; }
}

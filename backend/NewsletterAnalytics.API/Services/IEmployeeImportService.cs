using NewsletterAnalytics.API.DTOs;

namespace NewsletterAnalytics.API.Services;

public interface IEmployeeImportService
{
    // Parses and validates the CSV without writing anything to the database.
    Task<EmployeeImportSummaryDto> PreviewAsync(Stream csvStream);

    // Re-validates the CSV (state may have changed since the preview) and persists
    // every row that comes out Valid: finds-or-creates its Group, then creates the
    // Employee. Rows that are Duplicate or Invalid are skipped, never partially applied.
    // Records one EmployeeImportBatch history entry per call, success or failure.
    Task<EmployeeImportSummaryDto> ImportAsync(Stream csvStream, string fileName);

    // Past confirmed import attempts, newest first. Previews are never recorded.
    Task<List<EmployeeImportHistoryDto>> GetHistoryAsync();
}

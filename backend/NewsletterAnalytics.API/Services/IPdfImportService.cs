using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Services;

// V1: every PDF page becomes one slide image, verbatim -- no AI-based splitting or
// text extraction. Kept behind an interface so a smarter implementation (OCR, AI
// content extraction, layout analysis) can be swapped in later without touching
// any caller of this service.
public interface IPdfImportService
{
    Task<Newsletter> ImportFromPdfAsync(Stream pdfStream, string title, string? description, string createdBy);

    void DeleteStoredFiles(int newsletterId);
}

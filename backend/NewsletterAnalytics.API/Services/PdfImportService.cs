using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.Models;
using SkiaSharp;

namespace NewsletterAnalytics.API.Services;

public class PdfImportService : IPdfImportService
{
    private readonly AppDbContext _context;
    private readonly string _storageRoot;

    public PdfImportService(AppDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _storageRoot = Path.Combine(env.ContentRootPath, "StoredFiles", "newsletters");
    }

    public async Task<Newsletter> ImportFromPdfAsync(Stream pdfStream, string title, string? description, string createdBy)
    {
        // Buffer the whole file in memory: we need to read it twice (save to disk, then
        // rasterize), and newsletter PDFs are small enough that this is simple and safe.
        using var buffer = new MemoryStream();
        await pdfStream.CopyToAsync(buffer);

        var newsletter = new Newsletter
        {
            Title = title,
            Description = description,
            CreatedBy = createdBy,
            Status = NewsletterStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };

        _context.Newsletters.Add(newsletter);
        await _context.SaveChangesAsync(); // assigns newsletter.Id

        var folder = Path.Combine(_storageRoot, newsletter.Id.ToString());
        Directory.CreateDirectory(folder);

        buffer.Position = 0;
        await using (var pdfFile = File.Create(Path.Combine(folder, "source.pdf")))
        {
            await buffer.CopyToAsync(pdfFile);
        }

        var slides = new List<NewsletterSlide>();
        var pageNumber = 0;

        buffer.Position = 0;
        await foreach (var bitmap in PDFtoImage.Conversion.ToImagesAsync(buffer))
        {
            pageNumber++;
            using (bitmap)
            {
                var fileName = $"page-{pageNumber}.png";
                await using var imageFile = File.Create(Path.Combine(folder, fileName));
                bitmap.Encode(imageFile, SKEncodedImageFormat.Png, 100);

                slides.Add(new NewsletterSlide
                {
                    NewsletterId = newsletter.Id,
                    SlideNumber = pageNumber,
                    Title = $"Slide {pageNumber}",
                    Content = string.Empty,
                    ImageUrl = $"/uploads/newsletters/{newsletter.Id}/{fileName}",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        _context.NewsletterSlides.AddRange(slides);

        // A successfully processed PDF is immediately ready to send, but stays a Draft
        // until the admin actually sends or schedules it -- PublishedAt is now set when
        // that happens (see NewslettersController and ScheduledNewsletterDispatcher),
        // not at upload time.
        await _context.SaveChangesAsync();

        newsletter.Slides = slides;
        return newsletter;
    }

    public void DeleteStoredFiles(int newsletterId)
    {
        var folder = Path.Combine(_storageRoot, newsletterId.ToString());
        if (Directory.Exists(folder))
        {
            Directory.Delete(folder, recursive: true);
        }
    }
}

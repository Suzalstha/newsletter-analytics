using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;
using NewsletterAnalytics.API.Services;

namespace NewsletterAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NewslettersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPdfImportService _pdfImportService;
    private readonly IDistributionService _distributionService;
    private readonly IAnalyticsService _analyticsService;

    public NewslettersController(
        AppDbContext context,
        IPdfImportService pdfImportService,
        IDistributionService distributionService,
        IAnalyticsService analyticsService)
    {
        _context = context;
        _pdfImportService = pdfImportService;
        _distributionService = distributionService;
        _analyticsService = analyticsService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NewsletterDto>>> GetAll()
    {
        var newsletters = await _context.Newsletters
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new
            {
                n.Id,
                n.Title,
                n.Description,
                n.CreatedAt,
                n.PublishedAt,
                n.Status,
                n.CreatedBy,
                SlideCount = n.Slides.Count,
                RecipientCount = n.Recipients.Count
            })
            .ToListAsync();

        var result = new List<NewsletterDto>();
        foreach (var n in newsletters)
        {
            var summary = await _analyticsService.GetSummaryAsync(n.Id);
            result.Add(new NewsletterDto
            {
                Id = n.Id,
                Title = n.Title,
                Description = n.Description,
                CreatedAt = n.CreatedAt,
                PublishedAt = n.PublishedAt,
                Status = n.Status,
                CreatedBy = n.CreatedBy,
                SlideCount = n.SlideCount,
                RecipientCount = n.RecipientCount,
                OpenRate = summary?.OpenRate ?? 0,
                CompletionRate = summary?.CompletionRate ?? 0
            });
        }

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NewsletterDto>> GetById(int id)
    {
        var newsletter = await _context.Newsletters
            .Where(n => n.Id == id)
            .Select(n => new
            {
                n.Id,
                n.Title,
                n.Description,
                n.CreatedAt,
                n.PublishedAt,
                n.Status,
                n.CreatedBy,
                SlideCount = n.Slides.Count,
                RecipientCount = n.Recipients.Count
            })
            .FirstOrDefaultAsync();

        if (newsletter is null)
        {
            return NotFound();
        }

        var summary = await _analyticsService.GetSummaryAsync(id);

        return Ok(new NewsletterDto
        {
            Id = newsletter.Id,
            Title = newsletter.Title,
            Description = newsletter.Description,
            CreatedAt = newsletter.CreatedAt,
            PublishedAt = newsletter.PublishedAt,
            Status = newsletter.Status,
            CreatedBy = newsletter.CreatedBy,
            SlideCount = newsletter.SlideCount,
            RecipientCount = newsletter.RecipientCount,
            OpenRate = summary?.OpenRate ?? 0,
            CompletionRate = summary?.CompletionRate ?? 0
        });
    }

    // The only way a newsletter is created: upload a finished PDF, one page -> one slide.
    // No manual authoring endpoints exist anymore -- the PDF is the source of truth.
    [HttpPost("upload")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<NewsletterDto>> Upload(
        IFormFile file,
        [FromForm] string? title,
        [FromForm] string? description,
        [FromForm] string? createdBy)
    {
        if (file.Length == 0)
        {
            return BadRequest(new { message = "No file was uploaded." });
        }

        if (Path.GetExtension(file.FileName).ToLowerInvariant() != ".pdf" || file.ContentType != "application/pdf")
        {
            return BadRequest(new { message = "Only PDF files are accepted." });
        }

        var resolvedTitle = string.IsNullOrWhiteSpace(title)
            ? Path.GetFileNameWithoutExtension(file.FileName)
            : title;

        await using var stream = file.OpenReadStream();

        var newsletter = await _pdfImportService.ImportFromPdfAsync(
            stream,
            resolvedTitle,
            description,
            string.IsNullOrWhiteSpace(createdBy) ? "Newsletter Head" : createdBy
        );

        var result = new NewsletterDto
        {
            Id = newsletter.Id,
            Title = newsletter.Title,
            Description = newsletter.Description,
            CreatedAt = newsletter.CreatedAt,
            PublishedAt = newsletter.PublishedAt,
            Status = newsletter.Status,
            CreatedBy = newsletter.CreatedBy,
            SlideCount = newsletter.Slides.Count,
            RecipientCount = 0,
            OpenRate = 0,
            CompletionRate = 0
        };

        return CreatedAtAction(nameof(GetById), new { id = newsletter.Id }, result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var newsletter = await _context.Newsletters.FindAsync(id);

        if (newsletter is null)
        {
            return NotFound();
        }

        _context.Newsletters.Remove(newsletter);
        await _context.SaveChangesAsync();

        _pdfImportService.DeleteStoredFiles(id);

        return NoContent();
    }

    [HttpPost("{id}/distribute")]
    public async Task<ActionResult<IEnumerable<RecipientDto>>> Distribute(int id, DistributeNewsletterDto dto)
    {
        if (!await _context.Newsletters.AnyAsync(n => n.Id == id))
        {
            return NotFound();
        }

        if (!dto.AllEmployees && dto.GroupIds.Count == 0)
        {
            return BadRequest(new { message = "Select at least one group, or choose All Employees." });
        }

        var created = await _distributionService.DistributeAsync(id, dto.GroupIds, dto.AllEmployees);

        var createdIds = created.Select(r => r.Id).ToList();
        var result = await _context.Recipients
            .Where(r => createdIds.Contains(r.Id))
            .Include(r => r.Employee)
            .Select(r => new RecipientDto
            {
                Id = r.Id,
                NewsletterId = r.NewsletterId,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee.Name,
                Email = r.Employee.Email,
                TrackingToken = r.TrackingToken,
                SentAt = r.SentAt
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id}/recipients")]
    public async Task<ActionResult<IEnumerable<RecipientDto>>> GetRecipients(int id)
    {
        if (!await _context.Newsletters.AnyAsync(n => n.Id == id))
        {
            return NotFound();
        }

        var recipients = await _context.Recipients
            .Where(r => r.NewsletterId == id)
            .Include(r => r.Employee)
            .Select(r => new RecipientDto
            {
                Id = r.Id,
                NewsletterId = r.NewsletterId,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee.Name,
                Email = r.Employee.Email,
                TrackingToken = r.TrackingToken,
                SentAt = r.SentAt
            })
            .ToListAsync();

        return Ok(recipients);
    }

    [HttpGet("{id}/slides")]
    public async Task<ActionResult<IEnumerable<SlideDto>>> GetSlides(int id)
    {
        if (!await _context.Newsletters.AnyAsync(n => n.Id == id))
        {
            return NotFound();
        }

        var slides = await _context.NewsletterSlides
            .Where(s => s.NewsletterId == id)
            .OrderBy(s => s.SlideNumber)
            .Select(s => new SlideDto
            {
                Id = s.Id,
                SlideNumber = s.SlideNumber,
                Title = s.Title,
                Content = s.Content,
                ImageUrl = s.ImageUrl
            })
            .ToListAsync();

        return Ok(slides);
    }
}

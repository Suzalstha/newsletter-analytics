using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;
using NewsletterAnalytics.API.Models;
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
                n.ScheduledAt,
                n.ScheduledAllEmployees,
                ScheduledGroupNames = n.ScheduledGroups.Select(g => g.Name).ToList(),
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
                Status = n.Status.ToString(),
                CreatedBy = n.CreatedBy,
                SlideCount = n.SlideCount,
                RecipientCount = n.RecipientCount,
                OpenRate = summary?.OpenRate ?? 0,
                CompletionRate = summary?.CompletionRate ?? 0,
                ScheduledAt = n.ScheduledAt,
                ScheduledAllEmployees = n.ScheduledAllEmployees,
                ScheduledGroupNames = n.ScheduledGroupNames
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
                n.ScheduledAt,
                n.ScheduledAllEmployees,
                ScheduledGroupNames = n.ScheduledGroups.Select(g => g.Name).ToList(),
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
            Status = newsletter.Status.ToString(),
            CreatedBy = newsletter.CreatedBy,
            SlideCount = newsletter.SlideCount,
            RecipientCount = newsletter.RecipientCount,
            OpenRate = summary?.OpenRate ?? 0,
            CompletionRate = summary?.CompletionRate ?? 0,
            ScheduledAt = newsletter.ScheduledAt,
            ScheduledAllEmployees = newsletter.ScheduledAllEmployees,
            ScheduledGroupNames = newsletter.ScheduledGroupNames
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
            Status = newsletter.Status.ToString(),
            CreatedBy = newsletter.CreatedBy,
            SlideCount = newsletter.Slides.Count,
            RecipientCount = 0,
            OpenRate = 0,
            CompletionRate = 0,
            ScheduledAt = null,
            ScheduledAllEmployees = false,
            ScheduledGroupNames = new List<string>()
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

    // "Send Now": unchanged distribution mechanics (reuses IDistributionService exactly as
    // before), now also carries the newsletter through Sending -> Sent so this path and the
    // scheduled/background path leave the newsletter in the same state afterwards.
    [HttpPost("{id}/distribute")]
    public async Task<ActionResult<IEnumerable<RecipientDto>>> Distribute(int id, DistributeNewsletterDto dto)
    {
        var newsletter = await _context.Newsletters.FindAsync(id);
        if (newsletter is null)
        {
            return NotFound();
        }

        if (newsletter.Status == NewsletterStatus.Scheduled)
        {
            return BadRequest(new { message = "This newsletter is scheduled. Cancel the schedule before sending it manually." });
        }

        if (newsletter.Status == NewsletterStatus.Sending)
        {
            return BadRequest(new { message = "This newsletter is currently being sent." });
        }

        if (!dto.AllEmployees && dto.GroupIds.Count == 0)
        {
            return BadRequest(new { message = "Select at least one group, or choose All Employees." });
        }

        newsletter.Status = NewsletterStatus.Sending;
        await _context.SaveChangesAsync();

        var created = await _distributionService.DistributeAsync(id, dto.GroupIds, dto.AllEmployees);

        newsletter.Status = NewsletterStatus.Sent;
        newsletter.PublishedAt ??= DateTime.UtcNow; // first time this newsletter has actually gone out
        await _context.SaveChangesAsync();

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

    // Schedules (or, called again on an already-Scheduled newsletter, edits the schedule
    // of) a future send. Distribution itself doesn't happen here -- ScheduledNewsletterDispatcher
    // performs it once ScheduledAt arrives.
    [HttpPost("{id}/schedule")]
    public async Task<IActionResult> Schedule(int id, ScheduleNewsletterDto dto)
    {
        var newsletter = await _context.Newsletters.Include(n => n.ScheduledGroups).FirstOrDefaultAsync(n => n.Id == id);
        if (newsletter is null)
        {
            return NotFound();
        }

        if (newsletter.Status != NewsletterStatus.Draft && newsletter.Status != NewsletterStatus.Scheduled)
        {
            return BadRequest(new { message = $"Only a Draft or already-Scheduled newsletter can be scheduled (current status: {newsletter.Status})." });
        }

        if (!dto.AllEmployees && dto.GroupIds.Count == 0)
        {
            return BadRequest(new { message = "Select at least one group, or choose All Employees." });
        }

        if (!DateTime.TryParseExact(dto.ScheduledAtLocal, "yyyy-MM-ddTHH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var scheduledLocal))
        {
            return BadRequest(new { message = "Invalid scheduled date/time." });
        }

        var settings = await _context.CompanySettings.FirstAsync(s => s.Id == 1);
        TimeZoneInfo companyTimeZone;
        try
        {
            companyTimeZone = TimeZoneInfo.FindSystemTimeZoneById(settings.TimeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return StatusCode(500, new { message = "The configured company timezone is invalid." });
        }

        var scheduledUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(scheduledLocal, DateTimeKind.Unspecified), companyTimeZone);

        if (scheduledUtc <= DateTime.UtcNow)
        {
            return BadRequest(new { message = "Scheduled time must be in the future." });
        }

        var groups = dto.AllEmployees
            ? new List<Group>()
            : await _context.Groups.Where(g => dto.GroupIds.Contains(g.Id)).ToListAsync();

        newsletter.Status = NewsletterStatus.Scheduled;
        newsletter.ScheduledAt = scheduledUtc;
        newsletter.ScheduledAllEmployees = dto.AllEmployees;
        newsletter.ScheduledGroups.Clear();
        foreach (var group in groups)
        {
            newsletter.ScheduledGroups.Add(group);
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Cancelling returns the newsletter to Draft -- nothing is deleted.
    [HttpPost("{id}/cancel-schedule")]
    public async Task<IActionResult> CancelSchedule(int id)
    {
        var newsletter = await _context.Newsletters.Include(n => n.ScheduledGroups).FirstOrDefaultAsync(n => n.Id == id);
        if (newsletter is null)
        {
            return NotFound();
        }

        if (newsletter.Status != NewsletterStatus.Scheduled)
        {
            return BadRequest(new { message = "Only a Scheduled newsletter can have its schedule cancelled." });
        }

        newsletter.Status = NewsletterStatus.Draft;
        newsletter.ScheduledAt = null;
        newsletter.ScheduledAllEmployees = false;
        newsletter.ScheduledGroups.Clear();

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Manual, admin-triggered close-out of a Sent newsletter. Deliberately independent of
    // reading-completion analytics (AnalyticsService/NewsletterEvent) -- "the newsletter's
    // distribution is done" is not the same claim as "everyone finished reading it".
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        var newsletter = await _context.Newsletters.FindAsync(id);
        if (newsletter is null)
        {
            return NotFound();
        }

        if (newsletter.Status != NewsletterStatus.Sent)
        {
            return BadRequest(new { message = "Only a Sent newsletter can be marked Completed." });
        }

        newsletter.Status = NewsletterStatus.Completed;
        await _context.SaveChangesAsync();
        return NoContent();
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

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;
using NewsletterAnalytics.API.Models;
using NewsletterAnalytics.API.Services;

namespace NewsletterAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(AppDbContext context, IAnalyticsService analyticsService)
    {
        _context = context;
        _analyticsService = analyticsService;
    }

    [HttpPost("track")]
    public async Task<IActionResult> Track(TrackEventDto dto)
    {
        var newsletterExists = await _context.Newsletters.AnyAsync(n => n.Id == dto.NewsletterId);
        var recipientExists = await _context.Recipients.AnyAsync(r => r.Id == dto.RecipientId);

        if (!newsletterExists || !recipientExists)
        {
            return BadRequest(new { message = "Newsletter or Recipient does not exist." });
        }

        var newsletterEvent = new NewsletterEvent
        {
            NewsletterId = dto.NewsletterId,
            RecipientId = dto.RecipientId,
            EventType = dto.EventType,
            SlideNumber = dto.SlideNumber,
            DurationSeconds = dto.DurationSeconds,
            Timestamp = DateTime.UtcNow
        };

        _context.NewsletterEvents.Add(newsletterEvent);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Event recorded", eventId = newsletterEvent.Id });
    }

    [HttpGet("{newsletterId}")]
    public async Task<ActionResult<AnalyticsSummaryDto>> GetSummary(int newsletterId)
    {
        var summary = await _analyticsService.GetSummaryAsync(newsletterId);
        return summary is null ? NotFound() : Ok(summary);
    }

    [HttpGet("{newsletterId}/slides")]
    public async Task<ActionResult<IEnumerable<SlideEngagementDto>>> GetSlideEngagement(int newsletterId)
    {
        if (!await _context.Newsletters.AnyAsync(n => n.Id == newsletterId))
        {
            return NotFound();
        }

        return Ok(await _analyticsService.GetSlideEngagementAsync(newsletterId));
    }

    [HttpGet("{newsletterId}/recipients")]
    public async Task<ActionResult<IEnumerable<RecipientAnalyticsDto>>> GetRecipientAnalytics(int newsletterId)
    {
        if (!await _context.Newsletters.AnyAsync(n => n.Id == newsletterId))
        {
            return NotFound();
        }

        return Ok(await _analyticsService.GetRecipientAnalyticsAsync(newsletterId));
    }
}

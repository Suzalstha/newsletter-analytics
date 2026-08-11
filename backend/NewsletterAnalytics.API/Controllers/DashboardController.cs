using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;
using NewsletterAnalytics.API.Services;

namespace NewsletterAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAnalyticsService _analyticsService;

    public DashboardController(AppDbContext context, IAnalyticsService analyticsService)
    {
        _context = context;
        _analyticsService = analyticsService;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<DashboardOverviewDto>> GetOverview()
    {
        var totalNewsletters = await _context.Newsletters.CountAsync();
        var totalEmployees = await _context.Employees.CountAsync(e => e.IsActive);
        var totalRecipientsSent = await _context.Recipients.CountAsync();

        var newsletterIds = await _context.Newsletters.Select(n => n.Id).ToListAsync();
        var openRates = new List<double>();
        var completionRates = new List<double>();

        foreach (var id in newsletterIds)
        {
            var summary = await _analyticsService.GetSummaryAsync(id);
            if (summary is null || summary.TotalSent == 0)
            {
                continue;
            }

            openRates.Add(summary.OpenRate);
            completionRates.Add(summary.CompletionRate);
        }

        var activity = new List<ActivityItemDto>();

        var recentNewsletters = await _context.Newsletters
            .OrderByDescending(n => n.CreatedAt)
            .Take(5)
            .Select(n => new { n.Title, n.CreatedAt })
            .ToListAsync();
        activity.AddRange(recentNewsletters.Select(n => new ActivityItemDto
        {
            Type = "NEWSLETTER_UPLOADED",
            Description = $"Newsletter \"{n.Title}\" was uploaded",
            Timestamp = n.CreatedAt
        }));

        var recentEmployees = await _context.Employees
            .OrderByDescending(e => e.CreatedAt)
            .Take(5)
            .Select(e => new { e.Name, e.CreatedAt })
            .ToListAsync();
        activity.AddRange(recentEmployees.Select(e => new ActivityItemDto
        {
            Type = "EMPLOYEE_ADDED",
            Description = $"{e.Name} was added as an employee",
            Timestamp = e.CreatedAt
        }));

        var recentEvents = await _context.NewsletterEvents
            .Where(ev => ev.EventType == "NEWSLETTER_OPENED" || ev.EventType == "NEWSLETTER_COMPLETED")
            .OrderByDescending(ev => ev.Timestamp)
            .Take(10)
            .Include(ev => ev.Newsletter)
            .Include(ev => ev.Recipient)
            .ThenInclude(r => r.Employee)
            .ToListAsync();
        activity.AddRange(recentEvents.Select(ev => new ActivityItemDto
        {
            Type = ev.EventType,
            Description = ev.EventType == "NEWSLETTER_OPENED"
                ? $"{ev.Recipient.Employee.Name} opened \"{ev.Newsletter.Title}\""
                : $"{ev.Recipient.Employee.Name} completed \"{ev.Newsletter.Title}\"",
            Timestamp = ev.Timestamp
        }));

        return Ok(new DashboardOverviewDto
        {
            TotalNewsletters = totalNewsletters,
            TotalEmployees = totalEmployees,
            TotalRecipientsSent = totalRecipientsSent,
            AverageOpenRate = openRates.Count == 0 ? 0 : Math.Round(openRates.Average(), 1),
            AverageCompletionRate = completionRates.Count == 0 ? 0 : Math.Round(completionRates.Average(), 1),
            RecentActivity = activity.OrderByDescending(a => a.Timestamp).Take(12).ToList()
        });
    }
}

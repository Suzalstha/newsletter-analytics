using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;

namespace NewsletterAnalytics.API.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly AppDbContext _context;

    public AnalyticsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AnalyticsSummaryDto?> GetSummaryAsync(int newsletterId)
    {
        if (!await _context.Newsletters.AnyAsync(n => n.Id == newsletterId))
        {
            return null;
        }

        var totalSent = await _context.Recipients.CountAsync(r => r.NewsletterId == newsletterId);

        var events = await _context.NewsletterEvents
            .Where(e => e.NewsletterId == newsletterId)
            .ToListAsync();

        var totalOpened = events.Where(e => e.EventType == "NEWSLETTER_OPENED").Select(e => e.RecipientId).Distinct().Count();
        var totalCompleted = events.Where(e => e.EventType == "NEWSLETTER_COMPLETED").Select(e => e.RecipientId).Distinct().Count();

        var readTimePerRecipient = events
            .Where(e => e.EventType == "SLIDE_VIEWED" && e.DurationSeconds.HasValue)
            .GroupBy(e => e.RecipientId)
            .Select(g => g.Sum(e => e.DurationSeconds!.Value))
            .ToList();

        var slidesViewedPerRecipient = events
            .Where(e => e.EventType == "SLIDE_VIEWED" && e.SlideNumber.HasValue)
            .GroupBy(e => e.RecipientId)
            .Select(g => g.Select(e => e.SlideNumber!.Value).Distinct().Count())
            .ToList();

        return new AnalyticsSummaryDto
        {
            NewsletterId = newsletterId,
            TotalSent = totalSent,
            TotalOpened = totalOpened,
            OpenRate = totalSent == 0 ? 0 : Math.Round((double)totalOpened / totalSent * 100, 1),
            TotalCompleted = totalCompleted,
            CompletionRate = totalSent == 0 ? 0 : Math.Round((double)totalCompleted / totalSent * 100, 1),
            AverageReadTimeSeconds = readTimePerRecipient.Count == 0 ? 0 : Math.Round(readTimePerRecipient.Average(), 1),
            AverageSlidesViewed = slidesViewedPerRecipient.Count == 0 ? 0 : Math.Round(slidesViewedPerRecipient.Average(), 1)
        };
    }

    public async Task<List<SlideEngagementDto>> GetSlideEngagementAsync(int newsletterId)
    {
        var events = await _context.NewsletterEvents
            .Where(e => e.NewsletterId == newsletterId)
            .ToListAsync();

        var totalOpened = events.Where(e => e.EventType == "NEWSLETTER_OPENED").Select(e => e.RecipientId).Distinct().Count();

        return events
            .Where(e => e.EventType == "SLIDE_VIEWED" && e.SlideNumber.HasValue)
            .GroupBy(e => e.SlideNumber!.Value)
            .Select(g =>
            {
                var viewers = g.Select(e => e.RecipientId).Distinct().Count();
                return new SlideEngagementDto
                {
                    SlideNumber = g.Key,
                    ViewCount = viewers,
                    EngagementPercentage = totalOpened == 0 ? 0 : Math.Round((double)viewers / totalOpened * 100, 1)
                };
            })
            .OrderBy(s => s.SlideNumber)
            .ToList();
    }

    public async Task<List<RecipientAnalyticsDto>> GetRecipientAnalyticsAsync(int newsletterId)
    {
        var recipients = await _context.Recipients
            .Where(r => r.NewsletterId == newsletterId)
            .Include(r => r.Employee)
            .ToListAsync();

        var events = await _context.NewsletterEvents
            .Where(e => e.NewsletterId == newsletterId)
            .ToListAsync();

        return recipients.Select(r =>
        {
            var recipientEvents = events.Where(e => e.RecipientId == r.Id).ToList();

            return new RecipientAnalyticsDto
            {
                RecipientId = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee.Name,
                Email = r.Employee.Email,
                Opened = recipientEvents.Any(e => e.EventType == "NEWSLETTER_OPENED"),
                Completed = recipientEvents.Any(e => e.EventType == "NEWSLETTER_COMPLETED"),
                SlidesViewed = recipientEvents
                    .Where(e => e.EventType == "SLIDE_VIEWED" && e.SlideNumber.HasValue)
                    .Select(e => e.SlideNumber!.Value)
                    .Distinct()
                    .Count(),
                TotalReadTimeSeconds = recipientEvents
                    .Where(e => e.EventType == "SLIDE_VIEWED" && e.DurationSeconds.HasValue)
                    .Sum(e => e.DurationSeconds!.Value),
                LastEventAt = recipientEvents.Any() ? recipientEvents.Max(e => e.Timestamp) : null
            };
        }).ToList();
    }

    public async Task<EmployeeAnalyticsDto?> GetEmployeeAnalyticsAsync(int employeeId)
    {
        var employee = await _context.Employees.FindAsync(employeeId);
        if (employee is null)
        {
            return null;
        }

        var recipientRows = await _context.Recipients
            .Where(r => r.EmployeeId == employeeId)
            .Include(r => r.Newsletter)
            .OrderByDescending(r => r.SentAt)
            .ToListAsync();

        var recipientIds = recipientRows.Select(r => r.Id).ToList();

        var events = await _context.NewsletterEvents
            .Where(e => recipientIds.Contains(e.RecipientId))
            .ToListAsync();

        var openedRecipientIds = events.Where(e => e.EventType == "NEWSLETTER_OPENED").Select(e => e.RecipientId).ToHashSet();
        var completedRecipientIds = events.Where(e => e.EventType == "NEWSLETTER_COMPLETED").Select(e => e.RecipientId).ToHashSet();

        var readTimePerRecipient = events
            .Where(e => e.EventType == "SLIDE_VIEWED" && e.DurationSeconds.HasValue)
            .GroupBy(e => e.RecipientId)
            .ToDictionary(g => g.Key, g => g.Sum(e => e.DurationSeconds!.Value));

        var newslettersReceived = recipientRows.Count;
        var opened = recipientRows.Count(r => openedRecipientIds.Contains(r.Id));
        var completed = recipientRows.Count(r => completedRecipientIds.Contains(r.Id));
        var readTimes = readTimePerRecipient.Values.ToList();

        return new EmployeeAnalyticsDto
        {
            EmployeeId = employee.Id,
            Name = employee.Name,
            Email = employee.Email,
            NewslettersReceived = newslettersReceived,
            Opened = opened,
            OpenRate = newslettersReceived == 0 ? 0 : Math.Round((double)opened / newslettersReceived * 100, 1),
            Completed = completed,
            CompletionRate = newslettersReceived == 0 ? 0 : Math.Round((double)completed / newslettersReceived * 100, 1),
            AverageReadTimeSeconds = readTimes.Count == 0 ? 0 : Math.Round(readTimes.Average(), 1),
            RecentNewsletters = recipientRows.Take(10).Select(r => new EmployeeNewsletterHistoryDto
            {
                NewsletterId = r.NewsletterId,
                NewsletterTitle = r.Newsletter.Title,
                Opened = openedRecipientIds.Contains(r.Id),
                Completed = completedRecipientIds.Contains(r.Id),
                ReadTimeSeconds = readTimePerRecipient.GetValueOrDefault(r.Id, 0)
            }).ToList()
        };
    }
}

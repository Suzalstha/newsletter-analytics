using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Services;

// Server-side scheduling: this runs inside the API process itself, not a browser timer,
// so a scheduled newsletter still goes out even if every admin's browser is closed.
// Polling (rather than a precise per-newsletter timer) keeps this simple and correct for
// the single-instance deployment this app currently runs as. If the app is ever scaled to
// multiple instances, this loop would need an explicit claim/lock step to guarantee two
// instances can't pick up the same newsletter at once.
public class ScheduledNewsletterDispatcher : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduledNewsletterDispatcher> _logger;

    public ScheduledNewsletterDispatcher(IServiceScopeFactory scopeFactory, ILogger<ScheduledNewsletterDispatcher> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchDueNewslettersAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Scheduled newsletter dispatch pass failed.");
            }

            try
            {
                await Task.Delay(PollInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Shutting down.
            }
        }
    }

    private async Task DispatchDueNewslettersAsync(CancellationToken stoppingToken)
    {
        // BackgroundService is a singleton; AppDbContext/IDistributionService/IEmailService
        // are scoped, so each pass gets its own short-lived scope.
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var distributionService = scope.ServiceProvider.GetRequiredService<IDistributionService>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var now = DateTime.UtcNow;
        var dueNewsletterIds = await context.Newsletters
            .Where(n => n.Status == NewsletterStatus.Scheduled && n.ScheduledAt != null && n.ScheduledAt <= now)
            .Select(n => n.Id)
            .ToListAsync(stoppingToken);

        foreach (var newsletterId in dueNewsletterIds)
        {
            await DispatchOneAsync(context, distributionService, emailService, newsletterId, stoppingToken);
        }
    }

    private async Task DispatchOneAsync(
        AppDbContext context,
        IDistributionService distributionService,
        IEmailService emailService,
        int newsletterId,
        CancellationToken stoppingToken)
    {
        var newsletter = await context.Newsletters
            .Include(n => n.ScheduledGroups)
            .FirstOrDefaultAsync(n => n.Id == newsletterId, stoppingToken);

        // Re-check: another pass, or an admin cancelling/sending manually, may have
        // already moved it on since the query above.
        if (newsletter is null || newsletter.Status != NewsletterStatus.Scheduled)
        {
            return;
        }

        var groupIds = newsletter.ScheduledGroups.Select(g => g.Id).ToList();
        var allEmployees = newsletter.ScheduledAllEmployees;

        // Claim it immediately so a slow distribution doesn't get picked up twice by the
        // next poll.
        newsletter.Status = NewsletterStatus.Sending;
        await context.SaveChangesAsync(stoppingToken);

        try
        {
            // Reuses the exact same distribution logic "Send Now" uses -- no duplicate
            // audience-resolution/tracking-token code.
            var created = await distributionService.DistributeAsync(newsletter.Id, groupIds, allEmployees);

            foreach (var recipient in created)
            {
                // Distribution (deciding who + generating tracking links) and actual email
                // delivery are separate steps on purpose -- see IEmailService.
                await emailService.SendNewsletterEmailAsync(recipient, newsletter);
            }

            newsletter.Status = NewsletterStatus.Sent;
            newsletter.PublishedAt ??= DateTime.UtcNow;
            await context.SaveChangesAsync(stoppingToken);

            _logger.LogInformation(
                "Dispatched scheduled newsletter {NewsletterId} (\"{Title}\") to {Count} recipients.",
                newsletter.Id, newsletter.Title, created.Count);
        }
        catch (Exception ex)
        {
            // Left in Sending rather than guessed back to Scheduled (risking a duplicate
            // send later) or forward to Sent (hiding the failure) -- a newsletter stuck in
            // Sending is a clear, visible signal for an admin to investigate.
            _logger.LogError(ex, "Failed to dispatch scheduled newsletter {NewsletterId}.", newsletter.Id);
        }
    }
}

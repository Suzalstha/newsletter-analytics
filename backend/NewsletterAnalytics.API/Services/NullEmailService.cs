using Microsoft.Extensions.Logging;
using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Services;

// No real email provider is configured yet. This implementation intentionally does NOT
// pretend to send anything -- it just records that delivery was skipped, so it's obvious
// in the logs (and in code review) that "Sent" currently means "distributed/tracked",
// not "an email left the building". Replace this registration in Program.cs once a real
// provider (SMTP/SendGrid/etc.) is wired up; nothing else needs to change.
public class NullEmailService : IEmailService
{
    private readonly ILogger<NullEmailService> _logger;

    public NullEmailService(ILogger<NullEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendNewsletterEmailAsync(Recipient recipient, Newsletter newsletter)
    {
        _logger.LogInformation(
            "Email delivery not yet configured -- skipping send for employeeId={EmployeeId}, newsletterId={NewsletterId} (\"{Title}\").",
            recipient.EmployeeId, newsletter.Id, newsletter.Title);
        return Task.CompletedTask;
    }
}

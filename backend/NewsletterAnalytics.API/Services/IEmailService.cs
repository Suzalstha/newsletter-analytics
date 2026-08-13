using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Services;

// Deliberately separate from IDistributionService: distribution decides *who* gets a
// tracking link (Recipient rows); this interface is only about actually delivering an
// email to that person. Swapping in a real provider (SMTP/SendGrid/etc.) later means
// implementing this interface and changing one DI registration in Program.cs -- nothing
// in ScheduledNewsletterDispatcher or the controllers needs to change.
public interface IEmailService
{
    Task SendNewsletterEmailAsync(Recipient recipient, Newsletter newsletter);
}

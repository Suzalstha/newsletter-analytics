namespace NewsletterAnalytics.API.Models;

// Draft is intentionally first (the default enum value) -- a newsletter with no
// explicit status is a draft, never anything more advanced.
public enum NewsletterStatus
{
    Draft,
    Scheduled,
    Sending,
    Sent,
    Completed
}

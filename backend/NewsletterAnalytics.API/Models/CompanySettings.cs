namespace NewsletterAnalytics.API.Models;

// Single-row table (always Id = 1) holding the few settings the app actually uses.
public class CompanySettings
{
    public int Id { get; set; }
    public required string CompanyName { get; set; }

    // IANA id (e.g. "Asia/Kathmandu"), used to interpret the date/time an admin types in
    // when scheduling a newsletter -- .NET's TimeZoneInfo understands IANA ids on every
    // platform this app runs on, so we don't need a separate Windows-id mapping.
    public required string TimeZoneId { get; set; }
}

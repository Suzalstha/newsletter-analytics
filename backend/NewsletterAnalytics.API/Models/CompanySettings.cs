namespace NewsletterAnalytics.API.Models;

// Single-row table (always Id = 1) holding the few settings the app actually uses.
public class CompanySettings
{
    public int Id { get; set; }
    public required string CompanyName { get; set; }
    public string? LogoUrl { get; set; }
}

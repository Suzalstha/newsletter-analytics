namespace NewsletterAnalytics.API.DTOs;

public class ScheduleNewsletterDto
{
    // "yyyy-MM-ddTHH:mm" -- a plain wall-clock date/time with no timezone attached.
    // The server interprets it using the company's configured timezone (CompanySettings),
    // not the admin's browser timezone, per the "configured application/company timezone"
    // requirement.
    public required string ScheduledAtLocal { get; set; }
    public bool AllEmployees { get; set; }
    public List<int> GroupIds { get; set; } = new();
}

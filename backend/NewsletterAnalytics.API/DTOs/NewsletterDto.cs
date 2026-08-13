namespace NewsletterAnalytics.API.DTOs;

public class NewsletterDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public required string Status { get; set; }
    public required string CreatedBy { get; set; }
    public int SlideCount { get; set; }
    public int RecipientCount { get; set; }
    public double OpenRate { get; set; }
    public double CompletionRate { get; set; }

    // Only meaningful while Status == "Scheduled" (kept afterwards as a record of what
    // was scheduled).
    public DateTime? ScheduledAt { get; set; }
    public bool ScheduledAllEmployees { get; set; }
    public List<string> ScheduledGroupNames { get; set; } = new();
}

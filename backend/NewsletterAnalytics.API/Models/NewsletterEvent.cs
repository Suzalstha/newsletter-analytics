namespace NewsletterAnalytics.API.Models;

public class NewsletterEvent
{
    public int Id { get; set; }

    public int NewsletterId { get; set; }
    public Newsletter Newsletter { get; set; } = null!;

    public int RecipientId { get; set; }
    public Recipient Recipient { get; set; } = null!;

    // e.g. NEWSLETTER_OPENED, SLIDE_VIEWED, SLIDE_EXITED, LINK_CLICKED, NEWSLETTER_COMPLETED
    public required string EventType { get; set; }
    public int? SlideNumber { get; set; }
    public int? DurationSeconds { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? Metadata { get; set; }
}

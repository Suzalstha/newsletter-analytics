namespace NewsletterAnalytics.API.DTOs;

public class TrackEventDto
{
    public int NewsletterId { get; set; }
    public int RecipientId { get; set; }
    public required string EventType { get; set; }
    public int? SlideNumber { get; set; }
    public int? DurationSeconds { get; set; }
}

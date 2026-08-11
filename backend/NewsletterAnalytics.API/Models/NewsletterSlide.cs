namespace NewsletterAnalytics.API.Models;

public class NewsletterSlide
{
    public int Id { get; set; }

    // Foreign key + navigation property pair, pointing back at the parent Newsletter
    public int NewsletterId { get; set; }
    public Newsletter Newsletter { get; set; } = null!;

    public int SlideNumber { get; set; }
    public required string Title { get; set; }
    public required string Content { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

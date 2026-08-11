namespace NewsletterAnalytics.API.Models;

public class Newsletter
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public required string Status { get; set; }
    public required string CreatedBy { get; set; }

    // Navigation properties: how EF Core lets us walk the relationship as objects
    public ICollection<NewsletterSlide> Slides { get; set; } = new List<NewsletterSlide>();
    public ICollection<Recipient> Recipients { get; set; } = new List<Recipient>();
}

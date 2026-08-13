namespace NewsletterAnalytics.API.Models;

public class Newsletter
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public required NewsletterStatus Status { get; set; }
    public required string CreatedBy { get; set; }

    // Populated while Status == Scheduled (and left in place afterwards as a record of
    // what was scheduled): the UTC instant the background dispatcher should distribute
    // this newsletter at, and the audience to distribute it to. Actual Recipient rows
    // are only created once the dispatcher runs -- these fields just hold the intent.
    public DateTime? ScheduledAt { get; set; }
    public bool ScheduledAllEmployees { get; set; }
    public ICollection<Group> ScheduledGroups { get; set; } = new List<Group>();

    // Navigation properties: how EF Core lets us walk the relationship as objects
    public ICollection<NewsletterSlide> Slides { get; set; } = new List<NewsletterSlide>();
    public ICollection<Recipient> Recipients { get; set; } = new List<Recipient>();
}

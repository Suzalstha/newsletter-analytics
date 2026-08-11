namespace NewsletterAnalytics.API.Models;

// One row = "this Employee was sent this Newsletter" -- the unit the tracking token identifies.
public class Recipient
{
    public int Id { get; set; }

    public int NewsletterId { get; set; }
    public Newsletter Newsletter { get; set; } = null!;

    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    // Random, unguessable identifier used in the tracking URL instead of the employee's identity.
    public required string TrackingToken { get; set; }
    public DateTime? SentAt { get; set; }

    public ICollection<NewsletterEvent> Events { get; set; } = new List<NewsletterEvent>();
}

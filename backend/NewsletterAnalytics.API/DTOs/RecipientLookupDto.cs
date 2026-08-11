namespace NewsletterAnalytics.API.DTOs;

// What the newsletter viewer page gets back when it resolves a tracking token from the URL.
public class RecipientLookupDto
{
    public int RecipientId { get; set; }
    public int NewsletterId { get; set; }
    public required string NewsletterTitle { get; set; }
    public required string EmployeeName { get; set; }
}

namespace NewsletterAnalytics.API.DTOs;

public class RecipientDto
{
    public int Id { get; set; }
    public int NewsletterId { get; set; }
    public int EmployeeId { get; set; }
    public required string EmployeeName { get; set; }
    public required string Email { get; set; }
    public required string TrackingToken { get; set; }
    public DateTime? SentAt { get; set; }
}

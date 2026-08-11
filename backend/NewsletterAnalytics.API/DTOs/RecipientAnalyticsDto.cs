namespace NewsletterAnalytics.API.DTOs;

public class RecipientAnalyticsDto
{
    public int RecipientId { get; set; }
    public int EmployeeId { get; set; }
    public required string EmployeeName { get; set; }
    public required string Email { get; set; }
    public bool Opened { get; set; }
    public bool Completed { get; set; }
    public int SlidesViewed { get; set; }
    public int TotalReadTimeSeconds { get; set; }
    public DateTime? LastEventAt { get; set; }
}

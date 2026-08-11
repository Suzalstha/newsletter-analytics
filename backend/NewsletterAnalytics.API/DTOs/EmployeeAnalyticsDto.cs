namespace NewsletterAnalytics.API.DTOs;

public class EmployeeAnalyticsDto
{
    public int EmployeeId { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public int NewslettersReceived { get; set; }
    public int Opened { get; set; }
    public double OpenRate { get; set; }
    public int Completed { get; set; }
    public double CompletionRate { get; set; }
    public double AverageReadTimeSeconds { get; set; }
    public List<EmployeeNewsletterHistoryDto> RecentNewsletters { get; set; } = new();
}

public class EmployeeNewsletterHistoryDto
{
    public int NewsletterId { get; set; }
    public required string NewsletterTitle { get; set; }
    public bool Opened { get; set; }
    public bool Completed { get; set; }
    public int ReadTimeSeconds { get; set; }
}

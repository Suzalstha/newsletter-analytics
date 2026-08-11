namespace NewsletterAnalytics.API.DTOs;

public class DashboardOverviewDto
{
    public int TotalNewsletters { get; set; }
    public int TotalEmployees { get; set; }
    public int TotalRecipientsSent { get; set; }
    public double AverageOpenRate { get; set; }
    public double AverageCompletionRate { get; set; }
    public List<ActivityItemDto> RecentActivity { get; set; } = new();
}

public class ActivityItemDto
{
    public required string Type { get; set; } // NEWSLETTER_UPLOADED, NEWSLETTER_OPENED, NEWSLETTER_COMPLETED, EMPLOYEE_ADDED
    public required string Description { get; set; }
    public DateTime Timestamp { get; set; }
}

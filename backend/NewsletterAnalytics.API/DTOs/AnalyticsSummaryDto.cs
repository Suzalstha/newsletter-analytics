namespace NewsletterAnalytics.API.DTOs;

public class AnalyticsSummaryDto
{
    public int NewsletterId { get; set; }
    public int TotalSent { get; set; }
    public int TotalOpened { get; set; }
    public double OpenRate { get; set; }
    public int TotalCompleted { get; set; }
    public double CompletionRate { get; set; }
    public double AverageReadTimeSeconds { get; set; }
    public double AverageSlidesViewed { get; set; }
}

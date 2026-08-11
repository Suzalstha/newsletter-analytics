namespace NewsletterAnalytics.API.DTOs;

public class DistributeNewsletterDto
{
    public bool AllEmployees { get; set; }
    public List<int> GroupIds { get; set; } = new();
}

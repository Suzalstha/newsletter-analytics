namespace NewsletterAnalytics.API.DTOs;

public class GroupDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public int EmployeeCount { get; set; }
}

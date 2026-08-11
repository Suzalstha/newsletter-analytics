namespace NewsletterAnalytics.API.DTOs;

public class CreateEmployeeDto
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Department { get; set; }
    public List<int>? GroupIds { get; set; }
}

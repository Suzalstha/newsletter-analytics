namespace NewsletterAnalytics.API.DTOs;

public class EmployeeDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Department { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Groups { get; set; } = new();
}

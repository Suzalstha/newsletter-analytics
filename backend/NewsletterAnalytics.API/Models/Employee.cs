namespace NewsletterAnalytics.API.Models;

public class Employee
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Department { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Group> Groups { get; set; } = new List<Group>();
    public ICollection<Recipient> Recipients { get; set; } = new List<Recipient>();
}

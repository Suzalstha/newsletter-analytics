namespace NewsletterAnalytics.API.DTOs;

public class SlideDto
{
    public int Id { get; set; }
    public int SlideNumber { get; set; }
    public required string Title { get; set; }
    public required string Content { get; set; }
    public string? ImageUrl { get; set; }
}

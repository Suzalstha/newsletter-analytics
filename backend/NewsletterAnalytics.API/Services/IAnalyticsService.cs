using NewsletterAnalytics.API.DTOs;

namespace NewsletterAnalytics.API.Services;

public interface IAnalyticsService
{
    Task<AnalyticsSummaryDto?> GetSummaryAsync(int newsletterId);
    Task<List<SlideEngagementDto>> GetSlideEngagementAsync(int newsletterId);
    Task<List<RecipientAnalyticsDto>> GetRecipientAnalyticsAsync(int newsletterId);
    Task<EmployeeAnalyticsDto?> GetEmployeeAnalyticsAsync(int employeeId);
}

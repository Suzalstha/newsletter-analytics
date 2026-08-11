using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Services;

public interface IDistributionService
{
    // Sends a newsletter to every active employee in the given groups (or all active
    // employees if allEmployees is true). Employees already sent this newsletter are
    // skipped -- calling this twice for the same audience is safe.
    Task<List<Recipient>> DistributeAsync(int newsletterId, List<int> groupIds, bool allEmployees);
}

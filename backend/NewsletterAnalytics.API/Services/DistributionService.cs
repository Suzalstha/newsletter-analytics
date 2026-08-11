using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Services;

public class DistributionService : IDistributionService
{
    private readonly AppDbContext _context;

    public DistributionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Recipient>> DistributeAsync(int newsletterId, List<int> groupIds, bool allEmployees)
    {
        var employeeIdsQuery = allEmployees
            ? _context.Employees.Where(e => e.IsActive).Select(e => e.Id)
            : _context.Employees.Where(e => e.IsActive && e.Groups.Any(g => groupIds.Contains(g.Id))).Select(e => e.Id);

        var targetEmployeeIds = await employeeIdsQuery.Distinct().ToListAsync();

        var alreadySent = await _context.Recipients
            .Where(r => r.NewsletterId == newsletterId)
            .Select(r => r.EmployeeId)
            .ToListAsync();

        var newEmployeeIds = targetEmployeeIds.Except(alreadySent).ToList();

        var recipients = newEmployeeIds.Select(employeeId => new Recipient
        {
            NewsletterId = newsletterId,
            EmployeeId = employeeId,
            TrackingToken = GenerateTrackingToken(),
            SentAt = DateTime.UtcNow
        }).ToList();

        _context.Recipients.AddRange(recipients);
        await _context.SaveChangesAsync();

        return recipients;
    }

    private static string GenerateTrackingToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(24);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

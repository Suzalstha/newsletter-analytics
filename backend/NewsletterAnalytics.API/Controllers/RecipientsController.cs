using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;

namespace NewsletterAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecipientsController : ControllerBase
{
    private readonly AppDbContext _context;

    public RecipientsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{token}")]
    public async Task<ActionResult<RecipientLookupDto>> GetByToken(string token)
    {
        var recipient = await _context.Recipients
            .Where(r => r.TrackingToken == token)
            .Select(r => new RecipientLookupDto
            {
                RecipientId = r.Id,
                NewsletterId = r.NewsletterId,
                NewsletterTitle = r.Newsletter.Title,
                EmployeeName = r.Employee.Name
            })
            .FirstOrDefaultAsync();

        if (recipient is null)
        {
            return NotFound();
        }

        return Ok(recipient);
    }
}

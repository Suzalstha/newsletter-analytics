using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;

namespace NewsletterAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SettingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<CompanySettingsDto>> Get()
    {
        var settings = await _context.CompanySettings.FirstAsync(s => s.Id == 1);
        return Ok(new CompanySettingsDto { CompanyName = settings.CompanyName, TimeZoneId = settings.TimeZoneId });
    }

    [HttpPut]
    public async Task<IActionResult> Update(CompanySettingsDto dto)
    {
        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(dto.TimeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return BadRequest(new { message = $"Unknown timezone id \"{dto.TimeZoneId}\"." });
        }

        var settings = await _context.CompanySettings.FirstAsync(s => s.Id == 1);
        settings.CompanyName = dto.CompanyName;
        settings.TimeZoneId = dto.TimeZoneId;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

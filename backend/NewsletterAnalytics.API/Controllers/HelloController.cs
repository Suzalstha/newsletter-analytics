using Microsoft.AspNetCore.Mvc;

namespace NewsletterAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HelloController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { message = "Newsletter Analytics API is running" });
    }
}

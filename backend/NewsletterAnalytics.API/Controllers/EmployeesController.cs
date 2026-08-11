using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;
using NewsletterAnalytics.API.Models;
using NewsletterAnalytics.API.Services;

namespace NewsletterAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAnalyticsService _analyticsService;

    public EmployeesController(AppDbContext context, IAnalyticsService analyticsService)
    {
        _context = context;
        _analyticsService = analyticsService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? groupId,
        [FromQuery] string? department,
        [FromQuery] bool includeInactive = false)
    {
        var query = _context.Employees.Include(e => e.Groups).AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(e => e.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(e => e.Name.Contains(search) || e.Email.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(department))
        {
            query = query.Where(e => e.Department == department);
        }

        if (groupId.HasValue)
        {
            query = query.Where(e => e.Groups.Any(g => g.Id == groupId.Value));
        }

        var employees = await query
            .OrderBy(e => e.Name)
            .Select(e => new EmployeeDto
            {
                Id = e.Id,
                Name = e.Name,
                Email = e.Email,
                Department = e.Department,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt,
                Groups = e.Groups.Select(g => g.Name).ToList()
            })
            .ToListAsync();

        return Ok(employees);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EmployeeDto>> GetById(int id)
    {
        var employee = await _context.Employees
            .Include(e => e.Groups)
            .Where(e => e.Id == id)
            .Select(e => new EmployeeDto
            {
                Id = e.Id,
                Name = e.Name,
                Email = e.Email,
                Department = e.Department,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt,
                Groups = e.Groups.Select(g => g.Name).ToList()
            })
            .FirstOrDefaultAsync();

        return employee is null ? NotFound() : Ok(employee);
    }

    [HttpGet("{id}/analytics")]
    public async Task<ActionResult<EmployeeAnalyticsDto>> GetAnalytics(int id)
    {
        var result = await _analyticsService.GetEmployeeAnalyticsAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create(CreateEmployeeDto dto)
    {
        if (await _context.Employees.AnyAsync(e => e.Email == dto.Email))
        {
            return BadRequest(new { message = "An employee with this email already exists." });
        }

        var employee = new Employee
        {
            Name = dto.Name,
            Email = dto.Email,
            Department = dto.Department,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        if (dto.GroupIds is { Count: > 0 })
        {
            var groups = await _context.Groups.Where(g => dto.GroupIds.Contains(g.Id)).ToListAsync();
            foreach (var group in groups)
            {
                employee.Groups.Add(group);
            }
        }

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = employee.Id }, new EmployeeDto
        {
            Id = employee.Id,
            Name = employee.Name,
            Email = employee.Email,
            Department = employee.Department,
            IsActive = employee.IsActive,
            CreatedAt = employee.CreatedAt,
            Groups = employee.Groups.Select(g => g.Name).ToList()
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateEmployeeDto dto)
    {
        var employee = await _context.Employees.Include(e => e.Groups).FirstOrDefaultAsync(e => e.Id == id);
        if (employee is null)
        {
            return NotFound();
        }

        employee.Name = dto.Name;
        employee.Email = dto.Email;
        employee.Department = dto.Department;
        employee.IsActive = dto.IsActive;

        if (dto.GroupIds is not null)
        {
            var groups = await _context.Groups.Where(g => dto.GroupIds.Contains(g.Id)).ToListAsync();
            employee.Groups.Clear();
            foreach (var group in groups)
            {
                employee.Groups.Add(group);
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Deactivate rather than hard-delete: an employee's Recipient/tracking history must
    // survive even after they're removed from active distribution lists.
    [HttpDelete("{id}")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee is null)
        {
            return NotFound();
        }

        employee.IsActive = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

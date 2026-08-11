using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;
using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GroupsController : ControllerBase
{
    private readonly AppDbContext _context;

    public GroupsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GroupDto>>> GetAll()
    {
        var groups = await _context.Groups
            .OrderBy(g => g.Name)
            .Select(g => new GroupDto
            {
                Id = g.Id,
                Name = g.Name,
                CreatedAt = g.CreatedAt,
                EmployeeCount = g.Employees.Count(e => e.IsActive)
            })
            .ToListAsync();

        return Ok(groups);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<GroupDto>> GetById(int id)
    {
        var group = await _context.Groups
            .Where(g => g.Id == id)
            .Select(g => new GroupDto
            {
                Id = g.Id,
                Name = g.Name,
                CreatedAt = g.CreatedAt,
                EmployeeCount = g.Employees.Count(e => e.IsActive)
            })
            .FirstOrDefaultAsync();

        return group is null ? NotFound() : Ok(group);
    }

    [HttpGet("{id}/employees")]
    public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetEmployees(int id)
    {
        if (!await _context.Groups.AnyAsync(g => g.Id == id))
        {
            return NotFound();
        }

        var employees = await _context.Employees
            .Include(e => e.Groups)
            .Where(e => e.Groups.Any(g => g.Id == id))
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

    [HttpPost]
    public async Task<ActionResult<GroupDto>> Create(CreateGroupDto dto)
    {
        var group = new Group { Name = dto.Name, CreatedAt = DateTime.UtcNow };
        _context.Groups.Add(group);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = group.Id },
            new GroupDto { Id = group.Id, Name = group.Name, CreatedAt = group.CreatedAt, EmployeeCount = 0 });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Rename(int id, CreateGroupDto dto)
    {
        var group = await _context.Groups.FindAsync(id);
        if (group is null)
        {
            return NotFound();
        }

        group.Name = dto.Name;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var group = await _context.Groups.FindAsync(id);
        if (group is null)
        {
            return NotFound();
        }

        _context.Groups.Remove(group);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Replaces the group's full membership list with exactly the given employee ids.
    [HttpPut("{id}/employees")]
    public async Task<IActionResult> SetMembers(int id, UpdateGroupMembersDto dto)
    {
        var group = await _context.Groups.Include(g => g.Employees).FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
        {
            return NotFound();
        }

        var employees = await _context.Employees.Where(e => dto.EmployeeIds.Contains(e.Id)).ToListAsync();

        group.Employees.Clear();
        foreach (var employee in employees)
        {
            group.Employees.Add(employee);
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}

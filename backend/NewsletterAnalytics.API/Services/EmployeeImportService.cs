using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.DTOs;
using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Services;

public class EmployeeImportService : IEmployeeImportService
{
    private static readonly string[] ExpectedHeader = ["Name", "Email", "Department", "Group"];

    private readonly AppDbContext _context;

    public EmployeeImportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<EmployeeImportSummaryDto> PreviewAsync(Stream csvStream)
    {
        var rows = await ParseAndValidateAsync(csvStream);
        return Summarize(rows, importedCount: 0);
    }

    public async Task<EmployeeImportSummaryDto> ImportAsync(Stream csvStream)
    {
        // Re-validate against current data rather than trusting whatever the client
        // saw during preview -- another admin may have imported/added something since.
        var rows = await ParseAndValidateAsync(csvStream);

        var groupCache = new Dictionary<string, Group>(StringComparer.OrdinalIgnoreCase);
        foreach (var group in await _context.Groups.ToListAsync())
        {
            groupCache[group.Name] = group;
        }

        var imported = 0;
        foreach (var row in rows.Where(r => r.Status == "Valid"))
        {
            var groupName = row.Group!.Trim();
            if (!groupCache.TryGetValue(groupName, out var group))
            {
                group = new Group { Name = groupName, CreatedAt = DateTime.UtcNow };
                _context.Groups.Add(group);
                groupCache[groupName] = group;
            }

            var employee = new Employee
            {
                Name = row.Name!.Trim(),
                Email = row.Email!.Trim(),
                Department = row.Department!.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            employee.Groups.Add(group);

            _context.Employees.Add(employee);
            imported++;
        }

        // One SaveChanges call -- every new Group and Employee added above commits
        // together, or none of them do if something fails.
        await _context.SaveChangesAsync();

        return Summarize(rows, imported);
    }

    private async Task<List<EmployeeImportRowDto>> ParseAndValidateAsync(Stream csvStream)
    {
        using var reader = new StreamReader(csvStream);

        string? headerLine = await reader.ReadLineAsync();
        while (headerLine is not null && headerLine.Trim().Length == 0)
        {
            headerLine = await reader.ReadLineAsync();
        }

        if (headerLine is null)
        {
            throw new InvalidOperationException("The CSV file is empty.");
        }

        var headerFields = SplitCsvLine(headerLine).Select(f => f.Trim()).ToArray();
        if (headerFields.Length != ExpectedHeader.Length ||
            !headerFields.Select(f => f.ToLowerInvariant()).SequenceEqual(ExpectedHeader.Select(f => f.ToLowerInvariant())))
        {
            throw new InvalidOperationException(
                $"Invalid CSV structure: expected header \"{string.Join(",", ExpectedHeader)}\".");
        }

        var rows = new List<EmployeeImportRowDto>();
        var seenInFile = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase); // email -> first row number

        int rowNumber = 1; // row 1 is the first data row, right after the header
        string? line;
        while ((line = await reader.ReadLineAsync()) is not null)
        {
            if (line.Trim().Length == 0)
            {
                continue; // skip blank lines silently -- not counted as a row
            }

            var row = ParseRow(rowNumber, line, seenInFile);
            rows.Add(row);
            rowNumber++;
        }

        await FlagDatabaseDuplicatesAsync(rows);

        return rows;
    }

    private static EmployeeImportRowDto ParseRow(int rowNumber, string line, Dictionary<string, int> seenInFile)
    {
        var fields = SplitCsvLine(line);

        var row = new EmployeeImportRowDto { RowNumber = rowNumber, Status = "Invalid" };

        if (fields.Count != ExpectedHeader.Length)
        {
            row.Reason = $"Invalid row format (expected {ExpectedHeader.Length} columns, found {fields.Count}).";
            return row;
        }

        var name = fields[0].Trim();
        var email = fields[1].Trim();
        var department = fields[2].Trim();
        var group = fields[3].Trim();

        row.Name = name;
        row.Email = email;
        row.Department = department;
        row.Group = group;

        var reasons = new List<string>();

        if (name.Length == 0)
        {
            reasons.Add("Missing Name");
        }

        if (email.Length == 0)
        {
            reasons.Add("Missing Email");
        }
        else if (!IsValidEmail(email))
        {
            reasons.Add("Invalid email address");
        }

        if (department.Length == 0)
        {
            reasons.Add("Missing Department");
        }

        if (group.Length == 0)
        {
            reasons.Add("Missing Group");
        }

        if (reasons.Count > 0)
        {
            row.Reason = string.Join("; ", reasons);
            return row;
        }

        // Only rows with a syntactically valid email participate in duplicate detection.
        if (seenInFile.TryGetValue(email, out var firstRow))
        {
            row.Status = "Duplicate";
            row.Reason = $"Duplicate row in CSV (already listed on row {firstRow})";
            return row;
        }

        seenInFile[email] = rowNumber;
        row.Status = "Valid";
        return row;
    }

    private async Task FlagDatabaseDuplicatesAsync(List<EmployeeImportRowDto> rows)
    {
        var candidateEmails = rows
            .Where(r => r.Status == "Valid")
            .Select(r => r.Email!.ToLowerInvariant())
            .Distinct()
            .ToList();

        if (candidateEmails.Count == 0)
        {
            return;
        }

        var existingEmails = await _context.Employees
            .Select(e => e.Email.ToLower())
            .Where(email => candidateEmails.Contains(email))
            .ToListAsync();

        if (existingEmails.Count == 0)
        {
            return;
        }

        var existingSet = new HashSet<string>(existingEmails, StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            if (row.Status == "Valid" && existingSet.Contains(row.Email!.ToLowerInvariant()))
            {
                row.Status = "Duplicate";
                row.Reason = "An employee with this email already exists";
            }
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            _ = new MailAddress(email);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    // Minimal RFC4180-style splitter: handles plain fields and "quoted, with commas" fields.
    private static List<string> SplitCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    current.Append(c);
                }
            }
            else if (c == '"')
            {
                inQuotes = true;
            }
            else if (c == ',')
            {
                fields.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        fields.Add(current.ToString());
        return fields;
    }

    private static EmployeeImportSummaryDto Summarize(List<EmployeeImportRowDto> rows, int importedCount)
    {
        return new EmployeeImportSummaryDto
        {
            TotalRows = rows.Count,
            ValidCount = rows.Count(r => r.Status == "Valid"),
            DuplicateCount = rows.Count(r => r.Status == "Duplicate"),
            InvalidCount = rows.Count(r => r.Status == "Invalid"),
            ImportedCount = importedCount,
            Rows = rows
        };
    }
}

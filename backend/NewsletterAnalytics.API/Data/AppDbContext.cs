using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using NewsletterAnalytics.API.Models;

namespace NewsletterAnalytics.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Newsletter> Newsletters { get; set; } = null!;
    public DbSet<NewsletterSlide> NewsletterSlides { get; set; } = null!;
    public DbSet<Recipient> Recipients { get; set; } = null!;
    public DbSet<NewsletterEvent> NewsletterEvents { get; set; } = null!;
    public DbSet<Employee> Employees { get; set; } = null!;
    public DbSet<Group> Groups { get; set; } = null!;
    public DbSet<CompanySettings> CompanySettings { get; set; } = null!;

    // SQL Server has no concept of "this DateTime is UTC" -- it stores a plain timestamp
    // and EF Core reads it back as DateTimeKind.Unspecified. Without this, the JSON we send
    // to the frontend has no "Z" suffix, and the browser silently (and wrongly) parses it as
    // local time instead of UTC, corrupting every "time ago" display.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<UtcNullableDateTimeConverter>();
    }

    private class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
    {
        public UtcDateTimeConverter() : base(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
        {
        }
    }

    private class UtcNullableDateTimeConverter : ValueConverter<DateTime?, DateTime?>
    {
        public UtcNullableDateTimeConverter() : base(
            v => v,
            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v)
        {
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // NewsletterEvent has two paths back to Newsletters (direct, and via Recipient).
        // SQL Server won't allow cascade delete on both, so we restrict this one and let
        // the Recipients -> NewsletterEvents cascade handle cleanup instead.
        modelBuilder.Entity<NewsletterEvent>()
            .HasOne(e => e.Newsletter)
            .WithMany()
            .HasForeignKey(e => e.NewsletterId)
            .OnDelete(DeleteBehavior.Restrict);

        // A Recipient references both a Newsletter and an Employee. Deleting a Newsletter
        // should clean up its Recipients (cascade); deleting an Employee should NOT silently
        // delete their send/tracking history, so that side is restricted.
        modelBuilder.Entity<Recipient>()
            .HasOne(r => r.Employee)
            .WithMany(e => e.Recipients)
            .HasForeignKey(r => r.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Employee <-> Group is many-to-many with nothing extra to store on the relationship,
        // so EF Core generates the join table automatically -- no explicit join entity needed.
        modelBuilder.Entity<CompanySettings>().HasData(
            new CompanySettings { Id = 1, CompanyName = "Himalayan Everest Insurance", LogoUrl = null }
        );
    }
}

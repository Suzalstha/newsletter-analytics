using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using NewsletterAnalytics.API.Data;
using NewsletterAnalytics.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IPdfImportService, PdfImportService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IDistributionService, DistributionService>();
builder.Services.AddScoped<IEmployeeImportService, EmployeeImportService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var storedFilesRoot = Path.Combine(app.Environment.ContentRootPath, "StoredFiles", "newsletters");
Directory.CreateDirectory(storedFilesRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(storedFilesRoot),
    RequestPath = "/uploads/newsletters"
});

app.UseCors("Frontend");

app.UseAuthorization();

app.MapControllers();

app.Run();

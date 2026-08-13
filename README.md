# Newsletter Analytics

An internal tool for **Himalayan Everest Insurance** to turn a finished newsletter PDF into a trackable, per-employee reading experience: each page becomes a slide, each recipient gets a unique tracking link, and admins get a dashboard showing opens, completions, reading time, and slide-by-slide drop-off — plus employee/group management with CSV bulk import and newsletter scheduling.

## What the project does

- **Upload → track, no authoring tools.** An admin uploads a finished, designed PDF. Each page is rasterized into one slide (image); there's no in-app editor — the PDF is the source of truth.
- **Per-employee tracking links.** Distributing a newsletter (to specific groups or everyone) generates one unique tracking token per employee. Opening that link records opens, per-slide views (with duration), and completion — all tied back to that one employee.
- **Analytics dashboard.** Open rate, completion rate, average read time, slide-by-slide engagement/drop-off, per-employee and per-group breakdowns.
- **Employee & group management.** Add/edit/soft-delete employees, create/rename/delete groups, manage group membership, and bulk-import employees from a CSV (with validation, duplicate detection, and import history).
- **Newsletter status & scheduling.** Newsletters move through `Draft → Scheduled → Sending → Sent → Completed`. A newsletter can be sent immediately or scheduled for a future date/time in the company's configured timezone; a server-side background service — not a browser timer — sends it even if nobody has the admin UI open.
- **Light/dark theme**, throughout.

## System architecture

```
┌─────────────────────┐        HTTP (JSON / multipart)        ┌──────────────────────────┐
│   Frontend           │ ─────────────────────────────────────▶ │   Backend                │
│   Next.js 16 (React) │ ◀───────────────────────────────────── │   ASP.NET Core Web API   │
│   localhost:3000     │                                        │   localhost:5166         │
└─────────────────────┘                                        └────────────┬─────────────┘
                                                                              │ EF Core
                                                                              ▼
                                                                 ┌──────────────────────────┐
                                                                 │   SQL Server              │
                                                                 │   localhost:1433          │
                                                                 │   NewsletterAnalyticsDb   │
                                                                 └──────────────────────────┘
```

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4. Server Components fetch from the API directly; a handful of interactive pieces (forms, the CSV import panel, theme toggle) are Client Components. No frontend framework state library — just `fetch` through `lib/api.ts`.
- **Backend**: ASP.NET Core Web API (.NET, `net10.0`), thin controllers → services → `AppDbContext` (EF Core), DTOs for every request/response. A `BackgroundService` (`ScheduledNewsletterDispatcher`) runs inside the same process to execute scheduled sends.
- **Database**: SQL Server, accessed only through EF Core migrations — no hand-written schema changes.
- **File storage**: uploaded PDFs and their rasterized slide images are written to `backend/NewsletterAnalytics.API/StoredFiles/newsletters/{newsletterId}/` and served back over HTTP at `/uploads/newsletters/...` (see `Program.cs`). This is local disk storage, not blob storage — fine for one instance, worth knowing if you ever deploy behind multiple instances.

### Repository layout

```
newsletter-analytics/
├── backend/
│   └── NewsletterAnalytics.API/
│       ├── Controllers/        one controller per resource (thin — no business logic)
│       ├── Services/           business logic (distribution, analytics, CSV import, scheduling, email)
│       ├── Models/              EF Core entities
│       ├── DTOs/                request/response shapes — controllers never return entities directly
│       ├── Data/AppDbContext.cs
│       ├── Migrations/
│       ├── appsettings.json               committed, no secrets
│       └── appsettings.Development.json   NOT committed — you create this locally (see below)
└── frontend/
    ├── app/                    Next.js App Router pages
    ├── components/
    └── lib/                    api.ts, format.ts, trackEvent.ts, etc.
```

## Prerequisites

- **Node.js** 20+ and npm (developed against Node v20.20.2 / npm 10.8.2)
- **.NET SDK** for `net10.0` (developed against `10.0.302`; check with `dotnet --list-sdks`)
- **SQL Server** reachable at whatever host/port you put in your connection string (a local Docker container is the easiest option — see below)
- **EF Core CLI tools**, for running migrations:
  ```bash
  dotnet tool install --global dotnet-ef
  ```

## Database setup

There's no `docker-compose.yml` in the repo — spin up SQL Server yourself however you like. Locally, Docker is simplest. Pick your own `SA` password (do **not** reuse an example password from any docs):

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=<your-own-strong-password>" \
  -p 1433:1433 --name newsletter-sql \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

The app expects a database named `NewsletterAnalyticsDb` — you don't need to create it by hand; the first `dotnet ef database update` (below) creates it along with all tables.

## Configuration

### Backend

`appsettings.json` (committed) has no connection string on purpose. You provide one locally in `appsettings.Development.json`, which is **git-ignored** (see `.gitignore`: `backend/**/appsettings.Development.json`). Create it yourself:

```json
// backend/NewsletterAnalytics.API/appsettings.Development.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=NewsletterAnalyticsDb;User Id=sa;Password=<your-own-strong-password>;TrustServerCertificate=True;"
  }
}
```

Use the same password you gave the Docker container above. This file is loaded automatically when `ASPNETCORE_ENVIRONMENT=Development` (the default for `dotnet run`, set in `Properties/launchSettings.json`).

CORS is currently locked to a single hardcoded origin, `http://localhost:3000` (see `Program.cs`) — if you run the frontend on a different port, update the `AddCors` policy there.

### Frontend

One env file, `frontend/.env.local` (also git-ignored — see `frontend/.gitignore`'s `.env*` rule):

```
NEXT_PUBLIC_API_URL=http://localhost:5166
```

This is the only environment variable the frontend uses; every API call goes through `lib/api.ts`, which reads it.

## Running the app

Backend (from `backend/NewsletterAnalytics.API/`):

```bash
dotnet run
```

This uses the `http` launch profile by default → **http://localhost:5166** (an `https` profile also exists, on `https://localhost:7298`, if you want it — pass `--launch-profile https`). Leave this running; the scheduling background service only fires while the process is up.

Frontend (from `frontend/`):

```bash
npm install
npm run dev
```

→ **http://localhost:3000**

Other frontend scripts: `npm run build`, `npm run start` (production server), `npm run lint`.

## Running migrations

All commands run from `backend/NewsletterAnalytics.API/`.

Apply existing migrations to your database (do this after cloning, and any time you pull new migrations):

```bash
dotnet ef database update
```

Create a new migration after changing an entity in `Models/` or `AppDbContext.OnModelCreating`:

```bash
dotnet ef migrations add <DescriptiveName>
```

**Always review the generated `Up()`/`Down()` methods before applying** — this project has needed hand-added data migrations more than once (e.g. backfilling a new required column from existing rows). Never edit the database by hand outside of migrations.

Current migration history, for reference:

| Migration | What it did |
|---|---|
| `InitialCreate` | Newsletters, slides, recipients, events |
| `AddEmployeesGroupsAndSettings` | Employees, groups, company settings |
| `RemoveLogoUrl` | Dropped an unused settings column |
| `AddEmployeeImportBatchAndNewsletterScheduling` | CSV import history table; newsletter status/scheduling columns; company timezone |

## How CSV employee import works

**Frontend**: `components/BulkImportPanel.tsx` — a drag-and-drop CSV dropzone. Required columns, in order: `Name,Email,Department,Group`.

**Flow**: upload → **preview** (validates, writes nothing) → admin reviews → **confirm** (re-validates, then actually imports).

- `POST /api/employees/import/preview` — parses and validates the CSV, returns every row's status (`Valid` / `Duplicate` / `Invalid`) with a reason. Duplicates are tagged `InFile` (repeated within the same CSV) or `InDatabase` (email already belongs to an existing employee) so the UI can show them separately.
- `POST /api/employees/import/confirm` — re-parses and re-validates the same file (in case something changed since the preview), then for every `Valid` row: finds-or-creates the named `Group`, creates the `Employee`, and links them. Everything commits in one `SaveChangesAsync()` — it's all-or-nothing for the batch, but individual duplicate/invalid rows are simply skipped, never blocking the valid ones.
- Both endpoints are implemented in `Services/EmployeeImportService.cs`; the controller (`EmployeesController`) just wires up the HTTP plumbing.
- Every **confirmed** import (success or failure, e.g. a bad header) is recorded in the `EmployeeImportBatches` table — filename, timestamp, and counts only; **the uploaded file itself is never stored**. Previews are never recorded. See it at `GET /api/employees/import/history`, rendered at `/employees/import-history` in the app.

## How newsletter scheduling works

A newsletter's `Status` (`Models/NewsletterStatus.cs`) is a real enum column, not a frontend-only flag: `Draft → Scheduled → Sending → Sent → Completed`.

- **Send Now** (`POST /api/newsletters/{id}/distribute`, unchanged from the original distribution endpoint): flips the newsletter to `Sending`, calls `IDistributionService.DistributeAsync` (creates one `Recipient` + tracking token per targeted active employee, skipping anyone already sent this newsletter), then flips to `Sent`.
- **Schedule** (`POST /api/newsletters/{id}/schedule`): only valid from `Draft` or `Scheduled` — calling it again on an already-`Scheduled` newsletter *is* how you edit the schedule, no separate endpoint. The request carries a plain local date/time string (`yyyy-MM-ddTHH:mm`, no timezone) plus the intended audience (all employees, or specific group ids). The server converts that local time to UTC using the **company's configured timezone** (`CompanySettings.TimeZoneId`, editable on the Settings page — an IANA id like `Asia/Kathmandu`, not the admin's browser timezone), and stores the audience in `Newsletter.ScheduledGroups`/`ScheduledAllEmployees`. Distribution itself does **not** happen yet.
- **Cancel schedule** (`POST /api/newsletters/{id}/cancel-schedule`): only valid from `Scheduled` — returns the newsletter to `Draft` and clears the scheduling fields. Nothing is deleted.
- **The actual sending**: `Services/ScheduledNewsletterDispatcher.cs`, a `BackgroundService` registered in `Program.cs`, polls every 30 seconds for `Scheduled` newsletters whose time has arrived. For each one it claims it (`Sending`), calls the exact same `IDistributionService` used by Send Now, then flips to `Sent`. This runs **inside the API process** — it is not a browser `setTimeout` and does not depend on any admin's browser being open. If the API process isn't running, nothing gets scheduled or sent; there's no separate worker process to start.
- **Mark as Completed** (`POST /api/newsletters/{id}/complete`): only valid from `Sent`. This is a manual admin action, deliberately independent of reading-completion analytics — "the newsletter's distribution is done" is not the same claim as "every recipient finished reading it." Reading completion stays purely an analytics concept (see below).

## How tracking and analytics work

```
Employee clicks tracking link
        │
        ▼
GET /newsletter/{token}  (public reader page, no admin chrome)
        │  resolves token → GET /api/recipients/{token}
        ▼
NewsletterViewer.tsx fires events as the employee reads:
  - NEWSLETTER_OPENED   on first render
  - SLIDE_VIEWED        when leaving a slide, with durationSeconds
  - NEWSLETTER_COMPLETED  on finishing the last slide
        │  each is POST /api/analytics/track (lib/trackEvent.ts — fire-and-forget,
        │  a tracking failure must never break the reading experience)
        ▼
NewsletterEvent row written (Controllers/AnalyticsController.cs)
        │
        ▼
Services/AnalyticsService.cs aggregates NewsletterEvent rows into:
  - per-newsletter summary (open rate, completion rate, avg. read time)
  - per-slide engagement (view count, % of openers who reached that slide)
  - per-recipient and per-employee breakdowns
        │
        ▼
Dashboard, Analytics, Employee, and Group pages
```

The `TrackEventInput` type (`lib/trackEvent.ts`) also defines `SLIDE_EXITED` and `LINK_CLICKED` as valid event types the backend already accepts, but nothing in the app currently emits them — only the three listed above are actually fired today.

Tracking tokens (`Recipient.TrackingToken`) are random 24-byte hex strings, generated once per employee per newsletter distribution (`Services/DistributionService.cs`) — they identify the recipient, not the employee's real identity, in the URL.

## Email delivery is currently **NOT connected**

There is no real email-sending code anywhere in this repository. "Distributing" a newsletter (whether via Send Now or a scheduled send) only ever creates `Recipient` rows with tracking tokens and links — it does not send an email to anyone.

`Services/IEmailService.cs` defines the interface `SendNewsletterEmailAsync(Recipient, Newsletter)`; the only implementation registered today is `Services/NullEmailService.cs`, which does nothing but log that delivery was skipped:

```csharp
_logger.LogInformation(
    "Email delivery not yet configured -- skipping send for employeeId={EmployeeId}, newsletterId={NewsletterId} (\"{Title}\").",
    ...);
```

`ScheduledNewsletterDispatcher` and the Send Now path both already call `IEmailService` for every recipient — the integration point exists and is exercised on every send, it's just wired to a no-op. A newsletter's `Sent` status reflects that distribution (tracking-link generation) finished, **not** that any email left the building.

### Configuring a future email provider

1. Implement `IEmailService` for your provider (SMTP, SendGrid, SES, etc.) — e.g. `Services/SmtpEmailService.cs`. It receives the `Recipient` (has `TrackingToken`, `EmployeeId`) and `Newsletter` (has `Title`, etc.); build whatever tracking URL and template you need from those.
2. Add whatever configuration it needs (API key, SMTP host/credentials) to `appsettings.Development.json` locally and to your real secret store in production — **never commit real credentials**, following the same pattern as `ConnectionStrings` above.
3. Swap the DI registration in `Program.cs`:
   ```csharp
   // builder.Services.AddScoped<IEmailService, NullEmailService>();
   builder.Services.AddScoped<IEmailService, SmtpEmailService>();
   ```
   Nothing in `ScheduledNewsletterDispatcher`, `NewslettersController`, or `DistributionService` needs to change — they only depend on the interface.

## Common errors and fixes

| Symptom | Cause | Fix |
|---|---|---|
| Frontend pages fail to load data / `fetch failed` in the browser console | Backend isn't running, or `NEXT_PUBLIC_API_URL` doesn't point at it | Confirm `dotnet run` is up on `http://localhost:5166`; confirm `frontend/.env.local` has the matching URL, then restart `npm run dev` (env files are only read at server start) |
| Browser console shows a CORS error | Frontend is running on a port other than `3000` | Update the hardcoded origin in the `AddCors` policy in `Program.cs`, or run the frontend on 3000 |
| Backend throws on startup / EF Core connection errors | SQL Server isn't running, or the connection string is wrong/missing | Make sure your SQL container is up (`docker ps`), confirm `appsettings.Development.json` exists locally with the right password (it's git-ignored, so it won't exist after a fresh clone — you must create it) |
| `Cannot open database "NewsletterAnalyticsDb"` or missing-table errors | Migrations haven't been applied to this database yet | Run `dotnet ef database update` from `backend/NewsletterAnalytics.API/` |
| `dotnet ef` : command not found | The EF Core CLI tool isn't installed | `dotnet tool install --global dotnet-ef` |
| Scheduled newsletters never send | The backend process isn't running continuously, or the newsletter's `ScheduledAt` hasn't arrived yet | `ScheduledNewsletterDispatcher` only runs while `dotnet run` is up, and polls every 30s — leave the process running; check the console/log output for `Dispatched scheduled newsletter ...` or `Failed to dispatch ...` |
| Scheduling a newsletter fails with "Scheduled time must be in the future" or a timezone error | The date/time you entered, once interpreted in the company's configured timezone, isn't actually in the future — or `CompanySettings.TimeZoneId` isn't a valid IANA id | Check the timezone shown on the Settings page; it must be a real IANA id (e.g. `Asia/Kathmandu`, `America/New_York`), not a Windows-style id |
| PDF upload fails with "Only PDF files are accepted" | Non-PDF file, or wrong `Content-Type` on the upload | Upload an actual `.pdf`; the check is on both file extension and MIME type (`Controllers/NewslettersController.cs`) |
| PDF upload succeeds but slide images are missing/broken | `StoredFiles/newsletters/` wasn't writable, or SkiaSharp's native library failed to load (mainly a Linux issue) | Check the backend process has write access to `backend/NewsletterAnalytics.API/StoredFiles/`; on Linux, `PDFtoImage`/`SkiaSharp` need their native libraries available — check the startup logs for a `DllNotFoundException` |
| "An employee with this email already exists" on Add/CSV import | Email uniqueness is checked against **all** employees, including soft-deleted (inactive) ones | Reactivate the existing employee via edit instead of creating a new one, or use a different email |

## A note on secrets

This repo has been audited: no passwords, connection strings, or API keys are committed anywhere in git history. The only place real credentials exist is `backend/NewsletterAnalytics.API/appsettings.Development.json`, which is git-ignored and must be created locally by each developer (see **Configuration** above). Keep it that way — don't remove it from `.gitignore`, and don't paste real credentials into any file that isn't already git-ignored.

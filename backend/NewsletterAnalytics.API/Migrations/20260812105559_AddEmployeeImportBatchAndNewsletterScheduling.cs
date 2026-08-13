using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NewsletterAnalytics.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeImportBatchAndNewsletterScheduling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ScheduledAllEmployees",
                table: "Newsletters",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ScheduledAt",
                table: "Newsletters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TimeZoneId",
                table: "CompanySettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            // Data migration for existing rows: the old status vocabulary ("Draft" /
            // "Published", set together the moment a PDF finished processing) is replaced
            // by the real Draft/Scheduled/Sending/Sent/Completed lifecycle. There is no
            // single correct mapping from the old value alone, so this uses real data --
            // whether the newsletter has ever actually been distributed to anyone --
            // rather than guessing:
            //  - "Published" with zero Recipients was, in practice, still just a draft
            //    that had never been sent -- mapped to Draft, and PublishedAt is cleared
            //    since it no longer means "actually sent" for this row.
            //  - "Published" with at least one Recipient has genuinely been distributed --
            //    mapped to Sent, keeping its existing PublishedAt as the (approximate)
            //    send date, since recomputing an exact original send time isn't possible
            //    from the data that exists.
            //  - Existing "Draft" rows need no change; they already match the new value.
            migrationBuilder.Sql(@"
                UPDATE Newsletters
                SET Status = 'Draft', PublishedAt = NULL
                WHERE Status = 'Published'
                  AND Id NOT IN (SELECT DISTINCT NewsletterId FROM Recipients);
            ");

            migrationBuilder.Sql(@"
                UPDATE Newsletters
                SET Status = 'Sent'
                WHERE Status = 'Published'
                  AND Id IN (SELECT DISTINCT NewsletterId FROM Recipients);
            ");

            migrationBuilder.CreateTable(
                name: "EmployeeImportBatches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalRows = table.Column<int>(type: "int", nullable: false),
                    ImportedCount = table.Column<int>(type: "int", nullable: false),
                    DuplicateCount = table.Column<int>(type: "int", nullable: false),
                    InvalidCount = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeImportBatches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GroupNewsletter",
                columns: table => new
                {
                    NewsletterId = table.Column<int>(type: "int", nullable: false),
                    ScheduledGroupsId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupNewsletter", x => new { x.NewsletterId, x.ScheduledGroupsId });
                    table.ForeignKey(
                        name: "FK_GroupNewsletter_Groups_ScheduledGroupsId",
                        column: x => x.ScheduledGroupsId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GroupNewsletter_Newsletters_NewsletterId",
                        column: x => x.NewsletterId,
                        principalTable: "Newsletters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "CompanySettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "TimeZoneId",
                value: "Asia/Kathmandu");

            migrationBuilder.CreateIndex(
                name: "IX_GroupNewsletter_ScheduledGroupsId",
                table: "GroupNewsletter",
                column: "ScheduledGroupsId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmployeeImportBatches");

            migrationBuilder.DropTable(
                name: "GroupNewsletter");

            migrationBuilder.DropColumn(
                name: "ScheduledAllEmployees",
                table: "Newsletters");

            migrationBuilder.DropColumn(
                name: "ScheduledAt",
                table: "Newsletters");

            migrationBuilder.DropColumn(
                name: "TimeZoneId",
                table: "CompanySettings");
        }
    }
}

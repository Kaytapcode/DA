using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseEnrollmentStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Backfill existing enrollments as 'Approved': every row created before this
            // migration was a direct OrgAdmin enrollment, which is approved by definition.
            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "course_enrollments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Approved");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "status",
                table: "course_enrollments");
        }
    }
}

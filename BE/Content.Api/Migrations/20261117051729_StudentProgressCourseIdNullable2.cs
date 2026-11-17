using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Api.Migrations
{
    /// <inheritdoc />
    public partial class StudentProgressCourseIdNullable2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // M2: the model snapshot already says nullable (an earlier designer-less migration that EF
            // never applied), so this is raw SQL. DROP NOT NULL is a no-op on DBs that already have it.
            migrationBuilder.Sql("ALTER TABLE student_progress ALTER COLUMN course_id DROP NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM student_progress WHERE course_id IS NULL;");
            migrationBuilder.Sql("ALTER TABLE student_progress ALTER COLUMN course_id SET NOT NULL;");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixStudentProgressPerContentIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_student_progress_course_id_user_id_module_id",
                table: "student_progress");

            migrationBuilder.CreateIndex(
                name: "IX_student_progress_course_id_user_id_module_id_content_id",
                table: "student_progress",
                columns: new[] { "course_id", "user_id", "module_id", "content_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_student_progress_course_id_user_id_module_id_content_id",
                table: "student_progress");

            migrationBuilder.CreateIndex(
                name: "IX_student_progress_course_id_user_id_module_id",
                table: "student_progress",
                columns: new[] { "course_id", "user_id", "module_id" },
                unique: true);
        }
    }
}

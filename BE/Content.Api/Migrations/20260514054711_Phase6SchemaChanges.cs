using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Api.Migrations
{
    /// <inheritdoc />
    public partial class Phase6SchemaChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_documents_contents_content_id",
                table: "documents");

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "questions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "explanation",
                table: "questions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "questions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_mastered",
                table: "flashcards",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "mastered_at",
                table: "flashcards",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "flashcards",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "content_id",
                table: "documents",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "documents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "file_name",
                table: "documents",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "is_public",
                table: "documents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "documents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "quiz_attempts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    quiz_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    score_percentage = table.Column<int>(type: "integer", nullable: true),
                    answers = table.Column<string>(type: "jsonb", nullable: false),
                    time_taken_seconds = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quiz_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_quiz_attempts_quizzes_quiz_id",
                        column: x => x.quiz_id,
                        principalTable: "quizzes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "student_progress",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    course_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    module_id = table.Column<Guid>(type: "uuid", nullable: true),
                    content_id = table.Column<Guid>(type: "uuid", nullable: true),
                    progress_percentage = table.Column<int>(type: "integer", nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    time_spent_seconds = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_progress", x => x.id);
                    table.ForeignKey(
                        name: "FK_student_progress_contents_content_id",
                        column: x => x.content_id,
                        principalTable: "contents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_student_progress_courses_course_id",
                        column: x => x.course_id,
                        principalTable: "courses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_progress_modules_module_id",
                        column: x => x.module_id,
                        principalTable: "modules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_quiz_attempts_quiz_id",
                table: "quiz_attempts",
                column: "quiz_id");

            migrationBuilder.CreateIndex(
                name: "IX_quiz_attempts_user_id_quiz_id",
                table: "quiz_attempts",
                columns: new[] { "user_id", "quiz_id" });

            migrationBuilder.CreateIndex(
                name: "IX_student_progress_content_id",
                table: "student_progress",
                column: "content_id");

            migrationBuilder.CreateIndex(
                name: "IX_student_progress_course_id_user_id_module_id",
                table: "student_progress",
                columns: new[] { "course_id", "user_id", "module_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_progress_module_id",
                table: "student_progress",
                column: "module_id");

            migrationBuilder.AddForeignKey(
                name: "FK_documents_contents_content_id",
                table: "documents",
                column: "content_id",
                principalTable: "contents",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_documents_contents_content_id",
                table: "documents");

            migrationBuilder.DropTable(
                name: "quiz_attempts");

            migrationBuilder.DropTable(
                name: "student_progress");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "explanation",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "is_mastered",
                table: "flashcards");

            migrationBuilder.DropColumn(
                name: "mastered_at",
                table: "flashcards");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "flashcards");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "file_name",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "is_public",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "documents");

            migrationBuilder.AlterColumn<Guid>(
                name: "content_id",
                table: "documents",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_documents_contents_content_id",
                table: "documents",
                column: "content_id",
                principalTable: "contents",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

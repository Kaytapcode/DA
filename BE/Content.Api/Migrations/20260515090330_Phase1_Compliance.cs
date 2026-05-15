using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Api.Migrations
{
    /// <inheritdoc />
    public partial class Phase1_Compliance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "url",
                table: "videos");

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "videos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "videos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "thumbnail_url",
                table: "videos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "title",
                table: "videos",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "videos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "youtube_video_id",
                table: "videos",
                type: "character varying(11)",
                maxLength: 11,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "is_ai_generated",
                table: "quizzes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "contents",
                type: "uuid",
                nullable: true);

            // Spec §1: User-created resources MUST be public. Default new + existing rows to TRUE.
            migrationBuilder.AddColumn<bool>(
                name: "is_public",
                table: "contents",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "course_enrollments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    course_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    enrolled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_enrollments", x => x.id);
                    table.ForeignKey(
                        name: "FK_course_enrollments_courses_course_id",
                        column: x => x.course_id,
                        principalTable: "courses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_course_enrollments_course_id_user_id",
                table: "course_enrollments",
                columns: new[] { "course_id", "user_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "course_enrollments");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "description",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "thumbnail_url",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "title",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "youtube_video_id",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "is_ai_generated",
                table: "quizzes");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "contents");

            migrationBuilder.DropColumn(
                name: "is_public",
                table: "contents");

            migrationBuilder.AddColumn<string>(
                name: "url",
                table: "videos",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}

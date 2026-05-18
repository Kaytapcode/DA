using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Api.Migrations
{
    /// <inheritdoc />
    public partial class FlashcardUserMastery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "flashcard_user_mastery",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    flashcard_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_mastered = table.Column<bool>(type: "boolean", nullable: false),
                    mastered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_flashcard_user_mastery", x => x.id);
                    table.ForeignKey(
                        name: "FK_flashcard_user_mastery_flashcards_flashcard_id",
                        column: x => x.flashcard_id,
                        principalTable: "flashcards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_flashcard_user_mastery_flashcard_id_user_id",
                table: "flashcard_user_mastery",
                columns: new[] { "flashcard_id", "user_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "flashcard_user_mastery");
        }
    }
}

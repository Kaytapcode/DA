using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SysAdmin.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAiKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ai_keys",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    key_ciphertext = table.Column<string>(type: "text", nullable: false),
                    key_last_four = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_keys", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_keys_provider_is_active",
                table: "ai_keys",
                columns: new[] { "provider", "is_active" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_keys");
        }
    }
}

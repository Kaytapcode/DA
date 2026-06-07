using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Organization.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "members",
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
                table: "members");
        }
    }
}

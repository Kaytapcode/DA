using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Identity.Api.Migrations
{
    /// <inheritdoc />
    public partial class DropIsSystemAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Promote any user with is_system_admin = TRUE to role = 'SysAdmin' so we don't
            // lose admin privileges when the boolean column goes away (spec §1 collapses to a single Role).
            migrationBuilder.Sql("UPDATE users SET role = 'SysAdmin' WHERE is_system_admin = TRUE;");

            migrationBuilder.DropColumn(
                name: "is_system_admin",
                table: "users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_system_admin",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}

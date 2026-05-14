using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Content.Api.Migrations
{
    /// <inheritdoc />
    public partial class SyncContentSchema : Migration
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.AddColumn<string>(
                name: "url",
                table: "videos",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}

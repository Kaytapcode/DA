using Identity.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Identity.Api.Data
{
    /// <summary>
    /// Seeds spec-required test accounts (Section 5) on first startup.
    /// Uses fixed GUIDs so Organization.Api can cross-reference the same user IDs.
    /// </summary>
    public static class DbInitializer
    {
        // Fixed GUIDs — must match Organization.Api/Data/DbInitializer.cs
        public static readonly Guid SysAdmin1Id = new("11111111-1111-1111-1111-111111111111");
        public static readonly Guid SysAdmin2Id = new("22222222-2222-2222-2222-222222222222");
        public static readonly Guid OrgAdmin1Id = new("33333333-3333-3333-3333-333333333333");
        public static readonly Guid OrgAdmin2Id = new("44444444-4444-4444-4444-444444444444");
        public static readonly Guid User1Id = new("55555555-5555-5555-5555-555555555555");
        public static readonly Guid User2Id = new("66666666-6666-6666-6666-666666666666");
        public static readonly Guid User3Id = new("77777777-7777-7777-7777-777777777777");

        public static async Task SeedAsync(AuthDbContext db)
        {
            var seeds = new[]
            {
                new { Id = SysAdmin1Id, Username = "SysAdmin1", Email = "sysadmin1@lumina.test", Password = "SysAdmin@123", Role = "SysAdmin" },
                new { Id = SysAdmin2Id, Username = "SysAdmin2", Email = "sysadmin2@lumina.test", Password = "SysAdmin@123", Role = "SysAdmin" },
                new { Id = OrgAdmin1Id, Username = "OrgAdmin1", Email = "orgadmin1@lumina.test", Password = "OrgAdmin@123", Role = "OrgAdmin" },
                new { Id = OrgAdmin2Id, Username = "OrgAdmin2", Email = "orgadmin2@lumina.test", Password = "OrgAdmin@123", Role = "OrgAdmin" },
                new { Id = User1Id,     Username = "User1",     Email = "user1@lumina.test",     Password = "User@123",     Role = "Student" },
                new { Id = User2Id,     Username = "User2",     Email = "user2@lumina.test",     Password = "User@123",     Role = "Student" },
                new { Id = User3Id,     Username = "User3",     Email = "user3@lumina.test",     Password = "User@123",     Role = "Student" },
            };

            foreach (var s in seeds)
            {
                var exists = await db.Users.AnyAsync(u => u.Id == s.Id || u.Username == s.Username);
                if (exists) continue;

                db.Users.Add(new UserModel
                {
                    Id = s.Id,
                    Username = s.Username,
                    Email = s.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(s.Password),
                    Role = s.Role,
                    CreatedAt = DateTime.UtcNow,
                });
            }

            await db.SaveChangesAsync();
        }
    }
}

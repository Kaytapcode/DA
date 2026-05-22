using Microsoft.EntityFrameworkCore;
using Organization.Api.Models;

namespace Organization.Api.Data
{
    /// <summary>
    /// Seeds spec-required test organizations and OrgAdmin memberships (Section 5).
    /// Uses the same fixed GUIDs as Identity.Api/Data/DbInitializer.cs.
    /// </summary>
    public static class DbInitializer
    {
        // User GUIDs — must match Identity.Api/Data/DbInitializer.cs
        private static readonly Guid OrgAdmin1Id = new("33333333-3333-3333-3333-333333333333");
        private static readonly Guid OrgAdmin2Id = new("44444444-4444-4444-4444-444444444444");

        // Org GUIDs — fixed so tests can reference them
        public static readonly Guid TestOrg1Id = new("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        public static readonly Guid TestOrg2Id = new("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        public static async Task SeedAsync(OrganizationDbContext db)
        {
            var orgs = new[]
            {
                new { Id = TestOrg1Id, Name = "Test Organization 1", Slug = "test-org-1", OwnerId = OrgAdmin1Id },
                new { Id = TestOrg2Id, Name = "Test Organization 2", Slug = "test-org-2", OwnerId = OrgAdmin2Id },
            };

            foreach (var o in orgs)
            {
                var exists = await db.Organizations.IgnoreQueryFilters().AnyAsync(x => x.Id == o.Id);
                if (exists) continue;

                db.Organizations.Add(new OrganizationModel
                {
                    Id = o.Id,
                    Name = o.Name,
                    Slug = o.Slug,
                    OwnerId = o.OwnerId,
                    CreatedAt = DateTime.UtcNow,
                });
            }

            await db.SaveChangesAsync();

            // Seed OrgAdmin memberships
            var memberships = new[]
            {
                new { UserId = OrgAdmin1Id, OrgId = TestOrg1Id },
                new { UserId = OrgAdmin2Id, OrgId = TestOrg2Id },
            };

            foreach (var m in memberships)
            {
                var existing = await db.Members.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.UserId == m.UserId && x.OrgId == m.OrgId);
                if (existing != null)
                {
                    // Fix legacy seed that used "Admin" instead of "OrgAdmin"
                    if (existing.Role == "Admin")
                    {
                        existing.Role = "OrgAdmin";
                        db.Members.Update(existing);
                    }
                    continue;
                }

                db.Members.Add(new MemberModel
                {
                    Id = Guid.NewGuid(),
                    UserId = m.UserId,
                    OrgId = m.OrgId,
                    Role = "OrgAdmin",
                    JoinDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                });
            }

            await db.SaveChangesAsync();
        }
    }
}

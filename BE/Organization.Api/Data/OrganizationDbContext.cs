using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Organization.Api.Models;

namespace Organization.Api.Data
{
    public class OrganizationDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public OrganizationDbContext(DbContextOptions<OrganizationDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
            : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        // Current org_id resolved from HttpContext.Items (set by JWT OnTokenValidated or OrgContextMiddleware)
        private Guid? CurrentOrgId
        {
            get
            {
                var items = _httpContextAccessor?.HttpContext?.Items;
                if (items == null) return null;
                if (items.TryGetValue("org_id", out var raw) && raw is string s && Guid.TryParse(s, out var id))
                    return id;
                return null;
            }
        }

        private bool IsSysAdmin =>
            _httpContextAccessor?.HttpContext?.User?.IsInRole("SysAdmin") == true;

        // Organization.Api owns Organizations and Members only
        public DbSet<OrganizationModel> Organizations { get; set; }
        public DbSet<MemberModel> Members { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Unique constraints
            modelBuilder.Entity<OrganizationModel>()
                .HasIndex(o => o.Slug)
                .IsUnique();

            // Unique constraint: one user per org
            modelBuilder.Entity<MemberModel>()
                .HasIndex(m => new { m.UserId, m.OrgId })
                .IsUnique();

            // Foreign key configurations
            modelBuilder.Entity<MemberModel>()
                .HasOne(m => m.Organization)
                .WithMany(o => o.Members)
                .HasForeignKey(m => m.OrgId)
                .OnDelete(DeleteBehavior.Cascade);

            // --- GLOBAL QUERY FILTERS for org_id multi-tenant isolation ---
            modelBuilder.Entity<OrganizationModel>()
                .HasQueryFilter(o => IsSysAdmin || CurrentOrgId == null || o.Id == CurrentOrgId);

            modelBuilder.Entity<MemberModel>()
                .HasQueryFilter(m => IsSysAdmin || CurrentOrgId == null || m.OrgId == CurrentOrgId);
        }
    }
}


using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SysAdmin.Api.Models;

namespace SysAdmin.Api.Data
{
    public class SysAdminDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public SysAdminDbContext(DbContextOptions<SysAdminDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
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

        // Banners - announcements managed by SysAdmin / OrgAdmin
        public DbSet<BannerModel> Banners { get; set; }

        // AI provider keys managed by SysAdmin (spec §1)
        public DbSet<AiKeyModel> AiKeys { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Banner configuration - unique display order per org
            modelBuilder.Entity<BannerModel>()
                .HasIndex(b => new { b.OrgId, b.DisplayOrder })
                .IsUnique();

            // --- GLOBAL QUERY FILTERS for org_id multi-tenant isolation ---
            // System banners (OrgId == null) are visible to all; org banners filtered by org_id
            modelBuilder.Entity<BannerModel>()
                .HasQueryFilter(b => IsSysAdmin || b.OrgId == null || CurrentOrgId == null || b.OrgId == CurrentOrgId);

            // Active key lookup is hot-path for AI.Api — index on (provider, is_active).
            modelBuilder.Entity<AiKeyModel>()
                .HasIndex(k => new { k.Provider, k.IsActive });
        }
    }
}


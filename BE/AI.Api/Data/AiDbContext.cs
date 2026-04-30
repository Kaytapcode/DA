using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using AI.Api.Models;

namespace AI.Api.Data
{
    public class AiDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public AiDbContext(DbContextOptions<AiDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
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

        // AI Quota (T3.11) - Only table this service manages
        public DbSet<AiQuotaModel> AiQuotas { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Global query filter for AiQuotaModel - org_id isolation
            modelBuilder.Entity<AiQuotaModel>()
                .HasQueryFilter(q => IsSysAdmin || CurrentOrgId == null || q.OrgId == CurrentOrgId);
        }
    }
}


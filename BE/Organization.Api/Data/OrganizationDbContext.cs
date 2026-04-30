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

        // Users and Organizations
        public DbSet<UserModel> Users { get; set; }
        public DbSet<OrganizationModel> Organizations { get; set; }
        public DbSet<MemberModel> Members { get; set; }

        // Courses and Structure
        public DbSet<CourseModel> Courses { get; set; }
        public DbSet<ModuleModel> Modules { get; set; }
        public DbSet<CourseModuleModel> CourseModules { get; set; }

        // Content
        public DbSet<ContentModel> Contents { get; set; }
        public DbSet<ModuleContentModel> ModuleContents { get; set; }

        // Learning Materials
        public DbSet<VideoModel> Videos { get; set; }
        public DbSet<DocumentModel> Documents { get; set; }

        // Quizzes
        public DbSet<QuizModel> Quizzes { get; set; }
        public DbSet<QuestionModel> Questions { get; set; }
        public DbSet<QuestionOptionModel> QuestionOptions { get; set; }

        // Flashcards
        public DbSet<FlashcardDeckModel> FlashcardDecks { get; set; }
        public DbSet<FlashcardModel> Flashcards { get; set; }

        // AI Quota (T3.11)
        public DbSet<AiQuotaModel> AiQuotas { get; set; }

        // Banners and Activities
        public DbSet<BannerModel> Banners { get; set; }
        public DbSet<CourseParticipantModel> CourseParticipants { get; set; }
        public DbSet<AttemptModel> Attempts { get; set; }
        public DbSet<ResultModel> Results { get; set; }
        public DbSet<UserActivityModel> UserActivities { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Unique constraints
            modelBuilder.Entity<UserModel>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<UserModel>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<OrganizationModel>()
                .HasIndex(o => o.Slug)
                .IsUnique();

            // Unique constraint: one user per org
            modelBuilder.Entity<MemberModel>()
                .HasIndex(m => new { m.UserId, m.OrgId })
                .IsUnique();

            // Foreign key configurations
            modelBuilder.Entity<MemberModel>()
                .HasOne(m => m.User)
                .WithMany(u => u.Memberships)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MemberModel>()
                .HasOne(m => m.Organization)
                .WithMany(o => o.Members)
                .HasForeignKey(m => m.OrgId)
                .OnDelete(DeleteBehavior.Cascade);

            // Course relationships
            modelBuilder.Entity<CourseModel>()
                .HasOne(c => c.Organization)
                .WithMany(o => o.Courses)
                .HasForeignKey(c => c.OrgId)
                .OnDelete(DeleteBehavior.Cascade);

            // Module relationships
            modelBuilder.Entity<ModuleModel>()
                .HasOne(m => m.Organization)
                .WithMany()
                .HasForeignKey(m => m.OrgId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ModuleModel>()
                .HasOne(m => m.ParentModule)
                .WithMany(m => m.ChildModules)
                .HasForeignKey(m => m.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Content relationships
            modelBuilder.Entity<VideoModel>()
                .HasOne(v => v.Content)
                .WithOne(c => c.Video)
                .HasForeignKey<VideoModel>(v => v.ContentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DocumentModel>()
                .HasOne(d => d.Content)
                .WithOne(c => c.Document)
                .HasForeignKey<DocumentModel>(d => d.ContentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<QuizModel>()
                .HasOne(q => q.Content)
                .WithOne(c => c.Quiz)
                .HasForeignKey<QuizModel>(q => q.ContentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<FlashcardDeckModel>()
                .HasOne(f => f.Content)
                .WithOne(c => c.FlashcardDeck)
                .HasForeignKey<FlashcardDeckModel>(f => f.ContentId)
                .OnDelete(DeleteBehavior.Cascade);

            // --- GLOBAL QUERY FILTERS for org_id multi-tenant isolation ---
            // These filters run on every query. SysAdmin bypasses; otherwise only sees own org's data.
            modelBuilder.Entity<CourseModel>()
                .HasQueryFilter(c => IsSysAdmin || CurrentOrgId == null || c.OrgId == CurrentOrgId);

            modelBuilder.Entity<ModuleModel>()
                .HasQueryFilter(m => IsSysAdmin || CurrentOrgId == null || m.OrgId == CurrentOrgId);

            modelBuilder.Entity<MemberModel>()
                .HasQueryFilter(m => IsSysAdmin || CurrentOrgId == null || m.OrgId == CurrentOrgId);

            // Banners: system banners (OrgId == null) are visible to all; org banners filtered by org_id
            modelBuilder.Entity<BannerModel>()
                .HasQueryFilter(b => IsSysAdmin || b.OrgId == null || CurrentOrgId == null || b.OrgId == CurrentOrgId);

            modelBuilder.Entity<UserActivityModel>()
                .HasQueryFilter(a => IsSysAdmin || CurrentOrgId == null || a.OrgId == null || a.OrgId == CurrentOrgId);
        }
    }
}


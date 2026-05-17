using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Content.Api.Models;

namespace Content.Api.Data
{
    public class ContentDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public ContentDbContext(DbContextOptions<ContentDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
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
        public DbSet<CourseModel> Courses { get; set; }
        public DbSet<CourseEnrollmentModel> CourseEnrollments { get; set; }
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

        // Progress & Attempts
        public DbSet<StudentProgressModel> StudentProgress { get; set; }
        public DbSet<QuizAttemptModel> QuizAttempts { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Course relationships
            modelBuilder.Entity<CourseModel>()
                .HasQueryFilter(c => IsSysAdmin || CurrentOrgId == null || c.OrgId == CurrentOrgId);

            // Module relationships - self-referencing for nested modules
            modelBuilder.Entity<ModuleModel>()
                .HasOne(m => m.ParentModule)
                .WithMany(m => m.ChildModules)
                .HasForeignKey(m => m.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Personal collections (OrgId == null) are visible to all; org-scoped modules
            // are filtered by the caller's current org.
            modelBuilder.Entity<ModuleModel>()
                .HasQueryFilter(m => IsSysAdmin || m.OrgId == null || CurrentOrgId == null || m.OrgId == CurrentOrgId);

            // CourseModule - junction table
            modelBuilder.Entity<CourseModuleModel>()
                .HasIndex(cm => new { cm.CourseId, cm.ModuleId })
                .IsUnique();

            // CourseEnrollment - per-course Teacher/Student role (spec §4.1)
            modelBuilder.Entity<CourseEnrollmentModel>()
                .HasIndex(ce => new { ce.CourseId, ce.UserId })
                .IsUnique();

            modelBuilder.Entity<CourseEnrollmentModel>()
                .HasOne(ce => ce.Course)
                .WithMany()
                .HasForeignKey(ce => ce.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            // Content relationships
            modelBuilder.Entity<VideoModel>()
                .HasOne(v => v.Content)
                .WithOne(c => c.Video)
                .HasForeignKey<VideoModel>(v => v.ContentId)
                .OnDelete(DeleteBehavior.Cascade);

            // Document is now optional content (content_id nullable for standalone uploads)
            modelBuilder.Entity<DocumentModel>()
                .HasOne(d => d.Content)
                .WithOne(c => c.Document)
                .HasForeignKey<DocumentModel>(d => d.ContentId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

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

            // Student progress: unique per (course, user, module) combination
            modelBuilder.Entity<StudentProgressModel>()
                .HasIndex(sp => new { sp.CourseId, sp.UserId, sp.ModuleId })
                .IsUnique();

            modelBuilder.Entity<StudentProgressModel>()
                .HasOne(sp => sp.Course)
                .WithMany()
                .HasForeignKey(sp => sp.CourseId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StudentProgressModel>()
                .HasOne(sp => sp.Module)
                .WithMany()
                .HasForeignKey(sp => sp.ModuleId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<StudentProgressModel>()
                .HasOne(sp => sp.Content)
                .WithMany()
                .HasForeignKey(sp => sp.ContentId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            // Quiz attempts index for fast lookup by user + quiz
            modelBuilder.Entity<QuizAttemptModel>()
                .HasIndex(qa => new { qa.UserId, qa.QuizId });

            modelBuilder.Entity<QuizAttemptModel>()
                .HasOne(qa => qa.Quiz)
                .WithMany()
                .HasForeignKey(qa => qa.QuizId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}


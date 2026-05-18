using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Identity.Api.Models;

namespace Identity.Api.Data
{
    public class AuthDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public AuthDbContext(DbContextOptions<AuthDbContext> options, IHttpContextAccessor? httpContextAccessor = null)
            : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        // Users Only - Identity.Api is responsible for user management
        public DbSet<UserModel> Users { get; set; }
        public DbSet<RefreshTokenModel> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Unique constraints on User model
            modelBuilder.Entity<UserModel>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<UserModel>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<RefreshTokenModel>()
                .HasIndex(t => t.TokenHash)
                .IsUnique();

            modelBuilder.Entity<RefreshTokenModel>()
                .HasIndex(t => t.UserId);
        }
    }
}


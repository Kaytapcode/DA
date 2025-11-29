using Microsoft.EntityFrameworkCore;
using Auth.Api.Models;

namespace Auth.Api.Data
{
    public class AuthDbContext : DbContext
    {
        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

        public DbSet<UserModel> user { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            //modelBuilder.Entity<UserModel>()
            //    .ToTable("user");  // or any custom name

            // Đảm bảo username là duy nhất
            modelBuilder.Entity<UserModel>()
                .HasIndex(u => u.Username)
                .IsUnique();
        }
    }
}
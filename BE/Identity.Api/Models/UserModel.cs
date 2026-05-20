using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Identity.Api.Models
{
    [Table("users")]
    public class UserModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("username")]
        [StringLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [Column("email")]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [Column("role")]
        [StringLength(50)]
        public string Role { get; set; } = "Student"; // Student, Teacher, OrgAdmin, SysAdmin

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // Spec 1 — i18n preference. Supported: "vi", "ja", "en". Null = no preference set (FE defaults to "en").
        [Column("language")]
        [StringLength(8)]
        public string? Language { get; set; }
    }
}

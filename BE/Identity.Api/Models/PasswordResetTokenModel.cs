using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Identity.Api.Models
{
    [Table("password_reset_tokens")]
    public class PasswordResetTokenModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        // SHA-256 hash of the raw token sent to user
        [Required]
        [Column("token_hash")]
        [StringLength(255)]
        public string TokenHash { get; set; } = string.Empty;

        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        // Set when the token is consumed; null = still valid
        [Column("used_at")]
        public DateTime? UsedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public UserModel? User { get; set; }
    }
}

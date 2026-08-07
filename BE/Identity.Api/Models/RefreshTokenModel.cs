using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Identity.Api.Models
{
    [Table("refresh_tokens")]
    public class RefreshTokenModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        // SHA-256 hex of the plaintext token — DB leak doesn't expose usable tokens.
        [Required]
        [Column("token_hash")]
        [StringLength(128)]
        public string TokenHash { get; set; } = string.Empty;

        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [Column("revoked_at")]
        public DateTime? RevokedAt { get; set; }

        // Set on rotation so we can detect reuse of an already-rotated token.
        [Column("replaced_by_id")]
        public Guid? ReplacedById { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

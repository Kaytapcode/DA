using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SysAdmin.Api.Models
{
    // SysAdmin-managed API keys for AI providers (spec §1, SysAdmin: "Configure AI API Keys").
    // The plaintext key is never persisted — only ciphertext via IDataProtectionProvider.
    [Table("ai_keys")]
    public class AiKeyModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("provider")]
        [StringLength(50)]
        public string Provider { get; set; } = "OpenRouter"; // OpenRouter, OpenAI, Anthropic

        // A short label for SysAdmin UX (e.g. "primary", "fallback").
        [Column("label")]
        [StringLength(100)]
        public string? Label { get; set; }

        [Required]
        [Column("key_ciphertext")]
        public string KeyCiphertext { get; set; } = string.Empty;

        // Last 4 chars of the plaintext key for UX (display only).
        [Column("key_last_four")]
        [StringLength(4)]
        public string? KeyLastFour { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}

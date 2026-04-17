using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auth.Api.Models
{
    [Table("module_has_content")]
    public class ModuleContentModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("module_id")]
        public Guid ModuleId { get; set; }

        [Required]
        [Column("content_id")]
        public Guid ContentId { get; set; }

        [Column("order_index")]
        public int OrderIndex { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign keys
        [ForeignKey(nameof(ModuleId))]
        public ModuleModel? Module { get; set; }

        [ForeignKey(nameof(ContentId))]
        public ContentModel? Content { get; set; }
    }
}

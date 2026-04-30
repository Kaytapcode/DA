using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Content.Api.Models
{
    [Table("course_has_module")]
    public class CourseModuleModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("course_id")]
        public Guid CourseId { get; set; }

        [Required]
        [Column("module_id")]
        public Guid ModuleId { get; set; }

        [Column("order_index")]
        public int OrderIndex { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign keys
        [ForeignKey(nameof(CourseId))]
        public CourseModel? Course { get; set; }

        [ForeignKey(nameof(ModuleId))]
        public ModuleModel? Module { get; set; }
    }
}

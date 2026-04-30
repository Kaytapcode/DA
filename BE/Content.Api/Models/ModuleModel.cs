using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Content.Api.Models
{
    [Table("modules")]
    public class ModuleModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("org_id")]
        public Guid OrgId { get; set; }

        [Column("created_by")]
        public Guid? CreatedBy { get; set; }

        [Column("parent_id")]
        public Guid? ParentId { get; set; }

        [Required]
        [Column("title")]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Column("description")]
        [StringLength(2000)]
        public string? Description { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // Self-referencing for nested modules
        [ForeignKey(nameof(ParentId))]
        public ModuleModel? ParentModule { get; set; }

        // Navigation properties
        public ICollection<ModuleModel> ChildModules { get; set; } = new List<ModuleModel>();
        public ICollection<CourseModuleModel> CourseModules { get; set; } = new List<CourseModuleModel>();
        public ICollection<ModuleContentModel> ModuleContents { get; set; } = new List<ModuleContentModel>();
    }
}

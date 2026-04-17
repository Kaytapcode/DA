using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auth.Api.Models
{
    [Table("courses")]
    public class CourseModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("org_id")]
        public Guid OrgId { get; set; }

        [Required]
        [Column("created_by")]
        public Guid CreatedBy { get; set; }

        [Required]
        [Column("title")]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Column("description")]
        [StringLength(2000)]
        public string? Description { get; set; }

        [Column("course_code")]
        [StringLength(50)]
        public string? CourseCode { get; set; }

        [Column("status")]
        [StringLength(50)]
        public string Status { get; set; } = "ACTIVE"; // 'ACTIVE', 'ARCHIVED', 'DRAFT'

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // Foreign keys
        [ForeignKey(nameof(OrgId))]
        public OrganizationModel? Organization { get; set; }

        [ForeignKey(nameof(CreatedBy))]
        public UserModel? Creator { get; set; }

        // Navigation properties
        public ICollection<CourseModuleModel> CourseModules { get; set; } = new List<CourseModuleModel>();
        public ICollection<CourseParticipantModel> Participants { get; set; } = new List<CourseParticipantModel>();
    }
}

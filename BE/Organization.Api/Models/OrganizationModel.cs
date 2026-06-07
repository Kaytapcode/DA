using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Organization.Api.Models
{
    [Table("organizations")]
    public class OrganizationModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("name")]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Column("address")]
        [StringLength(500)]
        public string? Address { get; set; }

        [Column("slug")]
        [StringLength(50)]
        public string Slug { get; set; } = string.Empty;

        [Required]
        [Column("owner_id")]
        public Guid OwnerId { get; set; }

        // 'Active' | 'Suspended'. A SysAdmin may suspend an org (spec §6.6); while Suspended, access
        // to the org's courses/content is frozen (enforced in Content.Api's CourseAccessService).
        [Column("status")]
        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public ICollection<MemberModel> Members { get; set; } = new List<MemberModel>();
    }
}

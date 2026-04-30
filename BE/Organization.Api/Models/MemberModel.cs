using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Organization.Api.Models
{
    [Table("members")]
    public class MemberModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("org_id")]
        public Guid OrgId { get; set; }

        [Required]
        [Column("role")]
        [StringLength(50)]
        public string Role { get; set; } = "Student"; // 'Student', 'Teacher', 'Owner', 'Admin'

        [Column("join_date")]
        public DateTime JoinDate { get; set; } = DateTime.UtcNow;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(OrgId))]
        public OrganizationModel? Organization { get; set; }
    }
}

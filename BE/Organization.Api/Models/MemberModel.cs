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
        public string Role { get; set; } = "Student"; // 'Member', 'OrgAdmin', 'Owner'

        // 'Pending' | 'Approved' | 'Rejected'. A user self-requesting to join starts 'Pending' and
        // only counts as a member once an OrgAdmin approves. OrgAdmin-added / founding rows are
        // 'Approved' immediately. Only 'Approved' grants org membership/access.
        [Column("status")]
        [StringLength(20)]
        public string Status { get; set; } = "Approved";

        [Column("join_date")]
        public DateTime JoinDate { get; set; } = DateTime.UtcNow;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(OrgId))]
        public OrganizationModel? Organization { get; set; }
    }
}

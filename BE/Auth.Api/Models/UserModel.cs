using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Auth.Api.Models
{
    [Table("users")]
    public class UserModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("username")]
        [StringLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [Column("email")]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [Column("role")]
        [StringLength(50)]
        public string Role { get; set; } = "Student"; // Student, Teacher, OrgAdmin, SysAdmin

        [Column("is_system_admin")]
        public bool IsSystemAdmin { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public ICollection<OrganizationModel> OwnedOrganizations { get; set; } = new List<OrganizationModel>();
        public ICollection<MemberModel> Memberships { get; set; } = new List<MemberModel>();
        public ICollection<CourseModel> CreatedCourses { get; set; } = new List<CourseModel>();
        public ICollection<CourseParticipantModel> CourseParticipations { get; set; } = new List<CourseParticipantModel>();
        public ICollection<UserActivityModel> Activities { get; set; } = new List<UserActivityModel>();
        public ICollection<AttemptModel> Attempts { get; set; } = new List<AttemptModel>();
    }
}

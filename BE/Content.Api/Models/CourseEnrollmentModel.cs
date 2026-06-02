using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Content.Api.Models
{
    [Table("course_enrollments")]
    public class CourseEnrollmentModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("course_id")]
        public Guid CourseId { get; set; }

        // Cross-service reference to Identity.Api users — no FK constraint.
        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        // Per-course role: 'Teacher' or 'Student' (spec §1, §4.1).
        [Required]
        [Column("role")]
        [StringLength(50)]
        public string Role { get; set; } = "Student";

        // Enrollment lifecycle status: 'Pending' | 'Approved' | 'Rejected'.
        // OrgAdmin-created enrollments are 'Approved' immediately. A User self-request
        // (POST .../enrollments/request) creates a 'Pending' row that an OrgAdmin must
        // approve before the user gains course access. Only 'Approved' rows grant access.
        [Required]
        [Column("status")]
        [StringLength(20)]
        public string Status { get; set; } = "Approved";

        [Column("enrolled_at")]
        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(CourseId))]
        public CourseModel? Course { get; set; }
    }
}

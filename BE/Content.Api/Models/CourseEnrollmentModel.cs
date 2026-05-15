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

        [Column("enrolled_at")]
        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(CourseId))]
        public CourseModel? Course { get; set; }
    }
}

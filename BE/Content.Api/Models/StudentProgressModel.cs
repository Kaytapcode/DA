using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Content.Api.Models
{
    [Table("student_progress")]
    public class StudentProgressModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("course_id")]
        public Guid CourseId { get; set; }

        // Cross-service reference to Identity.Api users — no FK constraint
        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("module_id")]
        public Guid? ModuleId { get; set; }

        [Column("content_id")]
        public Guid? ContentId { get; set; }

        [Column("progress_percentage")]
        [Range(0, 100)]
        public int ProgressPercentage { get; set; } = 0;

        [Column("is_completed")]
        public bool IsCompleted { get; set; } = false;

        [Column("completed_at")]
        public DateTime? CompletedAt { get; set; }

        [Column("time_spent_seconds")]
        public int TimeSpentSeconds { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(CourseId))]
        public CourseModel? Course { get; set; }

        [ForeignKey(nameof(ModuleId))]
        public ModuleModel? Module { get; set; }

        [ForeignKey(nameof(ContentId))]
        public ContentModel? Content { get; set; }
    }
}

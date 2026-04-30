using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SysAdmin.Api.Models
{
    [Table("banners")]
    public class BannerModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("image_url")]
        public string ImageUrl { get; set; } = string.Empty;

        [Column("title")]
        [StringLength(500)]
        public string? Title { get; set; }

        [Column("description")]
        [StringLength(2000)]
        public string? Description { get; set; }

        [Column("display_order")]
        public int DisplayOrder { get; set; } = 1;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("org_id")]
        public Guid? OrgId { get; set; } // null = system-wide banner

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // Foreign key
        [ForeignKey(nameof(OrgId))]
        public OrganizationModel? Organization { get; set; }
    }

    [Table("course_participants")]
    public class CourseParticipantModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("course_id")]
        public Guid CourseId { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("role")]
        [StringLength(50)]
        public string Role { get; set; } = "Student"; // 'Owner', 'Teacher', 'Student'

        [Column("joined_at")]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign keys
        [ForeignKey(nameof(CourseId))]
        public CourseModel? Course { get; set; }

        [ForeignKey(nameof(UserId))]
        public UserModel? User { get; set; }
    }

    [Table("attempts")]
    public class AttemptModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("quiz_id")]
        public Guid QuizId { get; set; }

        [Column("start_time")]
        public DateTime StartTime { get; set; } = DateTime.UtcNow;

        [Column("end_time")]
        public DateTime? EndTime { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign keys
        [ForeignKey(nameof(UserId))]
        public UserModel? User { get; set; }

        [ForeignKey(nameof(QuizId))]
        public QuizModel? Quiz { get; set; }

        // Navigation properties
        public ICollection<ResultModel> Results { get; set; } = new List<ResultModel>();
    }

    [Table("results")]
    public class ResultModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("attempt_id")]
        public Guid AttemptId { get; set; }

        [Column("score")]
        public decimal Score { get; set; }

        [Column("feedback")]
        public string? Feedback { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(AttemptId))]
        public AttemptModel? Attempt { get; set; }
    }

    [Table("user_activities")]
    public class UserActivityModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("action_type")]
        [StringLength(50)]
        public string ActionType { get; set; } = string.Empty; // 'CREATE', 'UPDATE', 'DELETE', 'VIEW'

        [Column("entity_type")]
        [StringLength(50)]
        public string EntityType { get; set; } = string.Empty; // 'COURSE', 'MODULE', 'CONTENT'

        [Column("entity_id")]
        public Guid? EntityId { get; set; }

        [Column("org_id")]
        public Guid? OrgId { get; set; }

        [Column("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Foreign keys
        [ForeignKey(nameof(UserId))]
        public UserModel? User { get; set; }

        [ForeignKey(nameof(OrgId))]
        public OrganizationModel? Organization { get; set; }
    }
}

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Content.Api.Models
{
    [Table("quiz_attempts")]
    public class QuizAttemptModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("quiz_id")]
        public Guid QuizId { get; set; }

        // Cross-service reference to Identity.Api users — no FK constraint
        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("score_percentage")]
        public int? ScorePercentage { get; set; }

        // JSON: { "questionId": selectedIndex, ... }
        [Required]
        [Column("answers", TypeName = "jsonb")]
        public string Answers { get; set; } = "{}";

        [Column("time_taken_seconds")]
        public int? TimeTakenSeconds { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(QuizId))]
        public QuizModel? Quiz { get; set; }
    }
}

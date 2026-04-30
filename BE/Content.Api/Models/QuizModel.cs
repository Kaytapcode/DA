using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Content.Api.Models
{
    [Table("quizzes")]
    public class QuizModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("content_id")]
        public Guid ContentId { get; set; }

        [Column("time_limit")]
        public int? TimeLimit { get; set; } // Time limit in minutes

        [Column("passing_score")]
        public int PassingScore { get; set; } = 70; // Percentage

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(ContentId))]
        public ContentModel? Content { get; set; }

        // Navigation properties
        public ICollection<QuestionModel> Questions { get; set; } = new List<QuestionModel>();
    }

    [Table("questions")]
    public class QuestionModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("quiz_id")]
        public Guid QuizId { get; set; }

        [Required]
        [Column("question_text")]
        public string QuestionText { get; set; } = string.Empty;

        [Column("order_index")]
        public int OrderIndex { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(QuizId))]
        public QuizModel? Quiz { get; set; }

        // Navigation properties
        public ICollection<QuestionOptionModel> Options { get; set; } = new List<QuestionOptionModel>();
    }

    [Table("question_options")]
    public class QuestionOptionModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("question_id")]
        public Guid QuestionId { get; set; }

        [Required]
        [Column("option_text")]
        public string OptionText { get; set; } = string.Empty;

        [Column("is_correct")]
        public bool IsCorrect { get; set; } = false;

        [Column("order_index")]
        public int OrderIndex { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(QuestionId))]
        public QuestionModel? Question { get; set; }
    }
}

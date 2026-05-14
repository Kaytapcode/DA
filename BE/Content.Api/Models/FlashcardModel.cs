using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Content.Api.Models
{
    [Table("flashcard_decks")]
    public class FlashcardDeckModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("content_id")]
        public Guid ContentId { get; set; }

        [Column("theme")]
        [StringLength(100)]
        public string Theme { get; set; } = "Default";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(ContentId))]
        public ContentModel? Content { get; set; }

        // Navigation properties
        public ICollection<FlashcardModel> Flashcards { get; set; } = new List<FlashcardModel>();
    }

    [Table("flashcards")]
    public class FlashcardModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("deck_id")]
        public Guid DeckId { get; set; }

        [Required]
        [Column("front_text")]
        public string FrontText { get; set; } = string.Empty;

        [Required]
        [Column("back_text")]
        public string BackText { get; set; } = string.Empty;

        [Column("is_mastered")]
        public bool IsMastered { get; set; } = false;

        [Column("mastered_at")]
        public DateTime? MasteredAt { get; set; }

        [Column("order_index")]
        public int OrderIndex { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(DeckId))]
        public FlashcardDeckModel? Deck { get; set; }
    }
}

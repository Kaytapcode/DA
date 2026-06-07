using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Content.Api.Models
{
    [Table("contents")]
    public class ContentModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("title")]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Column("content_type")]
        [StringLength(50)]
        public string ContentType { get; set; } = "VIDEO"; // 'VIDEO', 'PDF', 'QUIZ', 'FLASHCARD'

        [Column("status")]
        [StringLength(50)]
        public string Status { get; set; } = "DRAFT"; // 'DRAFT', 'PUBLISHED'

        // Owner of personal resources (null when content is course-scoped only).
        // Spec §1: resources created by a User must be public — enforced in repositories/controllers.
        [Column("created_by_user_id")]
        public Guid? CreatedByUserId { get; set; }

        // Personal resources are always public (spec §1). Course resources default to public
        // and may be restricted to course members via the CourseEnrollment table.
        [Column("is_public")]
        public bool IsPublic { get; set; } = true;

        // True when this content was CREATED INSIDE a course (via the in-course "add content" flow).
        // Course-scoped content is hidden from the creator's personal Library and from public
        // search/clone — it is visible ONLY inside the course it was created for. Set at link time
        // in ContentRepository.LinkExistingAsync. (Dev requirement 2026-06-06; see SPEC_ADDITIONS.md —
        // this narrows spec §5 invariant 1 "all User-created resources are public".)
        [Column("is_course_scoped")]
        public bool IsCourseScoped { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public ICollection<ModuleContentModel> ModuleContents { get; set; } = new List<ModuleContentModel>();
        public VideoModel? Video { get; set; }
        public DocumentModel? Document { get; set; }
        public QuizModel? Quiz { get; set; }
        public FlashcardDeckModel? FlashcardDeck { get; set; }
    }

    [Table("videos")]
    public class VideoModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("content_id")]
        public Guid ContentId { get; set; }

        [Required]
        [Column("youtube_video_id")]
        [StringLength(11)]
        public string YouTubeVideoId { get; set; } = string.Empty;

        [Column("title")]
        [StringLength(255)]
        public string? Title { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }

        [Column("duration")]
        public int? Duration { get; set; } // Duration in seconds

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [ForeignKey(nameof(ContentId))]
        public ContentModel? Content { get; set; }
    }

    [Table("documents")]
    public class DocumentModel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        // Nullable: null when document is a standalone user upload, set when linked to course content
        [Column("content_id")]
        public Guid? ContentId { get; set; }

        // Uploader user ID (cross-service reference, no FK constraint)
        [Column("created_by_user_id")]
        public Guid? CreatedByUserId { get; set; }

        [Required]
        [Column("file_name")]
        [StringLength(255)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [Column("file_path")]
        public string FilePath { get; set; } = string.Empty;

        [Column("file_size")]
        public long FileSize { get; set; }

        [Column("file_type")]
        [StringLength(50)]
        public string FileType { get; set; } = "PDF"; // 'PDF', 'PNG', 'JPEG', 'TXT'

        [Column("is_public")]
        public bool IsPublic { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [ForeignKey(nameof(ContentId))]
        public ContentModel? Content { get; set; }
    }
}

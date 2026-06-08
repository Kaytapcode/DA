using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    // Spec §1, User role: "Can copy other public resources to create a personal version".
    // The clone is always personal (no ModuleContent link) and always public.
    [ApiController]
    [Route("api/contents/{contentId:guid}/clone")]
    [Authorize]
    public class ContentCloneController : ControllerBase
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;
        private readonly IStorageService _storage;

        public ContentCloneController(ContentDbContext db, IOrgContextService orgCtx, IStorageService storage)
        {
            _db = db;
            _orgCtx = orgCtx;
            _storage = storage;
        }

        [HttpPost]
        public async Task<IActionResult> Clone(Guid contentId, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            // Load the source content including its typed payload. IgnoreQueryFilters so SysAdmin
            // and cross-org public resources can still be cloned.
            var source = await _db.Contents
                .IgnoreQueryFilters()
                .Include(c => c.Quiz)
                    .ThenInclude(q => q!.Questions.Where(q => q.DeletedAt == null))
                        .ThenInclude(q => q.Options)
                .Include(c => c.FlashcardDeck)
                    .ThenInclude(d => d!.Flashcards)
                .Include(c => c.Video)
                .Include(c => c.Document)
                .FirstOrDefaultAsync(c => c.Id == contentId, ct);

            if (source == null) return NotFound(new ApiResponse(false, "Content not found."));
            // Course-scoped content cannot be copied out of its course (it is not public).
            if (!source.IsPublic || source.IsCourseScoped) return Forbid();
            if (source.CreatedByUserId == userId)
                return BadRequest(new ApiResponse(false, "You already own this resource."));

            var now = DateTime.UtcNow;
            var clonedContent = new ContentModel
            {
                Id = Guid.NewGuid(),
                Title = source.Title + " (copy)",
                ContentType = source.ContentType,
                Status = "PUBLISHED",
                CreatedByUserId = userId.Value,
                IsPublic = true, // Spec §1: cloned personal version must also be public.
                CreatedAt = now
            };
            _db.Contents.Add(clonedContent);

            switch (source.ContentType)
            {
                case "QUIZ" when source.Quiz != null:
                    var clonedQuiz = new QuizModel
                    {
                        Id = Guid.NewGuid(),
                        ContentId = clonedContent.Id,
                        TimeLimit = source.Quiz.TimeLimit,
                        PassingScore = source.Quiz.PassingScore,
                        IsAiGenerated = source.Quiz.IsAiGenerated,
                        CreatedAt = now
                    };
                    _db.Quizzes.Add(clonedQuiz);
                    foreach (var q in source.Quiz.Questions.OrderBy(q => q.OrderIndex))
                    {
                        var newQ = new QuestionModel
                        {
                            Id = Guid.NewGuid(),
                            QuizId = clonedQuiz.Id,
                            QuestionText = q.QuestionText,
                            Explanation = q.Explanation,
                            OrderIndex = q.OrderIndex,
                            CreatedAt = now
                        };
                        _db.Questions.Add(newQ);
                        foreach (var o in q.Options.OrderBy(o => o.OrderIndex))
                        {
                            _db.QuestionOptions.Add(new QuestionOptionModel
                            {
                                Id = Guid.NewGuid(),
                                QuestionId = newQ.Id,
                                OptionText = o.OptionText,
                                IsCorrect = o.IsCorrect,
                                OrderIndex = o.OrderIndex,
                                CreatedAt = now
                            });
                        }
                    }
                    break;

                case "FLASHCARD" when source.FlashcardDeck != null:
                    var clonedDeck = new FlashcardDeckModel
                    {
                        Id = Guid.NewGuid(),
                        ContentId = clonedContent.Id,
                        Theme = source.FlashcardDeck.Theme,
                        CreatedAt = now
                    };
                    _db.FlashcardDecks.Add(clonedDeck);
                    foreach (var f in source.FlashcardDeck.Flashcards.OrderBy(f => f.OrderIndex))
                    {
                        _db.Flashcards.Add(new FlashcardModel
                        {
                            Id = Guid.NewGuid(),
                            DeckId = clonedDeck.Id,
                            FrontText = f.FrontText,
                            BackText = f.BackText,
                            // Reset progress: a fresh personal copy starts unmastered.
                            IsMastered = false,
                            MasteredAt = null,
                            OrderIndex = f.OrderIndex,
                            CreatedAt = now
                        });
                    }
                    break;

                case "VIDEO" when source.Video != null:
                    _db.Videos.Add(new VideoModel
                    {
                        Id = Guid.NewGuid(),
                        ContentId = clonedContent.Id,
                        YouTubeVideoId = source.Video.YouTubeVideoId,
                        Title = source.Video.Title,
                        Description = source.Video.Description,
                        ThumbnailUrl = source.Video.ThumbnailUrl,
                        Duration = source.Video.Duration,
                        CreatedAt = now
                    });
                    break;

                case "PDF" when source.Document != null:
                    // Copy the physical file into the copier's OWN storage so the clone is fully
                    // independent — sharing the original's FilePath meant deleting either copy
                    // (which physically removes the file) broke the other copy's preview. If the
                    // source file is missing the original is already broken; fall back to the
                    // shared path so the clone still gets a DB row.
                    var clonedFilePath = source.Document.FilePath;
                    var clonedFileSize = source.Document.FileSize;
                    try
                    {
                        (clonedFilePath, clonedFileSize) = await _storage.CopyAsync(
                            source.Document.FilePath, userId.Value, source.Document.FileName, ct);
                    }
                    catch (FileNotFoundException) { /* keep shared path fallback */ }

                    _db.Documents.Add(new DocumentModel
                    {
                        Id = Guid.NewGuid(),
                        ContentId = clonedContent.Id,
                        CreatedByUserId = userId.Value,
                        FileName = source.Document.FileName,
                        FilePath = clonedFilePath,
                        FileSize = clonedFileSize,
                        FileType = source.Document.FileType,
                        IsPublic = true,
                        CreatedAt = now
                    });
                    break;

                default:
                    return BadRequest(new ApiResponse(false, $"Content type '{source.ContentType}' is not cloneable."));
            }

            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<object>(
                true,
                new { id = clonedContent.Id, title = clonedContent.Title, contentType = clonedContent.ContentType },
                "Content cloned to your personal library."));
        }
    }
}

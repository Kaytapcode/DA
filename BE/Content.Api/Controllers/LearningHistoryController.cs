using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;
using System.Text.Json;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/student-progress")]
    [Authorize]
    public class LearningHistoryController : ControllerBase
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;

        public LearningHistoryController(ContentDbContext db, IOrgContextService orgCtx)
        {
            _db = db;
            _orgCtx = orgCtx;
        }

        public record LearningHistoryEntryDto(
            Guid? CourseId,
            string? CourseTitle,
            Guid? ModuleId,
            string? ModuleTitle,
            Guid? ContentId,
            string? ContentTitle,
            string? ContentType,
            int ProgressPercentage,
            bool IsCompleted,
            DateTime ActivityAt,
            Guid? AttemptId = null,
            Guid? SubEntityId = null  // VideoId / DocumentId / DeckId depending on ContentType
        );

        public record AttemptAnswerDto(
            Guid QuestionId,
            string QuestionText,
            Guid SelectedOptionId,
            string SelectedOptionText,
            Guid CorrectOptionId,
            string CorrectOptionText,
            bool IsCorrect,
            string? Explanation
        );

        public record QuizAttemptReviewDto(
            Guid AttemptId,
            Guid QuizId,
            string QuizTitle,
            int ScorePercentage,
            DateTime AttemptedAt,
            List<AttemptAnswerDto> Answers
        );

        // GET /api/student-progress/recent?limit=20
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent([FromQuery] int limit = 20, CancellationToken ct = default)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();
            limit = Math.Clamp(limit, 1, 100);

            var rawProgress = await _db.StudentProgress
                .IgnoreQueryFilters()
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.UpdatedAt ?? p.CreatedAt)
                .Take(limit)
                .Include(p => p.Course)
                .Include(p => p.Module)
                .Include(p => p.Content)
                    .ThenInclude(c => c!.Video)
                .Include(p => p.Content)
                    .ThenInclude(c => c!.Document)
                .Include(p => p.Content)
                    .ThenInclude(c => c!.FlashcardDeck)
                .ToListAsync(ct);

            var progressRows = rawProgress
                .Where(p => p.Content?.ContentType != "QUIZ")
                .Select(p =>
            {
                Guid? subEntityId = p.Content?.ContentType switch
                {
                    "VIDEO" => p.Content.Video?.Id,
                    "PDF" => p.Content.Document?.Id,
                    "FLASHCARD" => p.Content.FlashcardDeck?.Id,
                    _ => null
                };
                return new LearningHistoryEntryDto(
                    p.CourseId,
                    p.Course?.Title,
                    p.ModuleId,
                    p.Module?.Title,
                    p.ContentId,
                    p.Content?.Title,
                    p.Content?.ContentType,
                    p.ProgressPercentage,
                    p.IsCompleted,
                    p.UpdatedAt ?? p.CreatedAt,
                    null,
                    subEntityId
                );
            }).ToList();

            var quizAttempts = await _db.QuizAttempts
                .Where(a => a.UserId == userId)
                .Include(a => a.Quiz)
                    .ThenInclude(q => q!.Content)
                .OrderByDescending(a => a.CreatedAt)
                .Take(limit)
                .ToListAsync(ct);

            var attemptEntries = quizAttempts.Select(a => new LearningHistoryEntryDto(
                null, null, null, null,
                a.Quiz?.ContentId,
                a.Quiz?.Content?.Title ?? "Quiz",
                "QUIZ",
                a.ScorePercentage ?? 0,
                true,
                a.CreatedAt,
                a.Id
            ));

            var combined = progressRows
                .Concat(attemptEntries)
                .OrderByDescending(r => r.ActivityAt)
                .Take(limit)
                .ToList();

            return Ok(new ApiResponse<IEnumerable<LearningHistoryEntryDto>>(true, combined, null));
        }

        // GET /api/student-progress/quiz-attempts/{attemptId}
        // Returns full per-question review with resolved option texts for a past quiz attempt.
        [HttpGet("quiz-attempts/{attemptId:guid}")]
        public async Task<IActionResult> GetAttemptReview(Guid attemptId, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            var attempt = await _db.QuizAttempts
                .Where(a => a.Id == attemptId && a.UserId == userId.Value)
                .Include(a => a.Quiz)
                    .ThenInclude(q => q!.Content)
                .FirstOrDefaultAsync(ct);

            if (attempt == null)
                return NotFound(new ApiResponse(false, "Attempt not found."));

            var savedAnswers = JsonSerializer.Deserialize<Dictionary<string, string>>(attempt.Answers)
                ?? new Dictionary<string, string>();

            // Include soft-deleted questions — they existed when the attempt was made.
            var questions = await _db.Questions
                .Where(q => q.QuizId == attempt.QuizId)
                .Include(q => q.Options.OrderBy(o => o.OrderIndex))
                .OrderBy(q => q.OrderIndex)
                .ToListAsync(ct);

            var answerDtos = new List<AttemptAnswerDto>();
            foreach (var q in questions)
            {
                if (!savedAnswers.TryGetValue(q.Id.ToString(), out var selIdStr)) continue;
                if (!Guid.TryParse(selIdStr, out var selId)) continue;

                var selected = q.Options.FirstOrDefault(o => o.Id == selId);
                var correct = q.Options.FirstOrDefault(o => o.IsCorrect);
                if (selected == null || correct == null) continue;

                answerDtos.Add(new AttemptAnswerDto(
                    q.Id,
                    q.QuestionText,
                    selId,
                    selected.OptionText,
                    correct.Id,
                    correct.OptionText,
                    selected.IsCorrect,
                    q.Explanation
                ));
            }

            return Ok(new ApiResponse<QuizAttemptReviewDto>(true, new QuizAttemptReviewDto(
                attempt.Id,
                attempt.QuizId,
                attempt.Quiz?.Content?.Title ?? "Quiz",
                attempt.ScorePercentage ?? 0,
                attempt.CreatedAt,
                answerDtos
            ), null));
        }

        // POST /api/student-progress/activity — records personal content access (no course context)
        [HttpPost("activity")]
        public async Task<IActionResult> RecordActivity([FromBody] RecordActivityRequestDto request, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            var existing = await _db.StudentProgress
                .FirstOrDefaultAsync(p => p.CourseId == null && p.UserId == userId.Value && p.ContentId == request.ContentId, ct);

            if (existing != null)
            {
                var wasCompleted = existing.IsCompleted;
                existing.IsCompleted = request.IsCompleted || existing.IsCompleted;
                existing.ProgressPercentage = Math.Max(existing.ProgressPercentage, request.ProgressPercentage);
                existing.TimeSpentSeconds += request.TimeSpentSeconds;
                existing.UpdatedAt = DateTime.UtcNow;
                if (request.IsCompleted && !wasCompleted) existing.CompletedAt = DateTime.UtcNow;
                _db.StudentProgress.Update(existing);
            }
            else
            {
                var progress = new StudentProgressModel
                {
                    Id = Guid.NewGuid(),
                    CourseId = null,
                    UserId = userId.Value,
                    ContentId = request.ContentId,
                    IsCompleted = request.IsCompleted,
                    ProgressPercentage = request.ProgressPercentage,
                    TimeSpentSeconds = request.TimeSpentSeconds,
                    CreatedAt = DateTime.UtcNow
                };
                if (request.IsCompleted) progress.CompletedAt = DateTime.UtcNow;
                _db.StudentProgress.Add(progress);
            }

            await _db.SaveChangesAsync(ct);
            return Ok(new ApiResponse(true, "Activity recorded."));
        }

        // DELETE /api/student-progress/purge — irreversibly clears all learning history for the current user
        [HttpDelete("purge")]
        public async Task<IActionResult> PurgeHistory(CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            var progress = await _db.StudentProgress
                .IgnoreQueryFilters()
                .Where(p => p.UserId == userId.Value)
                .ToListAsync(ct);
            _db.StudentProgress.RemoveRange(progress);

            var attempts = await _db.QuizAttempts
                .Where(a => a.UserId == userId.Value)
                .ToListAsync(ct);
            _db.QuizAttempts.RemoveRange(attempts);

            await _db.SaveChangesAsync(ct);
            return Ok(new ApiResponse(true, "Learning history purged."));
        }
    }
}

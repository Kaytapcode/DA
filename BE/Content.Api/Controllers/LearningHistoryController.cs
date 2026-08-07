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

        public record LearningAnalyticsBucketDto(
            string BucketKey,
            DateTime BucketStart,
            int QuizAttempts,
            int VideoViews,
            int DocumentViews,
            int FlashcardDeckViews,
            double AvgQuizScore,
            int? BestQuizScore,
            int? LowestQuizScore
        );

        public record LearningAnalyticsSummaryDto(
            int TotalQuizAttempts,
            int TotalVideoViews,
            int TotalDocumentViews,
            int TotalFlashcardDeckViews,
            double AvgQuizScore,
            int? BestQuizScore,
            int? LowestQuizScore
        );

        public record LearningAnalyticsDto(
            string Period,
            DateTime RangeStart,
            DateTime RangeEnd,
            LearningAnalyticsSummaryDto Summary,
            List<LearningAnalyticsBucketDto> Buckets
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

        // GET /api/student-progress/analytics?period=day|month|year
        [HttpGet("analytics")]
        public async Task<IActionResult> GetLearningAnalytics([FromQuery] string period = "month", CancellationToken ct = default)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            var normalizedPeriod = NormalizePeriod(period);
            if (normalizedPeriod == null)
                return BadRequest(new ApiResponse(false, "Invalid period. Use day, month, or year."));

            var nowUtc = DateTime.UtcNow;
            var bucketStarts = BuildBucketStarts(normalizedPeriod, nowUtc);
            var rangeStart = bucketStarts[0];
            var rangeEndExclusive = NextBucketStart(normalizedPeriod, bucketStarts[^1]);

            var accumulators = bucketStarts
                .Select(start => new BucketAccumulator(GetBucketKey(normalizedPeriod, start), start))
                .ToDictionary(x => x.Key, x => x);

            var quizAttempts = await _db.QuizAttempts
                .AsNoTracking()
                .Where(a => a.UserId == userId.Value && a.CreatedAt >= rangeStart && a.CreatedAt < rangeEndExclusive)
                .Select(a => new { a.CreatedAt, a.ScorePercentage })
                .ToListAsync(ct);

            foreach (var attempt in quizAttempts)
            {
                var bucketKey = GetBucketKey(normalizedPeriod, BucketStart(normalizedPeriod, attempt.CreatedAt));
                if (!accumulators.TryGetValue(bucketKey, out var bucket)) continue;

                bucket.QuizAttempts += 1;
                if (attempt.ScorePercentage.HasValue)
                {
                    bucket.ScoreValues.Add(attempt.ScorePercentage.Value);
                }
            }

            var activityRows = await (
                from progress in _db.StudentProgress.IgnoreQueryFilters().AsNoTracking()
                join content in _db.Contents.IgnoreQueryFilters().AsNoTracking() on progress.ContentId equals content.Id into contentJoin
                from content in contentJoin.DefaultIfEmpty()
                where progress.UserId == userId.Value
                      && progress.ContentId.HasValue
                      && progress.CreatedAt >= rangeStart
                      && progress.CreatedAt < rangeEndExclusive
                select new
                {
                    progress.ContentId,
                    progress.CreatedAt,
                    ContentType = content != null ? content.ContentType : null
                }
            ).ToListAsync(ct);

            var distinctViews = activityRows
                .Where(row => row.ContentId.HasValue && row.ContentType != null)
                .Select(row => new
                {
                    BucketKey = GetBucketKey(normalizedPeriod, BucketStart(normalizedPeriod, row.CreatedAt)),
                    ContentType = row.ContentType!.ToUpperInvariant(),
                    ContentId = row.ContentId!.Value
                })
                .Where(row => row.ContentType is "VIDEO" or "PDF" or "FLASHCARD")
                .Distinct()
                .ToList();

            foreach (var view in distinctViews)
            {
                if (!accumulators.TryGetValue(view.BucketKey, out var bucket)) continue;
                switch (view.ContentType)
                {
                    case "VIDEO":
                        bucket.VideoViews += 1;
                        break;
                    case "PDF":
                        bucket.DocumentViews += 1;
                        break;
                    case "FLASHCARD":
                        bucket.FlashcardDeckViews += 1;
                        break;
                }
            }

            var orderedBuckets = accumulators.Values
                .OrderBy(bucket => bucket.BucketStart)
                .Select(bucket => new LearningAnalyticsBucketDto(
                    BucketKey: bucket.Key,
                    BucketStart: bucket.BucketStart,
                    QuizAttempts: bucket.QuizAttempts,
                    VideoViews: bucket.VideoViews,
                    DocumentViews: bucket.DocumentViews,
                    FlashcardDeckViews: bucket.FlashcardDeckViews,
                    AvgQuizScore: bucket.ScoreValues.Count > 0 ? Math.Round(bucket.ScoreValues.Average(), 1) : 0,
                    BestQuizScore: bucket.ScoreValues.Count > 0 ? bucket.ScoreValues.Max() : null,
                    LowestQuizScore: bucket.ScoreValues.Count > 0 ? bucket.ScoreValues.Min() : null
                ))
                .ToList();

            var allScores = quizAttempts
                .Where(a => a.ScorePercentage.HasValue)
                .Select(a => a.ScorePercentage!.Value)
                .ToList();

            var summary = new LearningAnalyticsSummaryDto(
                TotalQuizAttempts: orderedBuckets.Sum(b => b.QuizAttempts),
                TotalVideoViews: orderedBuckets.Sum(b => b.VideoViews),
                TotalDocumentViews: orderedBuckets.Sum(b => b.DocumentViews),
                TotalFlashcardDeckViews: orderedBuckets.Sum(b => b.FlashcardDeckViews),
                AvgQuizScore: allScores.Count > 0 ? Math.Round(allScores.Average(), 1) : 0,
                BestQuizScore: allScores.Count > 0 ? allScores.Max() : null,
                LowestQuizScore: allScores.Count > 0 ? allScores.Min() : null
            );

            var response = new LearningAnalyticsDto(
                Period: normalizedPeriod,
                RangeStart: rangeStart,
                RangeEnd: rangeEndExclusive.AddTicks(-1),
                Summary: summary,
                Buckets: orderedBuckets
            );

            return Ok(new ApiResponse<LearningAnalyticsDto>(true, response, null));
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

        private static string? NormalizePeriod(string? rawPeriod)
        {
            return rawPeriod?.Trim().ToLowerInvariant() switch
            {
                "day" => "day",
                "month" => "month",
                "year" => "year",
                _ => null
            };
        }

        private static List<DateTime> BuildBucketStarts(string period, DateTime nowUtc)
        {
            if (period == "day")
            {
                var today = nowUtc.Date;
                return Enumerable.Range(0, 30).Select(i => today.AddDays(-(29 - i))).ToList();
            }

            if (period == "month")
            {
                var currentMonthStart = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                return Enumerable.Range(0, 12).Select(i => currentMonthStart.AddMonths(-(11 - i))).ToList();
            }

            var currentYearStart = new DateTime(nowUtc.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            return Enumerable.Range(0, 5).Select(i => currentYearStart.AddYears(-(4 - i))).ToList();
        }

        private static DateTime NextBucketStart(string period, DateTime bucketStart)
        {
            return period switch
            {
                "day" => bucketStart.AddDays(1),
                "month" => bucketStart.AddMonths(1),
                _ => bucketStart.AddYears(1)
            };
        }

        private static DateTime BucketStart(string period, DateTime value)
        {
            return period switch
            {
                "day" => value.Date,
                "month" => new DateTime(value.Year, value.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                _ => new DateTime(value.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
        }

        private static string GetBucketKey(string period, DateTime bucketStart)
        {
            return period switch
            {
                "day" => bucketStart.ToString("yyyy-MM-dd"),
                "month" => bucketStart.ToString("yyyy-MM"),
                _ => bucketStart.ToString("yyyy")
            };
        }

        private sealed class BucketAccumulator
        {
            public BucketAccumulator(string key, DateTime bucketStart)
            {
                Key = key;
                BucketStart = bucketStart;
            }

            public string Key { get; }
            public DateTime BucketStart { get; }
            public int QuizAttempts { get; set; }
            public int VideoViews { get; set; }
            public int DocumentViews { get; set; }
            public int FlashcardDeckViews { get; set; }
            public List<int> ScoreValues { get; } = new();
        }
    }
}

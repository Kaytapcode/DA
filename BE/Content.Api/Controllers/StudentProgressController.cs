using System.Net.Http.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/courses/{courseId:guid}/progress")]
    [Authorize]
    public class StudentProgressController : ControllerBase
    {
        private readonly IStudentProgressRepository _progressRepo;
        private readonly ICourseRepository _courseRepo;
        private readonly IOrgContextService _orgCtx;
        private readonly ICourseAccessService _access;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public StudentProgressController(
            IStudentProgressRepository progressRepo,
            ICourseRepository courseRepo,
            IOrgContextService orgCtx,
            ICourseAccessService access,
            IHttpClientFactory httpClientFactory,
            IConfiguration config)
        {
            _progressRepo = progressRepo;
            _courseRepo = courseRepo;
            _orgCtx = orgCtx;
            _access = access;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        // Resolve userId -> username via Identity's internal batch endpoint (same pattern as
        // SearchController/CourseEnrollmentController). Best-effort: missing names stay blank.
        private async Task<Dictionary<Guid, string>> ResolveUsernamesAsync(IEnumerable<Guid> ids, CancellationToken ct)
        {
            var distinct = ids.Distinct().ToList();
            var map = new Dictionary<Guid, string>();
            if (distinct.Count == 0) return map;
            try
            {
                var baseUrl = (_config["Identity:InternalBaseUrl"] ?? "http://localhost:5001").TrimEnd('/');
                var qs = string.Join("&", distinct.Select(id => $"ids={id}"));
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(8);
                var resp = await client.GetFromJsonAsync<ApiResponse<IEnumerable<UserInfoLite>>>(
                    $"{baseUrl}/api/internal/users/batch?{qs}", ct);
                if (resp?.Data != null)
                    foreach (var u in resp.Data) map[u.Id] = u.Username;
            }
            catch { /* best-effort */ }
            return map;
        }

        private record UserInfoLite(Guid Id, string Username, string? Email, string? Role);

        // Per-course access: an enrolled student usually has NO globally-selected org, so progress
        // must gate on CanViewAsync (enrollment/OrgAdmin/SysAdmin) — never org-equality alone.
        // Without this, every in-course progress write 404'd and all course/home counters stayed 0.
        private Task<bool> VerifyCourseAccessAsync(Guid courseId) => _access.CanViewAsync(courseId);

        private static StudentProgressDto ToDto(StudentProgressModel p) => new(
            p.Id, p.CourseId, p.UserId, p.ModuleId, p.ContentId,
            p.ProgressPercentage, p.IsCompleted, p.CompletedAt,
            p.TimeSpentSeconds, p.UpdatedAt ?? p.CreatedAt
        );

        // POST /api/courses/{courseId}/progress
        [HttpPost]
        public async Task<IActionResult> RecordProgress(Guid courseId, [FromBody] RecordProgressRequestDto request, CancellationToken ct)
        {
            if (!await VerifyCourseAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var totalModules = await _progressRepo.CountCourseModulesAsync(courseId, ct);

            // Build progress record
            var progress = new StudentProgressModel
            {
                CourseId = courseId,
                UserId = userId.Value,
                ModuleId = request.ModuleId,
                ContentId = request.ContentId,
                IsCompleted = request.IsCompleted,
                TimeSpentSeconds = request.TimeSpentSeconds
            };

            var upserted = await _progressRepo.UpsertAsync(progress, ct);

            // Recalculate overall course progress %
            if (totalModules > 0)
            {
                var allProgress = await _progressRepo.GetByCourseUserAsync(courseId, userId.Value, ct);
                var completedModules = allProgress.Count(p => p.ModuleId.HasValue && p.IsCompleted);
                upserted.ProgressPercentage = (completedModules * 100) / totalModules;
                await _progressRepo.UpsertAsync(upserted, ct);
            }

            return Ok(new ApiResponse<StudentProgressDto>(true, ToDto(upserted), "Progress recorded."));
        }

        // GET /api/courses/{courseId}/progress
        [HttpGet]
        public async Task<IActionResult> GetProgress(Guid courseId, CancellationToken ct)
        {
            if (!await VerifyCourseAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var allProgress = await _progressRepo.GetByCourseUserAsync(courseId, userId.Value, ct);
            var totalModules = await _progressRepo.CountCourseModulesAsync(courseId, ct);
            var completedItems = allProgress.Count(p => p.IsCompleted);
            var overallPct = totalModules > 0 ? (completedItems * 100) / totalModules : 0;
            var lastActive = allProgress
                .Select(p => p.UpdatedAt ?? p.CreatedAt)
                .OrderByDescending(d => d)
                .FirstOrDefault();

            return Ok(new ApiResponse<CourseProgressSummaryDto>(true,
                new CourseProgressSummaryDto(courseId, userId.Value, overallPct, completedItems, totalModules, lastActive == default ? null : lastActive),
                null));
        }

        // GET /api/courses/{courseId}/progress/items — flat per-content rows for the caller.
        [HttpGet("items")]
        public async Task<IActionResult> GetItemProgress(Guid courseId, CancellationToken ct)
        {
            if (!await VerifyCourseAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var rows = await _progressRepo.GetByCourseUserAsync(courseId, userId.Value, ct);
            var items = rows
                .Where(p => p.ContentId.HasValue)
                .Select(p => new {
                    contentId = p.ContentId,
                    moduleId = p.ModuleId,
                    progressPercentage = p.ProgressPercentage,
                    isCompleted = p.IsCompleted,
                    updatedAt = p.UpdatedAt ?? p.CreatedAt,
                });

            return Ok(new ApiResponse<object>(true, items, null));
        }

        // GET /api/courses/{courseId}/progress/analytics — Teacher progress dashboard data.
        // Gated by CanTeachAsync (SysAdmin / OrgAdmin-of-org / APPROVED per-course Teacher), NOT the
        // RequireTeacher JWT-role policy — a per-course Teacher's JWT role is "Student" (spec §5), so
        // the policy would wrongly block them.
        [HttpGet("analytics")]
        public async Task<IActionResult> GetAnalytics(Guid courseId, CancellationToken ct)
        {
            if (!await _access.CanTeachAsync(courseId, ct))
                return Forbid();

            var allProgress = await _progressRepo.GetByCourseAsync(courseId, ct);
            var totalContents = await _progressRepo.CountCourseContentsAsync(courseId, ct);

            var byUser = allProgress
                .GroupBy(p => p.UserId)
                .Select(g =>
                {
                    // % = distinct completed contents / total contents in the course (capped 100).
                    var completedContents = g.Where(p => p.IsCompleted && p.ContentId.HasValue)
                        .Select(p => p.ContentId).Distinct().Count();
                    var pct = totalContents > 0 ? Math.Min(100, completedContents * 100 / totalContents) : 0;
                    var lastActive = g
                        .Select(p => p.UpdatedAt ?? p.CreatedAt)
                        .OrderByDescending(d => d)
                        .FirstOrDefault();
                    return new StudentProgressSummaryDto(
                        UserId: g.Key,
                        Username: string.Empty,
                        ProgressPercentage: pct,
                        LastActive: lastActive == default ? null : lastActive
                    );
                })
                .ToList();

            // Enrich usernames so the dashboard shows names, not GUIDs.
            var names = await ResolveUsernamesAsync(byUser.Select(b => b.UserId), ct);
            byUser = byUser.Select(b => b with { Username = names.GetValueOrDefault(b.UserId, "") }).ToList();

            var totalStudents = byUser.Count;
            var avgProgress = totalStudents > 0 ? byUser.Average(s => s.ProgressPercentage) : 0;
            var studentsCompleted = byUser.Count(s => s.ProgressPercentage >= 100);

            return Ok(new ApiResponse<CourseAnalyticsDto>(true,
                new CourseAnalyticsDto(courseId, totalStudents, avgProgress, studentsCompleted, byUser),
                null));
        }
    }
}

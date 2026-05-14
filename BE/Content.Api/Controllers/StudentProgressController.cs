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

        public StudentProgressController(
            IStudentProgressRepository progressRepo,
            ICourseRepository courseRepo,
            IOrgContextService orgCtx)
        {
            _progressRepo = progressRepo;
            _courseRepo = courseRepo;
            _orgCtx = orgCtx;
        }

        private async Task<bool> VerifyCourseAccessAsync(Guid courseId)
        {
            var course = await _courseRepo.GetByIdAsync(courseId);
            if (course == null) return false;
            return _orgCtx.IsSysAdmin() || course.OrgId == _orgCtx.GetCurrentOrgId();
        }

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

        // GET /api/courses/{courseId}/progress/analytics
        [HttpGet("analytics")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> GetAnalytics(Guid courseId, CancellationToken ct)
        {
            if (!await VerifyCourseAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));

            var allProgress = await _progressRepo.GetByCourseAsync(courseId, ct);
            var totalModules = await _progressRepo.CountCourseModulesAsync(courseId, ct);

            var byUser = allProgress
                .GroupBy(p => p.UserId)
                .Select(g =>
                {
                    var completedCount = g.Count(p => p.IsCompleted);
                    var pct = totalModules > 0 ? (completedCount * 100) / totalModules : 0;
                    var lastActive = g
                        .Select(p => p.UpdatedAt ?? p.CreatedAt)
                        .OrderByDescending(d => d)
                        .FirstOrDefault();
                    return new StudentProgressSummaryDto(
                        UserId: g.Key,
                        Username: string.Empty, // enriched by Identity.Api in a future integration
                        ProgressPercentage: pct,
                        LastActive: lastActive == default ? null : lastActive
                    );
                })
                .ToList();

            var totalStudents = byUser.Count;
            var avgProgress = totalStudents > 0 ? byUser.Average(s => s.ProgressPercentage) : 0;
            var studentsCompleted = byUser.Count(s => s.ProgressPercentage >= 100);

            return Ok(new ApiResponse<CourseAnalyticsDto>(true,
                new CourseAnalyticsDto(courseId, totalStudents, avgProgress, studentsCompleted, byUser),
                null));
        }
    }
}

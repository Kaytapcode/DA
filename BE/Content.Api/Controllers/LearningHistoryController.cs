using Content.Api.Data;
using Content.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    // Spec §4.3: "Progress Tracking: The system automatically records and updates the
    // Student's learning progress for each resource and course." This controller surfaces
    // a flat cross-course recent-activity feed for the user's Learning History page.
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
            Guid CourseId,
            string? CourseTitle,
            Guid? ModuleId,
            string? ModuleTitle,
            Guid? ContentId,
            string? ContentTitle,
            string? ContentType,
            int ProgressPercentage,
            bool IsCompleted,
            DateTime ActivityAt
        );

        // GET /api/student-progress/recent?limit=20
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent([FromQuery] int limit = 20, CancellationToken ct = default)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();
            limit = Math.Clamp(limit, 1, 100);

            var rows = await _db.StudentProgress
                .IgnoreQueryFilters()
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.UpdatedAt ?? p.CreatedAt)
                .Take(limit)
                .Select(p => new LearningHistoryEntryDto(
                    p.CourseId,
                    p.Course != null ? p.Course.Title : null,
                    p.ModuleId,
                    p.Module != null ? p.Module.Title : null,
                    p.ContentId,
                    p.Content != null ? p.Content.Title : null,
                    p.Content != null ? p.Content.ContentType : null,
                    p.ProgressPercentage,
                    p.IsCompleted,
                    p.UpdatedAt ?? p.CreatedAt
                ))
                .ToListAsync(ct);

            return Ok(new ApiResponse<IEnumerable<LearningHistoryEntryDto>>(true, rows, null));
        }
    }
}

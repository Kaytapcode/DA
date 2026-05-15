using Content.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/analytics")]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly ContentDbContext _db;

        public AnalyticsController(ContentDbContext db) => _db = db;

        public record SysAdminOverviewDto(
            int TotalCourses,
            int TotalModules,
            int TotalQuizzes,
            int TotalFlashcardDecks,
            int TotalVideos,
            int TotalDocuments,
            int TotalQuizAttempts
        );

        public record OrgOverviewDto(
            Guid OrgId,
            int CourseCount,
            int ActiveCourseCount,
            int ModuleCount,
            int CompletedAttempts,
            int RecentEnrollments
        );

        // GET /api/analytics/sysadmin — system-wide content metrics.
        [HttpGet("sysadmin")]
        [Authorize(Policy = "RequireSysAdmin")]
        public async Task<IActionResult> GetSysAdminOverview(CancellationToken ct)
        {
            // IgnoreQueryFilters because SysAdmin sees everything regardless of org context.
            var dto = new SysAdminOverviewDto(
                TotalCourses: await _db.Courses.IgnoreQueryFilters().CountAsync(ct),
                TotalModules: await _db.Modules.IgnoreQueryFilters().CountAsync(ct),
                TotalQuizzes: await _db.Quizzes.IgnoreQueryFilters().CountAsync(ct),
                TotalFlashcardDecks: await _db.FlashcardDecks.IgnoreQueryFilters().CountAsync(ct),
                TotalVideos: await _db.Videos.IgnoreQueryFilters().Where(v => v.DeletedAt == null).CountAsync(ct),
                TotalDocuments: await _db.Documents.IgnoreQueryFilters().Where(d => d.DeletedAt == null).CountAsync(ct),
                TotalQuizAttempts: await _db.QuizAttempts.IgnoreQueryFilters().CountAsync(ct)
            );
            return Ok(new ApiResponse<SysAdminOverviewDto>(true, dto, null));
        }

        // GET /api/analytics/orgs/{orgId} — per-org content metrics.
        [HttpGet("orgs/{orgId:guid}")]
        [Authorize(Policy = "RequireOrgAdmin")]
        public async Task<IActionResult> GetOrgOverview(Guid orgId, CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.AddDays(-30);
            var dto = new OrgOverviewDto(
                OrgId: orgId,
                CourseCount: await _db.Courses.IgnoreQueryFilters().CountAsync(c => c.OrgId == orgId, ct),
                ActiveCourseCount: await _db.Courses.IgnoreQueryFilters()
                    .CountAsync(c => c.OrgId == orgId && c.Status == "ACTIVE", ct),
                ModuleCount: await _db.Modules.IgnoreQueryFilters().CountAsync(m => m.OrgId == orgId, ct),
                CompletedAttempts: await _db.QuizAttempts.IgnoreQueryFilters()
                    .Where(a => _db.Quizzes.IgnoreQueryFilters()
                        .Any(q => q.Id == a.QuizId
                            && _db.Contents.IgnoreQueryFilters().Any(c => c.Id == q.ContentId
                                && c.ModuleContents.Any(mc => mc.Module!.OrgId == orgId))))
                    .CountAsync(ct),
                RecentEnrollments: await _db.CourseEnrollments
                    .Where(e => e.EnrolledAt >= cutoff
                        && _db.Courses.IgnoreQueryFilters().Any(c => c.Id == e.CourseId && c.OrgId == orgId))
                    .CountAsync(ct)
            );
            return Ok(new ApiResponse<OrgOverviewDto>(true, dto, null));
        }
    }
}

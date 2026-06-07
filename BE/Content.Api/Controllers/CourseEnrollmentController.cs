using System.Net.Http.Json;
using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/courses/{courseId:guid}/enrollments")]
    [Authorize]
    public class CourseEnrollmentController : ControllerBase
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<CourseEnrollmentController> _logger;

        public CourseEnrollmentController(
            ContentDbContext db,
            IOrgContextService orgCtx,
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            ILogger<CourseEnrollmentController> logger)
        {
            _db = db;
            _orgCtx = orgCtx;
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        // Auto-provision an approved student into the course's organization as a 'Member'
        // (Demo flow 3 / spec §4.2). Cross-service call to Organization.Api's internal endpoint;
        // idempotent there. Best-effort + logged — the enrollment approval itself already persisted.
        private async Task EnsureOrgMembershipAsync(Guid orgId, Guid userId, CancellationToken ct)
        {
            try
            {
                var baseUrl = _config["Organization:InternalBaseUrl"] ?? "http://localhost:5002";
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                var resp = await client.PostAsync(
                    $"{baseUrl.TrimEnd('/')}/api/internal/orgs/{orgId}/members/{userId}", content: null, ct);
                if (!resp.IsSuccessStatusCode)
                    _logger.LogWarning("Auto-provision org membership returned {Status} for user {User} org {Org}",
                        resp.StatusCode, userId, orgId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to auto-provision org membership for user {User} org {Org}", userId, orgId);
            }
        }

        private async Task<CourseModel?> LoadCourseInScopeAsync(Guid courseId, CancellationToken ct)
        {
            var course = await _db.Courses.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == courseId, ct);
            if (course == null) return null;
            return _orgCtx.IsSysAdmin() || course.OrgId == _orgCtx.GetCurrentOrgId() ? course : null;
        }

        // GET /api/courses/{courseId}/enrollments?status=Pending
        // Teacher + OrgAdmin see all (optionally filtered by status); Student sees only their own row.
        [HttpGet]
        public async Task<IActionResult> GetEnrollments(Guid courseId, [FromQuery] string? status, CancellationToken ct = default)
        {
            // Existence only — NOT org-scoped: a non-privileged enrolled user (e.g. a per-course
            // Teacher whose JWT role is "Student" and who has no selected org) must be able to read
            // their OWN enrollment row to discover their per-course role. Privileged callers
            // (SysAdmin / OrgAdmin of this org) see the full roster.
            var course = await _db.Courses.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == courseId, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var userId = _orgCtx.GetCurrentUserId();
            var role = _orgCtx.GetCurrentRole();
            var isPrivileged = _orgCtx.IsSysAdmin() || (role == "OrgAdmin" && _orgCtx.GetCurrentOrgId() == course.OrgId);

            var query = _db.CourseEnrollments.AsNoTracking().Where(e => e.CourseId == courseId);
            if (!isPrivileged)
                query = query.Where(e => e.UserId == userId);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(e => e.Status == status);

            var rows = await query
                .Select(e => new CourseEnrollmentResponseDto(e.Id, e.CourseId, e.UserId, e.Role, e.EnrolledAt, e.Status, null))
                .ToListAsync(ct);

            // Resolve usernames so the roster shows a name instead of a raw GUID (spec §6.4 pattern).
            var names = await ResolveUsernamesAsync(rows.Select(r => r.UserId), ct);
            var enriched = rows.Select(r => r with { Username = names.GetValueOrDefault(r.UserId) });

            return Ok(new ApiResponse<IEnumerable<CourseEnrollmentResponseDto>>(true, enriched, null));
        }

        // Resolve userId -> username via Identity.Api's internal batch endpoint. Best-effort.
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
                    foreach (var u in resp.Data)
                        map[u.Id] = u.Username;
            }
            catch { /* name resolution is best-effort */ }
            return map;
        }

        private record UserInfoLite(Guid Id, string Username, string? Email, string? Role);

        // POST /api/courses/{courseId}/enrollments/request — any authenticated user self-requests
        // enrollment in a course of their org. Creates a 'Pending' Student row that an OrgAdmin
        // must approve. Idempotent: an existing Pending/Approved row is returned unchanged; a
        // previously Rejected row is reopened as Pending.
        [HttpPost("request")]
        public async Task<IActionResult> RequestEnrollment(Guid courseId, CancellationToken ct)
        {
            // Existence-only (NOT org-scoped): any authenticated user — including one not yet in any
            // organization — may request to join a course from the global catalog (spec §6.3).
            var course = await _db.Courses.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == courseId, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var existing = await _db.CourseEnrollments.FirstOrDefaultAsync(
                e => e.CourseId == courseId && e.UserId == userId.Value, ct);

            if (existing != null)
            {
                if (existing.Status == "Rejected")
                {
                    existing.Status = "Pending";
                    existing.Role = "Student";
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync(ct);
                }
                return Ok(new ApiResponse<CourseEnrollmentResponseDto>(
                    true,
                    new CourseEnrollmentResponseDto(existing.Id, existing.CourseId, existing.UserId, existing.Role, existing.EnrolledAt, existing.Status),
                    existing.Status == "Approved" ? "Already enrolled." : "Enrollment request pending approval."));
            }

            var enrollment = new CourseEnrollmentModel
            {
                Id = Guid.NewGuid(),
                CourseId = courseId,
                UserId = userId.Value,
                Role = "Student",
                Status = "Pending",
                EnrolledAt = DateTime.UtcNow
            };
            _db.CourseEnrollments.Add(enrollment);
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<CourseEnrollmentResponseDto>(
                true,
                new CourseEnrollmentResponseDto(enrollment.Id, enrollment.CourseId, enrollment.UserId, enrollment.Role, enrollment.EnrolledAt, enrollment.Status),
                "Enrollment request submitted; awaiting OrgAdmin approval."));
        }

        // POST /api/courses/{courseId}/enrollments/{userId}/approve — OrgAdmin/SysAdmin approves a
        // pending request. Optionally promotes the role (Teacher/Student) at approval time.
        [HttpPost("{userId:guid}/approve")]
        [Authorize(Policy = "RequireOrgAdmin")]
        public async Task<IActionResult> ApproveEnrollment(Guid courseId, Guid userId, [FromBody] ApproveEnrollmentRequestDto? request, CancellationToken ct)
        {
            var course = await LoadCourseInScopeAsync(courseId, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var enrollment = await _db.CourseEnrollments.FirstOrDefaultAsync(
                e => e.CourseId == courseId && e.UserId == userId, ct);
            if (enrollment == null)
                return NotFound(new ApiResponse(false, "Enrollment request not found."));

            enrollment.Status = "Approved";
            if (request != null && !string.IsNullOrWhiteSpace(request.Role))
                enrollment.Role = request.Role;
            enrollment.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            // Atomic-membership rule (Demo flow 3 / spec §4.2): approving a course enrollment
            // auto-provisions the user as a Member of the course's organization if not already one.
            await EnsureOrgMembershipAsync(course.OrgId, userId, ct);

            return Ok(new ApiResponse<CourseEnrollmentResponseDto>(
                true,
                new CourseEnrollmentResponseDto(enrollment.Id, enrollment.CourseId, enrollment.UserId, enrollment.Role, enrollment.EnrolledAt, enrollment.Status),
                "Enrollment approved."));
        }

        // POST /api/courses/{courseId}/enrollments/{userId}/reject — OrgAdmin/SysAdmin rejects a
        // pending request. The row is kept with status 'Rejected' (the user may re-request later).
        [HttpPost("{userId:guid}/reject")]
        [Authorize(Policy = "RequireOrgAdmin")]
        public async Task<IActionResult> RejectEnrollment(Guid courseId, Guid userId, CancellationToken ct)
        {
            var course = await LoadCourseInScopeAsync(courseId, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var enrollment = await _db.CourseEnrollments.FirstOrDefaultAsync(
                e => e.CourseId == courseId && e.UserId == userId, ct);
            if (enrollment == null)
                return NotFound(new ApiResponse(false, "Enrollment request not found."));

            enrollment.Status = "Rejected";
            enrollment.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<CourseEnrollmentResponseDto>(
                true,
                new CourseEnrollmentResponseDto(enrollment.Id, enrollment.CourseId, enrollment.UserId, enrollment.Role, enrollment.EnrolledAt, enrollment.Status),
                "Enrollment request rejected."));
        }

        // POST /api/courses/{courseId}/enrollments — OrgAdmin/SysAdmin only.
        [HttpPost]
        [Authorize(Policy = "RequireOrgAdmin")]
        public async Task<IActionResult> CreateEnrollment(Guid courseId, [FromBody] CreateCourseEnrollmentRequestDto request, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(new ApiResponse(false, "Invalid request data."));

            var course = await LoadCourseInScopeAsync(courseId, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var existing = await _db.CourseEnrollments.FirstOrDefaultAsync(
                e => e.CourseId == courseId && e.UserId == request.UserId, ct);
            if (existing != null)
                return Conflict(new ApiResponse(false, "User is already enrolled in this course."));

            var enrollment = new CourseEnrollmentModel
            {
                Id = Guid.NewGuid(),
                CourseId = courseId,
                UserId = request.UserId,
                Role = request.Role,
                // OrgAdmin directly enrolling a user is an immediate, approved enrollment.
                Status = "Approved",
                EnrolledAt = DateTime.UtcNow
            };

            _db.CourseEnrollments.Add(enrollment);
            await _db.SaveChangesAsync(ct);

            // A directly-added member (incl. a Teacher) is also auto-provisioned into the course's
            // organization, mirroring approval — so they show up under org membership consistently.
            await EnsureOrgMembershipAsync(course.OrgId, request.UserId, ct);

            return Ok(new ApiResponse<CourseEnrollmentResponseDto>(
                true,
                new CourseEnrollmentResponseDto(enrollment.Id, enrollment.CourseId, enrollment.UserId, enrollment.Role, enrollment.EnrolledAt, enrollment.Status),
                "Enrollment created."));
        }

        // PATCH /api/courses/{courseId}/enrollments/{userId} — change role.
        [HttpPatch("{userId:guid}")]
        [Authorize(Policy = "RequireOrgAdmin")]
        public async Task<IActionResult> UpdateEnrollment(Guid courseId, Guid userId, [FromBody] UpdateCourseEnrollmentRequestDto request, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(new ApiResponse(false, "Invalid request data."));

            var course = await LoadCourseInScopeAsync(courseId, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var enrollment = await _db.CourseEnrollments.FirstOrDefaultAsync(
                e => e.CourseId == courseId && e.UserId == userId, ct);
            if (enrollment == null)
                return NotFound(new ApiResponse(false, "Enrollment not found."));

            enrollment.Role = request.Role;
            enrollment.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<CourseEnrollmentResponseDto>(
                true,
                new CourseEnrollmentResponseDto(enrollment.Id, enrollment.CourseId, enrollment.UserId, enrollment.Role, enrollment.EnrolledAt, enrollment.Status),
                "Enrollment role updated."));
        }

        // DELETE /api/courses/{courseId}/enrollments/{userId}
        [HttpDelete("{userId:guid}")]
        [Authorize(Policy = "RequireOrgAdmin")]
        public async Task<IActionResult> DeleteEnrollment(Guid courseId, Guid userId, CancellationToken ct)
        {
            var course = await LoadCourseInScopeAsync(courseId, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var enrollment = await _db.CourseEnrollments.FirstOrDefaultAsync(
                e => e.CourseId == courseId && e.UserId == userId, ct);
            if (enrollment == null)
                return NotFound(new ApiResponse(false, "Enrollment not found."));

            _db.CourseEnrollments.Remove(enrollment);
            await _db.SaveChangesAsync(ct);
            return Ok(new ApiResponse(true, "Enrollment removed."));
        }
    }
}

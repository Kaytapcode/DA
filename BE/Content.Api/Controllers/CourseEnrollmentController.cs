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

        public CourseEnrollmentController(ContentDbContext db, IOrgContextService orgCtx)
        {
            _db = db;
            _orgCtx = orgCtx;
        }

        private async Task<CourseModel?> LoadCourseInScopeAsync(Guid courseId, CancellationToken ct)
        {
            var course = await _db.Courses.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == courseId, ct);
            if (course == null) return null;
            return _orgCtx.IsSysAdmin() || course.OrgId == _orgCtx.GetCurrentOrgId() ? course : null;
        }

        // GET /api/courses/{courseId}/enrollments
        // Teacher + OrgAdmin see all; Student sees only their own row.
        [HttpGet]
        public async Task<IActionResult> GetEnrollments(Guid courseId, CancellationToken ct)
        {
            var course = await LoadCourseInScopeAsync(courseId, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var userId = _orgCtx.GetCurrentUserId();
            var role = _orgCtx.GetCurrentRole();
            var isPrivileged = _orgCtx.IsSysAdmin() || role == "OrgAdmin" || role == "Teacher";

            var query = _db.CourseEnrollments.AsNoTracking().Where(e => e.CourseId == courseId);
            if (!isPrivileged)
                query = query.Where(e => e.UserId == userId);

            var rows = await query
                .Select(e => new CourseEnrollmentResponseDto(e.Id, e.CourseId, e.UserId, e.Role, e.EnrolledAt))
                .ToListAsync(ct);

            return Ok(new ApiResponse<IEnumerable<CourseEnrollmentResponseDto>>(true, rows, null));
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
                EnrolledAt = DateTime.UtcNow
            };

            _db.CourseEnrollments.Add(enrollment);
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<CourseEnrollmentResponseDto>(
                true,
                new CourseEnrollmentResponseDto(enrollment.Id, enrollment.CourseId, enrollment.UserId, enrollment.Role, enrollment.EnrolledAt),
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
                new CourseEnrollmentResponseDto(enrollment.Id, enrollment.CourseId, enrollment.UserId, enrollment.Role, enrollment.EnrolledAt),
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

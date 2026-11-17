using Content.Api.CQRS.Courses.Commands;
using Content.Api.CQRS.Courses.Queries;
using Content.Api.Services;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CoursesController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IOrgContextService _orgCtx;
        private readonly ICourseAccessService _access;
        private readonly Content.Api.Data.ContentDbContext _db;

        public CoursesController(IMediator mediator, IOrgContextService orgCtx, ICourseAccessService access, Content.Api.Data.ContentDbContext db)
        {
            _mediator = mediator;
            _orgCtx = orgCtx;
            _access = access;
            _db = db;
        }

        // GET /api/courses/enrolled — courses the current user is APPROVED-enrolled in, with their
        // per-course role. Powers the user's "My Courses" page (no org context required — keyed on
        // the user's own enrollment rows). Literal route, so it never collides with GET {id}.
        [HttpGet("enrolled")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<EnrolledCourseDto>>), 200)]
        public async Task<IActionResult> GetEnrolledCourses(CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var rows = await (
                from e in _db.CourseEnrollments.IgnoreQueryFilters()
                join c in _db.Courses.IgnoreQueryFilters() on e.CourseId equals c.Id
                where e.UserId == userId.Value && e.Status == "Approved"
                select new EnrolledCourseDto(c.Id, c.Title, c.Description, c.CourseCode, e.Role, e.Status, c.OrgId)
            ).ToListAsync(ct);

            return Ok(new ApiResponse<IEnumerable<EnrolledCourseDto>>(true, rows, null));
        }

        // GET /api/courses/catalog?query= — GLOBAL public course catalog (spec §6.3). Any authenticated
        // user (even one not yet in any org) can discover courses across all orgs and request to join.
        // Directory-level fields only.
        public record CatalogCourseDto(Guid Id, string Title, string? Description, string? CourseCode, Guid OrgId);

        [HttpGet("catalog")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<CatalogCourseDto>>), 200)]
        public async Task<IActionResult> Catalog([FromQuery] string? query, [FromQuery] int pageSize = 50, CancellationToken ct = default)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized(new ApiResponse(false, "Invalid user context."));

            // M6/Q3: only PUBLISHED courses, and none from a Suspended org (unknown status = view, Q8).
            var q = _db.Courses.IgnoreQueryFilters().Where(c => c.Status == CourseStatus.Published);
            if (!string.IsNullOrWhiteSpace(query))
                q = q.Where(c => EF.Functions.ILike(c.Title, $"%{query.Trim()}%"));

            var suspended = new List<Guid>();
            foreach (var orgId in await q.Select(c => c.OrgId).Distinct().ToListAsync(ct))
                if (await _access.GetOrgStatusAsync(orgId, ct) == "Suspended") suspended.Add(orgId);
            if (suspended.Count > 0)
                q = q.Where(c => !suspended.Contains(c.OrgId));

            var items = await q
                .OrderByDescending(c => c.CreatedAt)
                .Take(Math.Clamp(pageSize, 1, 200))
                .Select(c => new CatalogCourseDto(c.Id, c.Title, c.Description, c.CourseCode, c.OrgId))
                .ToListAsync(ct);

            return Ok(new ApiResponse<IEnumerable<CatalogCourseDto>>(true, items, null));
        }

        [HttpGet]
        [ProducesResponseType(typeof(PaginatedResponse<CourseListResponseDto>), 200)]
        public async Task<IActionResult> GetCourses(
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 10)
        {
            var isSysAdmin = _orgCtx.IsSysAdmin();
            var orgId = _orgCtx.GetCurrentOrgId();
            if (!isSysAdmin && !orgId.HasValue)
                return BadRequest(new ApiResponse(false, "No org context."));

            var result = await _mediator.Send(new GetCoursesQuery(orgId, isSysAdmin, pageIndex, pageSize));
            return Ok(result);
        }

        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 200)]
        public async Task<IActionResult> GetCourse(Guid id, CancellationToken ct)
        {
            // Access is per-course, not purely org-scoped: an APPROVED-enrolled student may open a
            // course even without a globally-selected org. CanViewAsync covers SysAdmin, OrgAdmin of
            // the course's org, and any approved enrollment. We load the row ignoring the org query
            // filter and gate on CanView so an enrolled user no longer sees a false "Course not found".
            var course = await _db.Courses.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == id, ct);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found"));
            if (!await _access.CanViewAsync(id, ct))
                return NotFound(new ApiResponse(false, "Course not found"));

            var dto = new CourseResponseDto(course.Id, course.OrgId, course.Title,
                course.Description, course.CourseCode, course.CreatedBy, course.CreatedAt, course.Status);
            return Ok(new ApiResponse<CourseResponseDto>(true, dto, "Course retrieved successfully"));
        }

        [HttpPost]
        [Authorize(Policy = "RequireOrgAdmin")] // Q2: course CRUD = OrgAdmin of the org (org scope in handler) or SysAdmin
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 201)]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(new ApiResponse(false, "Invalid request data"));

            var orgId = _orgCtx.GetCurrentOrgId();
            if (!orgId.HasValue) return BadRequest(new ApiResponse(false, "No org context."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return BadRequest(new ApiResponse(false, "Invalid user context."));
            if (await SuspendedOrgResultAsync() is { } blocked) return blocked;

            var created = await _mediator.Send(new CreateCourseCommand(
                orgId.Value, userId.Value, request.Title, request.Description, request.CourseCode));

            return CreatedAtAction(nameof(GetCourse), new { id = created.Id },
                new ApiResponse<CourseResponseDto>(true, created, "Course created successfully"));
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "RequireOrgAdmin")] // Q2: course CRUD = OrgAdmin of the org (org scope in handler) or SysAdmin
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 200)]
        public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(new ApiResponse(false, "Invalid request data"));
            if (await SuspendedOrgResultAsync() is { } blocked) return blocked;

            var updated = await _mediator.Send(new UpdateCourseCommand(
                id, _orgCtx.GetCurrentOrgId(), _orgCtx.IsSysAdmin(),
                request.Title, request.Description, request.CourseCode));

            if (updated == null) return NotFound(new ApiResponse(false, "Course not found"));
            return Ok(new ApiResponse<CourseResponseDto>(true, updated, "Course updated successfully"));
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "RequireOrgAdmin")] // Q2: course CRUD = OrgAdmin of the org (org scope in handler) or SysAdmin
        public async Task<IActionResult> DeleteCourse(Guid id)
        {
            var orgId = _orgCtx.GetCurrentOrgId();
            if (!_orgCtx.IsSysAdmin() && !orgId.HasValue)
                return BadRequest(new ApiResponse(false, "No org context."));
            if (await SuspendedOrgResultAsync() is { } blocked) return blocked;

            var deleted = await _mediator.Send(new DeleteCourseCommand(id, orgId, _orgCtx.IsSysAdmin()));
            if (!deleted) return NotFound(new ApiResponse(false, "Course not found"));
            return Ok(new ApiResponse(true, "Course deleted successfully"));
        }

        // T3.6: toggle DRAFT/PUBLISHED/ARCHIVED
        [HttpPatch("{id}/status")]
        [Authorize(Policy = "RequireOrgAdmin")] // Q2: course CRUD = OrgAdmin of the org (org scope in handler) or SysAdmin
        public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetContentStatusRequestDto request)
        {
            if (!CourseStatus.All.Contains(request.Status))
                return BadRequest(new ApiResponse(false, "Invalid status. Use DRAFT, PUBLISHED, or ARCHIVED."));
            if (await SuspendedOrgResultAsync() is { } blocked) return blocked;

            var updated = await _mediator.Send(new SetCourseStatusCommand(
                id, request.Status, _orgCtx.GetCurrentOrgId(), _orgCtx.IsSysAdmin()));

            if (!updated) return NotFound(new ApiResponse(false, "Course not found"));
            return Ok(new ApiResponse(true, $"Course status set to {request.Status}."));
        }

        // Spec §6.2 (approved contract change 2026-11-17): a Suspended org's courses are frozen for everyone
        // but SysAdmin. Course writes are org-scoped in the handlers, so the caller's org is the course's org.
        // Q8: status unknown -> block writes (503).
        private async Task<IActionResult?> SuspendedOrgResultAsync()
        {
            var orgId = _orgCtx.GetCurrentOrgId();
            if (_orgCtx.IsSysAdmin() || !orgId.HasValue) return null;
            var status = await _access.GetOrgStatusAsync(orgId.Value, fresh: true);
            if (status == null)
                return StatusCode(503, new ApiResponse(false, "Organization status is unavailable. Try again later."));
            return status == "Active" ? null : StatusCode(403, new ApiResponse(false, "Your organization is suspended."));
        }

        // T3.8: search with LIKE/ILIKE
        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string query,
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 20)
        {
            var orgId = _orgCtx.GetCurrentOrgId();
            if (!orgId.HasValue) return BadRequest(new ApiResponse(false, "No org context."));
            if (string.IsNullOrWhiteSpace(query)) return BadRequest(new ApiResponse(false, "Query required."));

            var results = await _mediator.Send(new SearchCoursesQuery(orgId.Value, query, pageIndex, pageSize));
            return Ok(new ApiResponse<IEnumerable<CourseListResponseDto>>(true, results, null));
        }
    }
}

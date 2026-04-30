using Content.Api.CQRS.Courses.Commands;
using Content.Api.CQRS.Courses.Queries;
using Content.Api.Services;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public CoursesController(IMediator mediator, IOrgContextService orgCtx)
        {
            _mediator = mediator;
            _orgCtx = orgCtx;
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
        public async Task<IActionResult> GetCourse(Guid id)
        {
            var course = await _mediator.Send(new GetCourseByIdQuery(id, _orgCtx.GetCurrentOrgId(), _orgCtx.IsSysAdmin()));
            if (course == null) return NotFound(new ApiResponse(false, "Course not found"));
            return Ok(new ApiResponse<CourseResponseDto>(true, course, "Course retrieved successfully"));
        }

        [HttpPost]
        [Authorize(Policy = "RequireTeacher")]
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 201)]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(new ApiResponse(false, "Invalid request data"));

            var orgId = _orgCtx.GetCurrentOrgId();
            if (!orgId.HasValue) return BadRequest(new ApiResponse(false, "No org context."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return BadRequest(new ApiResponse(false, "Invalid user context."));

            var created = await _mediator.Send(new CreateCourseCommand(
                orgId.Value, userId.Value, request.Title, request.Description, request.CourseCode));

            return CreatedAtAction(nameof(GetCourse), new { id = created.Id },
                new ApiResponse<CourseResponseDto>(true, created, "Course created successfully"));
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "RequireTeacher")]
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 200)]
        public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(new ApiResponse(false, "Invalid request data"));

            var updated = await _mediator.Send(new UpdateCourseCommand(
                id, _orgCtx.GetCurrentOrgId(), _orgCtx.IsSysAdmin(),
                request.Title, request.Description, request.CourseCode));

            if (updated == null) return NotFound(new ApiResponse(false, "Course not found"));
            return Ok(new ApiResponse<CourseResponseDto>(true, updated, "Course updated successfully"));
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> DeleteCourse(Guid id)
        {
            var orgId = _orgCtx.GetCurrentOrgId();
            if (!_orgCtx.IsSysAdmin() && !orgId.HasValue)
                return BadRequest(new ApiResponse(false, "No org context."));

            var deleted = await _mediator.Send(new DeleteCourseCommand(id, orgId, _orgCtx.IsSysAdmin()));
            if (!deleted) return NotFound(new ApiResponse(false, "Course not found"));
            return Ok(new ApiResponse(true, "Course deleted successfully"));
        }

        // T3.6: toggle DRAFT/PUBLISHED/ARCHIVED
        [HttpPatch("{id}/status")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetContentStatusRequestDto request)
        {
            if (request.Status is not ("DRAFT" or "PUBLISHED" or "ARCHIVED"))
                return BadRequest(new ApiResponse(false, "Invalid status. Use DRAFT, PUBLISHED, or ARCHIVED."));

            var updated = await _mediator.Send(new SetCourseStatusCommand(
                id, request.Status, _orgCtx.GetCurrentOrgId(), _orgCtx.IsSysAdmin()));

            if (!updated) return NotFound(new ApiResponse(false, "Course not found"));
            return Ok(new ApiResponse(true, $"Course status set to {request.Status}."));
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

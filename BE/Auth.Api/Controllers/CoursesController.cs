using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;
using Auth.Api.Data;
using Auth.Api.Models;
using Auth.Api.Services;

namespace Auth.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CoursesController : ControllerBase
    {
        private readonly ICourseRepository _courseRepository;
        private readonly IOrganizationRepository _organizationRepository;
        private readonly IOrgContextService _orgCtx;

        public CoursesController(
            ICourseRepository courseRepository,
            IOrganizationRepository organizationRepository,
            IOrgContextService orgCtx)
        {
            _courseRepository = courseRepository;
            _organizationRepository = organizationRepository;
            _orgCtx = orgCtx;
        }

        /// <summary>
        /// Get all courses for the user's organization
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(PaginatedResponse<CourseListResponseDto>), 200)]
        public async Task<IActionResult> GetCourses(
            [FromQuery] int pageIndex = 0,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var orgId = HttpContext.Items["org_id"]?.ToString();
                if (string.IsNullOrEmpty(orgId) || !Guid.TryParse(orgId, out var orgGuid))
                    return BadRequest(new ApiResponse(false, "Invalid organization context"));

                var (courses, totalCount) = await _courseRepository.GetByOrgIdAsync(
                    orgGuid, pageIndex, pageSize);

                var responseData = courses.ConvertAll(course => new CourseListResponseDto(
                    course.Id,
                    course.Title,
                    course.Description,
                    course.CourseCode,
                    course.CreatedAt,
                    course.CourseModules?.Count ?? 0
                ));

                return Ok(new PaginatedResponse<CourseListResponseDto>(
                    true,
                    responseData,
                    pageIndex,
                    pageSize,
                    totalCount,
                    "Courses retrieved successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while retrieving courses",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Get a specific course by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 200)]
        public async Task<IActionResult> GetCourse(Guid id)
        {
            try
            {
                var orgId = HttpContext.Items["org_id"]?.ToString();
                if (string.IsNullOrEmpty(orgId) || !Guid.TryParse(orgId, out var orgGuid))
                    return BadRequest(new ApiResponse(false, "Invalid organization context"));

                var course = await _courseRepository.GetByIdAsync(id);
                if (course == null || course.OrgId != orgGuid)
                    return NotFound(new ApiResponse(false, "Course not found"));

                var responseData = new CourseResponseDto(
                    course.Id,
                    course.OrgId,
                    course.Title,
                    course.Description,
                    course.CourseCode,
                    course.CreatedBy,
                    course.CreatedAt
                );

                return Ok(new ApiResponse<CourseResponseDto>(
                    true,
                    responseData,
                    "Course retrieved successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while retrieving the course",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Create a new course
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 201)]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse(false, "Invalid request data"));

                var orgId = HttpContext.Items["org_id"]?.ToString();
                if (string.IsNullOrEmpty(orgId) || !Guid.TryParse(orgId, out var orgGuid))
                    return BadRequest(new ApiResponse(false, "Invalid organization context"));

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userGuid))
                    return BadRequest(new ApiResponse(false, "Invalid user ID"));

                // Verify organization exists
                var org = await _organizationRepository.GetByIdAsync(orgGuid);
                if (org == null)
                    return NotFound(new ApiResponse(false, "Organization not found"));

                var course = new CourseModel
                {
                    Id = Guid.NewGuid(),
                    OrgId = orgGuid,
                    CreatedBy = userGuid,
                    Title = request.Title,
                    Description = request.Description,
                    CourseCode = request.CourseCode,
                    Status = "ACTIVE",
                    CreatedAt = DateTime.UtcNow
                };

                await _courseRepository.CreateAsync(course);

                var responseData = new CourseResponseDto(
                    course.Id,
                    course.OrgId,
                    course.Title,
                    course.Description,
                    course.CourseCode,
                    course.CreatedBy,
                    course.CreatedAt
                );

                return CreatedAtAction(nameof(GetCourse), new { id = course.Id },
                    new ApiResponse<CourseResponseDto>(
                        true,
                        responseData,
                        "Course created successfully"
                    ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while creating the course",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Update a course
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 200)]
        public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse(false, "Invalid request data"));

                var orgId = HttpContext.Items["org_id"]?.ToString();
                if (string.IsNullOrEmpty(orgId) || !Guid.TryParse(orgId, out var orgGuid))
                    return BadRequest(new ApiResponse(false, "Invalid organization context"));

                var course = await _courseRepository.GetByIdAsync(id);
                if (course == null || course.OrgId != orgGuid)
                    return NotFound(new ApiResponse(false, "Course not found"));

                course.Title = request.Title;
                course.Description = request.Description;
                course.CourseCode = request.CourseCode;
                course.UpdatedAt = DateTime.UtcNow;

                await _courseRepository.UpdateAsync(course);

                var responseData = new CourseResponseDto(
                    course.Id,
                    course.OrgId,
                    course.Title,
                    course.Description,
                    course.CourseCode,
                    course.CreatedBy,
                    course.CreatedAt
                );

                return Ok(new ApiResponse<CourseResponseDto>(
                    true,
                    responseData,
                    "Course updated successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while updating the course",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Delete a course
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCourse(Guid id)
        {
            var orgId = _orgCtx.GetCurrentOrgId();
            if (!orgId.HasValue) return BadRequest(new ApiResponse(false, "No org context."));

            var course = await _courseRepository.GetByIdAsync(id);
            if (course == null || (!_orgCtx.IsSysAdmin() && course.OrgId != orgId))
                return NotFound(new ApiResponse(false, "Course not found"));

            await _courseRepository.DeleteAsync(id);
            return Ok(new ApiResponse(true, "Course deleted successfully"));
        }

        /// T3.6: PATCH /api/courses/{id}/status — toggle DRAFT/PUBLISHED
        [HttpPatch("{id}/status")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetContentStatusRequestDto request)
        {
            if (request.Status is not ("DRAFT" or "PUBLISHED" or "ARCHIVED"))
                return BadRequest(new ApiResponse(false, "Invalid status. Use DRAFT, PUBLISHED, or ARCHIVED."));

            var orgId = _orgCtx.GetCurrentOrgId();
            var course = await _courseRepository.GetByIdAsync(id);
            if (course == null || (!_orgCtx.IsSysAdmin() && course.OrgId != orgId))
                return NotFound(new ApiResponse(false, "Course not found"));

            course.Status = request.Status;
            await _courseRepository.UpdateAsync(course);
            return Ok(new ApiResponse(true, $"Course status set to {request.Status}."));
        }

        /// T3.8: GET /api/courses/search?query=...
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string query, [FromQuery] int pageIndex = 0, [FromQuery] int pageSize = 20)
        {
            var orgId = _orgCtx.GetCurrentOrgId();
            if (!orgId.HasValue) return BadRequest(new ApiResponse(false, "No org context."));
            if (string.IsNullOrWhiteSpace(query)) return BadRequest(new ApiResponse(false, "Query required."));

            var results = await _courseRepository.SearchAsync(orgId.Value, query, pageIndex, pageSize);
            var data = results.Select(c => new CourseListResponseDto(c.Id, c.Title, c.Description, c.CourseCode, c.CreatedAt));
            return Ok(new ApiResponse<IEnumerable<CourseListResponseDto>>(true, data, null));
        }
    }
}

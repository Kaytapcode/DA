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
            List<CourseModel> courses;
            int totalCount;

            if (_orgCtx.IsSysAdmin())
            {
                var all = await _courseRepository.GetAllAsync(pageIndex, pageSize);
                courses = all;
                totalCount = all.Count; // approximation — GetAllAsync doesn't return total
            }
            else
            {
                var orgId = _orgCtx.GetCurrentOrgId();
                if (!orgId.HasValue) return BadRequest(new ApiResponse(false, "No org context."));
                (courses, totalCount) = await _courseRepository.GetByOrgIdAsync(orgId.Value, pageIndex, pageSize);
            }

            var responseData = courses.ConvertAll(c => new CourseListResponseDto(
                c.Id, c.Title, c.Description, c.CourseCode, c.CreatedAt, c.CourseModules?.Count ?? 0));

            return Ok(new PaginatedResponse<CourseListResponseDto>(
                true, responseData, pageIndex, pageSize, totalCount, "Courses retrieved successfully"));
        }

        /// <summary>
        /// Get a specific course by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 200)]
        public async Task<IActionResult> GetCourse(Guid id)
        {
            var course = await _courseRepository.GetByIdAsync(id);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found"));

            if (!_orgCtx.IsSysAdmin() && course.OrgId != _orgCtx.GetCurrentOrgId())
                return NotFound(new ApiResponse(false, "Course not found"));

            return Ok(new ApiResponse<CourseResponseDto>(true,
                new CourseResponseDto(course.Id, course.OrgId, course.Title,
                    course.Description, course.CourseCode, course.CreatedBy, course.CreatedAt),
                "Course retrieved successfully"));
        }

        /// <summary>
        /// Create a new course
        /// </summary>
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

            var course = new CourseModel
            {
                Id = Guid.NewGuid(),
                OrgId = orgId.Value,
                CreatedBy = userId.Value,
                Title = request.Title,
                Description = request.Description,
                CourseCode = request.CourseCode,
                Status = "DRAFT",
                CreatedAt = DateTime.UtcNow
            };

            await _courseRepository.CreateAsync(course);
            return CreatedAtAction(nameof(GetCourse), new { id = course.Id },
                new ApiResponse<CourseResponseDto>(true,
                    new CourseResponseDto(course.Id, course.OrgId, course.Title,
                        course.Description, course.CourseCode, course.CreatedBy, course.CreatedAt),
                    "Course created successfully"));
        }

        /// <summary>
        /// Update a course
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Policy = "RequireTeacher")]
        [ProducesResponseType(typeof(ApiResponse<CourseResponseDto>), 200)]
        public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(new ApiResponse(false, "Invalid request data"));

            var course = await _courseRepository.GetByIdAsync(id);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found"));

            if (!_orgCtx.IsSysAdmin() && course.OrgId != _orgCtx.GetCurrentOrgId())
                return NotFound(new ApiResponse(false, "Course not found"));

            course.Title = request.Title;
            course.Description = request.Description;
            course.CourseCode = request.CourseCode;
            course.UpdatedAt = DateTime.UtcNow;

            await _courseRepository.UpdateAsync(course);
            return Ok(new ApiResponse<CourseResponseDto>(true,
                new CourseResponseDto(course.Id, course.OrgId, course.Title,
                    course.Description, course.CourseCode, course.CreatedBy, course.CreatedAt),
                "Course updated successfully"));
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


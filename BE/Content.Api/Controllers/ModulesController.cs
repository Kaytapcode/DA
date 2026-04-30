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
    [Route("api/courses/{courseId:guid}/modules")]
    [Authorize]
    public class ModulesController : ControllerBase
    {
        private readonly IModuleRepository _moduleRepo;
        private readonly ICourseRepository _courseRepo;
        private readonly IOrgContextService _orgCtx;

        public ModulesController(IModuleRepository moduleRepo, ICourseRepository courseRepo, IOrgContextService orgCtx)
        {
            _moduleRepo = moduleRepo;
            _courseRepo = courseRepo;
            _orgCtx = orgCtx;
        }

        private async Task<CourseModel?> GetVerifiedCourseAsync(Guid courseId)
        {
            var course = await _courseRepo.GetByIdAsync(courseId);
            if (course == null) return null;
            if (!_orgCtx.IsSysAdmin() && course.OrgId != _orgCtx.GetCurrentOrgId()) return null;
            return course;
        }

        // GET /api/courses/{courseId}/modules
        [HttpGet]
        public async Task<IActionResult> GetModules(Guid courseId)
        {
            if (await GetVerifiedCourseAsync(courseId) == null)
                return NotFound(new ApiResponse(false, "Course not found."));

            var modules = await _moduleRepo.GetByCourseAsync(courseId);
            var result = modules.Select((m, i) => new ModuleResponseDto(
                m.Id, m.OrgId, m.Title, m.Description, i, m.CreatedAt,
                m.ModuleContents?.OrderBy(mc => mc.OrderIndex)
                    .Select(mc => new ContentResponseDto(mc.ContentId, mc.Content?.Title ?? "", mc.Content?.ContentType ?? "", mc.Content?.Status ?? "", mc.OrderIndex, mc.Content?.CreatedAt ?? DateTime.MinValue))
                    .ToList()
            ));
            return Ok(new ApiResponse<IEnumerable<ModuleResponseDto>>(true, result, null));
        }

        // POST /api/courses/{courseId}/modules
        [HttpPost]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> CreateModule(Guid courseId, [FromBody] CreateModuleRequestDto request)
        {
            var course = await GetVerifiedCourseAsync(courseId);
            if (course == null) return NotFound(new ApiResponse(false, "Course not found."));

            var module = new ModuleModel
            {
                OrgId = course.OrgId,
                CreatedBy = _orgCtx.GetCurrentUserId(),
                Title = request.Title,
                Description = request.Description
            };

            var created = await _moduleRepo.CreateAsync(module, courseId);
            return Ok(new ApiResponse<ModuleResponseDto>(true,
                new ModuleResponseDto(created.Id, created.OrgId, created.Title, created.Description, 0, created.CreatedAt),
                "Module created."));
        }

        // PUT /api/courses/{courseId}/modules/{moduleId}
        [HttpPut("{moduleId:guid}")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> UpdateModule(Guid courseId, Guid moduleId, [FromBody] UpdateModuleRequestDto request)
        {
            if (await GetVerifiedCourseAsync(courseId) == null)
                return NotFound(new ApiResponse(false, "Course not found."));

            var module = await _moduleRepo.GetByIdAsync(moduleId);
            if (module == null) return NotFound(new ApiResponse(false, "Module not found."));

            module.Title = request.Title;
            module.Description = request.Description;
            var updated = await _moduleRepo.UpdateAsync(module);
            return Ok(new ApiResponse<ModuleResponseDto>(true,
                new ModuleResponseDto(updated.Id, updated.OrgId, updated.Title, updated.Description, 0, updated.CreatedAt),
                "Module updated."));
        }

        // DELETE /api/courses/{courseId}/modules/{moduleId}
        [HttpDelete("{moduleId:guid}")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> DeleteModule(Guid courseId, Guid moduleId)
        {
            if (await GetVerifiedCourseAsync(courseId) == null)
                return NotFound(new ApiResponse(false, "Course not found."));

            await _moduleRepo.DeleteAsync(moduleId, courseId);
            return Ok(new ApiResponse(true, "Module deleted."));
        }

        // PATCH /api/courses/{courseId}/modules/{moduleId}/order — T3.7 Up/Down sort
        [HttpPatch("{moduleId:guid}/order")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> ReorderModule(Guid courseId, Guid moduleId, [FromBody] ReorderModuleRequestDto request)
        {
            if (await GetVerifiedCourseAsync(courseId) == null)
                return NotFound(new ApiResponse(false, "Course not found."));

            await _moduleRepo.ReorderAsync(courseId, moduleId, request.NewIndex);
            return Ok(new ApiResponse(true, "Module reordered."));
        }
    }
}


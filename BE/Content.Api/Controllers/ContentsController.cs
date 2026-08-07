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
    [Route("api/courses/{courseId:guid}/modules/{moduleId:guid}/contents")]
    [Authorize]
    public class ContentsController : ControllerBase
    {
        private readonly IContentRepository _contentRepo;
        private readonly IModuleRepository _moduleRepo;
        private readonly ICourseRepository _courseRepo;
        private readonly IOrgContextService _orgCtx;
        private readonly ICourseAccessService _access;

        public ContentsController(
            IContentRepository contentRepo,
            IModuleRepository moduleRepo,
            ICourseRepository courseRepo,
            IOrgContextService orgCtx,
            ICourseAccessService access)
        {
            _contentRepo = contentRepo;
            _moduleRepo = moduleRepo;
            _courseRepo = courseRepo;
            _orgCtx = orgCtx;
            _access = access;
        }

        // Per-course read access (SysAdmin / OrgAdmin-of-org / approved enrollment), NOT org scope —
        // so an enrolled Teacher/Student without a selected org isn't falsely 404'd. Mutations
        // additionally gate on CanTeachAsync, so a Student passes this but cannot modify content.
        private async Task<bool> VerifyAccessAsync(Guid courseId)
            => await _access.CanViewAsync(courseId);

        private static ContentResponseDto ToContentDto(ContentModel content, int orderIndex) => new(
            content.Id,
            content.Title,
            content.ContentType,
            content.Status,
            orderIndex,
            content.CreatedAt,
            content.Quiz?.Id,
            content.FlashcardDeck?.Id,
            content.Document?.Id,
            content.Video?.Id
        );

        // GET /api/courses/{courseId}/modules/{moduleId}/contents
        [HttpGet]
        public async Task<IActionResult> GetContents(Guid courseId, Guid moduleId)
        {
            if (!await VerifyAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));

            var contents = await _contentRepo.GetByModuleAsync(moduleId);
            var result = contents.Select((content, index) => ToContentDto(content, index));
            return Ok(new ApiResponse<IEnumerable<ContentResponseDto>>(true, result, null));
        }

        // GET /api/courses/{courseId}/modules/{moduleId}/contents/{contentId}
        [HttpGet("{contentId:guid}")]
        public async Task<IActionResult> GetContent(Guid courseId, Guid contentId)
        {
            if (!await VerifyAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));

            var content = await _contentRepo.GetByIdAsync(contentId);
            if (content == null) return NotFound(new ApiResponse(false, "Content not found."));

            return Ok(new ApiResponse<ContentResponseDto>(true, ToContentDto(content, 0), null));
        }

        // POST /api/courses/{courseId}/modules/{moduleId}/contents
        [HttpPost]
        [Authorize] // gate is CanTeachAsync (per-course Teacher / OrgAdmin / SysAdmin), not a JWT-role policy
        public async Task<IActionResult> CreateContent(Guid courseId, Guid moduleId, [FromBody] CreateContentRequestDto request)
        {
            if (!await VerifyAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));
            if (!await _access.CanTeachAsync(courseId))
                return Forbid();

            var validTypes = new[] { "VIDEO", "PDF", "QUIZ", "FLASHCARD" };
            if (!validTypes.Contains(request.ContentType.ToUpper()))
                return BadRequest(new ApiResponse(false, $"Invalid ContentType. Must be one of: {string.Join(", ", validTypes)}"));

            var content = new ContentModel
            {
                Title = request.Title,
                ContentType = request.ContentType.ToUpper(),
                Status = "DRAFT"
            };

            var created = await _contentRepo.CreateAsync(content, moduleId);
            var hydrated = await _contentRepo.GetByIdAsync(created.Id, CancellationToken.None) ?? created;
            return Ok(new ApiResponse<ContentResponseDto>(true, ToContentDto(hydrated, 0), "Content created."));
        }

        // PUT /api/courses/{courseId}/modules/{moduleId}/contents/{contentId}
        [HttpPut("{contentId:guid}")]
        [Authorize] // gate is CanTeachAsync (per-course Teacher / OrgAdmin / SysAdmin), not a JWT-role policy
        public async Task<IActionResult> UpdateContent(Guid courseId, Guid contentId, [FromBody] UpdateContentRequestDto request)
        {
            if (!await VerifyAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));
            if (!await _access.CanTeachAsync(courseId))
                return Forbid();

            var content = await _contentRepo.GetByIdAsync(contentId);
            if (content == null) return NotFound(new ApiResponse(false, "Content not found."));

            content.Title = request.Title;
            var updated = await _contentRepo.UpdateAsync(content);
            var hydrated = await _contentRepo.GetByIdAsync(updated.Id, CancellationToken.None) ?? updated;
            return Ok(new ApiResponse<ContentResponseDto>(true, ToContentDto(hydrated, 0), "Content updated."));
        }

        // DELETE /api/courses/{courseId}/modules/{moduleId}/contents/{contentId}
        [HttpDelete("{contentId:guid}")]
        [Authorize] // gate is CanTeachAsync (per-course Teacher / OrgAdmin / SysAdmin), not a JWT-role policy
        public async Task<IActionResult> DeleteContent(Guid courseId, Guid moduleId, Guid contentId)
        {
            if (!await VerifyAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));
            if (!await _access.CanTeachAsync(courseId))
                return Forbid();

            await _contentRepo.DeleteAsync(contentId, moduleId);
            return Ok(new ApiResponse(true, "Content deleted."));
        }

        // T3.6: PATCH /api/courses/{courseId}/modules/{moduleId}/contents/{contentId}/status
        [HttpPatch("{contentId:guid}/status")]
        [Authorize] // gate is CanTeachAsync (per-course Teacher / OrgAdmin / SysAdmin), not a JWT-role policy
        public async Task<IActionResult> SetStatus(Guid courseId, Guid contentId, [FromBody] SetContentStatusRequestDto request)
        {
            if (!await VerifyAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));
            if (!await _access.CanTeachAsync(courseId))
                return Forbid();

            if (request.Status is not ("DRAFT" or "PUBLISHED"))
                return BadRequest(new ApiResponse(false, "Status must be DRAFT or PUBLISHED."));

            await _contentRepo.SetStatusAsync(contentId, request.Status);
            return Ok(new ApiResponse(true, $"Content status set to {request.Status}."));
        }

        // POST /api/courses/{courseId}/modules/{moduleId}/contents/link
        // Links an existing content item (quiz/video/doc/deck) owned by the user to this module
        // without creating a new ContentModel stub. Accepts { contentId } in the body.
        [HttpPost("link")]
        [Authorize] // gate is CanTeachAsync (per-course Teacher / OrgAdmin / SysAdmin), not a JWT-role policy
        public async Task<IActionResult> LinkExistingContent(Guid courseId, Guid moduleId, [FromBody] LinkContentRequestDto request)
        {
            if (!await VerifyAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));
            if (!await _access.CanTeachAsync(courseId))
                return Forbid();

            var content = await _contentRepo.LinkExistingAsync(request.ContentId, moduleId);
            if (content == null)
                return NotFound(new ApiResponse(false, "Content not found."));

            return Ok(new ApiResponse<ContentResponseDto>(true, ToContentDto(content, 0), "Content linked to module."));
        }

        // T3.7: PATCH /api/courses/{courseId}/modules/{moduleId}/contents/{contentId}/order
        [HttpPatch("{contentId:guid}/order")]
        [Authorize] // gate is CanTeachAsync (per-course Teacher / OrgAdmin / SysAdmin), not a JWT-role policy
        public async Task<IActionResult> ReorderContent(Guid courseId, Guid moduleId, Guid contentId, [FromBody] ReorderContentRequestDto request)
        {
            if (!await VerifyAccessAsync(courseId))
                return NotFound(new ApiResponse(false, "Course not found."));
            if (!await _access.CanTeachAsync(courseId))
                return Forbid();

            await _contentRepo.ReorderAsync(moduleId, contentId, request.NewIndex);
            return Ok(new ApiResponse(true, "Content reordered."));
        }
    }
}

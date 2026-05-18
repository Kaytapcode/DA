using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    // Spec §3.1 "Collection (For Users)": personal, public groupings of learning resources.
    // A Collection is a Module with OrgId == null and no CourseModule link, owned by CreatedBy.
    [ApiController]
    [Route("api/collections")]
    [Authorize]
    public class CollectionsController : ControllerBase
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;

        public CollectionsController(ContentDbContext db, IOrgContextService orgCtx)
        {
            _db = db;
            _orgCtx = orgCtx;
        }

        public record CreateCollectionRequestDto(string Title, string? Description, Guid? ParentId);
        public record CollectionResponseDto(Guid Id, string Title, string? Description, Guid? ParentId, DateTime CreatedAt);
        public record AddCollectionItemRequestDto(Guid ContentId);

        private static CollectionResponseDto ToDto(ModuleModel m) =>
            new(m.Id, m.Title, m.Description, m.ParentId, m.CreatedAt);

        // GET /api/collections — current user's collections.
        [HttpGet]
        public async Task<IActionResult> GetMine(CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var rows = await _db.Modules
                .IgnoreQueryFilters()
                .Where(m => m.OrgId == null && m.CreatedBy == userId)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new CollectionResponseDto(m.Id, m.Title, m.Description, m.ParentId, m.CreatedAt))
                .ToListAsync(ct);

            return Ok(new ApiResponse<IEnumerable<CollectionResponseDto>>(true, rows, null));
        }

        // POST /api/collections
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCollectionRequestDto request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new ApiResponse(false, "Title is required."));

            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            if (request.ParentId.HasValue)
            {
                var parentOwned = await _db.Modules.IgnoreQueryFilters().AnyAsync(
                    m => m.Id == request.ParentId.Value && m.OrgId == null && m.CreatedBy == userId, ct);
                if (!parentOwned) return BadRequest(new ApiResponse(false, "Parent collection not found."));
            }

            var module = new ModuleModel
            {
                Id = Guid.NewGuid(),
                OrgId = null, // Personal collection (spec §3.1).
                CreatedBy = userId,
                ParentId = request.ParentId,
                Title = request.Title.Trim(),
                Description = request.Description,
                CreatedAt = DateTime.UtcNow
            };
            _db.Modules.Add(module);
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<CollectionResponseDto>(true, ToDto(module), "Collection created."));
        }

        // DELETE /api/collections/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var module = await _db.Modules.IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.Id == id && m.OrgId == null && m.CreatedBy == userId, ct);
            if (module == null) return NotFound(new ApiResponse(false, "Collection not found."));

            // Also remove ModuleContents (cascade isn't configured for personal modules).
            var items = _db.ModuleContents.Where(mc => mc.ModuleId == id);
            _db.ModuleContents.RemoveRange(items);
            _db.Modules.Remove(module);
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse(true, "Collection deleted."));
        }

        // POST /api/collections/{id}/items — add a content item to the collection.
        [HttpPost("{id:guid}/items")]
        public async Task<IActionResult> AddItem(Guid id, [FromBody] AddCollectionItemRequestDto request, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var module = await _db.Modules.IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.Id == id && m.OrgId == null && m.CreatedBy == userId, ct);
            if (module == null) return NotFound(new ApiResponse(false, "Collection not found."));

            var content = await _db.Contents.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == request.ContentId, ct);
            if (content == null) return NotFound(new ApiResponse(false, "Content not found."));
            if (!content.IsPublic && content.CreatedByUserId != userId)
                return Forbid();

            var exists = await _db.ModuleContents.AnyAsync(
                mc => mc.ModuleId == id && mc.ContentId == request.ContentId, ct);
            if (exists)
                return Ok(new ApiResponse(true, "Item already in collection."));

            var maxOrder = await _db.ModuleContents
                .Where(mc => mc.ModuleId == id)
                .Select(mc => (int?)mc.OrderIndex)
                .MaxAsync(ct) ?? -1;

            _db.ModuleContents.Add(new ModuleContentModel
            {
                Id = Guid.NewGuid(),
                ModuleId = id,
                ContentId = request.ContentId,
                OrderIndex = maxOrder + 1,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse(true, "Item added to collection."));
        }

        public record CollectionItemDto(
            Guid ContentId,
            string Title,
            string ContentType,
            Guid? VideoId,
            Guid? QuizId,
            Guid? DeckId,
            Guid? DocumentId,
            int OrderIndex
        );

        // GET /api/collections/{id}/items
        [HttpGet("{id:guid}/items")]
        public async Task<IActionResult> GetItems(Guid id, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var owned = await _db.Modules.IgnoreQueryFilters()
                .AnyAsync(m => m.Id == id && m.OrgId == null && m.CreatedBy == userId, ct);
            if (!owned) return NotFound(new ApiResponse(false, "Collection not found."));

            var links = await _db.ModuleContents
                .Where(mc => mc.ModuleId == id)
                .Include(mc => mc.Content)
                    .ThenInclude(c => c!.Video)
                .Include(mc => mc.Content)
                    .ThenInclude(c => c!.Quiz)
                .Include(mc => mc.Content)
                    .ThenInclude(c => c!.FlashcardDeck)
                .Include(mc => mc.Content)
                    .ThenInclude(c => c!.Document)
                .OrderBy(mc => mc.OrderIndex)
                .ToListAsync(ct);

            var dtos = links.Select(mc => new CollectionItemDto(
                mc.ContentId,
                mc.Content?.Title ?? "Untitled",
                mc.Content?.ContentType ?? "UNKNOWN",
                mc.Content?.Video?.Id,
                mc.Content?.Quiz?.Id,
                mc.Content?.FlashcardDeck?.Id,
                mc.Content?.Document?.Id,
                mc.OrderIndex
            ));

            return Ok(new ApiResponse<IEnumerable<CollectionItemDto>>(true, dtos, null));
        }

        // GET /api/collections/for-content/{contentId} — resolve which personal collection owns this content.
        [HttpGet("for-content/{contentId:guid}")]
        public async Task<IActionResult> GetCollectionForContent(Guid contentId, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var collection = await _db.ModuleContents
                .Where(mc => mc.ContentId == contentId)
                .Join(
                    _db.Modules.IgnoreQueryFilters().Where(m => m.OrgId == null && m.CreatedBy == userId),
                    mc => mc.ModuleId,
                    m => m.Id,
                    (mc, m) => new CollectionResponseDto(m.Id, m.Title, m.Description, m.ParentId, m.CreatedAt))
                .FirstOrDefaultAsync(ct);

            return Ok(new ApiResponse<CollectionResponseDto?>(true, collection, null));
        }

        // DELETE /api/collections/{id}/items/{contentId}
        [HttpDelete("{id:guid}/items/{contentId:guid}")]
        public async Task<IActionResult> RemoveItem(Guid id, Guid contentId, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var owned = await _db.Modules.IgnoreQueryFilters().AnyAsync(
                m => m.Id == id && m.OrgId == null && m.CreatedBy == userId, ct);
            if (!owned) return NotFound(new ApiResponse(false, "Collection not found."));

            var link = await _db.ModuleContents.FirstOrDefaultAsync(
                mc => mc.ModuleId == id && mc.ContentId == contentId, ct);
            if (link == null) return NotFound(new ApiResponse(false, "Item not in collection."));

            _db.ModuleContents.Remove(link);
            await _db.SaveChangesAsync(ct);
            return Ok(new ApiResponse(true, "Item removed from collection."));
        }
    }
}

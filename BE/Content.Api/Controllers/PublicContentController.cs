using Content.Api.Data;
using Content.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    // Spec §1 User: "Can view other public resources... Can copy other public resources to create a personal version."
    // Surfaces personal, public content (not bound to a course) so any user can discover and clone.
    [ApiController]
    [Route("api/public-content")]
    [Authorize]
    public class PublicContentController : ControllerBase
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;

        public PublicContentController(ContentDbContext db, IOrgContextService orgCtx)
        {
            _db = db;
            _orgCtx = orgCtx;
        }

        public record PublicContentDto(
            Guid Id,
            string Title,
            string ContentType,
            string Status,
            Guid? CreatedByUserId,
            DateTime CreatedAt,
            bool OwnedByCaller
        );

        // GET /api/public-content?type=&query=&limit=
        // Returns personal public content (no module/course attachment) from any user.
        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? type,
            [FromQuery] string? query,
            [FromQuery] int limit = 50,
            CancellationToken ct = default)
        {
            var userId = _orgCtx.GetCurrentUserId();
            limit = Math.Clamp(limit, 1, 200);

            // Personal-public: IsPublic = true AND not attached to any ModuleContent (i.e. not course-bound).
            var q = _db.Contents.IgnoreQueryFilters()
                .Where(c => c.IsPublic && !c.ModuleContents.Any());

            if (!string.IsNullOrWhiteSpace(type))
            {
                var t = type.ToUpper();
                q = q.Where(c => c.ContentType == t);
            }

            if (!string.IsNullOrWhiteSpace(query))
            {
                var like = $"%{query.Trim()}%";
                q = q.Where(c => EF.Functions.ILike(c.Title, like));
            }

            var rows = await q
                .OrderByDescending(c => c.CreatedAt)
                .Take(limit)
                .Select(c => new PublicContentDto(
                    c.Id,
                    c.Title,
                    c.ContentType,
                    c.Status,
                    c.CreatedByUserId,
                    c.CreatedAt,
                    userId != null && c.CreatedByUserId == userId
                ))
                .ToListAsync(ct);

            return Ok(new ApiResponse<IEnumerable<PublicContentDto>>(true, rows, null));
        }
    }
}

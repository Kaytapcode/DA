using Content.Api.Data;
using Content.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/search")]
    [Authorize]
    public class SearchController : ControllerBase
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;

        public SearchController(ContentDbContext db, IOrgContextService orgCtx)
        {
            _db = db;
            _orgCtx = orgCtx;
        }

        public record SearchResultDto(
            Guid ContentId,
            string Title,
            string ContentType,
            bool OwnedByCaller,
            Guid? ResourceId,
            DateTime CreatedAt
        );

        // GET /api/search?q=&type=&scope=&limit=
        // Unified search index:
        // - returns caller-owned content + public content from other users
        // - returns caller-owned collections + collections authored by other users
        // The scope query param is accepted for backward compatibility but ignored.
        [HttpGet]
        public async Task<IActionResult> Search(
            [FromQuery] string? q,
            [FromQuery] string? type,
            [FromQuery] string scope = "all",
            [FromQuery] int limit = 50,
            CancellationToken ct = default)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var uid = userId.Value;
            _ = scope;
            limit = Math.Clamp(limit, 1, 200);
            var typeUpper = type?.ToUpperInvariant();

            // ── Stage A: regular content (VIDEO, QUIZ, FLASHCARD, PDF) ─────────────
            IEnumerable<SearchResultDto> contentDtos = [];

            if (typeUpper != "COLLECTION")
            {
                var query = _db.Contents.IgnoreQueryFilters().AsQueryable();

                query = query.Where(c =>
                    c.CreatedByUserId == uid ||
                    (c.IsPublic &&
                     c.CreatedByUserId.HasValue &&
                     c.CreatedByUserId != uid &&
                     !c.ModuleContents.Any()));

                if (!string.IsNullOrWhiteSpace(typeUpper))
                    query = query.Where(c => c.ContentType == typeUpper);

                if (!string.IsNullOrWhiteSpace(q))
                    query = query.Where(c => EF.Functions.ILike(c.Title, $"%{q.Trim()}%"));

                var contents = await query
                    .OrderByDescending(c => c.CreatedAt)
                    .Take(limit)
                    .Select(c => new
                    {
                        c.Id,
                        c.Title,
                        c.ContentType,
                        c.CreatedByUserId,
                        c.CreatedAt,
                    })
                    .ToListAsync(ct);

                if (contents.Count > 0)
                {
                    var ids = contents.Select(c => c.Id).ToList();

                    var videoMap = await _db.Videos
                        .Where(v => ids.Contains(v.ContentId))
                        .Select(v => new { v.ContentId, ResourceId = v.Id })
                        .ToListAsync(ct);

                    var quizMap = await _db.Quizzes
                        .Where(q2 => ids.Contains(q2.ContentId))
                        .Select(q2 => new { q2.ContentId, ResourceId = q2.Id })
                        .ToListAsync(ct);

                    var deckMap = await _db.FlashcardDecks
                        .Where(d => ids.Contains(d.ContentId))
                        .Select(d => new { d.ContentId, ResourceId = d.Id })
                        .ToListAsync(ct);

                    var docMap = await _db.Documents
                        .Where(d => d.ContentId.HasValue && ids.Contains(d.ContentId.Value))
                        .Select(d => new { ContentId = d.ContentId!.Value, ResourceId = d.Id })
                        .ToListAsync(ct);

                    var videoLookup = videoMap.ToDictionary(x => x.ContentId, x => x.ResourceId);
                    var quizLookup  = quizMap.ToDictionary(x => x.ContentId, x => x.ResourceId);
                    var deckLookup  = deckMap.ToDictionary(x => x.ContentId, x => x.ResourceId);
                    var docLookup   = docMap.ToDictionary(x => x.ContentId, x => x.ResourceId);

                    contentDtos = contents.Select(c =>
                    {
                        Guid? resourceId = c.ContentType switch
                        {
                            "VIDEO"     => videoLookup.TryGetValue(c.Id, out var v)   ? v   : null,
                            "QUIZ"      => quizLookup.TryGetValue(c.Id, out var qz)   ? qz  : null,
                            "FLASHCARD" => deckLookup.TryGetValue(c.Id, out var d)    ? d   : null,
                            "PDF"       => docLookup.TryGetValue(c.Id, out var doc)   ? doc : null,
                            _           => null,
                        };
                        return new SearchResultDto(c.Id, c.Title, c.ContentType,
                            c.CreatedByUserId == uid, resourceId, c.CreatedAt);
                    }).ToList();
                }
            }

            // ── Stage B: collections (Modules with OrgId == null) ────────────────────
            IEnumerable<SearchResultDto> collectionDtos = [];

            if (typeUpper is null || typeUpper == "COLLECTION")
            {
                var colQuery = _db.Modules.IgnoreQueryFilters()
                    .Where(m => m.OrgId == null && m.CreatedBy.HasValue);

                if (!string.IsNullOrWhiteSpace(q))
                    colQuery = colQuery.Where(m =>
                        EF.Functions.ILike(m.Title, $"%{q.Trim()}%") ||
                        (m.Description != null && EF.Functions.ILike(m.Description, $"%{q.Trim()}%")));

                var collections = await colQuery
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(limit)
                    .Select(m => new { m.Id, m.Title, m.CreatedAt, m.CreatedBy })
                    .ToListAsync(ct);

                // ContentId == ResourceId == module Id (collections have no Content row).
                collectionDtos = collections.Select(m =>
                    new SearchResultDto(m.Id, m.Title, "COLLECTION", m.CreatedBy == uid, m.Id, m.CreatedAt));
            }

            // ── Merge, re-sort by recency, cap at limit ──────────────────────────────
            var merged = contentDtos
                .Concat(collectionDtos)
                .OrderByDescending(d => d.CreatedAt)
                .Take(limit);

            return Ok(new ApiResponse<IEnumerable<SearchResultDto>>(true, merged, null));
        }
    }
}

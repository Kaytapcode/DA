using System.Net.Http.Json;
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
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public SearchController(ContentDbContext db, IOrgContextService orgCtx,
            IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _db = db;
            _orgCtx = orgCtx;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        // Resolve userId -> display name via Identity.Api's internal batch endpoint (spec §6.4:
        // search shows the original author). Best-effort: on failure, authors are left null.
        private async Task<Dictionary<Guid, string>> ResolveAuthorsAsync(IEnumerable<Guid> ids, CancellationToken ct)
        {
            var distinct = ids.Distinct().ToList();
            var map = new Dictionary<Guid, string>();
            if (distinct.Count == 0) return map;
            try
            {
                var baseUrl = (_config["Identity:InternalBaseUrl"] ?? "http://localhost:5001").TrimEnd('/');
                var qs = string.Join("&", distinct.Select(id => $"ids={id}"));
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(8);
                var resp = await client.GetFromJsonAsync<ApiResponse<IEnumerable<UserInfoLite>>>(
                    $"{baseUrl}/api/internal/users/batch?{qs}", ct);
                if (resp?.Data != null)
                    foreach (var u in resp.Data)
                        map[u.Id] = u.Username;
            }
            catch { /* author name is best-effort */ }
            return map;
        }

        private record UserInfoLite(Guid Id, string Username, string? Email, string? Role);

        public record SearchResultDto(
            Guid ContentId,
            string Title,
            string ContentType,
            bool OwnedByCaller,
            Guid? ResourceId,
            DateTime CreatedAt,
            string? AuthorName = null
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

                // Course-scoped content (created inside a course) never appears in search — not even
                // for its own creator. It is reachable only inside the course.
                query = query.Where(c => !c.IsCourseScoped);

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

                    // Resolve author display names (spec §6.4).
                    var authors = await ResolveAuthorsAsync(
                        contents.Where(c => c.CreatedByUserId.HasValue).Select(c => c.CreatedByUserId!.Value), ct);

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
                        var author = c.CreatedByUserId.HasValue && authors.TryGetValue(c.CreatedByUserId.Value, out var an) ? an : null;
                        return new SearchResultDto(c.Id, c.Title, c.ContentType,
                            c.CreatedByUserId == uid, resourceId, c.CreatedAt, author);
                    }).ToList();
                }
            }

            // ── Stage B: collections (Modules with OrgId == null) ────────────────────
            IEnumerable<SearchResultDto> collectionDtos = [];

            if (typeUpper is null || typeUpper == "COLLECTION")
            {
                // Only TOP-LEVEL collections (ParentId == null). Child modules are "sections"
                // shown inside their parent collection, not as standalone collections.
                var colQuery = _db.Modules.IgnoreQueryFilters()
                    .Where(m => m.OrgId == null && m.CreatedBy.HasValue && m.ParentId == null);

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
                var colAuthors = await ResolveAuthorsAsync(
                    collections.Where(m => m.CreatedBy.HasValue).Select(m => m.CreatedBy!.Value), ct);
                collectionDtos = collections.Select(m =>
                    new SearchResultDto(m.Id, m.Title, "COLLECTION", m.CreatedBy == uid, m.Id, m.CreatedAt,
                        m.CreatedBy.HasValue && colAuthors.TryGetValue(m.CreatedBy.Value, out var an) ? an : null));
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

using System.Net.Http.Json;
using Content.Api.Data;
using Content.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    // Global content management (CMS).
    //  • SysAdmin sees ALL content platform-wide (incl. course-scoped) — for moderation/deletion.
    //  • OrgAdmin sees content attached to a course in THEIR org (spec §1 invariant 7 — org-bounded).
    // The per-type delete endpoints (/documents|quizzes|decks|videos/{id}) already allow SysAdmin and
    // owners, so this controller only needs to LIST; the FE deletes via those existing routes.
    [ApiController]
    [Route("api/contents")]
    [Authorize]
    public class AdminContentController : ControllerBase
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public AdminContentController(ContentDbContext db, IOrgContextService orgCtx,
            IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _db = db;
            _orgCtx = orgCtx;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        public record AdminContentDto(
            Guid ContentId, string Title, string ContentType, string Status,
            bool IsCourseScoped, Guid? ResourceId, Guid? CreatedByUserId, string? AuthorName,
            DateTime CreatedAt);

        private record UserInfoLite(Guid Id, string Username, string? Email, string? Role);

        // GET /api/contents/all?query=&limit=
        [HttpGet("all")]
        public async Task<IActionResult> GetAll([FromQuery] string? query, [FromQuery] int limit = 200, CancellationToken ct = default)
        {
            var isSysAdmin = _orgCtx.IsSysAdmin();
            var role = _orgCtx.GetCurrentRole();
            var orgId = _orgCtx.GetCurrentOrgId();
            if (!isSysAdmin && !(role == "OrgAdmin" && orgId.HasValue))
                return Forbid();

            limit = Math.Clamp(limit, 1, 500);

            var q = _db.Contents.IgnoreQueryFilters()
                .Include(c => c.Quiz)
                .Include(c => c.Document)
                .Include(c => c.Video)
                .Include(c => c.FlashcardDeck)
                .AsQueryable();

            if (!isSysAdmin)
            {
                // OrgAdmin: only content attached to a course in their org.
                q = q.Where(c => c.ModuleContents.Any(mc =>
                    mc.Module != null && mc.Module.CourseModules.Any(cm => cm.Course != null && cm.Course.OrgId == orgId!.Value)));
            }

            if (!string.IsNullOrWhiteSpace(query))
                q = q.Where(c => EF.Functions.ILike(c.Title, $"%{query}%"));

            var rows = await q
                .OrderByDescending(c => c.CreatedAt)
                .Take(limit)
                .Select(c => new AdminContentDto(
                    c.Id, c.Title, c.ContentType, c.Status, c.IsCourseScoped,
                    c.ContentType == "QUIZ" ? (c.Quiz != null ? c.Quiz.Id : (Guid?)null)
                    : c.ContentType == "PDF" || c.ContentType == "DOCUMENT" ? (c.Document != null ? c.Document.Id : (Guid?)null)
                    : c.ContentType == "VIDEO" ? (c.Video != null ? c.Video.Id : (Guid?)null)
                    : c.ContentType == "FLASHCARD" ? (c.FlashcardDeck != null ? c.FlashcardDeck.Id : (Guid?)null)
                    : (Guid?)null,
                    c.CreatedByUserId, null, c.CreatedAt))
                .ToListAsync(ct);

            // Enrich author usernames (best-effort).
            var names = await ResolveUsernamesAsync(rows.Where(r => r.CreatedByUserId.HasValue).Select(r => r.CreatedByUserId!.Value), ct);
            var enriched = rows.Select(r => r with { AuthorName = r.CreatedByUserId.HasValue ? names.GetValueOrDefault(r.CreatedByUserId.Value) : null });

            return Ok(new ApiResponse<IEnumerable<AdminContentDto>>(true, enriched, null));
        }

        private async Task<Dictionary<Guid, string>> ResolveUsernamesAsync(IEnumerable<Guid> ids, CancellationToken ct)
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
                    foreach (var u in resp.Data) map[u.Id] = u.Username;
            }
            catch { /* best-effort */ }
            return map;
        }
    }
}

using System.Net.Http.Json;
using System.Security.Claims;
using Content.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Content.Api.Services
{
    public interface IOrgContextService
    {
        Guid? GetCurrentOrgId();
        Guid? GetCurrentUserId();
        string? GetCurrentRole();
        bool IsSysAdmin();
        bool HasOrgAccess(Guid orgId);
    }

    public interface ICourseAccessService
    {
        // True if the caller may modify resources in the given course: SysAdmin, OrgAdmin
        // of the course's org, or a User enrolled as Teacher in this specific course.
        Task<bool> CanTeachAsync(Guid courseId, CancellationToken ct = default);

        // True if the caller may read course resources: SysAdmin, anyone in the course's org
        // (legacy behaviour), or a User enrolled in this specific course (Teacher or Student).
        Task<bool> CanViewAsync(Guid courseId, CancellationToken ct = default);

        // True if the caller may read a specific piece of content by resolving every course that
        // contains it (module → course_modules) and checking CanViewAsync on each. Used by the
        // per-resource viewers (quiz/deck/progress) so an enrolled user WITHOUT a globally-selected
        // org can still open in-course content — access is per-course, not org-equality.
        Task<bool> CanViewContentAsync(Guid contentId, CancellationToken ct = default);
    }

    public class CourseAccessService : ICourseAccessService
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _cache;

        public CourseAccessService(ContentDbContext db, IOrgContextService orgCtx,
            IHttpClientFactory httpClientFactory, IConfiguration config,
            Microsoft.Extensions.Caching.Memory.IMemoryCache cache)
        {
            _db = db;
            _orgCtx = orgCtx;
            _httpClientFactory = httpClientFactory;
            _config = config;
            _cache = cache;
        }

        // True if the course's organization is Suspended (spec §6.6) — access is then frozen for
        // everyone except SysAdmin. Queried from Organization.Api's internal endpoint, cached 15s so
        // this hot path stays cheap while reflecting a suspend/reactivate within seconds.
        private async Task<bool> IsOrgSuspendedAsync(Guid orgId, CancellationToken ct)
        {
            var key = $"org_status_{orgId}";
            if (_cache.TryGetValue(key, out string? cached))
                return cached == "Suspended";
            try
            {
                var baseUrl = (_config["Organization:InternalBaseUrl"] ?? "http://localhost:5002").TrimEnd('/');
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                var resp = await client.GetFromJsonAsync<Shared.Contracts.Responses.ApiResponse<OrgStatusLite>>(
                    $"{baseUrl}/api/internal/orgs/{orgId}/status", ct);
                var status = resp?.Data?.Status ?? "Active";
                _cache.Set(key, status, TimeSpan.FromSeconds(15));
                return status == "Suspended";
            }
            catch
            {
                return false; // fail-open: an Organization.Api hiccup must not lock the whole platform
            }
        }

        private record OrgStatusLite(string Status);

        public async Task<bool> CanTeachAsync(Guid courseId, CancellationToken ct = default)
        {
            if (_orgCtx.IsSysAdmin()) return true;
            var role = _orgCtx.GetCurrentRole();
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return false;

            var course = await _db.Courses.IgnoreQueryFilters()
                .Where(c => c.Id == courseId)
                .Select(c => new { c.OrgId })
                .FirstOrDefaultAsync(ct);
            if (course == null) return false;

            // Spec §6.6: while the org is Suspended, access is frozen for everyone except SysAdmin
            // (already returned true above).
            if (await IsOrgSuspendedAsync(course.OrgId, ct)) return false;

            // OrgAdmin of this org has full Teacher privileges per spec §1.
            if (role == "OrgAdmin" && _orgCtx.GetCurrentOrgId() == course.OrgId) return true;

            // Per-course Teacher: a user with an APPROVED Teacher enrollment in THIS course can
            // teach it, REGARDLESS of their global/JWT role. The per-course role lives only in the
            // enrollment table (spec §5: never in the JWT), so we must not gate on the JWT role here
            // — that was why a per-course Teacher (global role "Student") could not add modules.
            return await _db.CourseEnrollments.AnyAsync(
                e => e.CourseId == courseId && e.UserId == userId
                    && e.Role == "Teacher" && e.Status == "Approved", ct);
        }

        public async Task<bool> CanViewAsync(Guid courseId, CancellationToken ct = default)
        {
            if (_orgCtx.IsSysAdmin()) return true;
            var userId = _orgCtx.GetCurrentUserId();
            if (userId == null) return false;

            var course = await _db.Courses.IgnoreQueryFilters()
                .Where(c => c.Id == courseId)
                .Select(c => new { c.OrgId })
                .FirstOrDefaultAsync(ct);
            if (course == null) return false;

            // Spec §6.6: while the org is Suspended, access is frozen for everyone except SysAdmin.
            if (await IsOrgSuspendedAsync(course.OrgId, ct)) return false;

            // OrgAdmin of the org sees everything.
            var role = _orgCtx.GetCurrentRole();
            if (role == "OrgAdmin" && _orgCtx.GetCurrentOrgId() == course.OrgId) return true;

            // Otherwise must have an APPROVED enrollment row (Teacher or Student) for this course.
            // A Pending request does not yet grant read access to course content.
            return await _db.CourseEnrollments.AnyAsync(
                e => e.CourseId == courseId && e.UserId == userId && e.Status == "Approved", ct);
        }

        public async Task<bool> CanViewContentAsync(Guid contentId, CancellationToken ct = default)
        {
            if (_orgCtx.IsSysAdmin()) return true;

            // Every course that contains this content (a content can sit in modules shared by
            // more than one course). Enrolled in ANY of them → may view it.
            var courseIds = await _db.ModuleContents
                .Where(mc => mc.ContentId == contentId && mc.Module != null)
                .SelectMany(mc => mc.Module!.CourseModules)
                .Select(cm => cm.CourseId)
                .Distinct()
                .ToListAsync(ct);

            foreach (var cid in courseIds)
                if (await CanViewAsync(cid, ct)) return true;

            return false;
        }
    }

    public class OrgContextService : IOrgContextService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public OrgContextService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        private HttpContext? Context => _httpContextAccessor.HttpContext;

        public Guid? GetCurrentOrgId()
        {
            // 1. Check HttpContext.Items (set by OrgContextMiddleware from header/slug)
            if (Context?.Items.TryGetValue("org_id", out var itemVal) == true
                && itemVal is string s && Guid.TryParse(s, out var id))
                return id;

            // 2. Fall back to JWT claim
            var claim = Context?.User?.FindFirst("org_id")?.Value;
            if (Guid.TryParse(claim, out var claimId)) return claimId;

            // 3. Fall back to X-Org-Id request header (forwarded by YARP from FE localStorage)
            var header = Context?.Request.Headers["X-Org-Id"].FirstOrDefault();
            return Guid.TryParse(header, out var headerId) ? headerId : null;
        }

        public Guid? GetCurrentUserId()
        {
            var claim = Context?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        public string? GetCurrentRole()
            => Context?.Items.TryGetValue("role", out var r) == true
                ? r as string
                : Context?.User?.FindFirst(ClaimTypes.Role)?.Value;

        public bool IsSysAdmin()
            => Context?.User?.IsInRole(Roles.SysAdmin) == true
               || GetCurrentRole() == Roles.SysAdmin;

        // Returns true if user is SysAdmin OR current org matches the requested orgId
        public bool HasOrgAccess(Guid orgId)
            => IsSysAdmin() || GetCurrentOrgId() == orgId;
    }
}

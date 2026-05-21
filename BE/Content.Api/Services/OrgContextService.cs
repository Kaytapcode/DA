using System.Security.Claims;
using Content.Api.Data;
using Microsoft.EntityFrameworkCore;

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
    }

    public class CourseAccessService : ICourseAccessService
    {
        private readonly ContentDbContext _db;
        private readonly IOrgContextService _orgCtx;

        public CourseAccessService(ContentDbContext db, IOrgContextService orgCtx)
        {
            _db = db;
            _orgCtx = orgCtx;
        }

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

            // OrgAdmin of this org has full Teacher privileges per spec §1.
            if (role == "OrgAdmin" && _orgCtx.GetCurrentOrgId() == course.OrgId) return true;

            // Teacher must be enrolled in this specific course.
            if (role == "Teacher")
            {
                return await _db.CourseEnrollments.AnyAsync(
                    e => e.CourseId == courseId && e.UserId == userId && e.Role == "Teacher", ct);
            }
            return false;
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

            // OrgAdmin of the org sees everything.
            var role = _orgCtx.GetCurrentRole();
            if (role == "OrgAdmin" && _orgCtx.GetCurrentOrgId() == course.OrgId) return true;

            // Otherwise must have an enrollment row (Teacher or Student) for this course.
            return await _db.CourseEnrollments.AnyAsync(
                e => e.CourseId == courseId && e.UserId == userId, ct);
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

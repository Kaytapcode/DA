using System.Security.Claims;

namespace Auth.Api.Services
{
    public interface IOrgContextService
    {
        Guid? GetCurrentOrgId();
        Guid? GetCurrentUserId();
        string? GetCurrentRole();
        bool IsSysAdmin();
        bool HasOrgAccess(Guid orgId);
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
            return Guid.TryParse(claim, out var claimId) ? claimId : null;
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

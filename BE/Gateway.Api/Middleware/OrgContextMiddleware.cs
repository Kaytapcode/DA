using System.Security.Claims;

namespace Gateway.Api.Middleware
{
    /// <summary>
    /// Extracts org_id from JWT claims or X-Org-Id header and forwards it to downstream services.
    /// Phase 2: reads from JWT claims. Phase 3 (T3.9) will resolve X-Org-Slug via DB lookup.
    /// </summary>
    public class OrgContextMiddleware
    {
        private readonly RequestDelegate _next;

        public OrgContextMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // 1. Extract org_id from JWT claim (set during login with org context)
            var orgIdFromClaim = context.User?.FindFirst("org_id")?.Value;

            // 2. Any authenticated user may provide org context via X-Org-Id header.
            //    Membership enforcement happens at the downstream service level.
            //    SysAdmin can also override; regular users trust the header they send.
            var orgIdFromHeader = context.Request.Headers["X-Org-Id"].FirstOrDefault();

            var resolvedOrgId = !string.IsNullOrEmpty(orgIdFromHeader)
                ? orgIdFromHeader
                : orgIdFromClaim;

            if (!string.IsNullOrEmpty(resolvedOrgId))
            {
                // Store in HttpContext.Items for downstream middleware/handlers
                context.Items["org_id"] = resolvedOrgId;

                // Inject as header for YARP to forward to downstream services
                context.Request.Headers["X-Org-Id"] = resolvedOrgId;
            }

            // Pass X-Org-Slug through as-is (downstream service resolves slug → org_id in T3.9)
            var orgSlug = context.Request.Headers["X-Org-Slug"].FirstOrDefault();
            if (!string.IsNullOrEmpty(orgSlug))
                context.Request.Headers["X-Org-Slug"] = orgSlug;

            await _next(context);
        }
    }
}


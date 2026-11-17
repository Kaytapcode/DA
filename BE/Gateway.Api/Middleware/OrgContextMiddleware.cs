using System.Security.Claims;

namespace Gateway.Api.Middleware
{
    /// <summary>
    /// Sets X-Org-Id for downstream services from the JWT org_id claim (SysAdmin may pass its own header).
    /// Any other client-supplied X-Org-Id is stripped.
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

            // 2. Only SysAdmin may switch org context via X-Org-Id header.
            //    Regular users are pinned to the org_id embedded in their JWT.
            var orgIdFromHeader = context.Request.Headers["X-Org-Id"].FirstOrDefault();
            var isSysAdmin = context.User?.IsInRole("SysAdmin") == true;

            var resolvedOrgId = (isSysAdmin && !string.IsNullOrEmpty(orgIdFromHeader))
                ? orgIdFromHeader
                : orgIdFromClaim;

            // CONTRACT M1: never forward a client-supplied X-Org-Id; only the value resolved above.
            // Exception: on /api/auth (login/refresh) the header is a login parameter that Identity
            // verifies against membership before putting org_id in the token.
            if (!context.Request.Path.StartsWithSegments("/api/auth"))
                context.Request.Headers.Remove("X-Org-Id");

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


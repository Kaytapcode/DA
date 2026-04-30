namespace Identity.Api.Middleware
{
    /// <summary>
    /// Resolves org_id from request headers or JWT claims.
    /// Sets HttpContext.Items["org_id"] for downstream use (DbContext global filters, IOrgContextService).
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
            // 1. Accept explicit X-Org-Id header
            var orgIdHeader = context.Request.Headers["X-Org-Id"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(orgIdHeader))
            {
                context.Items["org_id"] = orgIdHeader;
            }

            // 2. Fallback: JWT claim
            if (!context.Items.ContainsKey("org_id"))
            {
                var jwtOrgId = context.User?.FindFirst("org_id")?.Value;
                if (!string.IsNullOrWhiteSpace(jwtOrgId))
                    context.Items["org_id"] = jwtOrgId;
            }

            await _next(context);
        }
    }
}

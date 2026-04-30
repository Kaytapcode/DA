using Identity.Api.Data;

namespace Identity.Api.Middleware
{
    /// <summary>
    /// T3.9: Resolves X-Org-Slug header ? org_id via DB lookup.
    /// Falls back to X-Org-Id header if no slug is provided.
    /// Sets HttpContext.Items["org_id"] for downstream use (DbContext global filters, IOrgContextService).
    /// </summary>
    public class OrgContextMiddleware
    {
        private readonly RequestDelegate _next;

        public OrgContextMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IOrganizationRepository orgRepo)
        {
            // 1. Prefer slug resolution (T3.9 — path-based URL: /org/:slug/...)
            var slug = context.Request.Headers["X-Org-Slug"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(slug))
            {
                var org = await orgRepo.GetBySlugAsync(slug);
                if (org != null)
                    context.Items["org_id"] = org.Id.ToString();
            }

            // 2. Accept explicit X-Org-Id header (overrides slug if both present? No — slug takes precedence)
            if (!context.Items.ContainsKey("org_id"))
            {
                var orgIdHeader = context.Request.Headers["X-Org-Id"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(orgIdHeader))
                    context.Items["org_id"] = orgIdHeader;
            }

            // 3. Fallback: JWT claim (already set by OnTokenValidated in Program.cs if token has org_id)
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


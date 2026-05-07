using Hangfire.Dashboard;

namespace AI.Api
{
    /// <summary>
    /// Authorization filter for Hangfire dashboard.
    /// Only SysAdmin users are allowed to access the dashboard.
    /// </summary>
    public class HangfireSysAdminFilter : IDashboardAuthorizationFilter
    {
        public bool Authorize(DashboardContext context)
        {
            var httpContext = context.GetHttpContext();
            return httpContext.User.IsInRole("SysAdmin");
        }
    }
}

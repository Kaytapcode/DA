using Hangfire.Dashboard;

namespace AI.Api.Filters;

public class HangfireSysAdminFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
        => context.GetHttpContext().User.IsInRole("SysAdmin");
}

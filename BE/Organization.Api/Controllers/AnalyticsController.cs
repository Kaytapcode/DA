using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Organization.Api.Data;
using Shared.Contracts.Responses;

namespace Organization.Api.Controllers
{
    [ApiController]
    [Route("api/analytics")]
    [Authorize]
    public class AnalyticsController : ControllerBase
    {
        private readonly OrganizationDbContext _db;

        public AnalyticsController(OrganizationDbContext db) => _db = db;

        public record SysAdminOrgsOverviewDto(int TotalOrgs, int TotalMembers, int RecentJoins);
        public record OrgMembersOverviewDto(Guid OrgId, int TotalMembers, int TeacherCount, int StudentCount, int RecentJoins);

        // GET /api/analytics/sysadmin/orgs — system-wide org & membership counts.
        [HttpGet("sysadmin/orgs")]
        [Authorize(Policy = "RequireSysAdmin")]
        public async Task<IActionResult> GetSysAdminOrgsOverview(CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.AddDays(-30);
            var dto = new SysAdminOrgsOverviewDto(
                TotalOrgs: await _db.Organizations.IgnoreQueryFilters().CountAsync(ct),
                TotalMembers: await _db.Members.IgnoreQueryFilters().CountAsync(ct),
                RecentJoins: await _db.Members.IgnoreQueryFilters().CountAsync(m => m.JoinDate >= cutoff, ct)
            );
            return Ok(new ApiResponse<SysAdminOrgsOverviewDto>(true, dto, null));
        }

        // GET /api/analytics/orgs/{orgId}/members — per-org membership breakdown.
        [HttpGet("orgs/{orgId:guid}/members")]
        [Authorize(Policy = "RequireOrgAdmin")]
        public async Task<IActionResult> GetOrgMembers(Guid orgId, CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.AddDays(-30);
            var members = await _db.Members.IgnoreQueryFilters()
                .Where(m => m.OrgId == orgId)
                .Select(m => new { m.Role, m.JoinDate })
                .ToListAsync(ct);

            var dto = new OrgMembersOverviewDto(
                OrgId: orgId,
                TotalMembers: members.Count,
                TeacherCount: members.Count(m => m.Role == "Teacher"),
                StudentCount: members.Count(m => m.Role == "Student"),
                RecentJoins: members.Count(m => m.JoinDate >= cutoff)
            );
            return Ok(new ApiResponse<OrgMembersOverviewDto>(true, dto, null));
        }
    }
}

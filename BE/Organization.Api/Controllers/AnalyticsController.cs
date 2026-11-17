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

        private readonly IMemberRepository _members;

        public AnalyticsController(OrganizationDbContext db, IMemberRepository members) { _db = db; _members = members; }

        public record SysAdminOrgsOverviewDto(int TotalOrgs, int TotalMembers, int RecentJoins);
        public record OrgMembersOverviewDto(Guid OrgId, int TotalMembers, int MemberCount, int OrgAdminCount, int RecentJoins);

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
            var uid = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!User.IsInRole("SysAdmin") && !(Guid.TryParse(uid, out var userId) && await _members.IsUserOrgAdminAsync(userId, orgId, ct)))
                return Forbid();

            var cutoff = DateTime.UtcNow.AddDays(-30);
            var members = await _db.Members.IgnoreQueryFilters()
                .Where(m => m.OrgId == orgId && m.Status == "Approved")
                .Select(m => new { m.Role, m.JoinDate })
                .ToListAsync(ct);

            var dto = new OrgMembersOverviewDto(
                OrgId: orgId,
                TotalMembers: members.Count,
                MemberCount: members.Count(m => m.Role == "Member"),
                OrgAdminCount: members.Count(m => m.Role == "OrgAdmin" || m.Role == "Owner"),
                RecentJoins: members.Count(m => m.JoinDate >= cutoff)
            );
            return Ok(new ApiResponse<OrgMembersOverviewDto>(true, dto, null));
        }
    }
}

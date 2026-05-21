using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Organization.Api.Data;
using Organization.Api.Models;
using Shared.Contracts.Responses;

namespace Organization.Api.Controllers
{
    // Internal service-to-service endpoint — no JWT required.
    // Protected at the network level (not exposed through the public Gateway).
    [Route("api/internal/orgs")]
    [ApiController]
    [AllowAnonymous]
    public class InternalOrgController : ControllerBase
    {
        private readonly IMemberRepository _memberRepository;
        private readonly IOrganizationRepository _orgRepository;

        public InternalOrgController(IMemberRepository memberRepository, IOrganizationRepository orgRepository)
        {
            _memberRepository = memberRepository;
            _orgRepository = orgRepository;
        }

        // GET /api/internal/orgs/{orgId}/members/{userId} -> { isMember, role }
        [HttpGet("{orgId:guid}/members/{userId:guid}")]
        public async Task<IActionResult> CheckMembership(Guid orgId, Guid userId, CancellationToken ct)
        {
            var member = await _memberRepository.GetByUserAndOrgAsync(userId, orgId, ct);
            if (member == null)
                return Ok(new ApiResponse<MembershipCheckDto>(true, new MembershipCheckDto(false, null), null));

            return Ok(new ApiResponse<MembershipCheckDto>(true, new MembershipCheckDto(true, member.Role), null));
        }

        // POST /api/internal/orgs/setup — creates an org and adds userId as OrgAdmin member.
        // Called by Identity.Api during OrgAdmin self-registration. Idempotent on slug conflict.
        [HttpPost("setup")]
        public async Task<IActionResult> SetupOrgWithAdmin([FromBody] SetupOrgRequest req, CancellationToken ct)
        {
            if (await _orgRepository.SlugExistsAsync(req.Slug, null, ct))
                return BadRequest(new ApiResponse(false, "Organization slug already in use."));

            var org = await _orgRepository.CreateAsync(new OrganizationModel
            {
                Id = Guid.NewGuid(),
                Name = req.Name,
                Slug = req.Slug,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            }, ct);

            await _memberRepository.CreateAsync(new MemberModel
            {
                Id = Guid.NewGuid(),
                OrgId = org.Id,
                UserId = req.AdminUserId,
                Role = "OrgAdmin",
                JoinDate = DateTime.UtcNow,
            }, ct);

            return Ok(new ApiResponse<OrgSetupResultDto>(true, new OrgSetupResultDto(org.Id, org.Name, org.Slug), null));
        }
    }

    public record MembershipCheckDto(bool IsMember, string? Role);
    public record SetupOrgRequest(string Name, string Slug, Guid AdminUserId);
    public record OrgSetupResultDto(Guid OrgId, string Name, string Slug);
}

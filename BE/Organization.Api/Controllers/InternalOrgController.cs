using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Organization.Api.Data;
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

        public InternalOrgController(IMemberRepository memberRepository)
        {
            _memberRepository = memberRepository;
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
    }

    public record MembershipCheckDto(bool IsMember, string? Role);
}

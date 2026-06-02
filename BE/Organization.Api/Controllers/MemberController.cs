using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Organization.Api.Data;
using Organization.Api.Models;
using Organization.Api.Services;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Organization.Api.Controllers
{
    [Route("api/orgs/{orgId:guid}/members")]
    [ApiController]
    [Authorize]
    public class MemberController : ControllerBase
    {
        private readonly IMemberRepository _memberRepository;
        private readonly IIdentityServiceClient _identityClient;

        public MemberController(IMemberRepository memberRepository, IIdentityServiceClient identityClient)
        {
            _memberRepository = memberRepository;
            _identityClient = identityClient;
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> CanManageOrg(Guid orgId)
        {
            if (User.IsInRole("SysAdmin")) return true;
            var userId = GetCurrentUserId();
            return userId.HasValue && await _memberRepository.IsUserOrgAdminAsync(userId.Value, orgId);
        }

        // GET /api/orgs/{orgId}/members
        [HttpGet]
        public async Task<IActionResult> GetMembers(Guid orgId)
        {
            var userId = GetCurrentUserId();
            if (!User.IsInRole("SysAdmin") && userId.HasValue && !await _memberRepository.IsUserMemberAsync(userId.Value, orgId))
                return Forbid();

            var members = await _memberRepository.GetByOrgIdAsync(orgId);
            var userMap = await _identityClient.GetUsersAsync(members.Select(m => m.UserId));
            var result = members.Select(m =>
            {
                userMap.TryGetValue(m.UserId, out var info);
                return new MemberListResponseDto(
                    UserId: m.UserId,
                    Username: info.Username ?? string.Empty,
                    Email: info.Email ?? string.Empty,
                    Role: m.Role,
                    JoinDate: m.JoinDate
                );
            });

            return Ok(new ApiResponse<IEnumerable<MemberListResponseDto>>(
                Success: true, Data: result, Message: null
            ));
        }

        // POST /api/orgs/{orgId}/members - add member (OrgAdmin or SysAdmin)
        [HttpPost]
        public async Task<IActionResult> AddMember(Guid orgId, [FromBody] CreateMemberRequestDto request)
        {
            if (!await CanManageOrg(orgId)) return Forbid();

            // TODO: Verify user exists via HttpClient call to Identity.Api
            // var user = await httpClient.GetAsync($".../{request.UserId}");
            // if (user == null) return NotFound(...);

            var existing = await _memberRepository.GetByUserAndOrgAsync(request.UserId, orgId);
            if (existing != null)
                return BadRequest(new ApiResponse(Success: false, Message: "User is already a member of this organization."));

            // Org-level roles are ONLY 'Member' and 'OrgAdmin' (plus 'Owner' for the creator).
            // Teacher/Student is NOT an org role — it is assigned per-course in Content.Api.
            var validRoles = new[] { "Member", "OrgAdmin", "Owner" };
            if (!validRoles.Contains(request.Role))
                return BadRequest(new ApiResponse(Success: false, Message: $"Invalid role. Valid roles: {string.Join(", ", validRoles)}"));

            var member = new MemberModel
            {
                UserId = request.UserId,
                OrgId = orgId,
                Role = request.Role
            };

            var created = await _memberRepository.CreateAsync(member);
            return Ok(new ApiResponse<MemberResponseDto>(
                Success: true,
                Data: new MemberResponseDto(created.UserId, created.OrgId, created.Role, created.JoinDate),
                Message: "Member added successfully."
            ));
        }

        // POST /api/orgs/{orgId}/members/self - any authenticated User joins the org as a Member.
        // Spec §1: "Can join Organizations." Org-level role is 'Member' (Teacher/Student is
        // assigned later, per-course, by an OrgAdmin).
        [HttpPost("self")]
        public async Task<IActionResult> JoinSelf(Guid orgId)
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            var existing = await _memberRepository.GetByUserAndOrgAsync(userId.Value, orgId);
            if (existing != null)
                return Ok(new ApiResponse<MemberResponseDto>(
                    Success: true,
                    Data: new MemberResponseDto(existing.UserId, existing.OrgId, existing.Role, existing.JoinDate),
                    Message: "Already a member."
                ));

            var member = new MemberModel
            {
                UserId = userId.Value,
                OrgId = orgId,
                Role = "Member"
            };
            var created = await _memberRepository.CreateAsync(member);
            return Ok(new ApiResponse<MemberResponseDto>(
                Success: true,
                Data: new MemberResponseDto(created.UserId, created.OrgId, created.Role, created.JoinDate),
                Message: "Joined organization."
            ));
        }

        // PUT /api/orgs/{orgId}/members/{userId} - update role (OrgAdmin or SysAdmin).
        // The path segment is the member's USER id (what the FE has on hand), not the
        // internal MemberModel.Id — the member row is resolved by (userId, orgId).
        [HttpPut("{userId:guid}")]
        public async Task<IActionResult> UpdateMember(Guid orgId, Guid userId, [FromBody] UpdateMemberRequestDto request)
        {
            if (!await CanManageOrg(orgId)) return Forbid();

            var member = await _memberRepository.GetByUserAndOrgAsync(userId, orgId);
            if (member == null)
                return NotFound(new ApiResponse(Success: false, Message: "Member does not exist."));

            if (member.Role == "Owner")
                return BadRequest(new ApiResponse(Success: false, Message: "Owner role cannot be changed."));

            // Org-level roles are ONLY 'Member' and 'OrgAdmin' (Teacher/Student live per-course).
            var validRoles = new[] { "Member", "OrgAdmin" };
            if (!validRoles.Contains(request.Role))
                return BadRequest(new ApiResponse(Success: false, Message: "Invalid role. Valid roles: Member, OrgAdmin"));

            member.Role = request.Role;
            var updated = await _memberRepository.UpdateAsync(member);

            return Ok(new ApiResponse<MemberResponseDto>(
                Success: true,
                Data: new MemberResponseDto(updated.UserId, updated.OrgId, updated.Role, updated.JoinDate),
                Message: "Role updated successfully."
            ));
        }

        // DELETE /api/orgs/{orgId}/members/{userId} - remove member.
        // Path segment is the member's USER id (resolved by (userId, orgId)).
        [HttpDelete("{userId:guid}")]
        public async Task<IActionResult> RemoveMember(Guid orgId, Guid userId)
        {
            if (!await CanManageOrg(orgId)) return Forbid();

            var member = await _memberRepository.GetByUserAndOrgAsync(userId, orgId);
            if (member == null)
                return NotFound(new ApiResponse(Success: false, Message: "Member does not exist."));

            if (member.Role == "Owner")
                return BadRequest(new ApiResponse(Success: false, Message: "Cannot remove Owner from the organization."));

            await _memberRepository.DeleteAsync(member.Id);
            return Ok(new ApiResponse(Success: true, Message: "Member removed from the organization."));
        }
    }
}

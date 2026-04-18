using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Auth.Api.Data;
using Auth.Api.Models;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Auth.Api.Controllers
{
    [Route("api/orgs/{orgId:guid}/members")]
    [ApiController]
    [Authorize]
    public class MemberController : ControllerBase
    {
        private readonly IMemberRepository _memberRepository;
        private readonly IUserRepository _userRepository;

        public MemberController(IMemberRepository memberRepository, IUserRepository userRepository)
        {
            _memberRepository = memberRepository;
            _userRepository = userRepository;
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
            var result = members.Select(m => new MemberListResponseDto(
                UserId: m.UserId,
                Username: m.User?.Username ?? string.Empty,
                Email: m.User?.Email ?? string.Empty,
                Role: m.Role,
                JoinDate: m.JoinDate
            ));

            return Ok(new ApiResponse<IEnumerable<MemberListResponseDto>>(
                Success: true, Data: result, Message: null
            ));
        }

        // POST /api/orgs/{orgId}/members - add member (OrgAdmin or SysAdmin)
        [HttpPost]
        public async Task<IActionResult> AddMember(Guid orgId, [FromBody] CreateMemberRequestDto request)
        {
            if (!await CanManageOrg(orgId)) return Forbid();

            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
                return NotFound(new ApiResponse(Success: false, Message: "User does not exist."));

            var existing = await _memberRepository.GetByUserAndOrgAsync(request.UserId, orgId);
            if (existing != null)
                return BadRequest(new ApiResponse(Success: false, Message: "User is already a member of this organization."));

            var validRoles = new[] { "Student", "Teacher", "OrgAdmin", "Owner" };
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

        // PUT /api/orgs/{orgId}/members/{memberId} - update role (OrgAdmin or SysAdmin)
        [HttpPut("{memberId:guid}")]
        public async Task<IActionResult> UpdateMember(Guid orgId, Guid memberId, [FromBody] UpdateMemberRequestDto request)
        {
            if (!await CanManageOrg(orgId)) return Forbid();

            var member = await _memberRepository.GetByIdAsync(memberId);
            if (member == null || member.OrgId != orgId)
                return NotFound(new ApiResponse(Success: false, Message: "Member does not exist."));

            if (member.Role == "Owner")
                return BadRequest(new ApiResponse(Success: false, Message: "Owner role cannot be changed."));

            var validRoles = new[] { "Student", "Teacher", "OrgAdmin" };
            if (!validRoles.Contains(request.Role))
                return BadRequest(new ApiResponse(Success: false, Message: "Invalid role."));

            member.Role = request.Role;
            var updated = await _memberRepository.UpdateAsync(member);

            return Ok(new ApiResponse<MemberResponseDto>(
                Success: true,
                Data: new MemberResponseDto(updated.UserId, updated.OrgId, updated.Role, updated.JoinDate),
                Message: "Role updated successfully."
            ));
        }

        // DELETE /api/orgs/{orgId}/members/{memberId} - remove member
        [HttpDelete("{memberId:guid}")]
        public async Task<IActionResult> RemoveMember(Guid orgId, Guid memberId)
        {
            if (!await CanManageOrg(orgId)) return Forbid();

            var member = await _memberRepository.GetByIdAsync(memberId);
            if (member == null || member.OrgId != orgId)
                return NotFound(new ApiResponse(Success: false, Message: "Member does not exist."));

            if (member.Role == "Owner")
                return BadRequest(new ApiResponse(Success: false, Message: "Cannot remove Owner from the organization."));

            await _memberRepository.DeleteAsync(memberId);
            return Ok(new ApiResponse(Success: true, Message: "Member removed from the organization."));
        }
    }
}

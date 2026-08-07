using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Organization.Api.Data;
using Organization.Api.Models;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Organization.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationRepository _organizationRepository;
    private readonly IMemberRepository _memberRepository;
    private readonly IMapper _mapper;

    public OrganizationsController(IOrganizationRepository organizationRepository, IMemberRepository memberRepository, IMapper mapper)
    {
        _organizationRepository = organizationRepository;
        _memberRepository = memberRepository;
        _mapper = mapper;
    }

    /// <summary>Organizations the current user is a MEMBER of (any role), with their org role.
    /// Powers the user's "Browse Courses" org picker and org-scoped views.</summary>
    [HttpGet("mine")]
    [ProducesResponseType(typeof(ApiResponse<List<MyOrganizationDto>>), 200)]
    public async Task<IActionResult> GetMyOrganizations()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return BadRequest(new ApiResponse(false, "Invalid user ID"));

        // Only APPROVED memberships count as "mine" — a Pending join request is not yet membership.
        var memberships = (await _memberRepository.GetByUserIdAsync(userId))
            .Where(m => m.Status == "Approved")
            .ToList();
        var result = new List<MyOrganizationDto>();
        foreach (var m in memberships)
        {
            var org = await _organizationRepository.GetByIdAsync(m.OrgId);
            if (org != null)
                result.Add(new MyOrganizationDto(org.Id, org.Name, org.Slug, m.Role));
        }

        return Ok(new ApiResponse<List<MyOrganizationDto>>(true, result, null));
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<OrganizationListResponseDto>>), 200)]
    public async Task<IActionResult> GetOrganizations()
    {
        // Spec §1 (User role "Can join Organizations") + §4.2 onboarding: any authenticated user
        // must be able to discover the directory of organizations in order to join one. This list
        // exposes only directory-level fields (name, slug, member count) — never internal course/
        // member/analytics structure (which stays gated by CourseAccessService). SysAdmin and
        // normal users alike get the full directory; "my organizations" is served by GET /mine.
        var organizations = await _organizationRepository.GetAllAsync();

        return Ok(new ApiResponse<List<OrganizationListResponseDto>>(
            true,
            _mapper.Map<List<OrganizationListResponseDto>>(organizations),
            "Organizations retrieved successfully"
        ));
    }

    /// <summary>Resolve organization by slug (public — used by FE to map slug → id)</summary>
    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var organization = await _organizationRepository.GetBySlugAsync(slug.ToLower());
        if (organization == null)
            return NotFound(new ApiResponse(false, "Organization not found"));

        return Ok(new ApiResponse<object>(true, new
        {
            organization.Id,
            organization.Name,
            organization.Slug,
        }, null));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiResponse<OrganizationResponseDto>), 200)]
    public async Task<IActionResult> GetOrganization(Guid id)
    {
        var organization = await _organizationRepository.GetByIdAsync(id);
        if (organization == null)
            return NotFound(new ApiResponse(false, "Organization not found"));

        return Ok(new ApiResponse<OrganizationResponseDto>(
            true,
            _mapper.Map<OrganizationResponseDto>(organization),
            "Organization retrieved successfully"
        ));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<OrganizationResponseDto>), 201)]
    public async Task<IActionResult> CreateOrganization([FromBody] CreateOrganizationRequestDto request)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userId, out var userGuid))
            return BadRequest(new ApiResponse(false, "Invalid user ID"));

        var existingOrg = await _organizationRepository.GetBySlugAsync(request.Slug);
        if (existingOrg != null)
            return BadRequest(new ApiResponse(false, "Slug already exists"));

        var organization = new OrganizationModel
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Address = request.Address,
            Slug = request.Slug.ToLower(),
            OwnerId = userGuid,
            CreatedAt = DateTime.UtcNow
        };

        await _organizationRepository.CreateAsync(organization);

        return CreatedAtAction(nameof(GetOrganization), new { id = organization.Id },
            new ApiResponse<OrganizationResponseDto>(
                true,
                _mapper.Map<OrganizationResponseDto>(organization),
                "Organization created successfully"
            ));
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ApiResponse<OrganizationResponseDto>), 200)]
    public async Task<IActionResult> UpdateOrganization(Guid id, [FromBody] UpdateOrganizationRequestDto request)
    {
        var organization = await _organizationRepository.GetByIdAsync(id);
        if (organization == null)
            return NotFound(new ApiResponse(false, "Organization not found"));

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userId, out var userGuid))
            return BadRequest(new ApiResponse(false, "Invalid user ID"));

        if (organization.OwnerId != userGuid && !User.IsInRole("SysAdmin"))
            return Forbid();

        if (!string.IsNullOrEmpty(request.Slug) && request.Slug != organization.Slug)
        {
            var existingOrg = await _organizationRepository.GetBySlugAsync(request.Slug);
            if (existingOrg != null)
                return BadRequest(new ApiResponse(false, "Slug already exists"));

            organization.Slug = request.Slug.ToLower();
        }

        organization.Name = request.Name;
        organization.Address = request.Address;
        organization.UpdatedAt = DateTime.UtcNow;

        await _organizationRepository.UpdateAsync(organization);

        return Ok(new ApiResponse<OrganizationResponseDto>(
            true,
            _mapper.Map<OrganizationResponseDto>(organization),
            "Organization updated successfully"
        ));
    }

    // POST /api/organizations/{id}/suspend | /reactivate — SysAdmin only (spec §6.6).
    [HttpPost("{id}/suspend")]
    [Authorize(Roles = "SysAdmin")]
    public Task<IActionResult> SuspendOrganization(Guid id) => SetStatusAsync(id, "Suspended");

    [HttpPost("{id}/reactivate")]
    [Authorize(Roles = "SysAdmin")]
    public Task<IActionResult> ReactivateOrganization(Guid id) => SetStatusAsync(id, "Active");

    private async Task<IActionResult> SetStatusAsync(Guid id, string status)
    {
        var organization = await _organizationRepository.GetByIdAsync(id);
        if (organization == null)
            return NotFound(new ApiResponse(false, "Organization not found"));

        organization.Status = status;
        organization.UpdatedAt = DateTime.UtcNow;
        await _organizationRepository.UpdateAsync(organization);

        return Ok(new ApiResponse<OrganizationResponseDto>(
            true, _mapper.Map<OrganizationResponseDto>(organization),
            status == "Suspended" ? "Organization suspended." : "Organization reactivated."));
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(typeof(ApiResponse), 200)]
    public async Task<IActionResult> DeleteOrganization(Guid id)
    {
        var organization = await _organizationRepository.GetByIdAsync(id);
        if (organization == null)
            return NotFound(new ApiResponse(false, "Organization not found"));

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userId, out var userGuid))
            return BadRequest(new ApiResponse(false, "Invalid user ID"));

        if (organization.OwnerId != userGuid && !User.IsInRole("SysAdmin"))
            return Forbid();

        await _organizationRepository.DeleteAsync(id);

        return Ok(new ApiResponse(true, "Organization deleted successfully"));
    }
}

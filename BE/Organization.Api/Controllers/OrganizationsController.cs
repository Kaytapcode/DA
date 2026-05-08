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
    private readonly IMapper _mapper;

    public OrganizationsController(IOrganizationRepository organizationRepository, IMapper mapper)
    {
        _organizationRepository = organizationRepository;
        _mapper = mapper;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<OrganizationListResponseDto>>), 200)]
    public async Task<IActionResult> GetOrganizations()
    {
        var isAdmin = User.IsInRole("SysAdmin");
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        List<OrganizationModel> organizations;

        if (isAdmin)
        {
            organizations = await _organizationRepository.GetAllAsync();
        }
        else
        {
            if (!Guid.TryParse(userId, out var userGuid))
                return BadRequest(new ApiResponse(false, "Invalid user ID"));

            organizations = await _organizationRepository.GetByOwnerIdAsync(userGuid);
        }

        return Ok(new ApiResponse<List<OrganizationListResponseDto>>(
            true,
            _mapper.Map<List<OrganizationListResponseDto>>(organizations),
            "Organizations retrieved successfully"
        ));
    }

    /// <summary>Returns all orgs the current user belongs to (as member or owner)</summary>
    [HttpGet("my-orgs")]
    [ProducesResponseType(typeof(ApiResponse<List<OrganizationListResponseDto>>), 200)]
    public async Task<IActionResult> GetMyOrganizations()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userId, out var userGuid))
            return BadRequest(new ApiResponse(false, "Invalid user ID"));

        var organizations = await _organizationRepository.GetByMemberUserIdAsync(userGuid);
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

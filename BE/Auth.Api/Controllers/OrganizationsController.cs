using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;
using Auth.Api.Data;
using Auth.Api.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Auth.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrganizationsController : ControllerBase
    {
        private readonly IOrganizationRepository _organizationRepository;
        private readonly IUserRepository _userRepository;

        public OrganizationsController(
            IOrganizationRepository organizationRepository,
            IUserRepository userRepository)
        {
            _organizationRepository = organizationRepository;
            _userRepository = userRepository;
        }

        /// <summary>
        /// Get all organizations (for system admin only) or user's organizations
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<OrganizationListResponseDto>>), 200)]
        public async Task<IActionResult> GetOrganizations()
        {
            try
            {
                var isAdmin = User.FindFirst("role")?.Value == "SysAdmin";
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

                var responseData = organizations.ConvertAll(org => new OrganizationListResponseDto(
                    org.Id,
                    org.Name,
                    org.Slug,
                    org.Members?.Count ?? 0,
                    org.CreatedAt
                ));

                return Ok(new ApiResponse<List<OrganizationListResponseDto>>(
                    true,
                    responseData,
                    "Organizations retrieved successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while retrieving organizations",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Resolve organization by slug (public — used by OrgContext to map slug → id)
        /// </summary>
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

        /// <summary>
        /// Get a specific organization by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<OrganizationResponseDto>), 200)]
        public async Task<IActionResult> GetOrganization(Guid id)
        {
            try
            {
                var organization = await _organizationRepository.GetByIdAsync(id);
                if (organization == null)
                    return NotFound(new ApiResponse(false, "Organization not found"));

                var responseData = new OrganizationResponseDto(
                    organization.Id,
                    organization.Name,
                    organization.Address,
                    organization.Slug,
                    organization.OwnerId,
                    organization.CreatedAt,
                    organization.Members?.Count ?? 0
                );

                return Ok(new ApiResponse<OrganizationResponseDto>(
                    true,
                    responseData,
                    "Organization retrieved successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while retrieving the organization",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Create a new organization
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<OrganizationResponseDto>), 201)]
        public async Task<IActionResult> CreateOrganization([FromBody] CreateOrganizationRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse(false, "Invalid request data"));

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userGuid))
                    return BadRequest(new ApiResponse(false, "Invalid user ID"));

                // Check if slug already exists
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

                var responseData = new OrganizationResponseDto(
                    organization.Id,
                    organization.Name,
                    organization.Address,
                    organization.Slug,
                    organization.OwnerId,
                    organization.CreatedAt
                );

                return CreatedAtAction(nameof(GetOrganization), new { id = organization.Id },
                    new ApiResponse<OrganizationResponseDto>(
                        true,
                        responseData,
                        "Organization created successfully"
                    ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while creating the organization",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Update an organization (owner only)
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(ApiResponse<OrganizationResponseDto>), 200)]
        public async Task<IActionResult> UpdateOrganization(Guid id, [FromBody] UpdateOrganizationRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse(false, "Invalid request data"));

                var organization = await _organizationRepository.GetByIdAsync(id);
                if (organization == null)
                    return NotFound(new ApiResponse(false, "Organization not found"));

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userGuid))
                    return BadRequest(new ApiResponse(false, "Invalid user ID"));

                // Check authorization
                if (organization.OwnerId != userGuid && User.FindFirst("role")?.Value != "SysAdmin")
                    return Forbid();

                // Check slug uniqueness if slug is being changed
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

                var responseData = new OrganizationResponseDto(
                    organization.Id,
                    organization.Name,
                    organization.Address,
                    organization.Slug,
                    organization.OwnerId,
                    organization.CreatedAt,
                    organization.Members?.Count ?? 0
                );

                return Ok(new ApiResponse<OrganizationResponseDto>(
                    true,
                    responseData,
                    "Organization updated successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while updating the organization",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Delete an organization (owner only)
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(ApiResponse), 200)]
        public async Task<IActionResult> DeleteOrganization(Guid id)
        {
            try
            {
                var organization = await _organizationRepository.GetByIdAsync(id);
                if (organization == null)
                    return NotFound(new ApiResponse(false, "Organization not found"));

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userGuid))
                    return BadRequest(new ApiResponse(false, "Invalid user ID"));

                // Check authorization
                if (organization.OwnerId != userGuid && User.FindFirst("role")?.Value != "SysAdmin")
                    return Forbid();

                await _organizationRepository.DeleteAsync(id);

                return Ok(new ApiResponse(
                    true,
                    "Organization deleted successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while deleting the organization",
                    new List<string> { ex.Message }
                ));
            }
        }
    }
}


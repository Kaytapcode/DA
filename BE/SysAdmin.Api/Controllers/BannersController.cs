using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;
using SysAdmin.Api.Data;
using SysAdmin.Api.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SysAdmin.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BannersController : ControllerBase
    {
        private readonly IBannerRepository _bannerRepository;

        public BannersController(IBannerRepository bannerRepository)
        {
            _bannerRepository = bannerRepository;
        }

        /// <summary>
        /// Get all active banners (public endpoint)
        /// Shows system-wide banners or org-specific banners based on org context
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<BannerListResponseDto>>), 200)]
        public async Task<IActionResult> GetBanners()
        {
            try
            {
                var orgId = HttpContext.Items["org_id"]?.ToString();

                List<BannerModel> banners;

                if (string.IsNullOrEmpty(orgId))
                {
                    // Get only system-wide banners
                    banners = await _bannerRepository.GetSystemBannersAsync();
                }
                else if (Guid.TryParse(orgId, out var orgGuid))
                {
                    // Get both system-wide and org-specific banners
                    banners = await _bannerRepository.GetOrgBannersAsync(orgGuid);
                }
                else
                {
                    banners = await _bannerRepository.GetSystemBannersAsync();
                }

                var responseData = banners.ConvertAll(banner => new BannerListResponseDto(
                    banner.Id,
                    banner.ImageUrl,
                    banner.Title,
                    banner.DisplayOrder,
                    banner.IsActive,
                    banner.OrgId == null,
                    banner.CreatedAt
                ));

                return Ok(new ApiResponse<List<BannerListResponseDto>>(
                    true,
                    responseData,
                    "Banners retrieved successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while retrieving banners",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Get a specific banner by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<BannerResponseDto>), 200)]
        public async Task<IActionResult> GetBanner(Guid id)
        {
            try
            {
                var banner = await _bannerRepository.GetByIdAsync(id);
                if (banner == null)
                    return NotFound(new ApiResponse(false, "Banner not found"));

                var responseData = new BannerResponseDto(
                    banner.Id,
                    banner.ImageUrl,
                    banner.Title,
                    banner.Description,
                    banner.DisplayOrder,
                    banner.IsActive,
                    banner.OrgId,
                    banner.CreatedAt
                );

                return Ok(new ApiResponse<BannerResponseDto>(
                    true,
                    responseData,
                    "Banner retrieved successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while retrieving the banner",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Create a new banner (SysAdmin for system banners, OrgAdmin for org banners)
        /// </summary>
        [Authorize(Roles = "SysAdmin,OrgAdmin")]
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<BannerResponseDto>), 201)]
        public async Task<IActionResult> CreateBanner([FromBody] CreateBannerRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse(false, "Invalid request data"));

                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

                // OrgAdmin can only create org-specific banners
                if (userRole == "OrgAdmin" && request.OrgId == null)
                    return Forbid();

                // SysAdmin can create system or org banners
                if (userRole == "SysAdmin" && request.OrgId != null)
                {
                    // SysAdmin creating org banner - optional org validation
                }

                var banner = new BannerModel
                {
                    Id = Guid.NewGuid(),
                    ImageUrl = request.ImageUrl,
                    Title = request.Title,
                    Description = request.Description,
                    DisplayOrder = request.DisplayOrder,
                    IsActive = request.IsActive,
                    OrgId = request.OrgId,
                    CreatedAt = DateTime.UtcNow
                };

                await _bannerRepository.CreateAsync(banner);

                var responseData = new BannerResponseDto(
                    banner.Id,
                    banner.ImageUrl,
                    banner.Title,
                    banner.Description,
                    banner.DisplayOrder,
                    banner.IsActive,
                    banner.OrgId,
                    banner.CreatedAt
                );

                return CreatedAtAction(nameof(GetBanner), new { id = banner.Id },
                    new ApiResponse<BannerResponseDto>(
                        true,
                        responseData,
                        "Banner created successfully"
                    ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while creating the banner",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Update a banner
        /// </summary>
        [Authorize(Roles = "SysAdmin,OrgAdmin")]
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(ApiResponse<BannerResponseDto>), 200)]
        public async Task<IActionResult> UpdateBanner(Guid id, [FromBody] UpdateBannerRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new ApiResponse(false, "Invalid request data"));

                var banner = await _bannerRepository.GetByIdAsync(id);
                if (banner == null)
                    return NotFound(new ApiResponse(false, "Banner not found"));

                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                var orgId = HttpContext.Items["org_id"]?.ToString();

                // OrgAdmin can only update their org's banners
                if (userRole == "OrgAdmin" && (banner.OrgId == null || banner.OrgId.ToString() != orgId))
                    return Forbid();

                if (!string.IsNullOrEmpty(request.ImageUrl))
                    banner.ImageUrl = request.ImageUrl;

                if (!string.IsNullOrEmpty(request.Title))
                    banner.Title = request.Title;

                if (!string.IsNullOrEmpty(request.Description))
                    banner.Description = request.Description;

                if (request.DisplayOrder.HasValue)
                    banner.DisplayOrder = request.DisplayOrder.Value;

                if (request.IsActive.HasValue)
                    banner.IsActive = request.IsActive.Value;

                banner.UpdatedAt = DateTime.UtcNow;

                await _bannerRepository.UpdateAsync(banner);

                var responseData = new BannerResponseDto(
                    banner.Id,
                    banner.ImageUrl,
                    banner.Title,
                    banner.Description,
                    banner.DisplayOrder,
                    banner.IsActive,
                    banner.OrgId,
                    banner.CreatedAt
                );

                return Ok(new ApiResponse<BannerResponseDto>(
                    true,
                    responseData,
                    "Banner updated successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while updating the banner",
                    new List<string> { ex.Message }
                ));
            }
        }

        /// <summary>
        /// Delete a banner (SysAdmin only for system banners, OrgAdmin for org banners)
        /// </summary>
        [Authorize(Roles = "SysAdmin,OrgAdmin")]
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(ApiResponse), 200)]
        public async Task<IActionResult> DeleteBanner(Guid id)
        {
            try
            {
                var banner = await _bannerRepository.GetByIdAsync(id);
                if (banner == null)
                    return NotFound(new ApiResponse(false, "Banner not found"));

                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                var orgId = HttpContext.Items["org_id"]?.ToString();

                // Only SysAdmin can delete system banners
                if (banner.OrgId == null && userRole != "SysAdmin")
                    return Forbid();

                // OrgAdmin can only delete their org's banners
                if (banner.OrgId != null && userRole == "OrgAdmin" && banner.OrgId.ToString() != orgId)
                    return Forbid();

                await _bannerRepository.DeleteAsync(id);

                return Ok(new ApiResponse(
                    true,
                    "Banner deleted successfully"
                ));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse(
                    false,
                    "An error occurred while deleting the banner",
                    new List<string> { ex.Message }
                ));
            }
        }
    }
}

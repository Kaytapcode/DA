using System;
using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateBannerRequestDto(
        [Required(ErrorMessage = "Image URL is required")]
        [Url(ErrorMessage = "Image URL must be a valid URL")]
        string ImageUrl,

        [StringLength(500, ErrorMessage = "Title cannot exceed 500 characters")]
        string? Title,

        [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
        string? Description,

        [Range(1, 1000, ErrorMessage = "Display order must be between 1 and 1000")]
        int DisplayOrder = 1,

        bool IsActive = true,

        Guid? OrgId = null  // null = system banner, not null = org-specific banner
    );

    public record UpdateBannerRequestDto(
        [Required(ErrorMessage = "Banner ID is required")]
        Guid Id,

        [Url(ErrorMessage = "Image URL must be a valid URL")]
        string? ImageUrl,

        [StringLength(500, ErrorMessage = "Title cannot exceed 500 characters")]
        string? Title,

        [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
        string? Description,

        [Range(1, 1000, ErrorMessage = "Display order must be between 1 and 1000")]
        int? DisplayOrder,

        bool? IsActive
    );
}

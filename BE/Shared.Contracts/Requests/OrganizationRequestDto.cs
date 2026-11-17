using System;
using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateOrganizationRequestDto(
        [Required(ErrorMessage = "Organization name is required")]
        [StringLength(200, MinimumLength = 2, ErrorMessage = "Organization name must be between 2 and 200 characters")]
        string Name,

        [StringLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
        string? Address,

        [Required(ErrorMessage = "Slug is required for URL path")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Slug must be between 1 and 50 characters")]
        [RegularExpression(@"^[a-z0-9\-]+$", ErrorMessage = "Slug must contain only lowercase letters, numbers, and hyphens")]
        string Slug
    );

    public record UpdateOrganizationRequestDto(
        [Required(ErrorMessage = "Organization name is required")]
        [StringLength(200, MinimumLength = 2, ErrorMessage = "Organization name must be between 2 and 200 characters")]
        string Name,

        [StringLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
        string? Address,

        [StringLength(50, MinimumLength = 1, ErrorMessage = "Slug must be between 1 and 50 characters")]
        [RegularExpression(@"^[a-z0-9\-]+$", ErrorMessage = "Slug must contain only lowercase letters, numbers, and hyphens")]
        string? Slug
    );
}

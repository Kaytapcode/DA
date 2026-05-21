using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record OrgAdminRegisterRequestDto(
        [Required]
        [StringLength(50, MinimumLength = 3)]
        string Username,

        [Required]
        [EmailAddress]
        string Email,

        [Required]
        [StringLength(100, MinimumLength = 8)]
        string Password,

        [Required]
        [StringLength(100, MinimumLength = 1)]
        string OrganizationName,

        [Required]
        [RegularExpression(@"^[a-z0-9\-]+$", ErrorMessage = "Slug must contain only lowercase letters, numbers, and hyphens")]
        [StringLength(50, MinimumLength = 1)]
        string OrganizationSlug
    );
}

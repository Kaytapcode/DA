using System;
using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateMemberRequestDto(
        [Required(ErrorMessage = "Organization ID is required")]
        Guid OrgId,

        [Required(ErrorMessage = "User ID is required")]
        Guid UserId,

        [Required(ErrorMessage = "Role is required")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Role must be between 1 and 50 characters")]
        string Role  // 'Student', 'Teacher', 'Owner', 'Admin'
    );

    public record UpdateMemberRequestDto(
        [Required(ErrorMessage = "Member entry ID is required")]
        Guid Id,

        [Required(ErrorMessage = "Role is required")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Role must be between 1 and 50 characters")]
        string Role
    );
}

using System;
using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateMemberRequestDto(
        [Required(ErrorMessage = "User ID is required")]
        Guid UserId,

        [Required(ErrorMessage = "Role is required")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Role must be between 1 and 50 characters")]
        string Role  // Member | OrgAdmin
    );

    public record UpdateMemberRequestDto(
        [Required(ErrorMessage = "Role is required")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Role must be between 1 and 50 characters")]
        string Role
    );
}

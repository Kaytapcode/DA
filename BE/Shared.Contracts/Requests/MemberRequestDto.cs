using System;
using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateMemberRequestDto(
        // OrgId is taken from the route (/api/orgs/{orgId}/members), not the body. It is kept
        // here for callers that pass it but must NOT be [Required] — the FE add-member form
        // sends only { userId, role }, and requiring it here produced a spurious 400.
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

using System;
using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateCourseEnrollmentRequestDto(
        [Required(ErrorMessage = "User ID is required")]
        Guid UserId,

        [Required(ErrorMessage = "Role is required")]
        [RegularExpression("^(Teacher|Student)$", ErrorMessage = "Role must be Teacher or Student")]
        string Role
    );

    public record UpdateCourseEnrollmentRequestDto(
        [Required(ErrorMessage = "Role is required")]
        [RegularExpression("^(Teacher|Student)$", ErrorMessage = "Role must be Teacher or Student")]
        string Role
    );

    // Body for approving a pending enrollment request. Role is OPTIONAL: when omitted the
    // existing role (Student by default for self-requests) is kept; when present it promotes
    // the member to Teacher/Student at approval time. No [Required] so an empty {} body is valid.
    public record ApproveEnrollmentRequestDto(
        [RegularExpression("^(Teacher|Student)$", ErrorMessage = "Role must be Teacher or Student")]
        string? Role = null
    );
}

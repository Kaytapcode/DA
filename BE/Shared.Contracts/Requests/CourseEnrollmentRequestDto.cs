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
}

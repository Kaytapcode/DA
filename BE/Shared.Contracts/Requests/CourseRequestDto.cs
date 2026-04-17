using System;
using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateCourseRequestDto(
        [Required(ErrorMessage = "Organization ID is required")]
        Guid OrgId,

        [Required(ErrorMessage = "Course title is required")]
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Course title must be between 1 and 200 characters")]
        string Title,

        [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
        string? Description,

        [StringLength(500, ErrorMessage = "Course code cannot exceed 500 characters")]
        string? CourseCode
    );

    public record UpdateCourseRequestDto(
        [Required(ErrorMessage = "Course ID is required")]
        Guid Id,

        [Required(ErrorMessage = "Course title is required")]
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Course title must be between 1 and 200 characters")]
        string Title,

        [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
        string? Description,

        [StringLength(500, ErrorMessage = "Course code cannot exceed 500 characters")]
        string? CourseCode
    );
}

using System;

namespace Shared.Contracts.Responses
{
    public record CourseResponseDto(
        Guid Id,
        Guid OrgId,
        string Title,
        string? Description,
        string? CourseCode,
        Guid CreatedBy,
        DateTime CreatedAt
    );

    public record CourseListResponseDto(
        Guid Id,
        string Title,
        string? Description,
        string? CourseCode,
        DateTime CreatedAt,
        int ModuleCount = 0
    );

    /// <summary>A course the current user is enrolled in, plus their per-course role
    /// ('Teacher' | 'Student') and enrollment status. Powers the user's "My Courses" page.</summary>
    public record EnrolledCourseDto(
        Guid Id,
        string Title,
        string? Description,
        string? CourseCode,
        string Role,
        string Status,
        Guid OrgId
    );
}

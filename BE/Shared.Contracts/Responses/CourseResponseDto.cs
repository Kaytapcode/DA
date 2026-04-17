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
}

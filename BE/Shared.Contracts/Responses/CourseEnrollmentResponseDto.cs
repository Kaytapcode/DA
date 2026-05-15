using System;

namespace Shared.Contracts.Responses
{
    public record CourseEnrollmentResponseDto(
        Guid Id,
        Guid CourseId,
        Guid UserId,
        string Role,
        DateTime EnrolledAt
    );
}

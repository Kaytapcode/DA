using System;

namespace Shared.Contracts.Responses
{
    public record CourseEnrollmentResponseDto(
        Guid Id,
        Guid CourseId,
        Guid UserId,
        string Role,
        DateTime EnrolledAt,
        // 'Pending' | 'Approved' | 'Rejected'. Self-service requests start 'Pending';
        // OrgAdmin-created enrollments are 'Approved'. Only 'Approved' grants course access.
        string Status = "Approved",
        // Display name resolved from Identity.Api (so the roster shows a username, not a raw GUID).
        // Best-effort: null when the lookup is unavailable.
        string? Username = null
    );
}

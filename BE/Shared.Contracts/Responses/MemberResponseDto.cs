using System;

namespace Shared.Contracts.Responses
{
    public record MemberResponseDto(
        Guid UserId,
        Guid OrgId,
        string Role,
        DateTime JoinDate
    );

    public record MemberListResponseDto(
        Guid UserId,
        string Username,
        string Email,
        string Role,
        DateTime JoinDate,
        // 'Pending' | 'Approved' | 'Rejected' — Pending rows are join requests awaiting OrgAdmin approval.
        string Status = "Approved"
    );
}

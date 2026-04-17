using System;

namespace Shared.Contracts.Responses
{
    public record OrganizationResponseDto(
        Guid Id,
        string Name,
        string? Address,
        string Slug,
        Guid OwnerId,
        DateTime CreatedAt,
        int MemberCount = 0
    );

    public record OrganizationListResponseDto(
        Guid Id,
        string Name,
        string Slug,
        int MemberCount,
        DateTime CreatedAt
    );
}

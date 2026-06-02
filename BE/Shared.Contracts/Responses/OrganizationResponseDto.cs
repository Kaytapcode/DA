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

    /// <summary>An organization the current user belongs to, plus their org-level role
    /// ('Member' | 'OrgAdmin' | 'Owner'). Used by the user's Browse Courses org picker.</summary>
    public record MyOrganizationDto(
        Guid Id,
        string Name,
        string Slug,
        string Role
    );
}

using System;

namespace Shared.Contracts.Responses
{
    public record BannerResponseDto(
        Guid Id,
        string ImageUrl,
        string? Title,
        string? Description,
        int DisplayOrder,
        bool IsActive,
        Guid? OrgId,  // null = system banner
        DateTime CreatedAt
    );

    public record BannerListResponseDto(
        Guid Id,
        string ImageUrl,
        string? Title,
        int DisplayOrder,
        bool IsActive,
        bool IsSystemBanner,
        DateTime CreatedAt
    );
}

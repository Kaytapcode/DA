using System;

namespace Shared.Contracts.Responses
{
    public record AiKeyResponseDto(
        Guid Id,
        string Provider,
        string? Label,
        string? KeyLastFour,
        bool IsActive,
        DateTime CreatedAt,
        DateTime? UpdatedAt
    );
}

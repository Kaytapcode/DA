namespace Shared.Contracts.Responses
{
    public record ModuleResponseDto(
        Guid Id,
        Guid OrgId,
        string Title,
        string? Description,
        int OrderIndex,
        DateTime CreatedAt,
        List<ContentResponseDto>? Contents = null
    );

    public record ContentResponseDto(
        Guid Id,
        string Title,
        string ContentType,
        string Status,
        int OrderIndex,
        DateTime CreatedAt
    );
}

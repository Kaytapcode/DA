using System.ComponentModel.DataAnnotations;

namespace Shared.Contracts.Requests
{
    public record CreateModuleRequestDto(
        [StringLength(255)] string? Title,
        [StringLength(2000)] string? Description
    );

    public record UpdateModuleRequestDto(
        [StringLength(255)] string? Title,
        [StringLength(2000)] string? Description
    );

    public record ReorderModuleRequestDto(
        [Required] int NewIndex
    );

    public record CreateContentRequestDto(
        [Required][StringLength(200, MinimumLength = 1)] string Title,
        [Required] string ContentType  // VIDEO | PDF | QUIZ | FLASHCARD
    );

    public record UpdateContentRequestDto(
        [Required][StringLength(200, MinimumLength = 1)] string Title
    );

    public record ReorderContentRequestDto(
        [Required] int NewIndex
    );

    public record SetContentStatusRequestDto(
        [Required] string Status  // DRAFT | PUBLISHED
    );

    public record LinkContentRequestDto(
        [Required] Guid ContentId
    );
}

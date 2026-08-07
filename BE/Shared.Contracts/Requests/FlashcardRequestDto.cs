namespace Shared.Contracts.Requests
{
    public record CreateFlashcardRequestDto(
        string FrontText,
        string BackText,
        int OrderIndex = 0
    );

    public record UpdateFlashcardRequestDto(
        string FrontText,
        string BackText
    );

    public record CreateDeckRequestDto(
        string Title,
        string? Theme
    );

    public record UpdateDeckRequestDto(
        string? Title,
        string? Theme
    );
}

using System;

namespace Shared.Contracts.Responses
{
    public record FlashcardDto(
        Guid Id,
        Guid DeckId,
        string FrontText,
        string BackText,
        bool IsMastered,
        DateTime? MasteredAt,
        int OrderIndex,
        DateTime CreatedAt
    );

    public record FlashcardDeckDto(
        Guid Id,
        Guid ContentId,
        string Theme,
        int CardCount,
        int MasteredCount,
        DateTime CreatedAt
    );
}

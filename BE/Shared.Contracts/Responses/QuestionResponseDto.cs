using System;
using System.Collections.Generic;

namespace Shared.Contracts.Responses
{
    public record QuestionOptionDto(
        Guid Id,
        string OptionText,
        int OrderIndex
    );

    public record QuestionDto(
        Guid Id,
        Guid QuizId,
        string QuestionText,
        string? Explanation,
        int OrderIndex,
        List<QuestionOptionDto> Options
    );

    // Used when teacher views/edits questions (includes IsCorrect)
    public record QuestionTeacherDto(
        Guid Id,
        Guid QuizId,
        string QuestionText,
        string? Explanation,
        int OrderIndex,
        List<QuestionOptionTeacherDto> Options
    );

    public record QuestionOptionTeacherDto(
        Guid Id,
        string OptionText,
        bool IsCorrect,
        int OrderIndex
    );

    // Quiz submission result per question
    public record QuestionResultDto(
        Guid QuestionId,
        bool IsCorrect,
        Guid SelectedOptionId,
        Guid CorrectOptionId,
        string? Explanation
    );

    public record QuizSummaryDto(
        Guid QuizId,
        Guid ContentId,
        string Title,
        string Status,
        DateTime CreatedAt
    );
}

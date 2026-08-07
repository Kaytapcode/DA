using System;
using System.Collections.Generic;

namespace Shared.Contracts.Requests
{
    public record CreateQuestionRequestDto(
        string QuestionText,
        string? Explanation,
        List<CreateQuestionOptionDto> Options,
        int OrderIndex = 0
    );

    public record CreateQuestionOptionDto(
        string OptionText,
        bool IsCorrect,
        int OrderIndex = 0
    );

    public record UpdateQuestionRequestDto(
        string QuestionText,
        string? Explanation,
        List<CreateQuestionOptionDto> Options
    );

    public record ReorderQuestionRequestDto(int NewOrderIndex);

    public record QuizSubmitRequestDto(
        List<QuizAnswerDto> Answers,
        int? TimeTakenSeconds
    );

    public record QuizAnswerDto(
        Guid QuestionId,
        Guid SelectedOptionId
    );

    // For importing AI-generated questions
    public record GeneratedQuestionDto(
        string Question,
        List<string> Options,
        int CorrectIndex,
        string Explanation
    );

    public record ImportAiQuestionsRequestDto(
        List<GeneratedQuestionDto> Questions
    );

    public record CreateQuizRequestDto(
        string Title,
        int? TimeLimit,
        int? PassingScore
    );

    public record UpdateQuizRequestDto(
        string? Title,
        int? TimeLimit,
        int? PassingScore
    );
}

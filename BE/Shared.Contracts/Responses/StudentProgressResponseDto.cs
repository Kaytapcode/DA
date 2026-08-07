using System;
using System.Collections.Generic;

namespace Shared.Contracts.Responses
{
    public record StudentProgressDto(
        Guid Id,
        Guid? CourseId,
        Guid UserId,
        Guid? ModuleId,
        Guid? ContentId,
        int ProgressPercentage,
        bool IsCompleted,
        DateTime? CompletedAt,
        int TimeSpentSeconds,
        DateTime UpdatedAt
    );

    public record CourseProgressSummaryDto(
        Guid CourseId,
        Guid UserId,
        int OverallProgressPercentage,
        int CompletedItems,
        int TotalItems,
        DateTime? LastActiveAt
    );

    public record CourseAnalyticsDto(
        Guid CourseId,
        int TotalStudents,
        double AverageProgress,
        int StudentsCompleted,
        List<StudentProgressSummaryDto> StudentProgress
    );

    public record StudentProgressSummaryDto(
        Guid UserId,
        string Username,
        int ProgressPercentage,
        DateTime? LastActive
    );

    public record QuizAttemptDto(
        Guid Id,
        Guid QuizId,
        Guid UserId,
        int? ScorePercentage,
        int? TimeTakenSeconds,
        DateTime CreatedAt
    );

    public record QuizSubmitResultDto(
        Guid QuizId,
        int ScorePercentage,
        int CorrectCount,
        int TotalCount,
        List<QuestionResultDto> Results
    );
}

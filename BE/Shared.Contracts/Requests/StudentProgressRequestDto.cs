using System;

namespace Shared.Contracts.Requests
{
    public record RecordProgressRequestDto(
        Guid ContentId,
        Guid? ModuleId,
        bool IsCompleted,
        int TimeSpentSeconds
    );

    public record RecordActivityRequestDto(
        Guid ContentId,
        bool IsCompleted,
        int ProgressPercentage,
        int TimeSpentSeconds
    );
}

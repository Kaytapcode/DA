using System;

namespace Shared.Contracts.Requests
{
    public record RecordProgressRequestDto(
        Guid ContentId,
        Guid? ModuleId,
        bool IsCompleted,
        int TimeSpentSeconds
    );
}

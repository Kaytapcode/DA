using System;

namespace Shared.Contracts.Responses
{
    public record DocumentDto(
        Guid Id,
        Guid? ContentId,
        Guid? CreatedByUserId,
        string FileName,
        string FilePath,
        long FileSize,
        string FileType,
        bool IsPublic,
        DateTime CreatedAt
    );
}

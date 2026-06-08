using Microsoft.AspNetCore.Http;

namespace Content.Api.Services
{
    public interface IStorageService
    {
        Task<(string filePath, long fileSize)> SaveAsync(IFormFile file, Guid userId, CancellationToken ct = default);

        // Copy an existing stored file into `userId`'s own storage, returning a fresh independent
        // path. Used when cloning a document so the copy never shares bytes with the original
        // (spec §1: "editing the copy never mutates the original"; deleting one must not break the other).
        Task<(string filePath, long fileSize)> CopyAsync(string sourceFilePath, Guid userId, string fileName, CancellationToken ct = default);

        void Delete(string filePath);
        FileStream GetStream(string filePath);
    }
}

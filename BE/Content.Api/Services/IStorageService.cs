using Microsoft.AspNetCore.Http;

namespace Content.Api.Services
{
    public interface IStorageService
    {
        Task<(string filePath, long fileSize)> SaveAsync(IFormFile file, Guid userId, CancellationToken ct = default);
        void Delete(string filePath);
        FileStream GetStream(string filePath);
    }
}

using Microsoft.AspNetCore.Http;

namespace Content.Api.Services
{
    public class LocalStorageService : IStorageService
    {
        private readonly string _basePath;

        public LocalStorageService(IConfiguration config)
        {
            _basePath = config["Storage:LocalPath"] ?? "./uploads/documents";
        }

        public async Task<(string filePath, long fileSize)> SaveAsync(IFormFile file, Guid userId, CancellationToken ct = default)
        {
            var userDir = Path.Combine(_basePath, userId.ToString());
            Directory.CreateDirectory(userDir);

            var uniqueName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var fullPath = Path.Combine(userDir, uniqueName);

            await using var stream = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
            await file.CopyToAsync(stream, ct);

            return (fullPath, file.Length);
        }

        public async Task<(string filePath, long fileSize)> CopyAsync(string sourceFilePath, Guid userId, string fileName, CancellationToken ct = default)
        {
            if (!File.Exists(sourceFilePath))
                throw new FileNotFoundException("Source document file not found.", sourceFilePath);

            var userDir = Path.Combine(_basePath, userId.ToString());
            Directory.CreateDirectory(userDir);

            var uniqueName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
            var fullPath = Path.Combine(userDir, uniqueName);

            await using (var src = new FileStream(sourceFilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
            await using (var dst = new FileStream(fullPath, FileMode.Create, FileAccess.Write))
            {
                await src.CopyToAsync(dst, ct);
            }

            return (fullPath, new FileInfo(fullPath).Length);
        }

        public void Delete(string filePath)
        {
            if (File.Exists(filePath))
                File.Delete(filePath);
        }

        public FileStream GetStream(string filePath)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("Document file not found.", filePath);

            return new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        }
    }
}

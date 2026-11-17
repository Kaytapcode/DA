using Microsoft.AspNetCore.Http;

namespace Content.Api.Services
{
    // D7/Q9: files live under an absolute storage root (`Storage:LocalPath`, a persistent volume in
    // deploy; a relative value is resolved against the content root). The DB stores paths RELATIVE
    // to that root ("<userId>/<file>"), so moving the root or the cwd never breaks existing rows.
    public class LocalStorageService : IStorageService
    {
        private const string LegacyMarker = "uploads/documents/";
        private readonly string _root;

        public LocalStorageService(IConfiguration config, IHostEnvironment env)
        {
            _root = Path.GetFullPath(config["Storage:LocalPath"]!, env.ContentRootPath);
        }

        // Stored path -> absolute path. New rows are root-relative. Legacy rows hold the old
        // cwd-relative "./uploads/documents/<user>/<file>" (or an absolute path): try the root first,
        // then the legacy location.
        private string Resolve(string stored)
        {
            if (Path.IsPathRooted(stored)) return stored;
            var underRoot = Path.GetFullPath(stored, _root);
            if (File.Exists(underRoot)) return underRoot;

            var norm = stored.Replace('\\', '/');
            var idx = norm.IndexOf(LegacyMarker, StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                var migrated = Path.GetFullPath(norm[(idx + LegacyMarker.Length)..], _root);
                if (File.Exists(migrated)) return migrated;
            }
            return Path.GetFullPath(stored); // legacy: relative to the process cwd
        }

        private async Task<(string filePath, long fileSize)> WriteAsync(Stream source, Guid userId, string fileName, CancellationToken ct)
        {
            var relative = $"{userId}/{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
            var fullPath = Path.GetFullPath(relative, _root);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

            await using (var dst = new FileStream(fullPath, FileMode.Create, FileAccess.Write))
                await source.CopyToAsync(dst, ct);

            return (relative, new FileInfo(fullPath).Length);
        }

        public async Task<(string filePath, long fileSize)> SaveAsync(IFormFile file, Guid userId, CancellationToken ct = default)
        {
            await using var src = file.OpenReadStream();
            return await WriteAsync(src, userId, file.FileName, ct);
        }

        public async Task<(string filePath, long fileSize)> CopyAsync(string sourceFilePath, Guid userId, string fileName, CancellationToken ct = default)
        {
            var source = Resolve(sourceFilePath);
            if (!File.Exists(source))
                throw new FileNotFoundException("Source document file not found.", sourceFilePath);

            await using var src = new FileStream(source, FileMode.Open, FileAccess.Read, FileShare.Read);
            return await WriteAsync(src, userId, fileName, ct);
        }

        public void Delete(string filePath)
        {
            var full = Resolve(filePath);
            if (File.Exists(full))
                File.Delete(full);
        }

        public FileStream GetStream(string filePath)
        {
            var full = Resolve(filePath);
            if (!File.Exists(full))
                throw new FileNotFoundException("Document file not found.", filePath);

            return new FileStream(full, FileMode.Open, FileAccess.Read, FileShare.Read);
        }
    }
}

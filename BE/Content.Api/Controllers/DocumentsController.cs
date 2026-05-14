using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/documents")]
    [Authorize]
    public class DocumentsController : ControllerBase
    {
        private readonly IDocumentRepository _repo;
        private readonly IStorageService _storage;
        private readonly IOrgContextService _orgCtx;
        private readonly IConfiguration _config;

        private static readonly Dictionary<string, string> MimeToFileType = new()
        {
            ["application/pdf"] = "PDF",
            ["image/png"] = "PNG",
            ["image/jpeg"] = "JPEG",
            ["text/plain"] = "TXT"
        };

        public DocumentsController(
            IDocumentRepository repo,
            IStorageService storage,
            IOrgContextService orgCtx,
            IConfiguration config)
        {
            _repo = repo;
            _storage = storage;
            _orgCtx = orgCtx;
            _config = config;
        }

        private static DocumentDto ToDto(DocumentModel d) => new(
            d.Id, d.ContentId, d.CreatedByUserId,
            d.FileName, d.FilePath, d.FileSize, d.FileType,
            d.IsPublic, d.CreatedAt
        );

        // POST /api/documents
        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadDocument(
            IFormFile file,
            [FromForm] bool isPublic = false,
            CancellationToken ct = default)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponse(false, "No file provided."));

            // Validate MIME type
            var allowedTypes = _config.GetSection("Storage:AllowedTypes").Get<string[]>()
                ?? ["application/pdf", "image/png", "image/jpeg", "text/plain"];

            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest(new ApiResponse(false,
                    $"File type '{file.ContentType}' is not allowed. Allowed: {string.Join(", ", allowedTypes)}"));

            // Validate file size
            var maxSize = _config.GetValue<long>("Storage:MaxFileSizeBytes", 52428800);
            if (file.Length > maxSize)
                return BadRequest(new ApiResponse(false,
                    $"File size exceeds the maximum allowed size of {maxSize / 1024 / 1024} MB."));

            // Save file to storage
            var (filePath, fileSize) = await _storage.SaveAsync(file, userId.Value, ct);

            MimeToFileType.TryGetValue(file.ContentType, out var fileType);

            var doc = new DocumentModel
            {
                CreatedByUserId = userId.Value,
                FileName = file.FileName,
                FilePath = filePath,
                FileSize = fileSize,
                FileType = fileType ?? "PDF",
                IsPublic = isPublic
            };

            var created = await _repo.CreateAsync(doc, ct);
            return Ok(new ApiResponse<DocumentDto>(true, ToDto(created), "Document uploaded."));
        }

        // GET /api/documents
        [HttpGet]
        public async Task<IActionResult> GetDocuments(CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var docs = await _repo.GetByUserIdAsync(userId.Value, ct);
            return Ok(new ApiResponse<IEnumerable<DocumentDto>>(true, docs.Select(ToDto), null));
        }

        // GET /api/documents/{docId}
        [HttpGet("{docId:guid}")]
        public async Task<IActionResult> DownloadDocument(Guid docId, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var doc = await _repo.GetByIdAsync(docId, ct);
            if (doc == null)
                return NotFound(new ApiResponse(false, "Document not found."));

            // Access check: owner, public document, or SysAdmin
            if (doc.CreatedByUserId != userId && !doc.IsPublic && !_orgCtx.IsSysAdmin())
                return Forbid();

            FileStream stream;
            try
            {
                stream = _storage.GetStream(doc.FilePath);
            }
            catch (FileNotFoundException)
            {
                return NotFound(new ApiResponse(false, "Document file not found on server."));
            }

            var contentType = MimeToFileType
                .FirstOrDefault(kvp => kvp.Value == doc.FileType).Key
                ?? "application/octet-stream";

            return File(stream, contentType, doc.FileName);
        }

        // DELETE /api/documents/{docId}
        [HttpDelete("{docId:guid}")]
        public async Task<IActionResult> DeleteDocument(Guid docId, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var doc = await _repo.GetByIdAsync(docId, ct);
            if (doc == null)
                return NotFound(new ApiResponse(false, "Document not found."));

            // Only owner or SysAdmin can delete
            if (doc.CreatedByUserId != userId && !_orgCtx.IsSysAdmin())
                return Forbid();

            // Soft delete DB record; also remove physical file
            await _repo.SoftDeleteAsync(docId, ct);
            _storage.Delete(doc.FilePath);

            return Ok(new ApiResponse(true, "Document deleted."));
        }
    }
}

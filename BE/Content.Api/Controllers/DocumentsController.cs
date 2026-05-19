using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Shared.Contracts.Requests;
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
        private readonly ContentDbContext _db;

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
            IConfiguration config,
            ContentDbContext db)
        {
            _repo = repo;
            _storage = storage;
            _orgCtx = orgCtx;
            _config = config;
            _db = db;
        }

        private static DocumentDto ToDto(DocumentModel d) => new(
            d.Id, d.ContentId, d.CreatedByUserId,
            d.FileName, d.FilePath, d.FileSize, d.FileType,
            d.IsPublic, d.CreatedAt
        );

        // POST /api/documents
        // Spec §1: User-created (personal) resources MUST be public. The isPublic form field is
        // accepted for backwards compatibility but ignored when the document is a standalone
        // user upload (no ContentId / not course-bound).
        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadDocument(
            IFormFile file,
            [FromForm] bool isPublic = true,
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

            // Create a ContentModel so this document appears in learning history tracking.
            // The ContentModel and DocumentModel are saved atomically via the shared DbContext.
            var content = new ContentModel
            {
                Id = Guid.NewGuid(),
                Title = file.FileName,
                ContentType = "PDF",
                Status = "PUBLISHED",
                CreatedByUserId = userId.Value,
                IsPublic = true,
                CreatedAt = DateTime.UtcNow,
            };
            _db.Contents.Add(content);

            var doc = new DocumentModel
            {
                CreatedByUserId = userId.Value,
                ContentId = content.Id,
                FileName = file.FileName,
                FilePath = filePath,
                FileSize = fileSize,
                FileType = fileType ?? "PDF",
                IsPublic = true
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

            // Back-fill: documents uploaded before the ContentModel requirement was added
            // have ContentId == null. Create ContentModels for them now so activity tracking works.
            var unlinked = docs.Where(d => d.ContentId == null).ToList();
            if (unlinked.Count > 0)
            {
                foreach (var doc in unlinked)
                {
                    var content = new ContentModel
                    {
                        Id = Guid.NewGuid(),
                        Title = doc.FileName,
                        ContentType = doc.FileType,
                        Status = "PUBLISHED",
                        CreatedByUserId = userId.Value,
                        IsPublic = true,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _db.Contents.Add(content);
                    doc.ContentId = content.Id;
                }
                await _db.SaveChangesAsync(ct);
            }

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

            // Return inline so the FE viewer can embed the file (PDF in iframe, image in <img>,
            // etc.) without the browser forcing a download. Passing a filename to File() emits
            // Content-Disposition: attachment, which we explicitly do NOT want here.
            Response.Headers.ContentDisposition = $"inline; filename=\"{Uri.EscapeDataString(doc.FileName)}\"";
            return File(stream, contentType);
        }

        // PATCH /api/documents/{docId} — rename a document. Owner or SysAdmin only.
        // Updates DocumentModel.FileName and the linked ContentModel.Title so the rename
        // is reflected in learning history and any future doc-list views.
        [HttpPatch("{docId:guid}")]
        public async Task<IActionResult> RenameDocument(Guid docId, [FromBody] UpdateDocumentRequestDto request, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            if (string.IsNullOrWhiteSpace(request.FileName))
                return BadRequest(new ApiResponse(false, "FileName is required."));

            var doc = await _repo.GetByIdAsync(docId, ct);
            if (doc == null)
                return NotFound(new ApiResponse(false, "Document not found."));

            if (doc.CreatedByUserId != userId && !_orgCtx.IsSysAdmin())
                return StatusCode(403, new ApiResponse(false, "Only the document owner may rename it."));

            // Preserve the original extension when renaming so the viewer/MIME mapping still works.
            var newName = request.FileName.Trim();
            var oldExt = System.IO.Path.GetExtension(doc.FileName);
            if (!string.IsNullOrEmpty(oldExt) && !newName.EndsWith(oldExt, StringComparison.OrdinalIgnoreCase))
                newName = System.IO.Path.GetFileNameWithoutExtension(newName) + oldExt;

            doc.FileName = newName;

            if (doc.ContentId.HasValue)
            {
                var content = await _db.Contents.FirstOrDefaultAsync(c => c.Id == doc.ContentId.Value, ct);
                if (content != null) content.Title = newName;
            }

            await _db.SaveChangesAsync(ct);
            return Ok(new ApiResponse<DocumentDto>(true, ToDto(doc), "Document renamed."));
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

            // Cascade: remove the ContentModel so learning-history tracking is cleaned up.
            // DocumentModel.ContentId uses OnDelete(SetNull), so the document row remains
            // (already soft-deleted) with ContentId = null after the Content row is removed.
            if (doc.ContentId.HasValue)
            {
                var content = await _db.Contents.FindAsync(new object[] { doc.ContentId.Value }, ct);
                if (content != null)
                {
                    _db.Contents.Remove(content);
                    await _db.SaveChangesAsync(ct);
                }
            }

            return Ok(new ApiResponse(true, "Document deleted."));
        }
    }
}

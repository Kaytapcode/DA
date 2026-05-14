using Content.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Content.Api.Data
{
    public interface IDocumentRepository
    {
        Task<List<DocumentModel>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
        Task<DocumentModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<DocumentModel> CreateAsync(DocumentModel doc, CancellationToken ct = default);
        Task SoftDeleteAsync(Guid id, CancellationToken ct = default);
    }

    public class DocumentRepository : IDocumentRepository
    {
        private readonly ContentDbContext _db;

        public DocumentRepository(ContentDbContext db) => _db = db;

        public async Task<List<DocumentModel>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
            => await _db.Documents
                .Where(d => d.CreatedByUserId == userId && d.DeletedAt == null)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync(ct);

        public async Task<DocumentModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => await _db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.DeletedAt == null, ct);

        public async Task<DocumentModel> CreateAsync(DocumentModel doc, CancellationToken ct = default)
        {
            doc.Id = Guid.NewGuid();
            doc.CreatedAt = DateTime.UtcNow;
            _db.Documents.Add(doc);
            await _db.SaveChangesAsync(ct);
            return doc;
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken ct = default)
        {
            var doc = await _db.Documents.FindAsync(new object[] { id }, cancellationToken: ct)
                ?? throw new KeyNotFoundException($"Document {id} not found.");
            doc.DeletedAt = DateTime.UtcNow;
            doc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
    }
}

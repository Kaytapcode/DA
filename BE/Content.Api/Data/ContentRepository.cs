using Content.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Content.Api.Data
{
    public interface IContentRepository
    {
        Task<ContentModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<List<ContentModel>> GetByModuleAsync(Guid moduleId, CancellationToken ct = default);
        Task<ContentModel> CreateAsync(ContentModel content, Guid moduleId, CancellationToken ct = default);
        Task<ContentModel> UpdateAsync(ContentModel content, CancellationToken ct = default);
        Task DeleteAsync(Guid id, Guid moduleId, CancellationToken ct = default);
        Task SetStatusAsync(Guid id, string status, CancellationToken ct = default); // T3.6
        Task ReorderAsync(Guid moduleId, Guid contentId, int newIndex, CancellationToken ct = default); // T3.7
        // Link an existing ContentModel to a module (no new ContentModel is created)
        Task<ContentModel?> LinkExistingAsync(Guid contentId, Guid moduleId, CancellationToken ct = default);
    }

    public class ContentRepository : IContentRepository
    {
        private readonly ContentDbContext _context;

        public ContentRepository(ContentDbContext context) => _context = context;

        public async Task<ContentModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => await _context.Contents
                .Include(c => c.Video)
                .Include(c => c.Document)
                .Include(c => c.Quiz).ThenInclude(q => q!.Questions).ThenInclude(q => q.Options)
                .Include(c => c.FlashcardDeck).ThenInclude(d => d!.Flashcards)
                .FirstOrDefaultAsync(c => c.Id == id, ct);

        public async Task<List<ContentModel>> GetByModuleAsync(Guid moduleId, CancellationToken ct = default)
            => await _context.ModuleContents
                .Where(mc => mc.ModuleId == moduleId)
                .OrderBy(mc => mc.OrderIndex)
                .Include(mc => mc.Content).ThenInclude(c => c!.Quiz)
                .Include(mc => mc.Content).ThenInclude(c => c!.FlashcardDeck)
                .Include(mc => mc.Content).ThenInclude(c => c!.Document)
                .Include(mc => mc.Content).ThenInclude(c => c!.Video)
                .Select(mc => mc.Content!)
                .ToListAsync(ct);

        public async Task<ContentModel> CreateAsync(ContentModel content, Guid moduleId, CancellationToken ct = default)
        {
            content.Id = Guid.NewGuid();
            content.CreatedAt = DateTime.UtcNow;
            content.Status = "DRAFT";
            _context.Contents.Add(content);

            var maxOrder = await _context.ModuleContents
                .Where(mc => mc.ModuleId == moduleId)
                .Select(mc => (int?)mc.OrderIndex).MaxAsync(ct) ?? -1;

            _context.ModuleContents.Add(new ModuleContentModel
            {
                Id = Guid.NewGuid(),
                ModuleId = moduleId,
                ContentId = content.Id,
                OrderIndex = maxOrder + 1
            });

            switch (content.ContentType.ToUpperInvariant())
            {
                case "QUIZ":
                    _context.Quizzes.Add(new QuizModel
                    {
                        Id = Guid.NewGuid(),
                        ContentId = content.Id,
                        TimeLimit = null,
                        PassingScore = 70,
                        CreatedAt = DateTime.UtcNow
                    });
                    break;
                case "FLASHCARD":
                    _context.FlashcardDecks.Add(new FlashcardDeckModel
                    {
                        Id = Guid.NewGuid(),
                        ContentId = content.Id,
                        Theme = "Default",
                        CreatedAt = DateTime.UtcNow
                    });
                    break;
            }

            await _context.SaveChangesAsync(ct);
            return content;
        }

        public async Task<ContentModel> UpdateAsync(ContentModel content, CancellationToken ct = default)
        {
            content.UpdatedAt = DateTime.UtcNow;
            _context.Contents.Update(content);
            await _context.SaveChangesAsync(ct);
            return content;
        }

        public async Task DeleteAsync(Guid id, Guid moduleId, CancellationToken ct = default)
        {
            var junction = await _context.ModuleContents
                .FirstOrDefaultAsync(mc => mc.ContentId == id && mc.ModuleId == moduleId, ct)
                ?? throw new KeyNotFoundException("Content not found in module.");
            _context.ModuleContents.Remove(junction);

            var content = await _context.Contents.FindAsync(new object[] { id }, cancellationToken: ct);
            if (content != null) _context.Contents.Remove(content);

            await _context.SaveChangesAsync(ct);
        }

        // T3.6: toggle Draft/Published
        public async Task SetStatusAsync(Guid id, string status, CancellationToken ct = default)
        {
            var content = await _context.Contents.FindAsync(new object[] { id }, cancellationToken: ct)
                ?? throw new KeyNotFoundException($"Content {id} not found.");
            content.Status = status;
            content.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }

        // Link an existing ContentModel (e.g., a user's quiz/video/doc/deck) to a module.
        // Creates only the ModuleContent join row; the ContentModel itself is not modified.
        public async Task<ContentModel?> LinkExistingAsync(Guid contentId, Guid moduleId, CancellationToken ct = default)
        {
            var content = await _context.Contents
                .Include(c => c.Quiz)
                .Include(c => c.FlashcardDeck)
                .Include(c => c.Document)
                .Include(c => c.Video)
                .FirstOrDefaultAsync(c => c.Id == contentId, ct);
            if (content == null) return null;

            // Prevent duplicate links
            var already = await _context.ModuleContents
                .AnyAsync(mc => mc.ContentId == contentId && mc.ModuleId == moduleId, ct);
            if (already) return content;

            var maxOrder = await _context.ModuleContents
                .Where(mc => mc.ModuleId == moduleId)
                .Select(mc => (int?)mc.OrderIndex).MaxAsync(ct) ?? -1;

            _context.ModuleContents.Add(new ModuleContentModel
            {
                Id = Guid.NewGuid(),
                ModuleId = moduleId,
                ContentId = contentId,
                OrderIndex = maxOrder + 1
            });
            await _context.SaveChangesAsync(ct);
            return content;
        }

        // T3.7: reorder content within module
        public async Task ReorderAsync(Guid moduleId, Guid contentId, int newIndex, CancellationToken ct = default)
        {
            var junctions = await _context.ModuleContents
                .Where(mc => mc.ModuleId == moduleId)
                .OrderBy(mc => mc.OrderIndex)
                .ToListAsync(ct);

            var target = junctions.FirstOrDefault(j => j.ContentId == contentId)
                ?? throw new KeyNotFoundException("Content not found.");

            var currentIndex = junctions.IndexOf(target);
            if (newIndex < 0 || newIndex >= junctions.Count || newIndex == currentIndex) return;

            junctions.RemoveAt(currentIndex);
            junctions.Insert(newIndex, target);

            for (int i = 0; i < junctions.Count; i++)
                junctions[i].OrderIndex = i;

            await _context.SaveChangesAsync(ct);
        }
    }
}

using Content.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Content.Api.Data
{
    public interface IContentRepository
    {
        Task<ContentModel?> GetByIdAsync(Guid id);
        Task<List<ContentModel>> GetByModuleAsync(Guid moduleId);
        Task<ContentModel> CreateAsync(ContentModel content, Guid moduleId);
        Task<ContentModel> UpdateAsync(ContentModel content);
        Task DeleteAsync(Guid id, Guid moduleId);
        Task SetStatusAsync(Guid id, string status); // T3.6
        Task ReorderAsync(Guid moduleId, Guid contentId, int newIndex); // T3.7
    }

    public class ContentRepository : IContentRepository
    {
        private readonly ContentDbContext _context;

        public ContentRepository(ContentDbContext context) => _context = context;

        public async Task<ContentModel?> GetByIdAsync(Guid id)
            => await _context.Contents
                .Include(c => c.Video)
                .Include(c => c.Document)
                .Include(c => c.Quiz).ThenInclude(q => q!.Questions).ThenInclude(q => q.Options)
                .Include(c => c.FlashcardDeck).ThenInclude(d => d!.Flashcards)
                .FirstOrDefaultAsync(c => c.Id == id);

        public async Task<List<ContentModel>> GetByModuleAsync(Guid moduleId)
            => await _context.ModuleContents
                .Where(mc => mc.ModuleId == moduleId)
                .OrderBy(mc => mc.OrderIndex)
                .Include(mc => mc.Content)
                .Select(mc => mc.Content!)
                .ToListAsync();

        public async Task<ContentModel> CreateAsync(ContentModel content, Guid moduleId)
        {
            content.Id = Guid.NewGuid();
            content.CreatedAt = DateTime.UtcNow;
            content.Status = "DRAFT";
            _context.Contents.Add(content);

            var maxOrder = await _context.ModuleContents
                .Where(mc => mc.ModuleId == moduleId)
                .Select(mc => (int?)mc.OrderIndex).MaxAsync() ?? -1;

            _context.ModuleContents.Add(new ModuleContentModel
            {
                Id = Guid.NewGuid(),
                ModuleId = moduleId,
                ContentId = content.Id,
                OrderIndex = maxOrder + 1
            });

            await _context.SaveChangesAsync();
            return content;
        }

        public async Task<ContentModel> UpdateAsync(ContentModel content)
        {
            content.UpdatedAt = DateTime.UtcNow;
            _context.Contents.Update(content);
            await _context.SaveChangesAsync();
            return content;
        }

        public async Task DeleteAsync(Guid id, Guid moduleId)
        {
            var junction = await _context.ModuleContents
                .FirstOrDefaultAsync(mc => mc.ContentId == id && mc.ModuleId == moduleId)
                ?? throw new KeyNotFoundException("Content not found in module.");
            _context.ModuleContents.Remove(junction);

            var content = await _context.Contents.FindAsync(id);
            if (content != null) _context.Contents.Remove(content);

            await _context.SaveChangesAsync();
        }

        // T3.6: toggle Draft/Published
        public async Task SetStatusAsync(Guid id, string status)
        {
            var content = await _context.Contents.FindAsync(id)
                ?? throw new KeyNotFoundException($"Content {id} not found.");
            content.Status = status;
            content.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // T3.7: reorder content within module
        public async Task ReorderAsync(Guid moduleId, Guid contentId, int newIndex)
        {
            var junctions = await _context.ModuleContents
                .Where(mc => mc.ModuleId == moduleId)
                .OrderBy(mc => mc.OrderIndex)
                .ToListAsync();

            var target = junctions.FirstOrDefault(j => j.ContentId == contentId)
                ?? throw new KeyNotFoundException("Content not found.");

            var currentIndex = junctions.IndexOf(target);
            if (newIndex < 0 || newIndex >= junctions.Count || newIndex == currentIndex) return;

            junctions.RemoveAt(currentIndex);
            junctions.Insert(newIndex, target);

            for (int i = 0; i < junctions.Count; i++)
                junctions[i].OrderIndex = i;

            await _context.SaveChangesAsync();
        }
    }
}

using Auth.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Auth.Api.Data
{
    public interface IModuleRepository
    {
        Task<List<ModuleModel>> GetByCourseAsync(Guid courseId);
        Task<ModuleModel?> GetByIdAsync(Guid id);
        Task<ModuleModel> CreateAsync(ModuleModel module, Guid courseId);
        Task<ModuleModel> UpdateAsync(ModuleModel module);
        Task DeleteAsync(Guid id, Guid courseId);
        Task ReorderAsync(Guid courseId, Guid moduleId, int newIndex);
    }

    public class ModuleRepository : IModuleRepository
    {
        private readonly AuthDbContext _context;

        public ModuleRepository(AuthDbContext context) => _context = context;

        public async Task<List<ModuleModel>> GetByCourseAsync(Guid courseId)
            => await _context.CourseModules
                .Where(cm => cm.CourseId == courseId)
                .OrderBy(cm => cm.OrderIndex)
                .Include(cm => cm.Module).ThenInclude(m => m!.ModuleContents).ThenInclude(mc => mc.Content)
                .Select(cm => cm.Module!)
                .ToListAsync();

        public async Task<ModuleModel?> GetByIdAsync(Guid id)
            => await _context.Modules
                .Include(m => m.ModuleContents).ThenInclude(mc => mc.Content)
                .FirstOrDefaultAsync(m => m.Id == id);

        public async Task<ModuleModel> CreateAsync(ModuleModel module, Guid courseId)
        {
            module.Id = Guid.NewGuid();
            module.CreatedAt = DateTime.UtcNow;
            _context.Modules.Add(module);

            var maxOrder = await _context.CourseModules
                .Where(cm => cm.CourseId == courseId)
                .Select(cm => (int?)cm.OrderIndex).MaxAsync() ?? -1;

            _context.CourseModules.Add(new CourseModuleModel
            {
                Id = Guid.NewGuid(),
                CourseId = courseId,
                ModuleId = module.Id,
                OrderIndex = maxOrder + 1,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return module;
        }

        public async Task<ModuleModel> UpdateAsync(ModuleModel module)
        {
            module.UpdatedAt = DateTime.UtcNow;
            _context.Modules.Update(module);
            await _context.SaveChangesAsync();
            return module;
        }

        public async Task DeleteAsync(Guid id, Guid courseId)
        {
            var junction = await _context.CourseModules
                .FirstOrDefaultAsync(cm => cm.ModuleId == id && cm.CourseId == courseId)
                ?? throw new KeyNotFoundException("Module not found in course.");
            _context.CourseModules.Remove(junction);

            var module = await _context.Modules.FindAsync(id);
            if (module != null) _context.Modules.Remove(module);

            await _context.SaveChangesAsync();
        }

        // T3.7: swap order_index between adjacent modules (Up/Down buttons)
        public async Task ReorderAsync(Guid courseId, Guid moduleId, int newIndex)
        {
            var junctions = await _context.CourseModules
                .Where(cm => cm.CourseId == courseId)
                .OrderBy(cm => cm.OrderIndex)
                .ToListAsync();

            var target = junctions.FirstOrDefault(j => j.ModuleId == moduleId)
                ?? throw new KeyNotFoundException("Module not found.");

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

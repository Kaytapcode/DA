using Auth.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Auth.Api.Data
{
    public interface ICourseRepository
    {
        Task<CourseModel?> GetByIdAsync(Guid id);
        Task<(List<CourseModel> Items, int Total)> GetByOrgIdAsync(Guid orgId, int pageIndex = 0, int pageSize = 10);
        Task<List<CourseModel>> GetAllAsync(int pageIndex = 0, int pageSize = 10);
        Task<CourseModel> CreateAsync(CourseModel course);
        Task<CourseModel> UpdateAsync(CourseModel course);
        Task DeleteAsync(Guid id);
        Task<int> GetCountByOrgIdAsync(Guid orgId);
        Task<List<CourseModel>> SearchAsync(Guid orgId, string query, int pageIndex = 0, int pageSize = 20);
    }

    public class CourseRepository : ICourseRepository
    {
        private readonly AuthDbContext _context;

        public CourseRepository(AuthDbContext context) => _context = context;

        public async Task<CourseModel?> GetByIdAsync(Guid id)
            => await _context.Courses
                .Include(c => c.CourseModules.OrderBy(cm => cm.OrderIndex))
                    .ThenInclude(cm => cm.Module)
                        .ThenInclude(m => m!.ModuleContents.OrderBy(mc => mc.OrderIndex))
                            .ThenInclude(mc => mc.Content)
                .FirstOrDefaultAsync(c => c.Id == id);

        public async Task<(List<CourseModel> Items, int Total)> GetByOrgIdAsync(Guid orgId, int pageIndex = 0, int pageSize = 10)
        {
            var query = _context.Courses.Where(c => c.OrgId == orgId);
            var total = await query.CountAsync();
            var items = await query
                .Include(c => c.CourseModules)
                .OrderByDescending(c => c.CreatedAt)
                .Skip(pageIndex * pageSize).Take(pageSize)
                .ToListAsync();
            return (items, total);
        }

        public async Task<List<CourseModel>> GetAllAsync(int pageIndex = 0, int pageSize = 10)
            => await _context.Courses
                .IgnoreQueryFilters() // SysAdmin endpoint — see all
                .OrderByDescending(c => c.CreatedAt)
                .Skip(pageIndex * pageSize).Take(pageSize)
                .ToListAsync();

        public async Task<CourseModel> CreateAsync(CourseModel course)
        {
            course.Id = Guid.NewGuid();
            course.CreatedAt = DateTime.UtcNow;
            course.Status = "DRAFT";
            _context.Courses.Add(course);
            await _context.SaveChangesAsync();
            return course;
        }

        public async Task<CourseModel> UpdateAsync(CourseModel course)
        {
            course.UpdatedAt = DateTime.UtcNow;
            _context.Courses.Update(course);
            await _context.SaveChangesAsync();
            return course;
        }

        public async Task DeleteAsync(Guid id)
        {
            var course = await _context.Courses.FindAsync(id)
                ?? throw new KeyNotFoundException($"Course {id} not found.");
            _context.Courses.Remove(course);
            await _context.SaveChangesAsync();
        }

        public async Task<int> GetCountByOrgIdAsync(Guid orgId)
            => await _context.Courses.CountAsync(c => c.OrgId == orgId);

        // T3.8 — basic LIKE search with org_id guard
        public async Task<List<CourseModel>> SearchAsync(Guid orgId, string query, int pageIndex = 0, int pageSize = 20)
            => await _context.Courses
                .Where(c => c.OrgId == orgId &&
                    (EF.Functions.Like(c.Title, $"%{query}%") ||
                     (c.Description != null && EF.Functions.Like(c.Description, $"%{query}%"))))
                .Skip(pageIndex * pageSize).Take(pageSize)
                .ToListAsync();
    }
}


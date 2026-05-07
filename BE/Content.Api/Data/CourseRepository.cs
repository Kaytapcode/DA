using Content.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Content.Api.Data
{
    public interface ICourseRepository
    {
        Task<CourseModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<(List<CourseModel> Items, int Total)> GetByOrgIdAsync(Guid orgId, int pageIndex = 0, int pageSize = 10, CancellationToken ct = default);
        Task<List<CourseModel>> GetAllAsync(int pageIndex = 0, int pageSize = 10, CancellationToken ct = default);
        Task<int> GetTotalCountAsync(CancellationToken ct = default);
        Task<CourseModel> CreateAsync(CourseModel course, CancellationToken ct = default);
        Task<CourseModel> UpdateAsync(CourseModel course, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
        Task<int> GetCountByOrgIdAsync(Guid orgId, CancellationToken ct = default);
        Task<List<CourseModel>> SearchAsync(Guid orgId, string query, int pageIndex = 0, int pageSize = 20, CancellationToken ct = default);
    }

    public class CourseRepository : ICourseRepository
    {
        private readonly ContentDbContext _context;

        public CourseRepository(ContentDbContext context) => _context = context;

        public async Task<CourseModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => await _context.Courses
                .Include(c => c.CourseModules.OrderBy(cm => cm.OrderIndex))
                    .ThenInclude(cm => cm.Module)
                        .ThenInclude(m => m!.ModuleContents.OrderBy(mc => mc.OrderIndex))
                            .ThenInclude(mc => mc.Content)
                .FirstOrDefaultAsync(c => c.Id == id, ct);

        public async Task<(List<CourseModel> Items, int Total)> GetByOrgIdAsync(Guid orgId, int pageIndex = 0, int pageSize = 10, CancellationToken ct = default)
        {
            var query = _context.Courses.Where(c => c.OrgId == orgId);
            var total = await query.CountAsync(ct);
            var items = await query
                .Include(c => c.CourseModules)
                .OrderByDescending(c => c.CreatedAt)
                .Skip(pageIndex * pageSize).Take(pageSize)
                .ToListAsync(ct);
            return (items, total);
        }

        public async Task<List<CourseModel>> GetAllAsync(int pageIndex = 0, int pageSize = 10, CancellationToken ct = default)
            => await _context.Courses
                .IgnoreQueryFilters() // SysAdmin endpoint – see all
                .OrderByDescending(c => c.CreatedAt)
                .Skip(pageIndex * pageSize).Take(pageSize)
                .ToListAsync(ct);

        public async Task<CourseModel> CreateAsync(CourseModel course, CancellationToken ct = default)
        {
            course.Id = Guid.NewGuid();
            course.CreatedAt = DateTime.UtcNow;
            course.Status = "DRAFT";
            _context.Courses.Add(course);
            await _context.SaveChangesAsync(ct);
            return course;
        }

        public async Task<CourseModel> UpdateAsync(CourseModel course, CancellationToken ct = default)
        {
            course.UpdatedAt = DateTime.UtcNow;
            _context.Courses.Update(course);
            await _context.SaveChangesAsync(ct);
            return course;
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var course = await _context.Courses.FindAsync(new object[] { id }, cancellationToken: ct)
                ?? throw new KeyNotFoundException($"Course {id} not found.");
            _context.Courses.Remove(course);
            await _context.SaveChangesAsync(ct);
        }

        public async Task<int> GetTotalCountAsync(CancellationToken ct = default)
            => await _context.Courses.IgnoreQueryFilters().CountAsync(ct);

        public async Task<int> GetCountByOrgIdAsync(Guid orgId, CancellationToken ct = default)
            => await _context.Courses.CountAsync(c => c.OrgId == orgId, ct);

        // T3.8 � basic LIKE search with org_id guard
        public async Task<List<CourseModel>> SearchAsync(Guid orgId, string query, int pageIndex = 0, int pageSize = 20, CancellationToken ct = default)
            => await _context.Courses
                .Where(c => c.OrgId == orgId &&
                    (EF.Functions.ILike(c.Title, $"%{query}%") ||
                     (c.Description != null && EF.Functions.ILike(c.Description, $"%{query}%"))))
                .Skip(pageIndex * pageSize).Take(pageSize)
                .ToListAsync(ct);
    }
}


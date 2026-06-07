using Content.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Content.Api.Data
{
    public interface IStudentProgressRepository
    {
        Task<StudentProgressModel?> GetByKeyAsync(Guid courseId, Guid userId, Guid? moduleId, CancellationToken ct = default);
        Task<StudentProgressModel?> GetPersonalByContentAsync(Guid userId, Guid contentId, CancellationToken ct = default);
        Task<List<StudentProgressModel>> GetByCourseUserAsync(Guid courseId, Guid userId, CancellationToken ct = default);
        Task<List<StudentProgressModel>> GetByCourseAsync(Guid courseId, CancellationToken ct = default);
        Task<StudentProgressModel> UpsertAsync(StudentProgressModel progress, CancellationToken ct = default);
        Task<int> CountCourseModulesAsync(Guid courseId, CancellationToken ct = default);
    }

    public class StudentProgressRepository : IStudentProgressRepository
    {
        private readonly ContentDbContext _db;

        public StudentProgressRepository(ContentDbContext db) => _db = db;

        public async Task<StudentProgressModel?> GetByKeyAsync(Guid courseId, Guid userId, Guid? moduleId, CancellationToken ct = default)
            => await _db.StudentProgress
                .FirstOrDefaultAsync(p =>
                    p.CourseId == courseId &&
                    p.UserId == userId &&
                    p.ModuleId == moduleId, ct);

        public async Task<StudentProgressModel?> GetPersonalByContentAsync(Guid userId, Guid contentId, CancellationToken ct = default)
            => await _db.StudentProgress
                .FirstOrDefaultAsync(p => p.CourseId == null && p.UserId == userId && p.ContentId == contentId, ct);

        public async Task<List<StudentProgressModel>> GetByCourseUserAsync(Guid courseId, Guid userId, CancellationToken ct = default)
            => await _db.StudentProgress
                .Where(p => p.CourseId == courseId && p.UserId == userId)
                .OrderByDescending(p => p.UpdatedAt ?? p.CreatedAt)
                .ToListAsync(ct);

        public async Task<List<StudentProgressModel>> GetByCourseAsync(Guid courseId, CancellationToken ct = default)
            => await _db.StudentProgress
                .Where(p => p.CourseId == courseId)
                .ToListAsync(ct);

        public async Task<StudentProgressModel> UpsertAsync(StudentProgressModel progress, CancellationToken ct = default)
        {
            // Course progress is tracked PER CONTENT: the key must include ContentId, otherwise two
            // contents in the same module collapse onto one row and opening content B wipes content A's
            // completion. (A module-level row — ContentId == null — is still matched the old way.)
            StudentProgressModel? existing;
            if (progress.CourseId.HasValue)
            {
                existing = progress.ContentId.HasValue
                    ? await _db.StudentProgress.FirstOrDefaultAsync(p =>
                        p.CourseId == progress.CourseId &&
                        p.UserId == progress.UserId &&
                        p.ModuleId == progress.ModuleId &&
                        p.ContentId == progress.ContentId, ct)
                    : await GetByKeyAsync(progress.CourseId.Value, progress.UserId, progress.ModuleId, ct);
            }
            else
            {
                existing = await GetPersonalByContentAsync(progress.UserId, progress.ContentId ?? Guid.Empty, ct);
            }

            if (existing != null)
            {
                existing.TimeSpentSeconds += progress.TimeSpentSeconds;
                existing.UpdatedAt = DateTime.UtcNow;

                if (progress.IsCompleted && !existing.IsCompleted)
                {
                    existing.IsCompleted = true;
                    existing.CompletedAt = DateTime.UtcNow;
                }

                existing.ProgressPercentage = progress.ProgressPercentage;
                _db.StudentProgress.Update(existing);
                await _db.SaveChangesAsync(ct);
                return existing;
            }
            else
            {
                progress.Id = Guid.NewGuid();
                progress.CreatedAt = DateTime.UtcNow;
                if (progress.IsCompleted)
                    progress.CompletedAt = DateTime.UtcNow;
                _db.StudentProgress.Add(progress);
                await _db.SaveChangesAsync(ct);
                return progress;
            }
        }

        public async Task<int> CountCourseModulesAsync(Guid courseId, CancellationToken ct = default)
            => await _db.CourseModules.CountAsync(cm => cm.CourseId == courseId, ct);
    }
}

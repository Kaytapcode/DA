using Microsoft.EntityFrameworkCore;
using Content.Api.Models;

namespace Content.Api.Data
{
    public interface IVideoRepository
    {
        Task<VideoModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<List<VideoModel>> GetByModuleIdAsync(Guid moduleId, CancellationToken ct = default);
        Task<Guid?> GetModuleOrgIdAsync(Guid moduleId, CancellationToken ct = default);
        Task<VideoModel> CreateAsync(VideoModel video, CancellationToken ct = default);
        Task<VideoModel> CreatePersonalAsync(string youTubeVideoId, string? title, string? description, string? thumbnailUrl, Guid? createdByUserId, CancellationToken ct = default);
        Task<List<VideoModel>> GetPersonalAsync(CancellationToken ct = default);
        Task<VideoModel> UpdateAsync(VideoModel video, CancellationToken ct = default);
        Task SoftDeleteAsync(Guid id, CancellationToken ct = default);
    }

    public class VideoRepository : IVideoRepository
    {
        private readonly ContentDbContext _context;

        public VideoRepository(ContentDbContext context)
        {
            _context = context;
        }

        public async Task<VideoModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            return await _context.Videos
                .Where(v => v.DeletedAt == null)
                .FirstOrDefaultAsync(v => v.Id == id, ct);
        }

        public async Task<List<VideoModel>> GetByModuleIdAsync(Guid moduleId, CancellationToken ct = default)
        {
            return await _context.Videos
                .Where(v => v.DeletedAt == null &&
                           v.Content!.ModuleContents.Any(mc => mc.ModuleId == moduleId))
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<Guid?> GetModuleOrgIdAsync(Guid moduleId, CancellationToken ct = default)
        {
            var module = await _context.Modules
                .Where(m => m.Id == moduleId)
                .Select(m => new { m.OrgId })
                .FirstOrDefaultAsync(ct);

            return module?.OrgId;
        }

        public async Task<VideoModel> CreateAsync(VideoModel video, CancellationToken ct = default)
        {
            video.Id = Guid.NewGuid();
            video.CreatedAt = DateTime.UtcNow;
            _context.Videos.Add(video);
            await _context.SaveChangesAsync(ct);
            return video;
        }

        public async Task<VideoModel> CreatePersonalAsync(string youTubeVideoId, string? title, string? description, string? thumbnailUrl, Guid? createdByUserId, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var content = new ContentModel
            {
                Id = Guid.NewGuid(),
                Title = string.IsNullOrWhiteSpace(title) ? "YouTube Video" : title!,
                ContentType = "VIDEO",
                Status = "PUBLISHED",
                CreatedByUserId = createdByUserId,
                IsPublic = true, // Spec §1
                CreatedAt = now
            };
            var video = new VideoModel
            {
                Id = Guid.NewGuid(),
                ContentId = content.Id,
                YouTubeVideoId = youTubeVideoId,
                Title = title,
                Description = description,
                ThumbnailUrl = thumbnailUrl,
                CreatedAt = now
            };

            _context.Contents.Add(content);
            _context.Videos.Add(video);
            await _context.SaveChangesAsync(ct);
            return video;
        }

        public async Task<List<VideoModel>> GetPersonalAsync(CancellationToken ct = default)
        {
            // Videos whose Content has no ModuleContent attachment (personal/unaffiliated).
            return await _context.Videos
                .Where(v => v.DeletedAt == null &&
                            v.Content != null &&
                            !v.Content.ModuleContents.Any())
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<VideoModel> UpdateAsync(VideoModel video, CancellationToken ct = default)
        {
            video.UpdatedAt = DateTime.UtcNow;
            _context.Videos.Update(video);
            await _context.SaveChangesAsync(ct);
            return video;
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken ct = default)
        {
            var video = await GetByIdAsync(id, ct);
            if (video == null) return;

            video.DeletedAt = DateTime.UtcNow;
            video.UpdatedAt = DateTime.UtcNow;
            await UpdateAsync(video, ct);
        }
    }
}

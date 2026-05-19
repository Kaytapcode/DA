using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    [Route("api/videos")]
    [ApiController]
    [Authorize]
    public class VideosController : ControllerBase
    {
        private readonly IVideoRepository _videoRepository;
        private readonly IContentRepository _contentRepository;
        private readonly IOrgContextService _orgContext;
        private readonly ContentDbContext _db;

        public VideosController(
            IVideoRepository videoRepository,
            IContentRepository contentRepository,
            IOrgContextService orgContext,
            ContentDbContext db)
        {
            _videoRepository = videoRepository;
            _contentRepository = contentRepository;
            _orgContext = orgContext;
            _db = db;
        }

        private string? ExtractYouTubeVideoId(string url)
        {
            var patterns = new[]
            {
                @"(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})",
                @"youtube\.com\/embed\/([A-Za-z0-9_-]{11})",
                @"youtube\.com\/v\/([A-Za-z0-9_-]{11})"
            };

            foreach (var pattern in patterns)
            {
                var match = Regex.Match(url, pattern);
                if (match.Success)
                    return match.Groups[1].Value;
            }

            return null;
        }

        private async Task<bool> VerifyContentAccessAsync(Guid contentId)
        {
            var content = await _contentRepository.GetByIdAsync(contentId);
            if (content == null)
                return false;

            var moduleId = content.ModuleContents.FirstOrDefault()?.ModuleId;
            // Personal/public video (not attached to any module/course): allow any authenticated
            // user per spec §1 (User personal resources are public).
            if (moduleId == null)
                return _orgContext.GetCurrentUserId().HasValue;

            var orgId = await _videoRepository.GetModuleOrgIdAsync(moduleId.Value);
            if (orgId == null)
                return _orgContext.GetCurrentUserId().HasValue;
            return _orgContext.IsSysAdmin() || orgId == _orgContext.GetCurrentOrgId();
        }

        // POST /api/videos - Create YouTube video
        [HttpPost]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> CreateVideo([FromBody] CreateVideoRequestDto request, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(request.YouTubeUrl))
                return BadRequest(new ApiResponse(Success: false, Message: "YouTube URL is required."));

            var videoId = ExtractYouTubeVideoId(request.YouTubeUrl);
            if (string.IsNullOrEmpty(videoId))
                return BadRequest(new ApiResponse(Success: false, Message: "Invalid YouTube URL format."));

            if (!await VerifyContentAccessAsync(request.ContentId))
                return Forbid();

            var thumbnailUrl = $"https://i.ytimg.com/vi/{videoId}/maxresdefault.jpg";

            var video = new VideoModel
            {
                ContentId = request.ContentId,
                YouTubeVideoId = videoId,
                Title = request.Title ?? "YouTube Video",
                Description = request.Description,
                ThumbnailUrl = thumbnailUrl
            };

            var created = await _videoRepository.CreateAsync(video, ct);

            return Ok(new ApiResponse<VideoDto>(
                Success: true,
                Data: new VideoDto(
                    Id: created.Id,
                    ContentId: created.ContentId,
                    YouTubeVideoId: created.YouTubeVideoId,
                    Title: created.Title,
                    Description: created.Description,
                    ThumbnailUrl: created.ThumbnailUrl,
                    EmbeddableUrl: $"https://www.youtube.com/embed/{created.YouTubeVideoId}"
                ),
                Message: "Video added successfully."
            ));
        }

        // GET /api/videos/{videoId} - Get video details
        [HttpGet("{videoId:guid}")]
        public async Task<IActionResult> GetVideo(Guid videoId, CancellationToken ct = default)
        {
            var video = await _videoRepository.GetByIdAsync(videoId, ct);
            if (video == null)
                return NotFound(new ApiResponse(Success: false, Message: "Video not found."));

            if (!await VerifyContentAccessAsync(video.ContentId))
                return Forbid();

            // Owner-of-personal-video check needs Content.CreatedByUserId — load it separately
            // so the existing repo signature isn't disturbed.
            var content = await _db.Contents.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == video.ContentId, ct);

            return Ok(new ApiResponse<VideoDto>(
                Success: true,
                Data: new VideoDto(
                    Id: video.Id,
                    ContentId: video.ContentId,
                    YouTubeVideoId: video.YouTubeVideoId,
                    Title: video.Title,
                    Description: video.Description,
                    ThumbnailUrl: video.ThumbnailUrl,
                    EmbeddableUrl: $"https://www.youtube.com/embed/{video.YouTubeVideoId}",
                    CreatedByUserId: content?.CreatedByUserId
                ),
                Message: null
            ));
        }

        // PATCH /api/videos/{videoId} - Rename a personal video (owner-only, any auth role).
        // Course-bound videos must still go through the Teacher-gated PUT endpoint above.
        [HttpPatch("{videoId:guid}")]
        public async Task<IActionResult> RenameVideo(Guid videoId, [FromBody] UpdateVideoRequestDto request, CancellationToken ct = default)
        {
            var userId = _orgContext.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(Success: false, Message: "Invalid user context."));

            if (string.IsNullOrWhiteSpace(request.Title) && request.Description == null)
                return BadRequest(new ApiResponse(Success: false, Message: "Nothing to update."));

            var video = await _videoRepository.GetByIdAsync(videoId, ct);
            if (video == null)
                return NotFound(new ApiResponse(Success: false, Message: "Video not found."));

            var content = await _db.Contents
                .Include(c => c.ModuleContents)
                .FirstOrDefaultAsync(c => c.Id == video.ContentId, ct);
            if (content == null)
                return NotFound(new ApiResponse(Success: false, Message: "Content not found."));

            // Course-bound videos use the existing teacher-gated PUT instead.
            if (content.ModuleContents.Any())
                return StatusCode(403, new ApiResponse(Success: false, Message: "Course-bound videos must be renamed via the teacher endpoint."));

            if (content.CreatedByUserId != userId && !_orgContext.IsSysAdmin())
                return StatusCode(403, new ApiResponse(Success: false, Message: "Only the video owner may rename it."));

            if (!string.IsNullOrWhiteSpace(request.Title))
            {
                video.Title = request.Title.Trim();
                content.Title = request.Title.Trim();
            }
            if (request.Description != null)
                video.Description = request.Description;

            await _videoRepository.UpdateAsync(video, ct);
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse<VideoDto>(
                Success: true,
                Data: new VideoDto(
                    Id: video.Id,
                    ContentId: video.ContentId,
                    YouTubeVideoId: video.YouTubeVideoId,
                    Title: video.Title,
                    Description: video.Description,
                    ThumbnailUrl: video.ThumbnailUrl,
                    EmbeddableUrl: $"https://www.youtube.com/embed/{video.YouTubeVideoId}",
                    CreatedByUserId: content.CreatedByUserId
                ),
                Message: "Video renamed."
            ));
        }

        // GET /api/modules/{moduleId}/videos - List videos in module
        [HttpGet("modules/{moduleId:guid}")]
        public async Task<IActionResult> GetModuleVideos(Guid moduleId, CancellationToken ct = default)
        {
            var orgId = await _videoRepository.GetModuleOrgIdAsync(moduleId, ct);
            if (orgId == null || (!_orgContext.IsSysAdmin() && orgId != _orgContext.GetCurrentOrgId()))
                return Forbid();

            var videos = await _videoRepository.GetByModuleIdAsync(moduleId, ct);

            var result = videos.Select(v => new VideoDto(
                Id: v.Id,
                ContentId: v.ContentId,
                YouTubeVideoId: v.YouTubeVideoId,
                Title: v.Title,
                Description: v.Description,
                ThumbnailUrl: v.ThumbnailUrl,
                EmbeddableUrl: $"https://www.youtube.com/embed/{v.YouTubeVideoId}"
            ));

            return Ok(new ApiResponse<IEnumerable<VideoDto>>(
                Success: true,
                Data: result,
                Message: null
            ));
        }

        // POST /api/videos/personal - Create a personal video from a YouTube URL (any authenticated user)
        [HttpPost("personal")]
        public async Task<IActionResult> CreatePersonalVideo([FromBody] CreatePersonalVideoRequestDto request, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(request.YouTubeUrl))
                return BadRequest(new ApiResponse(Success: false, Message: "YouTube URL is required."));

            var videoId = ExtractYouTubeVideoId(request.YouTubeUrl);
            if (string.IsNullOrEmpty(videoId))
                return BadRequest(new ApiResponse(Success: false, Message: "Invalid YouTube URL format."));

            var thumbnailUrl = $"https://i.ytimg.com/vi/{videoId}/maxresdefault.jpg";

            var created = await _videoRepository.CreatePersonalAsync(
                videoId, request.Title, request.Description, thumbnailUrl, _orgContext.GetCurrentUserId(), ct);

            return Ok(new ApiResponse<VideoDto>(
                Success: true,
                Data: new VideoDto(
                    Id: created.Id,
                    ContentId: created.ContentId,
                    YouTubeVideoId: created.YouTubeVideoId,
                    Title: created.Title,
                    Description: created.Description,
                    ThumbnailUrl: created.ThumbnailUrl,
                    EmbeddableUrl: $"https://www.youtube.com/embed/{created.YouTubeVideoId}"
                ),
                Message: "Video saved."
            ));
        }

        // GET /api/videos/personal - List videos not attached to any module, owned by caller
        [HttpGet("personal")]
        public async Task<IActionResult> GetPersonalVideos(CancellationToken ct = default)
        {
            var videos = await _videoRepository.GetPersonalAsync(_orgContext.GetCurrentUserId(), ct);
            var result = videos.Select(v => new VideoDto(
                Id: v.Id,
                ContentId: v.ContentId,
                YouTubeVideoId: v.YouTubeVideoId,
                Title: v.Title,
                Description: v.Description,
                ThumbnailUrl: v.ThumbnailUrl,
                EmbeddableUrl: $"https://www.youtube.com/embed/{v.YouTubeVideoId}"
            ));
            return Ok(new ApiResponse<IEnumerable<VideoDto>>(Success: true, Data: result, Message: null));
        }

        // PUT /api/videos/{videoId} - Update video
        [HttpPut("{videoId:guid}")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> UpdateVideo(Guid videoId, [FromBody] UpdateVideoRequestDto request, CancellationToken ct = default)
        {
            var video = await _videoRepository.GetByIdAsync(videoId, ct);
            if (video == null)
                return NotFound(new ApiResponse(Success: false, Message: "Video not found."));

            if (!await VerifyContentAccessAsync(video.ContentId))
                return Forbid();

            if (!string.IsNullOrWhiteSpace(request.YouTubeUrl))
            {
                var extractedId = ExtractYouTubeVideoId(request.YouTubeUrl);
                if (string.IsNullOrEmpty(extractedId))
                    return BadRequest(new ApiResponse(Success: false, Message: "Invalid YouTube URL format."));
                video.YouTubeVideoId = extractedId;
                video.ThumbnailUrl = $"https://i.ytimg.com/vi/{extractedId}/maxresdefault.jpg";
            }

            if (!string.IsNullOrWhiteSpace(request.Title))
                video.Title = request.Title;

            if (request.Description != null)
                video.Description = request.Description;

            var updated = await _videoRepository.UpdateAsync(video, ct);

            return Ok(new ApiResponse<VideoDto>(
                Success: true,
                Data: new VideoDto(
                    Id: updated.Id,
                    ContentId: updated.ContentId,
                    YouTubeVideoId: updated.YouTubeVideoId,
                    Title: updated.Title,
                    Description: updated.Description,
                    ThumbnailUrl: updated.ThumbnailUrl,
                    EmbeddableUrl: $"https://www.youtube.com/embed/{updated.YouTubeVideoId}"
                ),
                Message: "Video updated successfully."
            ));
        }

        // DELETE /api/videos/{videoId} - Delete video
        // Personal videos (no module attachment) can be deleted by their owner or a SysAdmin.
        // Course-bound videos require Teacher-or-above within the same org.
        [HttpDelete("{videoId:guid}")]
        public async Task<IActionResult> DeleteVideo(Guid videoId, CancellationToken ct = default)
        {
            var userId = _orgContext.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(Success: false, Message: "Invalid user context."));

            var video = await _videoRepository.GetByIdAsync(videoId, ct);
            if (video == null)
                return NotFound(new ApiResponse(Success: false, Message: "Video not found."));

            var content = await _db.Contents
                .Include(c => c.ModuleContents)
                .FirstOrDefaultAsync(c => c.Id == video.ContentId, ct);
            if (content == null)
                return NotFound(new ApiResponse(Success: false, Message: "Content not found."));

            if (content.ModuleContents.Any())
            {
                // Course-bound: require teacher role and org membership
                var role = _orgContext.GetCurrentRole();
                if (role is not ("SysAdmin" or "OrgAdmin" or "Teacher"))
                    return Forbid();
                if (!await VerifyContentAccessAsync(video.ContentId))
                    return Forbid();
            }
            else
            {
                // Personal video: owner or SysAdmin only
                if (content.CreatedByUserId != userId && !_orgContext.IsSysAdmin())
                    return Forbid();
            }

            // Deleting ContentModel cascades to VideoModel (OnDelete Cascade).
            // StudentProgress.ContentId is set to null (OnDelete SetNull).
            _db.Contents.Remove(content);
            await _db.SaveChangesAsync(ct);

            return Ok(new ApiResponse(Success: true, Message: "Video deleted successfully."));
        }
    }

    // Request/Response DTOs
    public record CreateVideoRequestDto(
        Guid ContentId,
        string YouTubeUrl,
        string? Title = null,
        string? Description = null
    );

    public record CreatePersonalVideoRequestDto(
        string YouTubeUrl,
        string? Title = null,
        string? Description = null
    );

    public record UpdateVideoRequestDto(
        string? YouTubeUrl = null,
        string? Title = null,
        string? Description = null
    );

    public record VideoDto(
        Guid Id,
        Guid ContentId,
        string YouTubeVideoId,
        string? Title,
        string? Description,
        string? ThumbnailUrl,
        string EmbeddableUrl,
        Guid? CreatedByUserId = null
    );
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public VideosController(
            IVideoRepository videoRepository,
            IContentRepository contentRepository,
            IOrgContextService orgContext)
        {
            _videoRepository = videoRepository;
            _contentRepository = contentRepository;
            _orgContext = orgContext;
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
            if (moduleId == null)
                return _orgContext.IsSysAdmin();

            var orgId = await _videoRepository.GetModuleOrgIdAsync(moduleId.Value);
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

            return Ok(new ApiResponse<VideoDto>(
                Success: true,
                Data: new VideoDto(
                    Id: video.Id,
                    YouTubeVideoId: video.YouTubeVideoId,
                    Title: video.Title,
                    Description: video.Description,
                    ThumbnailUrl: video.ThumbnailUrl,
                    EmbeddableUrl: $"https://www.youtube.com/embed/{video.YouTubeVideoId}"
                ),
                Message: null
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
        [HttpDelete("{videoId:guid}")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> DeleteVideo(Guid videoId, CancellationToken ct = default)
        {
            var video = await _videoRepository.GetByIdAsync(videoId, ct);
            if (video == null)
                return NotFound(new ApiResponse(Success: false, Message: "Video not found."));

            if (!await VerifyContentAccessAsync(video.ContentId))
                return Forbid();

            await _videoRepository.SoftDeleteAsync(videoId, ct);

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

    public record UpdateVideoRequestDto(
        string? YouTubeUrl = null,
        string? Title = null,
        string? Description = null
    );

    public record VideoDto(
        Guid Id,
        string YouTubeVideoId,
        string? Title,
        string? Description,
        string? ThumbnailUrl,
        string EmbeddableUrl
    );
}

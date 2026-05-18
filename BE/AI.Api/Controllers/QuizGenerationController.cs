using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AI.Api.Services;
using Shared.Contracts.Responses;
using UglyToad.PdfPig;

namespace AI.Api.Controllers
{
    [ApiController]
    [Route("api/quiz")]
    [Authorize]
    public class QuizGenerationController : ControllerBase
    {
        private readonly IOpenRouterService _openRouterService;
        private readonly ILogger<QuizGenerationController> _logger;

        public QuizGenerationController(IOpenRouterService openRouterService, ILogger<QuizGenerationController> logger)
        {
            _openRouterService = openRouterService;
            _logger = logger;
        }

        /// <summary>
        /// Generate quiz questions from an uploaded PDF or text file.
        /// Returns questions for the client to review/edit before saving.
        /// </summary>
        [HttpPost("generate")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> GenerateQuiz(
            IFormFile file,
            [FromForm] string? documentTitle = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponse(false, "A PDF or text file is required."));

            if (file.Length > 10 * 1024 * 1024)
                return BadRequest(new ApiResponse(false, "File size must not exceed 10 MB."));

            string documentContent;
            try
            {
                documentContent = await ExtractTextAsync(file);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to extract text from {FileName}", file.FileName);
                return BadRequest(new ApiResponse(false, "Failed to read file content. Ensure the file is a valid PDF or plain text file."));
            }

            if (string.IsNullOrWhiteSpace(documentContent) || documentContent.Trim().Length < 50)
                return BadRequest(new ApiResponse(false, "File content is too short (minimum 50 characters of text)."));

            var title = !string.IsNullOrWhiteSpace(documentTitle)
                ? documentTitle.Trim()
                : Path.GetFileNameWithoutExtension(file.FileName);

            try
            {
                _logger.LogInformation("Generating quiz for document: {Title}", title);
                var response = await _openRouterService.GenerateQuizAsync(documentContent.Trim(), title);
                _logger.LogInformation("Quiz generated with {Count} questions", response.QuestionsCount);
                return Ok(new ApiResponse<QuizGenerationResponse>(true, response, "Quiz generated successfully"));
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid operation during quiz generation");
                return BadRequest(new ApiResponse(false, ex.Message));
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error during quiz generation");
                return StatusCode(503, new ApiResponse(false, "AI service temporarily unavailable"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during quiz generation");
                return StatusCode(500, new ApiResponse(false, "An error occurred while generating the quiz"));
            }
        }

        private static async Task<string> ExtractTextAsync(IFormFile file)
        {
            var contentType = (file.ContentType ?? string.Empty).ToLowerInvariant();
            var extension = Path.GetExtension(file.FileName ?? string.Empty).ToLowerInvariant();

            if (contentType == "application/pdf" || extension == ".pdf")
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                using var pdfDoc = PdfDocument.Open(ms.ToArray());
                var sb = new System.Text.StringBuilder();
                foreach (var page in pdfDoc.GetPages())
                    sb.AppendLine(page.Text);
                return sb.ToString();
            }
            else
            {
                using var reader = new StreamReader(file.OpenReadStream());
                return await reader.ReadToEndAsync();
            }
        }
    }
}

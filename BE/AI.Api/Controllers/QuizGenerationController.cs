using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AI.Api.Services;
using Shared.Contracts.Responses;

namespace AI.Api.Controllers
{
    [ApiController]
    [Route("api/quiz")]
    [Authorize]
    public class QuizGenerationController : ControllerBase
    {
        private readonly IOpenRouterService _openRouterService;
        private readonly ILogger<QuizGenerationController> _logger;

        public QuizGenerationController(
            IOpenRouterService openRouterService,
            ILogger<QuizGenerationController> logger)
        {
            _openRouterService = openRouterService;
            _logger = logger;
        }

        /// <summary>
        /// Generate quiz questions from document content using OpenRouter LLM
        /// </summary>
        [HttpPost("generate")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> GenerateQuiz([FromBody] GenerateQuizRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.DocumentContent))
            {
                return BadRequest(new ApiResponse(false, "Document content is required"));
            }

            try
            {
                _logger.LogInformation("Generating quiz for document: {DocumentTitle}", request.DocumentTitle);

                var response = await _openRouterService.GenerateQuizAsync(
                    request.DocumentContent,
                    request.DocumentTitle ?? "Document"
                );

                _logger.LogInformation("Quiz generated successfully with {QuestionCount} questions", response.QuestionsCount);

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
    }

    public class GenerateQuizRequest
    {
        public required string DocumentContent { get; set; }
        public string? DocumentTitle { get; set; }
    }
}

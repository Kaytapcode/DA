using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AI.Api.Services;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;
using System.Text.Json;

namespace AI.Api.Controllers
{
    [ApiController]
    [Route("api/quiz")]
    [Authorize]
    public class QuizGenerationController : ControllerBase
    {
        private readonly IOpenRouterService _openRouterService;
        private readonly ILogger<QuizGenerationController> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public QuizGenerationController(
            IOpenRouterService openRouterService,
            ILogger<QuizGenerationController> logger,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _openRouterService = openRouterService;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        /// <summary>
        /// Generate quiz questions from document content using OpenRouter LLM
        /// Optionally auto-save to Content.Api if quizId is provided
        /// </summary>
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateQuiz([FromBody] GenerateQuizRequest request, [FromQuery] Guid? quizId = null)
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

                // If quizId provided, auto-save to Content.Api
                if (quizId.HasValue)
                {
                    var saveResult = await SaveQuestionsToContentApiAsync(quizId.Value, response);
                    if (!saveResult.Success)
                    {
                        _logger.LogWarning("Failed to save questions to Content.Api: {Message}", saveResult.Message);
                        return StatusCode(500, new ApiResponse(false, $"Generated but failed to save: {saveResult.Message}"));
                    }

                    _logger.LogInformation("Questions saved to Content.Api for quiz {QuizId}", quizId);
                }

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

        private async Task<(bool Success, string Message)> SaveQuestionsToContentApiAsync(Guid quizId, QuizGenerationResponse response)
        {
            try
            {
                var contentApiUrl = _configuration["Identity:InternalBaseUrl"] ?? "http://localhost:5003";
                var client = _httpClientFactory.CreateClient();
                var token = Request.Headers["Authorization"].ToString();

                var importRequest = new ImportAiQuestionsRequestDto(
                    response.Questions.Select(q => new GeneratedQuestionDto(
                        q.Question,
                        q.Options,
                        q.CorrectIndex,
                        q.Explanation
                    )).ToList()
                );

                var json = JsonSerializer.Serialize(importRequest);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                if (!string.IsNullOrEmpty(token))
                {
                    client.DefaultRequestHeaders.Add("Authorization", token);
                }

                var endpoint = $"{contentApiUrl}/api/quizzes/{quizId}/generate";
                var httpResponse = await client.PostAsync(endpoint, content);

                if (!httpResponse.IsSuccessStatusCode)
                {
                    var errorContent = await httpResponse.Content.ReadAsStringAsync();
                    return (false, $"Content.Api returned {httpResponse.StatusCode}: {errorContent}");
                }

                return (true, "Questions saved successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving questions to Content.Api");
                return (false, ex.Message);
            }
        }
    }

    public class GenerateQuizRequest
    {
        public required string DocumentContent { get; set; }
        public string? DocumentTitle { get; set; }
    }
}

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace AI.Api.Services
{
    public interface IOpenRouterService
    {
        Task<QuizGenerationResponse> GenerateQuizAsync(string documentContent, string documentTitle = "Document");
    }

    public class OpenRouterService : IOpenRouterService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly IAiKeyResolver _keyResolver;
        private readonly ILogger<OpenRouterService> _logger;
        private const string OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

        public OpenRouterService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            IAiKeyResolver keyResolver,
            ILogger<OpenRouterService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _keyResolver = keyResolver;
            _logger = logger;
        }

        public async Task<QuizGenerationResponse> GenerateQuizAsync(string documentContent, string documentTitle = "Document")
        {
            try
            {
                // Prefer the SysAdmin-managed key (spec §1: SysAdmin "Configure AI API Keys");
                // fall back to configuration for local dev / bootstrap.
                var apiKey = await _keyResolver.ResolveAsync("OpenRouter");
                var model = _configuration["OpenRouter:Model"] ?? "meta-llama/llama-3.1-70b-instruct";

                if (string.IsNullOrEmpty(apiKey))
                {
                    _logger.LogError("OpenRouter API key not configured");
                    throw new InvalidOperationException("OpenRouter API key is not configured");
                }

                var client = _httpClientFactory.CreateClient();
                
                var request = new OpenRouterRequest
                {
                    Model = model,
                    Messages = new[]
                    {
                        new OpenRouterMessage
                        {
                            Role = "system",
                            Content = "You are an expert educator. Generate quiz questions based ONLY on the provided document content. Return ONLY valid JSON with no extra text, comments, or markdown formatting."
                        },
                        new OpenRouterMessage
                        {
                            Role = "user",
                            Content = BuildQuizPrompt(documentContent, documentTitle)
                        }
                    },
                    Temperature = 0.7,
                    TopP = 0.9,
                    MaxTokens = 2000
                };

                var json = JsonSerializer.Serialize(request, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
                client.DefaultRequestHeaders.Add("HTTP-Referer", "https://da-be.local");
                client.DefaultRequestHeaders.Add("X-Title", "DA-BE Quiz Generator");

                _logger.LogInformation("Calling OpenRouter API with model: {Model}", model);

                var response = await client.PostAsync($"{OPENROUTER_BASE_URL}/chat/completions", content);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("OpenRouter API error: {StatusCode} - {Content}", response.StatusCode, errorContent);
                    throw new HttpRequestException($"OpenRouter API returned {response.StatusCode}: {errorContent}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var openRouterResponse = JsonSerializer.Deserialize<OpenRouterResponse>(
                    responseContent,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
                );

                if (openRouterResponse?.Choices == null || openRouterResponse.Choices.Count == 0)
                {
                    _logger.LogError("OpenRouter returned empty choices");
                    throw new InvalidOperationException("OpenRouter API returned no content");
                }

                var messageContent = openRouterResponse.Choices[0].Message.Content;
                _logger.LogInformation("Received response from OpenRouter, parsing JSON");

                return ParseQuizResponse(messageContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating quiz with OpenRouter");
                throw;
            }
        }

        private string BuildQuizPrompt(string documentContent, string documentTitle)
        {
            return $@"Generate exactly 5 multiple-choice questions based ONLY on the content of this document titled ""{documentTitle}"".

Rules:
1. Questions must be based ONLY on information in the document
2. Each question must have exactly 4 options (A, B, C, D)
3. Avoid ambiguous or trick questions
4. Include clear explanations

Return ONLY this JSON format with no markdown, no code blocks, no extra text:
{{
  ""questions"": [
    {{
      ""question"": ""What is...?"",
      ""options"": [""Option A"", ""Option B"", ""Option C"", ""Option D""],
      ""correct_index"": 0,
      ""explanation"": ""Explanation based on document...""
    }}
  ]
}}

Document content:
---
{documentContent}
---

Now generate the quiz JSON:";
        }

        private QuizGenerationResponse ParseQuizResponse(string jsonContent)
        {
            try
            {
                var cleanedJson = jsonContent.Trim();
                
                // Remove markdown code blocks if present
                if (cleanedJson.StartsWith("```json"))
                    cleanedJson = cleanedJson[7..];
                if (cleanedJson.StartsWith("```"))
                    cleanedJson = cleanedJson[3..];
                if (cleanedJson.EndsWith("```"))
                    cleanedJson = cleanedJson[..^3];

                cleanedJson = cleanedJson.Trim();

                var quizData = JsonSerializer.Deserialize<QuizData>(
                    cleanedJson,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
                );

                if (quizData?.Questions == null || quizData.Questions.Count == 0)
                {
                    throw new InvalidOperationException("No questions found in response");
                }

                _logger.LogInformation("Successfully parsed {QuestionCount} questions", quizData.Questions.Count);

                return new QuizGenerationResponse
                {
                    Success = true,
                    QuestionsCount = quizData.Questions.Count,
                    Questions = quizData.Questions,
                    Message = $"Successfully generated {quizData.Questions.Count} quiz questions"
                };
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse quiz JSON: {Content}", jsonContent);
                throw new InvalidOperationException("Failed to parse OpenRouter response as JSON", ex);
            }
        }
    }

    // DTOs
    public class OpenRouterRequest
    {
        [JsonPropertyName("model")]
        public required string Model { get; set; }

        [JsonPropertyName("messages")]
        public required OpenRouterMessage[] Messages { get; set; }

        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }

        [JsonPropertyName("top_p")]
        public double TopP { get; set; }

        [JsonPropertyName("max_tokens")]
        public int MaxTokens { get; set; }
    }

    public class OpenRouterMessage
    {
        [JsonPropertyName("role")]
        public required string Role { get; set; }

        [JsonPropertyName("content")]
        public required string Content { get; set; }
    }

    public class OpenRouterResponse
    {
        [JsonPropertyName("choices")]
        public required List<OpenRouterChoice> Choices { get; set; }
    }

    public class OpenRouterChoice
    {
        [JsonPropertyName("message")]
        public required OpenRouterMessage Message { get; set; }
    }

    public class QuizData
    {
        [JsonPropertyName("questions")]
        public required List<QuizQuestion> Questions { get; set; }
    }

    public class QuizQuestion
    {
        [JsonPropertyName("question")]
        public required string Question { get; set; }

        [JsonPropertyName("options")]
        public required List<string> Options { get; set; }

        [JsonPropertyName("correct_index")]
        public int CorrectIndex { get; set; }

        [JsonPropertyName("explanation")]
        public required string Explanation { get; set; }
    }

    public class QuizGenerationResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("questions_count")]
        public int QuestionsCount { get; set; }

        [JsonPropertyName("questions")]
        public required List<QuizQuestion> Questions { get; set; }

        [JsonPropertyName("message")]
        public required string Message { get; set; }
    }
}

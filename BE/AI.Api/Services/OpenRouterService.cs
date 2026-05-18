using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace AI.Api.Services
{
    public interface IOpenRouterService
    {
        Task<QuizGenerationResponse> GenerateQuizAsync(
            string documentContent,
            string documentTitle = "Document",
            string questionCount = "normal",
            string difficulty = "normal");
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

        public async Task<QuizGenerationResponse> GenerateQuizAsync(
            string documentContent,
            string documentTitle = "Document",
            string questionCount = "normal",
            string difficulty = "normal")
        {
            try
            {
                var apiKey = await _keyResolver.ResolveAsync("OpenRouter");
                var model = _configuration["OpenRouter:Model"] ?? "stepfun/step-3.5-flash";
                var fallbackModel = _configuration["OpenRouter:FallbackModel"] ?? "meta-llama/llama-3.1-8b-instruct";

                if (string.IsNullOrEmpty(apiKey))
                    throw new InvalidOperationException("OpenRouter API key is not configured");

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromMinutes(8);
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
                client.DefaultRequestHeaders.Add("HTTP-Referer", "https://da-be.local");
                client.DefaultRequestHeaders.Add("X-Title", "DA-BE Quiz Generator");

                var (minQ, maxQ) = questionCount switch
                {
                    "many" => (15, 18),
                    "more" => (20, 25),
                    _      => (10, 12)
                };

                var maxTokens = questionCount switch
                {
                    "many" => 6000,
                    "more" => 9000,
                    _      => 4000
                };

                const int MaxDocChars = 96_000;
                if (documentContent.Length > MaxDocChars)
                {
                    documentContent = documentContent[..MaxDocChars];
                    _logger.LogWarning("Document truncated to {Chars} chars", MaxDocChars);
                }

                // First pass — ask for the maximum so natural under-delivery still lands in range
                var activeModel = model;
                var activeContent = documentContent;
                _logger.LogInformation("Generating quiz: target={Max}, difficulty={Diff}, model={Model}", maxQ, difficulty, activeModel);
                string firstRaw;
                try
                {
                    firstRaw = await CallApiAsync(client, activeModel,
                        BuildQuizPrompt(activeContent, documentTitle, difficulty, maxQ), maxTokens);
                }
                catch (Exception ex) when (IsTransient(ex) && activeModel != fallbackModel)
                {
                    activeModel = fallbackModel;
                    activeContent = TruncateForRetry(documentContent);
                    var retryTokens = ReduceTokens(maxTokens);
                    _logger.LogWarning(ex, "Primary model failed/timed out — retrying with fallback model {Model}", activeModel);
                    firstRaw = await CallApiAsync(client, activeModel,
                        BuildQuizPrompt(activeContent, documentTitle, difficulty, maxQ), retryTokens);
                }
                var questions = ParseQuizResponse(firstRaw).Questions;
                _logger.LogInformation("First pass returned {Count} questions (need {Min}–{Max})", questions.Count, minQ, maxQ);

                // Top-up pass — if still below the minimum, ask for exactly the shortfall
                if (questions.Count < minQ)
                {
                    var needed = minQ - questions.Count;
                    _logger.LogWarning("Short by {Needed} questions — running top-up pass", needed);
                    try
                    {
                        var topUpTokens = needed * 350 + 500;
                        var topUpRaw = await CallApiAsync(client, activeModel,
                            BuildTopUpPrompt(activeContent, documentTitle, difficulty, needed, questions.Count), topUpTokens);
                        var extra = ParseQuizResponse(topUpRaw).Questions;
                        questions.AddRange(extra);
                        _logger.LogInformation("After top-up: {Count} questions total", questions.Count);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Top-up pass failed — returning {Count} questions", questions.Count);
                    }
                }

                // Cap at maxQ
                if (questions.Count > maxQ)
                    questions = questions.Take(maxQ).ToList();

                return BuildResponse(questions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating quiz with OpenRouter");
                throw;
            }
        }

        private async Task<string> CallApiAsync(HttpClient client, string model, string userPrompt, int maxTokens)
        {
            var request = new OpenRouterRequest
            {
                Model = model,
                Messages = new[]
                {
                    new OpenRouterMessage
                    {
                        Role = "system",
                        Content = "You are an expert educator. Generate quiz questions based ONLY on the provided document content. Return ONLY valid JSON — no markdown, no extra text."
                    },
                    new OpenRouterMessage { Role = "user", Content = userPrompt }
                },
                Temperature = 0.7,
                TopP = 0.9,
                MaxTokens = maxTokens
            };

            var json = JsonSerializer.Serialize(request, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            var httpContent = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{OPENROUTER_BASE_URL}/chat/completions", httpContent);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"OpenRouter API returned {response.StatusCode}: {err}");
            }

            var raw = await response.Content.ReadAsStringAsync();
            var parsed = JsonSerializer.Deserialize<OpenRouterResponse>(raw,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            if (parsed?.Choices == null || parsed.Choices.Count == 0)
                throw new InvalidOperationException("OpenRouter API returned no content");

            return parsed.Choices[0].Message.Content;
        }

        private static bool IsTransient(Exception ex)
        {
            if (ex is TaskCanceledException)
                return true;

            if (ex is HttpRequestException httpEx)
            {
                if (httpEx.StatusCode is null)
                    return true;

                return httpEx.StatusCode == HttpStatusCode.RequestTimeout
                    || httpEx.StatusCode == HttpStatusCode.GatewayTimeout
                    || (int)httpEx.StatusCode >= 500;
            }

            return false;
        }

        private static string TruncateForRetry(string documentContent)
        {
            const int RetryDocChars = 48_000;
            return documentContent.Length > RetryDocChars
                ? documentContent[..RetryDocChars]
                : documentContent;
        }

        private static int ReduceTokens(int maxTokens) =>
            Math.Max(1200, (int)Math.Round(maxTokens * 0.7));

        private static string DifficultyLine(string difficulty) => difficulty switch
        {
            "easy" => "EASY: straightforward recall — test direct facts and basic definitions. Keep wording simple.",
            "hard" => "HARD: analysis and critical thinking — synthesise information, compare concepts, apply ideas to new situations.",
            _      => "NORMAL: mix of recall and comprehension — test understanding and application of key concepts."
        };

        private static string BuildQuizPrompt(string documentContent, string documentTitle, string difficulty, int targetQ) =>
            $@"TASK: Generate exactly {targetQ} multiple-choice questions from the document below.
REQUIRED COUNT: {targetQ}. You MUST output all {targetQ} questions — do NOT stop early.
DIFFICULTY: {DifficultyLine(difficulty)}
DOCUMENT TITLE: {documentTitle}

RULES:
1. Every question must be answerable solely from the document — zero hallucination.
2. Each question has EXACTLY 4 options (A, B, C, D).
3. Exactly ONE option is correct; the other three are plausible distractors.
4. The ""explanation"" field is MANDATORY and must quote or paraphrase the document.
5. Continue generating until you have written all {targetQ} questions.

Return ONLY this JSON — no markdown fences, no extra text:
{{
  ""questions"": [
    {{
      ""question"": ""..."",
      ""options"": [""A..."", ""B..."", ""C..."", ""D...""],
      ""correct_index"": 0,
      ""explanation"": ""...""
    }}
  ]
}}

DOCUMENT:
---
{documentContent}
---

JSON ({targetQ} questions):";

        private static string BuildTopUpPrompt(string documentContent, string documentTitle, string difficulty, int needed, int alreadyHave) =>
            $@"TASK: Generate exactly {needed} MORE multiple-choice questions from the document below.
CONTEXT: {alreadyHave} questions have already been generated. These {needed} must cover DIFFERENT aspects of the document.
REQUIRED COUNT: {needed}. Output all {needed} — do NOT stop early.
DIFFICULTY: {DifficultyLine(difficulty)}
DOCUMENT TITLE: {documentTitle}

RULES:
1. Every question must be answerable solely from the document — zero hallucination.
2. Each question has EXACTLY 4 options (A, B, C, D).
3. Exactly ONE option is correct; the other three are plausible distractors.
4. The ""explanation"" field is MANDATORY and must quote or paraphrase the document.
5. Do NOT repeat topics already likely covered — choose different sections/concepts.

Return ONLY this JSON — no markdown fences, no extra text:
{{
  ""questions"": [
    {{
      ""question"": ""..."",
      ""options"": [""A..."", ""B..."", ""C..."", ""D...""],
      ""correct_index"": 0,
      ""explanation"": ""...""
    }}
  ]
}}

DOCUMENT:
---
{documentContent}
---

JSON ({needed} new questions):";


        private QuizGenerationResponse ParseQuizResponse(string jsonContent)
        {
            var cleanedJson = jsonContent.Trim();

            // Strip markdown fences if the model wrapped the JSON anyway
            if (cleanedJson.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
                cleanedJson = cleanedJson[7..];
            else if (cleanedJson.StartsWith("```"))
                cleanedJson = cleanedJson[3..];
            if (cleanedJson.EndsWith("```"))
                cleanedJson = cleanedJson[..^3];

            cleanedJson = cleanedJson.Trim();

            // Try strict parse first
            try
            {
                var quizData = JsonSerializer.Deserialize<QuizData>(
                    cleanedJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (quizData?.Questions is { Count: > 0 })
                {
                    _logger.LogInformation("Parsed {Count} questions (strict)", quizData.Questions.Count);
                    return BuildResponse(quizData.Questions);
                }
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Strict JSON parse failed — attempting recovery");
            }

            // Recovery: the response was truncated mid-JSON.
            // Extract all complete question objects using a bracket-depth scanner.
            var recovered = RecoverPartialQuestions(cleanedJson);
            if (recovered.Count > 0)
            {
                _logger.LogWarning("Recovered {Count} complete questions from truncated JSON", recovered.Count);
                return BuildResponse(recovered);
            }

            _logger.LogError("Could not parse any questions from response: {Content}", cleanedJson[..Math.Min(500, cleanedJson.Length)]);
            throw new InvalidOperationException("Failed to parse AI response as JSON. The model may have returned an unexpected format.");
        }

        private static QuizGenerationResponse BuildResponse(List<QuizQuestion> questions) => new()
        {
            Success = true,
            QuestionsCount = questions.Count,
            Questions = questions,
            Message = $"Successfully generated {questions.Count} quiz questions"
        };

        /// <summary>
        /// Scans the raw JSON string and extracts every complete {...} object found inside
        /// the "questions" array, even when the outer array/object is truncated.
        /// </summary>
        private static List<QuizQuestion> RecoverPartialQuestions(string json)
        {
            var results = new List<QuizQuestion>();
            int i = 0;

            // Fast-forward to the first '[' after "questions"
            var arrayStart = json.IndexOf('[');
            if (arrayStart < 0) return results;
            i = arrayStart + 1;

            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            while (i < json.Length)
            {
                // Skip whitespace / commas
                while (i < json.Length && json[i] is ' ' or '\n' or '\r' or '\t' or ',') i++;
                if (i >= json.Length || json[i] != '{') break;

                // Find the matching closing '}'
                int depth = 0, start = i;
                while (i < json.Length)
                {
                    if (json[i] == '{') depth++;
                    else if (json[i] == '}') { depth--; if (depth == 0) { i++; break; } }
                    i++;
                }

                if (depth != 0) break; // truncated object — stop

                try
                {
                    var q = JsonSerializer.Deserialize<QuizQuestion>(json[start..i], opts);
                    if (q?.Question != null && q.Options?.Count >= 2)
                        results.Add(q);
                }
                catch { /* skip malformed object */ }
            }

            return results;
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

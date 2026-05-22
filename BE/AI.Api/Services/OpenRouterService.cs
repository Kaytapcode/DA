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
                var (temp, topP) = DifficultyParams(difficulty);
                _logger.LogInformation("Generating quiz: target={Max}, difficulty={Diff}, temp={Temp}, model={Model}", maxQ, difficulty, temp, activeModel);
                string firstRaw;
                try
                {
                    firstRaw = await CallApiAsync(client, activeModel,
                        BuildQuizPrompt(activeContent, documentTitle, difficulty, maxQ), maxTokens, temp, topP);
                }
                catch (Exception ex) when (IsTransient(ex) && activeModel != fallbackModel)
                {
                    activeModel = fallbackModel;
                    activeContent = TruncateForRetry(documentContent);
                    var retryTokens = ReduceTokens(maxTokens);
                    _logger.LogWarning(ex, "Primary model failed/timed out — retrying with fallback model {Model}", activeModel);
                    firstRaw = await CallApiAsync(client, activeModel,
                        BuildQuizPrompt(activeContent, documentTitle, difficulty, maxQ), retryTokens, temp, topP);
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
                            BuildTopUpPrompt(activeContent, documentTitle, difficulty, needed, questions.Count), topUpTokens, temp, topP);
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

        private async Task<string> CallApiAsync(HttpClient client, string model, string userPrompt, int maxTokens, double temperature = 0.6, double topP = 0.85)
        {
            var request = new OpenRouterRequest
            {
                Model = model,
                Messages = new[]
                {
                    new OpenRouterMessage
                    {
                        Role = "system",
                        Content = "You are an expert educator creating multiple-choice quiz questions from a provided document. Output ONLY valid JSON matching the exact schema requested — no markdown, no code fences, no explanatory text before or after the JSON object."
                    },
                    new OpenRouterMessage { Role = "user", Content = userPrompt }
                },
                Temperature = temperature,
                TopP = topP,
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

        // Standardised difficulty criteria sent in the prompt (not user-editable).
        // Easy fails most often, so its criteria are written to force short, unambiguous questions
        // and very different distractors — reducing the chance the model writes free-form text.
        private static string DifficultyLine(string difficulty) => difficulty switch
        {
            "easy" =>
                "EASY — Recognition and recall level:\n" +
                "  • Questions must directly extract a fact, term, or definition stated in the document.\n" +
                "  • Stem example pattern: \"According to the document, what is X?\" or \"Which of the following best defines Y?\"\n" +
                "  • Wrong options (distractors) must be clearly and obviously different from the correct answer — do NOT use near-synonyms or partially-correct options.\n" +
                "  • Keep question stems SHORT (one sentence). Avoid multi-clause sentences.\n" +
                "  • Do NOT ask inferential or synthesis questions at this level.",
            "hard" =>
                "HARD — Synthesis and evaluation level:\n" +
                "  • Questions must require the learner to synthesise information from multiple parts of the document, or reason about a hypothetical scenario using document knowledge.\n" +
                "  • Example patterns: \"Based on X from the document, what would most likely happen if Y?\", \"Which conclusion is best supported by both concept A and concept B in the document?\"\n" +
                "  • Wrong options must be extremely plausible — differ from the correct answer by only one subtle detail, or be correct in a different context.\n" +
                "  • Avoid questions that can be answered by reading a single sentence.",
            _ =>
                "NORMAL — Application and analysis level:\n" +
                "  • Questions require the learner to connect information from 2–3 different sentences or paragraphs in the document.\n" +
                "  • Example pattern: \"Why does X lead to Y according to the document?\", \"Which of the following is consistent with the document's explanation of Z?\"\n" +
                "  • Wrong options must be plausible and similar to the correct answer, but clearly incorrect when the document is read carefully.\n" +
                "  • Avoid pure recall (too easy) and avoid hypothetical scenarios (too hard)."
        };

        private static (double Temperature, double TopP) DifficultyParams(string difficulty) => difficulty switch
        {
            // Easy: moderate temperature — 0.35 was too low and caused stepfun to sometimes
            // stall, truncate, or return "correct_index" as a string instead of int.
            "easy" => (0.50, 0.82),
            // Hard: slightly higher temperature → more creative distractors
            "hard" => (0.70, 0.90),
            // Normal: balanced
            _ => (0.55, 0.85),
        };

        private static string BuildQuizPrompt(string documentContent, string documentTitle, string difficulty, int targetQ) =>
            $@"TASK: Generate exactly {targetQ} multiple-choice questions from the document below.
REQUIRED COUNT: {targetQ}. Output all {targetQ} questions without stopping early.

DIFFICULTY CRITERIA ({difficulty.ToUpper()}):
{DifficultyLine(difficulty)}

DOCUMENT TITLE: {documentTitle}

STRICT RULES (violating any rule makes the output unusable):
1. Base every question solely on the document — zero hallucination.
2. Detect the document language. Output ALL text (questions, options, explanations) in THAT SAME language.
   Vietnamese doc → Vietnamese output. Japanese doc → Japanese output. English doc → English output.
3. Each question has EXACTLY 4 options stored in the ""options"" array (index 0–3).
4. Exactly ONE option is correct. Set ""correct_index"" to its 0-based index (0, 1, 2, or 3).
5. The ""explanation"" field MUST be non-empty and must reference or quote the document.
6. Generate all {targetQ} questions before outputting anything.

OUTPUT FORMAT — return ONLY the JSON object below, starting with {{ and ending with }}.
No markdown fences. No code blocks. No preamble. No trailing commentary. Just the JSON:
{{
  ""questions"": [
    {{
      ""question"": ""..."",
      ""options"": [""A. ..."", ""B. ..."", ""C. ..."", ""D. ...""],
      ""correct_index"": 0,
      ""explanation"": ""...""
    }}
  ]
}}

DOCUMENT:
---
{documentContent}
---";

        private static string BuildTopUpPrompt(string documentContent, string documentTitle, string difficulty, int needed, int alreadyHave) =>
            $@"TASK: Generate exactly {needed} MORE multiple-choice questions from the document below.
CONTEXT: {alreadyHave} questions already exist. These {needed} must cover DIFFERENT aspects of the document.
REQUIRED COUNT: {needed}. Output all {needed} without stopping early.

DIFFICULTY CRITERIA ({difficulty.ToUpper()}):
{DifficultyLine(difficulty)}

DOCUMENT TITLE: {documentTitle}

STRICT RULES:
1. Base every question solely on the document — zero hallucination.
2. Detect the document language. Output ALL text in THAT SAME language.
3. Each question has EXACTLY 4 options in the ""options"" array (index 0–3).
4. Exactly ONE option is correct; set ""correct_index"" to its 0-based index.
5. The ""explanation"" field MUST be non-empty and reference the document.
6. Cover DIFFERENT document sections from what was already generated.

OUTPUT FORMAT — return ONLY the JSON object, starting with {{ and ending with }}.
No markdown fences. No code blocks. No preamble. No trailing text. Just JSON:
{{
  ""questions"": [
    {{
      ""question"": ""..."",
      ""options"": [""A. ..."", ""B. ..."", ""C. ..."", ""D. ...""],
      ""correct_index"": 0,
      ""explanation"": ""...""
    }}
  ]
}}

DOCUMENT:
---
{documentContent}
---";


        private QuizGenerationResponse ParseQuizResponse(string rawContent)
        {
            // Always log the raw model response for debugging. Truncated to 1000 chars.
            _logger.LogInformation("AI raw response ({Len} chars): {Preview}",
                rawContent.Length, rawContent[..Math.Min(1000, rawContent.Length)]);

            // Strip "thinking" / chain-of-thought preambles that some models emit before the JSON.
            // Pattern: <think>...</think> or similar XML-ish wrappers.
            rawContent = System.Text.RegularExpressions.Regex.Replace(
                rawContent, @"<think>[\s\S]*?</think>", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();

            // Step 1 — extract the JSON payload, stripping fences/prose before and after.
            var cleanedJson = ExtractJsonPayload(rawContent);
            _logger.LogInformation("Extracted JSON payload ({Len} chars): {Preview}",
                cleanedJson.Length, cleanedJson[..Math.Min(500, cleanedJson.Length)]);

            // Allow "correct_index": "0" (string) in addition to "correct_index": 0 (int).
            var opts = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
            };

            // Step 2 — try parsing as {"questions":[...]}
            try
            {
                var quizData = JsonSerializer.Deserialize<QuizData>(cleanedJson, opts);
                if (quizData?.Questions is { Count: > 0 })
                {
                    _logger.LogInformation("Parsed {Count} questions (wrapper object)", quizData.Questions.Count);
                    return BuildResponse(quizData.Questions);
                }
            }
            catch (JsonException ex)
            {
                _logger.LogWarning("Wrapper-object parse failed: {Msg}", ex.Message);
            }

            // Step 3 — try parsing as a bare array [...] (some models skip the wrapper object)
            try
            {
                var directList = JsonSerializer.Deserialize<List<QuizQuestion>>(cleanedJson, opts);
                if (directList is { Count: > 0 })
                {
                    _logger.LogInformation("Parsed {Count} questions (bare array)", directList.Count);
                    return BuildResponse(directList);
                }
            }
            catch (JsonException ex)
            {
                _logger.LogWarning("Bare-array parse failed: {Msg}", ex.Message);
            }

            // Step 4 — bracket-depth recovery for truncated or partially-valid JSON
            var recovered = RecoverPartialQuestions(cleanedJson);
            if (recovered.Count > 0)
            {
                _logger.LogWarning("Recovered {Count} questions from truncated JSON", recovered.Count);
                return BuildResponse(recovered);
            }

            _logger.LogError("All parse attempts failed. Raw response:\n{Content}", rawContent);
            throw new InvalidOperationException("Failed to parse AI response as JSON. The model may have returned an unexpected format.");
        }

        /// <summary>
        /// Extracts the outermost JSON object or array from a model response that may
        /// contain markdown fences, preamble prose, or trailing notes.
        /// </summary>
        private static string ExtractJsonPayload(string raw)
        {
            var s = raw.Trim();

            // Priority 1: markdown code block (handles ``` anywhere, not just at start)
            var fenceMatch = System.Text.RegularExpressions.Regex.Match(
                s, @"```(?:json|JSON)?\s*([\s\S]*?)```");
            if (fenceMatch.Success)
                s = fenceMatch.Groups[1].Value.Trim();
            else
            {
                // Remove unclosed opening fence if present
                if (s.StartsWith("```json", StringComparison.OrdinalIgnoreCase)) s = s[7..].TrimStart();
                else if (s.StartsWith("```")) s = s[3..].TrimStart();
                if (s.EndsWith("```")) s = s[..^3].TrimEnd();
                s = s.Trim();
            }

            // Find the first '{' or '[' (skip leading prose)
            int start = -1;
            for (int i = 0; i < s.Length; i++)
            {
                if (s[i] == '{' || s[i] == '[') { start = i; break; }
            }
            if (start < 0) return s; // no JSON token found

            // Walk forward to find the matching closing bracket, respecting strings.
            // This eliminates any trailing text/notes the model appended after the JSON.
            char openChar = s[start];
            char closeChar = openChar == '{' ? '}' : ']';
            int depth = 0;
            bool inStr = false;
            bool esc = false;
            int end = start;

            for (int i = start; i < s.Length; i++)
            {
                char c = s[i];
                if (esc)            { esc = false; continue; }
                if (c == '\\' && inStr) { esc = true; continue; }
                if (c == '"')       { inStr = !inStr; continue; }
                if (inStr)          continue;

                if (c == openChar)  depth++;
                else if (c == closeChar)
                {
                    depth--;
                    if (depth == 0) { end = i; break; }
                }
            }

            // If depth > 0 the JSON was truncated; return what we have so recovery can try
            return depth == 0
                ? s[start..(end + 1)]
                : s[start..];
        }

        private QuizGenerationResponse BuildResponse(List<QuizQuestion> questions)
        {
            // Spec invariant 3: AI explanations are mandatory. Fill any gaps so parsing
            // never silently produces an explanation-free AI question.
            int filled = 0;
            foreach (var q in questions)
            {
                if (string.IsNullOrWhiteSpace(q.Explanation))
                {
                    q.Explanation = "(Explanation not provided by model — verify before publishing)";
                    filled++;
                }
            }
            if (filled > 0)
                _logger.LogWarning("{Count} questions had empty explanations — placeholder inserted", filled);

            return new()
            {
                Success = true,
                QuestionsCount = questions.Count,
                Questions = questions,
                Message = $"Successfully generated {questions.Count} quiz questions"
            };
        }

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
        public string Question { get; set; } = string.Empty;

        [JsonPropertyName("options")]
        public List<string> Options { get; set; } = [];

        [JsonPropertyName("correct_index")]
        public int CorrectIndex { get; set; }

        // Nullable so a missing field doesn't abort the whole deserialization;
        // AI-generated quizzes validate non-empty after parsing.
        [JsonPropertyName("explanation")]
        public string? Explanation { get; set; }
    }

    public class QuizGenerationResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("questions_count")]
        public int QuestionsCount { get; set; }

        [JsonPropertyName("questions")]
        public List<QuizQuestion> Questions { get; set; } = [];

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
    }
}

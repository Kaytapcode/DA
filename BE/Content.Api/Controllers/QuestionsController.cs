using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;
using System.Text.Json;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/quizzes/{quizId:guid}")]
    [Authorize]
    public class QuestionsController : ControllerBase
    {
        private readonly IQuestionRepository _repo;
        private readonly IOrgContextService _orgCtx;

        public QuestionsController(IQuestionRepository repo, IOrgContextService orgCtx)
        {
            _repo = repo;
            _orgCtx = orgCtx;
        }

        private async Task<bool> VerifyQuizAccessAsync(Guid quizId)
        {
            var orgId = await _repo.GetQuizOrgIdAsync(quizId);
            // Personal/draft quiz (not attached to any module/course): allow any authenticated user.
            // Per spec section 1, personal resources are public and accessible to all users.
            if (orgId == null) return _orgCtx.GetCurrentUserId().HasValue;
            return _orgCtx.IsSysAdmin() || orgId == _orgCtx.GetCurrentOrgId();
        }

        private bool IsTeacherOrAbove()
        {
            var role = _orgCtx.GetCurrentRole();
            return role is "SysAdmin" or "OrgAdmin" or "Teacher";
        }

        private QuestionDto ToStudentDto(QuestionModel q) => new(
            q.Id, q.QuizId, q.QuestionText, q.Explanation, q.OrderIndex,
            q.Options.Select(o => new QuestionOptionDto(o.Id, o.OptionText, o.OrderIndex)).ToList()
        );

        private QuestionTeacherDto ToTeacherDto(QuestionModel q) => new(
            q.Id, q.QuizId, q.QuestionText, q.Explanation, q.OrderIndex,
            q.Options.Select(o => new QuestionOptionTeacherDto(o.Id, o.OptionText, o.IsCorrect, o.OrderIndex)).ToList()
        );

        // GET /api/quizzes
        [HttpGet("/api/quizzes")]
        public async Task<IActionResult> GetQuizzes(CancellationToken ct)
        {
            var quizzes = await _repo.GetQuizzesAsync(_orgCtx.GetCurrentOrgId(), _orgCtx.IsSysAdmin(), ct);
            var result = quizzes.Select(q => new QuizSummaryDto(
                q.Id,
                q.ContentId,
                q.Content?.Title ?? "Untitled Quiz",
                q.Content?.Status ?? "DRAFT",
                q.CreatedAt
            ));

            return Ok(new ApiResponse<IEnumerable<QuizSummaryDto>>(true, result, null));
        }

        // POST /api/quizzes - create new draft quiz (any authenticated user; personal/public per spec)
        [HttpPost("/api/quizzes")]
        public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizRequestDto request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new ApiResponse(false, "Title is required."));

            var quiz = await _repo.CreateQuizAsync(request.Title.Trim(), request.TimeLimit, request.PassingScore, _orgCtx.GetCurrentUserId(), ct);

            var summary = new QuizSummaryDto(
                quiz.Id,
                quiz.ContentId,
                quiz.Content?.Title ?? request.Title,
                quiz.Content?.Status ?? "DRAFT",
                quiz.CreatedAt
            );
            return Ok(new ApiResponse<QuizSummaryDto>(true, summary, "Quiz created."));
        }

        // GET /api/quizzes/{quizId}/questions
        [HttpGet("questions")]
        public async Task<IActionResult> GetQuestions(Guid quizId, CancellationToken ct)
        {
            if (!await VerifyQuizAccessAsync(quizId))
                return NotFound(new ApiResponse(false, "Quiz not found."));

            var questions = await _repo.GetByQuizIdAsync(quizId, ct);

            if (IsTeacherOrAbove())
                return Ok(new ApiResponse<IEnumerable<QuestionTeacherDto>>(true, questions.Select(ToTeacherDto), null));

            return Ok(new ApiResponse<IEnumerable<QuestionDto>>(true, questions.Select(ToStudentDto), null));
        }

        // GET /api/quizzes/{quizId}/questions/{questionId}
        [HttpGet("questions/{questionId:guid}")]
        public async Task<IActionResult> GetQuestion(Guid quizId, Guid questionId, CancellationToken ct)
        {
            if (!await VerifyQuizAccessAsync(quizId))
                return NotFound(new ApiResponse(false, "Quiz not found."));

            var question = await _repo.GetByIdAsync(questionId, ct);
            if (question == null || question.QuizId != quizId)
                return NotFound(new ApiResponse(false, "Question not found."));

            if (IsTeacherOrAbove())
                return Ok(new ApiResponse<QuestionTeacherDto>(true, ToTeacherDto(question), null));

            return Ok(new ApiResponse<QuestionDto>(true, ToStudentDto(question), null));
        }

        // POST /api/quizzes/{quizId}/questions - parent quiz access is verified inside
        [HttpPost("questions")]
        public async Task<IActionResult> CreateQuestion(Guid quizId, [FromBody] CreateQuestionRequestDto request, CancellationToken ct)
        {
            if (!await VerifyQuizAccessAsync(quizId))
                return NotFound(new ApiResponse(false, "Quiz not found."));

            if (request.Options == null || request.Options.Count < 2)
                return BadRequest(new ApiResponse(false, "A question must have at least 2 options."));

            if (!request.Options.Any(o => o.IsCorrect))
                return BadRequest(new ApiResponse(false, "At least one option must be marked as correct."));

            var question = new QuestionModel
            {
                QuizId = quizId,
                QuestionText = request.QuestionText,
                Explanation = request.Explanation,
                OrderIndex = request.OrderIndex
            };

            var options = request.Options.Select((o, i) => new QuestionOptionModel
            {
                OptionText = o.OptionText,
                IsCorrect = o.IsCorrect,
                OrderIndex = o.OrderIndex == 0 ? i : o.OrderIndex
            }).ToList();

            var created = await _repo.CreateAsync(question, options, ct);
            return Ok(new ApiResponse<QuestionTeacherDto>(true, ToTeacherDto(created), "Question created."));
        }

        // POST /api/quizzes/{quizId}/generate - parent quiz access is verified inside
        [HttpPost("generate")]
        public async Task<IActionResult> ImportAiQuestions(Guid quizId, [FromBody] ImportAiQuestionsRequestDto request, CancellationToken ct)
        {
            if (!await VerifyQuizAccessAsync(quizId))
                return NotFound(new ApiResponse(false, "Quiz not found."));

            if (request.Questions == null || request.Questions.Count == 0)
                return BadRequest(new ApiResponse(false, "At least one question is required."));

            var questions = request.Questions
                .Select(q => (q.Question, q.Options, q.CorrectIndex, (string?)q.Explanation))
                .ToList();

            var created = await _repo.CreateBulkAsync(quizId, questions, ct);
            // Spec §2.1: when AI-generated, mark so the UI can require Explanation display on results.
            await _repo.MarkQuizAiGeneratedAsync(quizId, ct);
            var dtos = created.Select(ToTeacherDto).ToList();

            return Ok(new ApiResponse<List<QuestionTeacherDto>>(true, dtos, $"Successfully imported {created.Count} questions."));
        }

        // PUT /api/quizzes/{quizId}/questions/{questionId} - parent quiz access is verified inside
        [HttpPut("questions/{questionId:guid}")]
        public async Task<IActionResult> UpdateQuestion(Guid quizId, Guid questionId, [FromBody] UpdateQuestionRequestDto request, CancellationToken ct)
        {
            if (!await VerifyQuizAccessAsync(quizId))
                return NotFound(new ApiResponse(false, "Quiz not found."));

            var question = await _repo.GetByIdAsync(questionId, ct);
            if (question == null || question.QuizId != quizId)
                return NotFound(new ApiResponse(false, "Question not found."));

            if (request.Options == null || request.Options.Count < 2)
                return BadRequest(new ApiResponse(false, "A question must have at least 2 options."));

            if (!request.Options.Any(o => o.IsCorrect))
                return BadRequest(new ApiResponse(false, "At least one option must be marked as correct."));

            question.QuestionText = request.QuestionText;
            question.Explanation = request.Explanation;

            var options = request.Options.Select((o, i) => new QuestionOptionModel
            {
                OptionText = o.OptionText,
                IsCorrect = o.IsCorrect,
                OrderIndex = o.OrderIndex == 0 ? i : o.OrderIndex
            }).ToList();

            var updated = await _repo.UpdateAsync(question, options, ct);
            return Ok(new ApiResponse<QuestionTeacherDto>(true, ToTeacherDto(updated), "Question updated."));
        }

        // DELETE /api/quizzes/{quizId}/questions/{questionId} - parent quiz access is verified inside
        [HttpDelete("questions/{questionId:guid}")]
        public async Task<IActionResult> DeleteQuestion(Guid quizId, Guid questionId, CancellationToken ct)
        {
            if (!await VerifyQuizAccessAsync(quizId))
                return NotFound(new ApiResponse(false, "Quiz not found."));

            var question = await _repo.GetByIdAsync(questionId, ct);
            if (question == null || question.QuizId != quizId)
                return NotFound(new ApiResponse(false, "Question not found."));

            await _repo.SoftDeleteAsync(questionId, ct);
            return Ok(new ApiResponse(true, "Question deleted."));
        }

        // PATCH /api/quizzes/{quizId}/questions/{questionId}/reorder - parent quiz access is verified inside
        [HttpPatch("questions/{questionId:guid}/reorder")]
        public async Task<IActionResult> ReorderQuestion(Guid quizId, Guid questionId, [FromBody] ReorderQuestionRequestDto request, CancellationToken ct)
        {
            if (!await VerifyQuizAccessAsync(quizId))
                return NotFound(new ApiResponse(false, "Quiz not found."));

            await _repo.ReorderAsync(quizId, questionId, request.NewOrderIndex, ct);
            return Ok(new ApiResponse(true, "Question reordered."));
        }

        // POST /api/quizzes/{quizId}/submit
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitQuiz(Guid quizId, [FromBody] QuizSubmitRequestDto request, CancellationToken ct)
        {
            if (!await VerifyQuizAccessAsync(quizId))
                return NotFound(new ApiResponse(false, "Quiz not found."));

            var quiz = await _repo.GetQuizWithQuestionsAsync(quizId, ct);
            if (quiz == null)
                return NotFound(new ApiResponse(false, "Quiz not found."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var questions = quiz.Questions.ToList();
            if (questions.Count == 0)
                return BadRequest(new ApiResponse(false, "Quiz has no questions."));

            // Grade each answer
            var results = new List<QuestionResultDto>();
            int correctCount = 0;

            foreach (var answer in request.Answers)
            {
                var question = questions.FirstOrDefault(q => q.Id == answer.QuestionId);
                if (question == null) continue;

                var selectedOption = question.Options.FirstOrDefault(o => o.Id == answer.SelectedOptionId);
                var correctOption = question.Options.FirstOrDefault(o => o.IsCorrect);

                bool isCorrect = selectedOption?.IsCorrect == true;
                if (isCorrect) correctCount++;

                results.Add(new QuestionResultDto(
                    QuestionId: question.Id,
                    IsCorrect: isCorrect,
                    SelectedOptionId: answer.SelectedOptionId,
                    CorrectOptionId: correctOption?.Id ?? Guid.Empty,
                    Explanation: question.Explanation
                ));
            }

            int scorePercentage = questions.Count > 0
                ? (correctCount * 100) / questions.Count
                : 0;

            // Serialize answers as { "questionId": "selectedOptionId" }
            var answersDict = request.Answers.ToDictionary(
                a => a.QuestionId.ToString(),
                a => a.SelectedOptionId.ToString());
            var answersJson = JsonSerializer.Serialize(answersDict);

            // Save attempt
            await _repo.SaveAttemptAsync(new QuizAttemptModel
            {
                QuizId = quizId,
                UserId = userId.Value,
                ScorePercentage = scorePercentage,
                Answers = answersJson,
                TimeTakenSeconds = request.TimeTakenSeconds
            }, ct);

            return Ok(new ApiResponse<QuizSubmitResultDto>(true,
                new QuizSubmitResultDto(quizId, scorePercentage, correctCount, questions.Count, results),
                "Quiz submitted."));
        }
    }
}

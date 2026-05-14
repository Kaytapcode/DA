using Content.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Content.Api.Data
{
    public interface IQuestionRepository
    {
        Task<List<QuestionModel>> GetByQuizIdAsync(Guid quizId, CancellationToken ct = default);
        Task<QuestionModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<Guid?> GetQuizOrgIdAsync(Guid quizId, CancellationToken ct = default);
        Task<QuizModel?> GetQuizWithQuestionsAsync(Guid quizId, CancellationToken ct = default);
        Task<QuestionModel> CreateAsync(QuestionModel question, List<QuestionOptionModel> options, CancellationToken ct = default);
        Task<List<QuestionModel>> CreateBulkAsync(Guid quizId, List<(string QuestionText, List<string> Options, int CorrectIndex, string? Explanation)> questions, CancellationToken ct = default);
        Task<QuestionModel> UpdateAsync(QuestionModel question, List<QuestionOptionModel> options, CancellationToken ct = default);
        Task SoftDeleteAsync(Guid id, CancellationToken ct = default);
        Task ReorderAsync(Guid quizId, Guid questionId, int newIndex, CancellationToken ct = default);
        Task<QuizAttemptModel> SaveAttemptAsync(QuizAttemptModel attempt, CancellationToken ct = default);
    }

    public class QuestionRepository : IQuestionRepository
    {
        private readonly ContentDbContext _db;

        public QuestionRepository(ContentDbContext db) => _db = db;

        public async Task<List<QuestionModel>> GetByQuizIdAsync(Guid quizId, CancellationToken ct = default)
            => await _db.Questions
                .Where(q => q.QuizId == quizId && q.DeletedAt == null)
                .Include(q => q.Options.OrderBy(o => o.OrderIndex))
                .OrderBy(q => q.OrderIndex)
                .ToListAsync(ct);

        public async Task<QuestionModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => await _db.Questions
                .Where(q => q.Id == id && q.DeletedAt == null)
                .Include(q => q.Options.OrderBy(o => o.OrderIndex))
                .FirstOrDefaultAsync(ct);

        public async Task<Guid?> GetQuizOrgIdAsync(Guid quizId, CancellationToken ct = default)
            => await _db.Quizzes
                .Where(q => q.Id == quizId)
                .SelectMany(q => q.Content!.ModuleContents)
                .Select(mc => (Guid?)mc.Module!.OrgId)
                .FirstOrDefaultAsync(ct);

        public async Task<QuizModel?> GetQuizWithQuestionsAsync(Guid quizId, CancellationToken ct = default)
            => await _db.Quizzes
                .Where(q => q.Id == quizId)
                .Include(q => q.Questions.Where(q => q.DeletedAt == null).OrderBy(q => q.OrderIndex))
                    .ThenInclude(q => q.Options.OrderBy(o => o.OrderIndex))
                .FirstOrDefaultAsync(ct);

        public async Task<QuestionModel> CreateAsync(QuestionModel question, List<QuestionOptionModel> options, CancellationToken ct = default)
        {
            var maxOrder = await _db.Questions
                .Where(q => q.QuizId == question.QuizId && q.DeletedAt == null)
                .MaxAsync(q => (int?)q.OrderIndex, ct) ?? -1;

            question.Id = Guid.NewGuid();
            question.OrderIndex = maxOrder + 1;
            question.CreatedAt = DateTime.UtcNow;

            foreach (var opt in options)
            {
                opt.Id = Guid.NewGuid();
                opt.QuestionId = question.Id;
                opt.CreatedAt = DateTime.UtcNow;
            }

            question.Options = options;
            _db.Questions.Add(question);
            await _db.SaveChangesAsync(ct);
            return question;
        }

        public async Task<List<QuestionModel>> CreateBulkAsync(Guid quizId, List<(string QuestionText, List<string> Options, int CorrectIndex, string? Explanation)> questions, CancellationToken ct = default)
        {
            var maxOrder = await _db.Questions
                .Where(q => q.QuizId == quizId && q.DeletedAt == null)
                .MaxAsync(q => (int?)q.OrderIndex, ct) ?? -1;

            var createdQuestions = new List<QuestionModel>();
            var now = DateTime.UtcNow;

            foreach (var (questionText, options, correctIndex, explanation) in questions)
            {
                maxOrder++;
                var question = new QuestionModel
                {
                    Id = Guid.NewGuid(),
                    QuizId = quizId,
                    QuestionText = questionText,
                    Explanation = explanation,
                    OrderIndex = maxOrder,
                    CreatedAt = now
                };

                var optionModels = options.Select((optionText, index) => new QuestionOptionModel
                {
                    Id = Guid.NewGuid(),
                    QuestionId = question.Id,
                    OptionText = optionText,
                    IsCorrect = index == correctIndex,
                    OrderIndex = index,
                    CreatedAt = now
                }).ToList();

                question.Options = optionModels;
                _db.Questions.Add(question);
                _db.QuestionOptions.AddRange(optionModels);
                createdQuestions.Add(question);
            }

            await _db.SaveChangesAsync(ct);
            return createdQuestions;
        }

        public async Task<QuestionModel> UpdateAsync(QuestionModel question, List<QuestionOptionModel> options, CancellationToken ct = default)
        {
            // Remove old options
            var oldOptions = await _db.QuestionOptions.Where(o => o.QuestionId == question.Id).ToListAsync(ct);
            _db.QuestionOptions.RemoveRange(oldOptions);

            // Add new options
            foreach (var opt in options)
            {
                opt.Id = Guid.NewGuid();
                opt.QuestionId = question.Id;
                opt.CreatedAt = DateTime.UtcNow;
            }

            question.UpdatedAt = DateTime.UtcNow;
            question.Options = options;
            _db.Questions.Update(question);
            await _db.SaveChangesAsync(ct);
            return question;
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken ct = default)
        {
            var question = await _db.Questions.FindAsync(new object[] { id }, cancellationToken: ct)
                ?? throw new KeyNotFoundException($"Question {id} not found.");
            question.DeletedAt = DateTime.UtcNow;
            question.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        public async Task ReorderAsync(Guid quizId, Guid questionId, int newIndex, CancellationToken ct = default)
        {
            var question = await _db.Questions.FirstOrDefaultAsync(q => q.Id == questionId && q.QuizId == quizId && q.DeletedAt == null, ct)
                ?? throw new KeyNotFoundException($"Question {questionId} not found.");

            // Find the question currently occupying the target index
            var displaced = await _db.Questions.FirstOrDefaultAsync(
                q => q.QuizId == quizId && q.OrderIndex == newIndex && q.DeletedAt == null && q.Id != questionId, ct);

            if (displaced != null)
            {
                displaced.OrderIndex = question.OrderIndex;
                _db.Questions.Update(displaced);
            }

            question.OrderIndex = newIndex;
            question.UpdatedAt = DateTime.UtcNow;
            _db.Questions.Update(question);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<QuizAttemptModel> SaveAttemptAsync(QuizAttemptModel attempt, CancellationToken ct = default)
        {
            attempt.Id = Guid.NewGuid();
            attempt.CreatedAt = DateTime.UtcNow;
            _db.QuizAttempts.Add(attempt);
            await _db.SaveChangesAsync(ct);
            return attempt;
        }
    }
}

using Content.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Content.Api.Data
{
    public interface IFlashcardRepository
    {
        Task<FlashcardDeckModel?> GetDeckByIdAsync(Guid deckId, CancellationToken ct = default);
        Task<Guid?> GetDeckOrgIdAsync(Guid deckId, CancellationToken ct = default);
        Task<List<FlashcardModel>> GetByDeckIdAsync(Guid deckId, CancellationToken ct = default);
        Task<FlashcardModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<FlashcardModel> CreateAsync(FlashcardModel card, CancellationToken ct = default);
        Task<FlashcardModel> UpdateAsync(FlashcardModel card, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
        Task MarkMasteredAsync(Guid id, bool mastered, CancellationToken ct = default);
    }

    public class FlashcardRepository : IFlashcardRepository
    {
        private readonly ContentDbContext _db;

        public FlashcardRepository(ContentDbContext db) => _db = db;

        public async Task<FlashcardDeckModel?> GetDeckByIdAsync(Guid deckId, CancellationToken ct = default)
            => await _db.FlashcardDecks.FirstOrDefaultAsync(d => d.Id == deckId, ct);

        public async Task<Guid?> GetDeckOrgIdAsync(Guid deckId, CancellationToken ct = default)
            => await _db.FlashcardDecks
                .Where(d => d.Id == deckId)
                .SelectMany(d => d.Content!.ModuleContents)
                .Select(mc => (Guid?)mc.Module!.OrgId)
                .FirstOrDefaultAsync(ct);

        public async Task<List<FlashcardModel>> GetByDeckIdAsync(Guid deckId, CancellationToken ct = default)
            => await _db.Flashcards
                .Where(f => f.DeckId == deckId)
                .OrderBy(f => f.OrderIndex)
                .ToListAsync(ct);

        public async Task<FlashcardModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => await _db.Flashcards.FirstOrDefaultAsync(f => f.Id == id, ct);

        public async Task<FlashcardModel> CreateAsync(FlashcardModel card, CancellationToken ct = default)
        {
            var maxOrder = await _db.Flashcards
                .Where(f => f.DeckId == card.DeckId)
                .MaxAsync(f => (int?)f.OrderIndex, ct) ?? -1;

            card.Id = Guid.NewGuid();
            card.OrderIndex = card.OrderIndex == 0 ? maxOrder + 1 : card.OrderIndex;
            card.CreatedAt = DateTime.UtcNow;

            _db.Flashcards.Add(card);
            await _db.SaveChangesAsync(ct);
            return card;
        }

        public async Task<FlashcardModel> UpdateAsync(FlashcardModel card, CancellationToken ct = default)
        {
            card.UpdatedAt = DateTime.UtcNow;
            _db.Flashcards.Update(card);
            await _db.SaveChangesAsync(ct);
            return card;
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var card = await _db.Flashcards.FindAsync(new object[] { id }, cancellationToken: ct)
                ?? throw new KeyNotFoundException($"Flashcard {id} not found.");
            _db.Flashcards.Remove(card);
            await _db.SaveChangesAsync(ct);
        }

        public async Task MarkMasteredAsync(Guid id, bool mastered, CancellationToken ct = default)
        {
            var card = await _db.Flashcards.FindAsync(new object[] { id }, cancellationToken: ct)
                ?? throw new KeyNotFoundException($"Flashcard {id} not found.");
            card.IsMastered = mastered;
            card.MasteredAt = mastered ? DateTime.UtcNow : null;
            card.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
    }
}

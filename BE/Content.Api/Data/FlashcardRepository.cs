using Content.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Content.Api.Data
{
    public interface IFlashcardRepository
    {
        Task<List<FlashcardDeckModel>> GetDecksAsync(Guid? orgId, Guid? userId, bool isSysAdmin, CancellationToken ct = default);
        Task<FlashcardDeckModel?> GetDeckByIdAsync(Guid deckId, CancellationToken ct = default);
        Task<Guid?> GetDeckOrgIdAsync(Guid deckId, CancellationToken ct = default);
        Task<FlashcardDeckModel> CreateDeckAsync(string title, string? theme, Guid? createdByUserId, CancellationToken ct = default);
        Task<int> ResetMasteredAsync(Guid deckId, Guid userId, CancellationToken ct = default);
        Task<List<FlashcardModel>> GetByDeckIdAsync(Guid deckId, CancellationToken ct = default);
        Task<FlashcardModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<FlashcardModel> CreateAsync(FlashcardModel card, CancellationToken ct = default);
        Task<FlashcardModel> UpdateAsync(FlashcardModel card, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
        Task MarkMasteredAsync(Guid cardId, Guid userId, bool mastered, CancellationToken ct = default);
        Task<bool> IsCardMasteredByUserAsync(Guid cardId, Guid userId, CancellationToken ct = default);
    }

    public class FlashcardRepository : IFlashcardRepository
    {
        private readonly ContentDbContext _db;

        public FlashcardRepository(ContentDbContext db) => _db = db;

        public async Task<List<FlashcardDeckModel>> GetDecksAsync(Guid? orgId, Guid? userId, bool isSysAdmin, CancellationToken ct = default)
        {
            var query = _db.FlashcardDecks
                .Include(d => d.Content)
                    .ThenInclude(c => c!.ModuleContents)
                        .ThenInclude(mc => mc.Module)
                .Include(d => d.Flashcards)
                .AsQueryable();

            if (!isSysAdmin)
            {
                if (!orgId.HasValue && !userId.HasValue) return [];
                // Show decks belonging to the user's org OR any public deck.
                query = query.Where(d =>
                    d.Content != null &&
                    !d.Content.IsCourseScoped && // course-created content stays inside its course
                    (
                        (orgId.HasValue && d.Content.ModuleContents.Any(mc => mc.Module != null && mc.Module.OrgId == orgId.Value))
                        || d.Content.IsPublic
                    ));
            }

            return await query
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<FlashcardDeckModel?> GetDeckByIdAsync(Guid deckId, CancellationToken ct = default)
            => await _db.FlashcardDecks.FirstOrDefaultAsync(d => d.Id == deckId, ct);

        public async Task<Guid?> GetDeckOrgIdAsync(Guid deckId, CancellationToken ct = default)
            => await _db.FlashcardDecks
                .Where(d => d.Id == deckId)
                .SelectMany(d => d.Content!.ModuleContents)
                .Select(mc => (Guid?)mc.Module!.OrgId)
                .FirstOrDefaultAsync(ct);

        public async Task<FlashcardDeckModel> CreateDeckAsync(string title, string? theme, Guid? createdByUserId, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var content = new ContentModel
            {
                Id = Guid.NewGuid(),
                Title = title,
                ContentType = "FLASHCARD",
                Status = "DRAFT",
                CreatedByUserId = createdByUserId,
                IsPublic = true, // Spec §1
                CreatedAt = now
            };
            var deck = new FlashcardDeckModel
            {
                Id = Guid.NewGuid(),
                ContentId = content.Id,
                Theme = string.IsNullOrWhiteSpace(theme) ? "Default" : theme!,
                CreatedAt = now
            };

            _db.Contents.Add(content);
            _db.FlashcardDecks.Add(deck);
            await _db.SaveChangesAsync(ct);
            deck.Content = content;
            return deck;
        }

        public async Task<int> ResetMasteredAsync(Guid deckId, Guid userId, CancellationToken ct = default)
        {
            var masteries = await _db.FlashcardUserMasteries
                .Where(fum => fum.Flashcard!.DeckId == deckId && fum.UserId == userId && fum.IsMastered)
                .ToListAsync(ct);
            foreach (var m in masteries)
            {
                m.IsMastered = false;
                m.MasteredAt = null;
                m.UpdatedAt = DateTime.UtcNow;
            }
            if (masteries.Count > 0) await _db.SaveChangesAsync(ct);
            return masteries.Count;
        }

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

        public async Task MarkMasteredAsync(Guid cardId, Guid userId, bool mastered, CancellationToken ct = default)
        {
            var card = await _db.Flashcards.FindAsync(new object[] { cardId }, cancellationToken: ct)
                ?? throw new KeyNotFoundException($"Flashcard {cardId} not found.");

            var mastery = await _db.FlashcardUserMasteries
                .FirstOrDefaultAsync(fum => fum.FlashcardId == cardId && fum.UserId == userId, ct);

            if (mastery == null)
            {
                mastery = new FlashcardUserMasteryModel
                {
                    FlashcardId = cardId,
                    UserId = userId,
                    IsMastered = mastered,
                    MasteredAt = mastered ? DateTime.UtcNow : null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.FlashcardUserMasteries.Add(mastery);
            }
            else
            {
                mastery.IsMastered = mastered;
                mastery.MasteredAt = mastered ? DateTime.UtcNow : null;
                mastery.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
        }

        public async Task<bool> IsCardMasteredByUserAsync(Guid cardId, Guid userId, CancellationToken ct = default)
        {
            var mastery = await _db.FlashcardUserMasteries
                .FirstOrDefaultAsync(fum => fum.FlashcardId == cardId && fum.UserId == userId, ct);
            return mastery?.IsMastered ?? false;
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Content.Api.Data;
using Content.Api.Models;
using Content.Api.Services;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Content.Api.Controllers
{
    [ApiController]
    [Route("api/decks/{deckId:guid}/flashcards")]
    [Authorize]
    public class FlashcardsController : ControllerBase
    {
        private readonly IFlashcardRepository _repo;
        private readonly IOrgContextService _orgCtx;
        private readonly ContentDbContext _db;

        public FlashcardsController(IFlashcardRepository repo, IOrgContextService orgCtx, ContentDbContext db)
        {
            _repo = repo;
            _orgCtx = orgCtx;
            _db = db;
        }

        private async Task<bool> VerifyDeckAccessAsync(Guid deckId)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return false;
            if (_orgCtx.IsSysAdmin()) return true;

            var deck = await _db.FlashcardDecks
                .Include(d => d.Content)
                    .ThenInclude(c => c!.ModuleContents)
                        .ThenInclude(mc => mc.Module)
                .FirstOrDefaultAsync(d => d.Id == deckId);
            if (deck?.Content == null) return false;

            // Public decks are readable by any authenticated user.
            if (deck.Content.IsPublic) return true;

            // Non-public decks are limited to same-org access.
            var orgId = deck.Content.ModuleContents
                .Where(mc => mc.Module != null)
                .Select(mc => (Guid?)mc.Module!.OrgId)
                .FirstOrDefault();
            return orgId.HasValue && orgId == _orgCtx.GetCurrentOrgId();
        }

        // Mutation guard: only the deck owner or a SysAdmin may create/edit/delete cards.
        private async Task<bool> VerifyDeckWriteAsync(Guid deckId, CancellationToken ct = default)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue) return false;
            if (_orgCtx.IsSysAdmin()) return true;
            var deck = await _db.FlashcardDecks
                .Include(d => d.Content)
                .FirstOrDefaultAsync(d => d.Id == deckId, ct);
            return deck?.Content?.CreatedByUserId == userId;
        }

        private static FlashcardDto ToDto(FlashcardModel f) => new(
            f.Id, f.DeckId, f.FrontText, f.BackText,
            f.IsMastered, f.MasteredAt, f.OrderIndex, f.CreatedAt
        );

        // GET /api/decks
        [HttpGet("/api/decks")]
        public async Task<IActionResult> GetDecks(CancellationToken ct)
        {
            var decks = await _repo.GetDecksAsync(_orgCtx.GetCurrentOrgId(), _orgCtx.GetCurrentUserId(), _orgCtx.IsSysAdmin(), ct);
            var result = decks.Select(d => new FlashcardDeckSummaryDto(
                DeckId: d.Id,
                ContentId: d.ContentId,
                Title: d.Content?.Title ?? "Untitled Deck",
                Status: d.Content?.Status ?? "DRAFT",
                CardCount: d.Flashcards.Count,
                MasteredCount: d.Flashcards.Count(f => f.IsMastered),
                CreatedAt: d.CreatedAt,
                CreatedByUserId: d.Content?.CreatedByUserId,
                Theme: d.Theme
            ));

            return Ok(new ApiResponse<IEnumerable<FlashcardDeckSummaryDto>>(true, result, null));
        }

        // GET /api/decks/{deckId} — deck summary including ownership info (for FE owner checks).
        [HttpGet("/api/decks/{deckId:guid}")]
        public async Task<IActionResult> GetDeck(Guid deckId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var deck = await _db.FlashcardDecks
                .Include(d => d.Content)
                .Include(d => d.Flashcards)
                .FirstOrDefaultAsync(d => d.Id == deckId, ct);
            if (deck == null)
                return NotFound(new ApiResponse(false, "Deck not found."));

            var summary = new FlashcardDeckSummaryDto(
                DeckId: deck.Id,
                ContentId: deck.ContentId,
                Title: deck.Content?.Title ?? "Untitled Deck",
                Status: deck.Content?.Status ?? "DRAFT",
                CardCount: deck.Flashcards.Count,
                MasteredCount: deck.Flashcards.Count(f => f.IsMastered),
                CreatedAt: deck.CreatedAt,
                CreatedByUserId: deck.Content?.CreatedByUserId,
                Theme: deck.Theme
            );
            return Ok(new ApiResponse<FlashcardDeckSummaryDto>(true, summary, null));
        }

        // PATCH /api/decks/{deckId} — rename deck or update theme. Owner or SysAdmin only.
        [HttpPatch("/api/decks/{deckId:guid}")]
        public async Task<IActionResult> UpdateDeck(Guid deckId, [FromBody] UpdateDeckRequestDto request, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));
            if (!await VerifyDeckWriteAsync(deckId, ct))
                return StatusCode(403, new ApiResponse(false, "Only the deck owner may edit this deck."));

            var deck = await _db.FlashcardDecks
                .Include(d => d.Content)
                .FirstOrDefaultAsync(d => d.Id == deckId, ct);
            if (deck == null || deck.Content == null)
                return NotFound(new ApiResponse(false, "Deck not found."));

            if (!string.IsNullOrWhiteSpace(request.Title))
                deck.Content.Title = request.Title.Trim();
            if (!string.IsNullOrWhiteSpace(request.Theme))
                deck.Theme = request.Theme.Trim();

            await _db.SaveChangesAsync(ct);

            var summary = new FlashcardDeckSummaryDto(
                DeckId: deck.Id,
                ContentId: deck.ContentId,
                Title: deck.Content.Title,
                Status: deck.Content.Status,
                CardCount: await _db.Flashcards.CountAsync(f => f.DeckId == deck.Id, ct),
                MasteredCount: 0,
                CreatedAt: deck.CreatedAt,
                CreatedByUserId: deck.Content.CreatedByUserId,
                Theme: deck.Theme
            );
            return Ok(new ApiResponse<FlashcardDeckSummaryDto>(true, summary, "Deck updated."));
        }

        // POST /api/decks - create new draft deck (any authenticated user; personal/public per spec)
        [HttpPost("/api/decks")]
        public async Task<IActionResult> CreateDeck([FromBody] CreateDeckRequestDto request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new ApiResponse(false, "Title is required."));

            var deck = await _repo.CreateDeckAsync(request.Title.Trim(), request.Theme, _orgCtx.GetCurrentUserId(), ct);

            var summary = new FlashcardDeckSummaryDto(
                DeckId: deck.Id,
                ContentId: deck.ContentId,
                Title: deck.Content?.Title ?? request.Title,
                Status: deck.Content?.Status ?? "DRAFT",
                CardCount: 0,
                MasteredCount: 0,
                CreatedAt: deck.CreatedAt,
                CreatedByUserId: deck.Content?.CreatedByUserId,
                Theme: deck.Theme
            );
            return Ok(new ApiResponse<FlashcardDeckSummaryDto>(true, summary, "Deck created."));
        }

        // GET /api/decks/{deckId}/flashcards
        [HttpGet]
        public async Task<IActionResult> GetFlashcards(Guid deckId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var deck = await _repo.GetDeckByIdAsync(deckId, ct);
            if (deck == null)
                return NotFound(new ApiResponse(false, "Deck not found."));

            var userId = _orgCtx.GetCurrentUserId();
            var isOwner = userId.HasValue && deck.Content?.CreatedByUserId == userId.Value;

            var cards = await _repo.GetByDeckIdAsync(deckId, ct);
            
            // Load mastery data for current user
            var userMasteryMap = new Dictionary<Guid, bool>();
            if (userId.HasValue)
            {
                var userMasteries = await _db.FlashcardUserMasteries
                    .Where(fum => cards.Select(c => c.Id).Contains(fum.FlashcardId) && fum.UserId == userId.Value)
                    .ToListAsync(ct);
                foreach (var mastery in userMasteries)
                    userMasteryMap[mastery.FlashcardId] = mastery.IsMastered;
            }

            var result = cards.Select(card => new FlashcardDto(
                card.Id,
                card.DeckId,
                card.FrontText,
                card.BackText,
                userMasteryMap.ContainsKey(card.Id) ? userMasteryMap[card.Id] : false,
                null,
                card.OrderIndex,
                card.CreatedAt
            ));

            return Ok(new ApiResponse<IEnumerable<FlashcardDto>>(true, result, null));
        }

        // GET /api/decks/{deckId}/flashcards/{cardId}
        [HttpGet("{cardId:guid}")]
        public async Task<IActionResult> GetFlashcard(Guid deckId, Guid cardId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var deck = await _repo.GetDeckByIdAsync(deckId, ct);
            if (deck == null)
                return NotFound(new ApiResponse(false, "Deck not found."));

            var card = await _repo.GetByIdAsync(cardId, ct);
            if (card == null || card.DeckId != deckId)
                return NotFound(new ApiResponse(false, "Flashcard not found."));

            var userId = _orgCtx.GetCurrentUserId();
            var isOwner = userId.HasValue && deck.Content?.CreatedByUserId == userId.Value;

            var dto = isOwner
                ? ToDto(card)
                : new FlashcardDto(
                    card.Id,
                    card.DeckId,
                    card.FrontText,
                    card.BackText,
                    false,
                    null,
                    card.OrderIndex,
                    card.CreatedAt
                );

            return Ok(new ApiResponse<FlashcardDto>(true, dto, null));
        }

        // POST /api/decks/{deckId}/flashcards - only the deck owner may add cards
        [HttpPost]
        public async Task<IActionResult> CreateFlashcard(Guid deckId, [FromBody] CreateFlashcardRequestDto request, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));
            if (!await VerifyDeckWriteAsync(deckId, ct))
                return StatusCode(403, new ApiResponse(false, "Only the deck owner may add cards."));

            var card = new FlashcardModel
            {
                DeckId = deckId,
                FrontText = request.FrontText,
                BackText = request.BackText,
                OrderIndex = request.OrderIndex
            };

            var created = await _repo.CreateAsync(card, ct);
            return Ok(new ApiResponse<FlashcardDto>(true, ToDto(created), "Flashcard created."));
        }

        // PUT /api/decks/{deckId}/flashcards/{cardId} - only the deck owner may edit cards
        [HttpPut("{cardId:guid}")]
        public async Task<IActionResult> UpdateFlashcard(Guid deckId, Guid cardId, [FromBody] UpdateFlashcardRequestDto request, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));
            if (!await VerifyDeckWriteAsync(deckId, ct))
                return StatusCode(403, new ApiResponse(false, "Only the deck owner may edit cards."));

            var card = await _repo.GetByIdAsync(cardId, ct);
            if (card == null || card.DeckId != deckId)
                return NotFound(new ApiResponse(false, "Flashcard not found."));

            card.FrontText = request.FrontText;
            card.BackText = request.BackText;

            var updated = await _repo.UpdateAsync(card, ct);
            return Ok(new ApiResponse<FlashcardDto>(true, ToDto(updated), "Flashcard updated."));
        }

        // PUT /api/decks/{deckId}/flashcards/{cardId}/master
        // Any authenticated user may mark cards as mastered. Mastery is tracked per-user.
        [HttpPut("{cardId:guid}/master")]
        public async Task<IActionResult> ToggleMastered(Guid deckId, Guid cardId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var card = await _repo.GetByIdAsync(cardId, ct);
            if (card == null || card.DeckId != deckId)
                return NotFound(new ApiResponse(false, "Flashcard not found."));

            var isMastered = await _repo.IsCardMasteredByUserAsync(cardId, userId.Value, ct);
            await _repo.MarkMasteredAsync(cardId, userId.Value, !isMastered, ct);
            
            var updated = await _repo.GetByIdAsync(cardId, ct);
            var newState = await _repo.IsCardMasteredByUserAsync(cardId, userId.Value, ct);
            
            return Ok(new ApiResponse<FlashcardDto>(true, ToDto(updated!), $"Card marked as {(newState ? "mastered" : "unmastered")}."));
        }

        // POST /api/decks/{deckId}/flashcards/reset-mastered
        // Any authenticated user may reset their own mastery progress.
        [HttpPost("reset-mastered")]
        public async Task<IActionResult> ResetMastered(Guid deckId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var resetCount = await _repo.ResetMasteredAsync(deckId, userId.Value, ct);
            return Ok(new ApiResponse<object>(true, new { resetCount }, $"Reset {resetCount} card(s) to unmastered."));
        }

        // DELETE /api/decks/{deckId} — cascade-deletes the deck, all its cards, and the ContentModel.
        // Only the owner (Content.CreatedByUserId) or a SysAdmin may delete a personal deck.
        // Course-bound decks (attached to a module) are rejected — use the course-management API instead.
        [HttpDelete("/api/decks/{deckId:guid}")]
        public async Task<IActionResult> DeleteDeck(Guid deckId, CancellationToken ct)
        {
            var userId = _orgCtx.GetCurrentUserId();
            if (!userId.HasValue)
                return Unauthorized(new ApiResponse(false, "Invalid user context."));

            var deck = await _db.FlashcardDecks
                .Include(d => d.Content)
                    .ThenInclude(c => c!.ModuleContents)
                .FirstOrDefaultAsync(d => d.Id == deckId, ct);

            if (deck == null)
                return NotFound(new ApiResponse(false, "Deck not found."));

            if (deck.Content?.CreatedByUserId != userId && !_orgCtx.IsSysAdmin())
                return Forbid();

            if (deck.Content?.ModuleContents.Any() == true)
                return BadRequest(new ApiResponse(false, "Cannot delete a deck that is attached to a course module."));

            // Deleting ContentModel cascades: FlashcardDeck (OnDelete Cascade) → Flashcards (convention Cascade).
            // StudentProgress.ContentId is set to null (OnDelete SetNull) — history rows are preserved.
            _db.Contents.Remove(deck.Content!);
            await _db.SaveChangesAsync(ct);
            return Ok(new ApiResponse(true, "Deck deleted."));
        }

        // DELETE /api/decks/{deckId}/flashcards/{cardId} - only the deck owner may delete cards
        [HttpDelete("{cardId:guid}")]
        public async Task<IActionResult> DeleteFlashcard(Guid deckId, Guid cardId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));
            if (!await VerifyDeckWriteAsync(deckId, ct))
                return StatusCode(403, new ApiResponse(false, "Only the deck owner may delete cards."));

            var card = await _repo.GetByIdAsync(cardId, ct);
            if (card == null || card.DeckId != deckId)
                return NotFound(new ApiResponse(false, "Flashcard not found."));

            await _repo.DeleteAsync(cardId, ct);
            return Ok(new ApiResponse(true, "Flashcard deleted."));
        }
    }
}

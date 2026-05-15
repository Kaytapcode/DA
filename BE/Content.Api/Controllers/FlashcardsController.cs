using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public FlashcardsController(IFlashcardRepository repo, IOrgContextService orgCtx)
        {
            _repo = repo;
            _orgCtx = orgCtx;
        }

        private async Task<bool> VerifyDeckAccessAsync(Guid deckId)
        {
            var orgId = await _repo.GetDeckOrgIdAsync(deckId);
            // Personal/draft deck (not attached to any module/course): allow any authenticated user.
            // Per spec section 1, personal resources are public and accessible to all users.
            if (orgId == null) return _orgCtx.GetCurrentUserId().HasValue;
            return _orgCtx.IsSysAdmin() || orgId == _orgCtx.GetCurrentOrgId();
        }

        private static FlashcardDto ToDto(FlashcardModel f) => new(
            f.Id, f.DeckId, f.FrontText, f.BackText,
            f.IsMastered, f.MasteredAt, f.OrderIndex, f.CreatedAt
        );

        // GET /api/decks
        [HttpGet("/api/decks")]
        public async Task<IActionResult> GetDecks(CancellationToken ct)
        {
            var decks = await _repo.GetDecksAsync(_orgCtx.GetCurrentOrgId(), _orgCtx.IsSysAdmin(), ct);
            var result = decks.Select(d => new FlashcardDeckSummaryDto(
                DeckId: d.Id,
                ContentId: d.ContentId,
                Title: d.Content?.Title ?? "Untitled Deck",
                Status: d.Content?.Status ?? "DRAFT",
                CardCount: d.Flashcards.Count,
                MasteredCount: d.Flashcards.Count(f => f.IsMastered),
                CreatedAt: d.CreatedAt
            ));

            return Ok(new ApiResponse<IEnumerable<FlashcardDeckSummaryDto>>(true, result, null));
        }

        // POST /api/decks - create new draft deck (any authenticated user; personal/public per spec)
        [HttpPost("/api/decks")]
        public async Task<IActionResult> CreateDeck([FromBody] CreateDeckRequestDto request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new ApiResponse(false, "Title is required."));

            var deck = await _repo.CreateDeckAsync(request.Title.Trim(), request.Theme, ct);

            var summary = new FlashcardDeckSummaryDto(
                DeckId: deck.Id,
                ContentId: deck.ContentId,
                Title: deck.Content?.Title ?? request.Title,
                Status: deck.Content?.Status ?? "DRAFT",
                CardCount: 0,
                MasteredCount: 0,
                CreatedAt: deck.CreatedAt
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

            var cards = await _repo.GetByDeckIdAsync(deckId, ct);
            return Ok(new ApiResponse<IEnumerable<FlashcardDto>>(true, cards.Select(ToDto), null));
        }

        // GET /api/decks/{deckId}/flashcards/{cardId}
        [HttpGet("{cardId:guid}")]
        public async Task<IActionResult> GetFlashcard(Guid deckId, Guid cardId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var card = await _repo.GetByIdAsync(cardId, ct);
            if (card == null || card.DeckId != deckId)
                return NotFound(new ApiResponse(false, "Flashcard not found."));

            return Ok(new ApiResponse<FlashcardDto>(true, ToDto(card), null));
        }

        // POST /api/decks/{deckId}/flashcards - parent deck access is verified inside
        [HttpPost]
        public async Task<IActionResult> CreateFlashcard(Guid deckId, [FromBody] CreateFlashcardRequestDto request, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

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

        // PUT /api/decks/{deckId}/flashcards/{cardId}
        [HttpPut("{cardId:guid}")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> UpdateFlashcard(Guid deckId, Guid cardId, [FromBody] UpdateFlashcardRequestDto request, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var card = await _repo.GetByIdAsync(cardId, ct);
            if (card == null || card.DeckId != deckId)
                return NotFound(new ApiResponse(false, "Flashcard not found."));

            card.FrontText = request.FrontText;
            card.BackText = request.BackText;

            var updated = await _repo.UpdateAsync(card, ct);
            return Ok(new ApiResponse<FlashcardDto>(true, ToDto(updated), "Flashcard updated."));
        }

        // PUT /api/decks/{deckId}/flashcards/{cardId}/master
        [HttpPut("{cardId:guid}/master")]
        public async Task<IActionResult> ToggleMastered(Guid deckId, Guid cardId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var card = await _repo.GetByIdAsync(cardId, ct);
            if (card == null || card.DeckId != deckId)
                return NotFound(new ApiResponse(false, "Flashcard not found."));

            await _repo.MarkMasteredAsync(cardId, !card.IsMastered, ct);
            var updated = await _repo.GetByIdAsync(cardId, ct);
            return Ok(new ApiResponse<FlashcardDto>(true, ToDto(updated!), $"Card marked as {(!card.IsMastered ? "mastered" : "unmastered")}."));
        }

        // DELETE /api/decks/{deckId}/flashcards/{cardId}
        [HttpDelete("{cardId:guid}")]
        [Authorize(Policy = "RequireTeacher")]
        public async Task<IActionResult> DeleteFlashcard(Guid deckId, Guid cardId, CancellationToken ct)
        {
            if (!await VerifyDeckAccessAsync(deckId))
                return NotFound(new ApiResponse(false, "Deck not found."));

            var card = await _repo.GetByIdAsync(cardId, ct);
            if (card == null || card.DeckId != deckId)
                return NotFound(new ApiResponse(false, "Flashcard not found."));

            await _repo.DeleteAsync(cardId, ct);
            return Ok(new ApiResponse(true, "Flashcard deleted."));
        }
    }
}

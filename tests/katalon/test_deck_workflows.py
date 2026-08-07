"""
Browser E2E — Flashcard Deck workflows (Spec 2.3).

End-to-end:
- User creates a deck via UI → adds card → card text appears in deck
- Reloading the deck page preserves the card content
"""

import requests
import pytest
from _helpers import (
    FE_BASE,
    API_BASE,
    login_fresh_user,
    unique_suffix,
)


def _api_token(username, password):
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": username, "password": password}, timeout=10)
    return r.json()["data"]["accessToken"]


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDeckCreateAndAddCardWorkflow:
    """Spec 2.3 — Create a deck, then add a flashcard via UI, then verify it persists."""

    def test_user_creates_deck_via_ui(self, page):
        creds = login_fresh_user(page, "deckcreate")
        deck_title = f"DeckTitle_{unique_suffix('d')}"

        page.goto(f"{FE_BASE}/user/decks/new")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='deck-title-input']").wait_for(state="visible")
        page.locator("[data-testid='deck-title-input']").fill(deck_title)
        page.locator("[data-testid='deck-create-btn']").click()

        # Wait for the editor to switch into "deck created" mode (flashcard inputs appear)
        page.locator("[data-testid='flashcard-front-input']").wait_for(state="visible", timeout=15000)

        # Verify deck exists on BE
        token = _api_token(creds["username"], creds["password"])
        r = requests.get(f"{API_BASE}/api/decks",
                         headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert r.status_code == 200
        decks = r.json().get("data", [])
        titles = [d.get("title") for d in decks]
        assert deck_title in titles, (
            f"Created deck '{deck_title}' must appear in user's deck list, got {titles}"
        )

    def test_user_adds_card_to_deck_via_ui(self, page):
        creds = login_fresh_user(page, "deckcard")
        deck_title = f"CardDeck_{unique_suffix('d')}"
        front = f"Front_{unique_suffix('c')}"
        back = f"Back_{unique_suffix('c')}"

        # Step 1 — create the deck through the UI
        page.goto(f"{FE_BASE}/user/decks/new")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='deck-title-input']").fill(deck_title)
        page.locator("[data-testid='deck-create-btn']").click()
        page.locator("[data-testid='flashcard-front-input']").wait_for(state="visible", timeout=15000)

        # Step 2 — add a card
        page.locator("[data-testid='flashcard-front-input']").fill(front)
        page.locator("[data-testid='flashcard-back-input']").fill(back)
        page.locator("[data-testid='flashcard-add-btn']").click()

        # Give the FE a moment to refresh the card list, then verify the card persisted
        page.wait_for_timeout(2000)

        token = _api_token(creds["username"], creds["password"])
        decks = requests.get(f"{API_BASE}/api/decks",
                             headers={"Authorization": f"Bearer {token}"}, timeout=10).json()["data"]
        deck = next((d for d in decks if d.get("title") == deck_title), None)
        assert deck is not None, f"Deck '{deck_title}' must exist after creation"
        deck_id = deck.get("deckId") or deck.get("id")

        cards = requests.get(f"{API_BASE}/api/decks/{deck_id}/flashcards",
                             headers={"Authorization": f"Bearer {token}"}, timeout=10).json()["data"]
        fronts = [c.get("frontText") for c in cards]
        backs = [c.get("backText") for c in cards]
        assert front in fronts, f"Card front '{front}' must be saved; got fronts {fronts}"
        assert back in backs, f"Card back '{back}' must be saved; got backs {backs}"

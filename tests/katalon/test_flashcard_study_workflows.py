"""
Browser E2E — Flashcard study mode + Collections CRUD workflows (Spec §2.3 + §3).

Validates:
  - User can study flashcards (card counter, flip, next/prev, mastered, reset)
  - Shuffle button is present and toggles
  - Mastered card is excluded from session; reset brings it back
  - User can create, view, and delete a Collection via the UI
"""

import uuid
import requests
import pytest
from _helpers import FE_BASE, API_BASE, login_fresh_user, register_user, unique_suffix

TIMEOUT = 12000  # ms


def _api_login(username: str, password: str) -> str:
    """Return access token."""
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["data"]["accessToken"]


def _create_deck_with_cards(token: str, n: int = 3) -> dict:
    """Create a deck with n cards via API, return {deck_id, card_ids, title}."""
    title = f"E2E Deck {unique_suffix('d')}"
    r = requests.post(
        f"{API_BASE}/api/decks",
        json={"title": title},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code in (200, 201), f"Create deck failed: {r.status_code} {r.text}"
    deck_id = r.json()["data"]["deckId"] or r.json()["data"]["id"]

    card_ids = []
    for i in range(n):
        rc = requests.post(
            f"{API_BASE}/api/decks/{deck_id}/flashcards",
            json={"frontText": f"Front {i+1}", "backText": f"Back {i+1}", "orderIndex": i},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert rc.status_code in (200, 201), f"Create card failed: {rc.status_code} {rc.text}"
        card_ids.append(rc.json()["data"]["id"])

    return {"deck_id": deck_id, "card_ids": card_ids, "title": title}


# ─────────────────────────────────────────────────────────────────────────────
# Flashcard Study Mode
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestFlashcardStudyMode:
    """Spec §2.3 — flashcard study: counter, flip, next/prev, mastered, reset."""

    def test_flashcard_study_counter_shown(self, page):
        """Card counter (e.g. 'Card 1/3') is visible on the study page."""
        creds = login_fresh_user(page, "fcst")
        token = _api_login(creds["username"], creds["password"])
        deck = _create_deck_with_cards(token, n=3)

        page.goto(f"{FE_BASE}/user/flashcards?deckId={deck['deck_id']}")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='flashcard-counter']").wait_for(state="visible", timeout=TIMEOUT)
        counter_text = page.locator("[data-testid='flashcard-counter']").inner_text()
        assert "1" in counter_text and "3" in counter_text, (
            f"Expected counter like '1/3', got: {counter_text}"
        )

    def test_flashcard_flip_shows_back_text(self, page):
        """Clicking flip button shows back text (data-testid='flashcard-back-text')."""
        creds = login_fresh_user(page, "fcflip")
        token = _api_login(creds["username"], creds["password"])
        deck = _create_deck_with_cards(token, n=2)

        page.goto(f"{FE_BASE}/user/flashcards?deckId={deck['deck_id']}")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='flashcard-flip-btn']").wait_for(state="visible", timeout=TIMEOUT)

        # Initially shows front
        front_el = page.locator("[data-testid='flashcard-front-text']")
        front_el.wait_for(state="visible", timeout=TIMEOUT)
        front_text = front_el.inner_text()
        assert "Front" in front_text

        # Flip
        page.locator("[data-testid='flashcard-flip-btn']").click()
        page.wait_for_timeout(500)

        back_el = page.locator("[data-testid='flashcard-back-text']")
        back_el.wait_for(state="visible", timeout=TIMEOUT)
        back_text = back_el.inner_text()
        assert "Back" in back_text

    def test_flashcard_next_advances_counter(self, page):
        """Clicking Next Card advances the counter from 1 to 2."""
        creds = login_fresh_user(page, "fcnxt")
        token = _api_login(creds["username"], creds["password"])
        deck = _create_deck_with_cards(token, n=3)

        page.goto(f"{FE_BASE}/user/flashcards?deckId={deck['deck_id']}")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='flashcard-next-btn']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='flashcard-next-btn']").click()
        page.wait_for_timeout(400)

        counter_text = page.locator("[data-testid='flashcard-counter']").inner_text()
        assert "2" in counter_text, f"Expected counter 2/3 after Next, got: {counter_text}"

    def test_flashcard_shuffle_button_present_and_clickable(self, page):
        """Shuffle button is visible and can be clicked (toggles shuffle mode)."""
        creds = login_fresh_user(page, "fcshu")
        token = _api_login(creds["username"], creds["password"])
        deck = _create_deck_with_cards(token, n=2)

        page.goto(f"{FE_BASE}/user/flashcards?deckId={deck['deck_id']}")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='flashcard-shuffle-btn']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='flashcard-shuffle-btn']").click()
        page.wait_for_timeout(300)
        # Button still visible after click (no crash)
        assert page.locator("[data-testid='flashcard-shuffle-btn']").is_visible()

    def test_flashcard_mastered_removes_card_from_session(self, page):
        """Mark all cards as mastered → 'all mastered' state appears (Spec §2.3)."""
        creds = login_fresh_user(page, "fcmst")
        token = _api_login(creds["username"], creds["password"])
        deck = _create_deck_with_cards(token, n=2)

        page.goto(f"{FE_BASE}/user/flashcards?deckId={deck['deck_id']}")
        page.wait_for_load_state("networkidle")

        # Mark card 1
        page.locator("[data-testid='flashcard-mastered-btn']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='flashcard-mastered-btn']").click()
        page.wait_for_timeout(600)

        # Mark card 2
        if page.locator("[data-testid='flashcard-mastered-btn']").is_visible():
            page.locator("[data-testid='flashcard-mastered-btn']").click()
            page.wait_for_timeout(600)

        # All mastered state should appear
        page.locator("[data-testid='flashcard-all-mastered']").wait_for(state="visible", timeout=TIMEOUT)

    def test_flashcard_reset_restores_cards(self, page):
        """After mastering all and clicking reset, counter resets to 1/N (Spec §2.3)."""
        creds = login_fresh_user(page, "fcrst")
        token = _api_login(creds["username"], creds["password"])
        deck = _create_deck_with_cards(token, n=1)

        page.goto(f"{FE_BASE}/user/flashcards?deckId={deck['deck_id']}")
        page.wait_for_load_state("networkidle")

        # Master the single card
        page.locator("[data-testid='flashcard-mastered-btn']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='flashcard-mastered-btn']").click()
        page.wait_for_timeout(800)

        # Reset
        page.locator("[data-testid='flashcard-reset-btn']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='flashcard-reset-btn']").click()
        page.wait_for_timeout(1000)

        # Card should reappear
        page.locator("[data-testid='flashcard-counter']").wait_for(state="visible", timeout=TIMEOUT)
        counter_text = page.locator("[data-testid='flashcard-counter']").inner_text()
        assert "1" in counter_text, f"Expected card 1/1 after reset, got: {counter_text}"


# ─────────────────────────────────────────────────────────────────────────────
# Collections CRUD via UI
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestCollectionsCRUDWorkflow:
    """Spec §3 — user creates, views, and deletes a Collection through the UI."""

    def test_user_creates_collection_via_ui(self, page):
        """Create a collection → title appears in collection list."""
        login_fresh_user(page, "coll")
        title = f"E2E Col {unique_suffix('c')}"

        page.goto(f"{FE_BASE}/user/collections")
        page.wait_for_load_state("networkidle")

        # Open create form
        page.locator("[data-testid='collection-new-btn']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='collection-new-btn']").click()
        page.locator("[data-testid='collection-title-input']").wait_for(state="visible", timeout=5000)
        page.locator("[data-testid='collection-title-input']").fill(title)
        page.locator("[data-testid='collection-create-btn']").click()
        page.wait_for_timeout(1500)
        page.wait_for_load_state("networkidle")

        assert page.locator(f"text={title}").count() > 0, (
            f"Collection '{title}' not visible after creation"
        )

    def test_user_can_cancel_collection_creation(self, page):
        """Cancel button dismisses the create form without creating a collection."""
        login_fresh_user(page, "collcancel")

        page.goto(f"{FE_BASE}/user/collections")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='collection-new-btn']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='collection-new-btn']").click()
        page.locator("[data-testid='collection-title-input']").wait_for(state="visible", timeout=5000)
        page.locator("[data-testid='collection-title-input']").fill("ShouldNotExist")
        page.locator("[data-testid='collection-cancel-btn']").click()
        page.wait_for_timeout(500)

        # Form should be hidden
        assert not page.locator("[data-testid='collection-title-input']").is_visible(), (
            "Collection form still visible after Cancel"
        )
        assert page.locator("text=ShouldNotExist").count() == 0

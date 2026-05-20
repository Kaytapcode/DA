"""
Spec 2.3 — Flashcard Management.
- Card CRUD: Front (Keyword) / Back (Definition)
- Deck CRUD: Group flashcards by topic
- Study mode: shuffle (FE-only) + mark Mastered + system hides mastered until user resets
"""

import pytest
from datetime import datetime


def _new_creds(prefix="fc"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


def _register_and_login(api_client, prefix="fc"):
    creds = _new_creds(prefix)
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    api_client.login_user(creds["username"], creds["password"])
    return creds


def _unwrap(resp):
    body = resp.json() if resp.text else {}
    if isinstance(body, dict) and "data" in body and body.get("data") is not None:
        return body["data"]
    return body


def _create_deck(api_client, title="Test Deck", theme=None):
    resp = api_client.post("/api/decks", json={"title": title, "theme": theme})
    assert resp.status_code in (200, 201), resp.text
    return _unwrap(resp)


def _add_card(api_client, deck_id, front, back, order=0):
    return api_client.post(f"/api/decks/{deck_id}/flashcards", json={
        "frontText": front,
        "backText": back,
        "orderIndex": order,
    })


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDeckCRUD:
    """Spec 2.3 — Deck CRUD."""

    def test_user_can_create_deck(self, api_client):
        _register_and_login(api_client)
        deck = _create_deck(api_client, "My Vocabulary Deck")
        assert deck.get("deckId") or deck.get("id"), "Deck creation must return an id"

    def test_user_can_rename_deck(self, api_client):
        _register_and_login(api_client)
        deck = _create_deck(api_client, "Old Title")
        deck_id = deck.get("deckId") or deck.get("id")

        resp = api_client.patch(f"/api/decks/{deck_id}", json={"title": "New Title"})
        assert resp.status_code == 200
        after = _unwrap(api_client.get(f"/api/decks/{deck_id}"))
        assert after.get("title") == "New Title"

    def test_user_can_delete_deck(self, api_client):
        _register_and_login(api_client)
        deck = _create_deck(api_client, "Temp Deck")
        deck_id = deck.get("deckId") or deck.get("id")
        resp = api_client.delete(f"/api/decks/{deck_id}")
        assert resp.status_code in (200, 204)

    def test_unauthenticated_cannot_create(self, api_client):
        resp = api_client.post("/api/decks", json={"title": "x"})
        assert resp.status_code == 401


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestFlashcardCRUD:
    """Spec 2.3 — Front/Back card CRUD."""

    def test_user_can_add_flashcard_with_front_back(self, api_client):
        """Spec 2.3 — Card has front (keyword) and back (definition)."""
        _register_and_login(api_client)
        deck = _create_deck(api_client)
        deck_id = deck.get("deckId") or deck.get("id")
        resp = _add_card(api_client, deck_id, "Bonjour", "Hello in French")
        assert resp.status_code in (200, 201), resp.text

        cards = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        assert len(cards) == 1
        assert cards[0]["frontText"] == "Bonjour"
        assert cards[0]["backText"] == "Hello in French"

    def test_owner_can_update_card(self, api_client):
        _register_and_login(api_client)
        deck = _create_deck(api_client)
        deck_id = deck.get("deckId") or deck.get("id")
        _add_card(api_client, deck_id, "Old front", "Old back")
        cards = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        card_id = cards[0]["id"]

        resp = api_client.put(f"/api/decks/{deck_id}/flashcards/{card_id}", json={
            "frontText": "New front",
            "backText": "New back",
        })
        assert resp.status_code == 200
        after = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        assert after[0]["frontText"] == "New front"

    def test_owner_can_delete_card(self, api_client):
        _register_and_login(api_client)
        deck = _create_deck(api_client)
        deck_id = deck.get("deckId") or deck.get("id")
        _add_card(api_client, deck_id, "x", "y")
        cards = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        card_id = cards[0]["id"]

        resp = api_client.delete(f"/api/decks/{deck_id}/flashcards/{card_id}")
        assert resp.status_code in (200, 204)
        after = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        assert len(after) == 0


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestMasteredAndReset:
    """Spec 2.3 — Mastered cards are hidden until reset."""

    def test_marking_card_mastered_sets_flag(self, api_client):
        """Spec 2.3 — User can mark a card 'Mastered'."""
        _register_and_login(api_client)
        deck = _create_deck(api_client)
        deck_id = deck.get("deckId") or deck.get("id")
        _add_card(api_client, deck_id, "A", "Apple")
        cards = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        card_id = cards[0]["id"]

        resp = api_client.put(f"/api/decks/{deck_id}/flashcards/{card_id}/master", json={"isMastered": True})
        assert resp.status_code == 200, f"Master toggle failed: {resp.text}"

        after = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        mastered = next((c for c in after if c["id"] == card_id), None)
        assert mastered and mastered.get("isMastered") is True, \
            "Spec 2.3: isMastered flag must persist per-user after toggle"

    def test_reset_mastered_clears_all_mastered_flags(self, api_client):
        """Spec 2.3 — Reset endpoint un-masters all the user's mastered cards in this deck."""
        _register_and_login(api_client)
        deck = _create_deck(api_client)
        deck_id = deck.get("deckId") or deck.get("id")
        _add_card(api_client, deck_id, "A", "Apple")
        _add_card(api_client, deck_id, "B", "Banana", order=1)
        cards = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        for c in cards:
            api_client.put(f"/api/decks/{deck_id}/flashcards/{c['id']}/master", json={"isMastered": True})

        # Verify both mastered
        all_mastered = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        assert all(c.get("isMastered") for c in all_mastered), "Setup: both cards must be mastered first"

        resp = api_client.post(f"/api/decks/{deck_id}/flashcards/reset-mastered", json={})
        assert resp.status_code == 200, f"Reset failed: {resp.text}"

        after = _unwrap(api_client.get(f"/api/decks/{deck_id}/flashcards"))
        assert all(not c.get("isMastered") for c in after), \
            "Spec 2.3: After reset, no card should remain mastered for this user"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDeckPublicAccess:
    """Spec 1 — User-created decks are public; non-owner can read but not edit."""

    def test_non_owner_can_read_public_deck(self, api_client):
        _register_and_login(api_client, prefix="dkowner")
        deck = _create_deck(api_client, "Public Vocab")
        deck_id = deck.get("deckId") or deck.get("id")
        _add_card(api_client, deck_id, "Hello", "Greeting")
        api_client.clear_auth()

        _register_and_login(api_client, prefix="dkother")
        resp = api_client.get(f"/api/decks/{deck_id}")
        assert resp.status_code == 200
        cards = api_client.get(f"/api/decks/{deck_id}/flashcards")
        assert cards.status_code == 200, "Spec 1: public deck cards must be readable by anyone"

    def test_non_owner_cannot_edit(self, api_client):
        _register_and_login(api_client, prefix="dkowner2")
        deck = _create_deck(api_client, "Locked")
        deck_id = deck.get("deckId") or deck.get("id")
        api_client.clear_auth()

        _register_and_login(api_client, prefix="dkother2")
        resp = api_client.patch(f"/api/decks/{deck_id}", json={"title": "hacked"})
        assert resp.status_code in (403, 404)

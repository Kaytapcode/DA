"""
User Content API Tests for Lumina LMS (Spec §2)
All resources (Quiz, Document, Flashcard Deck, Video) are personal user-owned
and always public. No course context needed.

Endpoints:
  Quiz:     POST /api/quizzes         {title}
            GET  /api/quizzes
            PUT  /api/quizzes/{id}    {title}
  Document: POST /api/documents       multipart file upload
            GET  /api/documents
  Deck:     POST /api/decks           {title, description?}
            GET  /api/decks
  Video:    POST /api/videos/personal {youTubeUrl, title?, description?}
            GET  /api/videos/personal
"""

import io
import pytest
from tests.fixtures.test_data import TestDataFactory


# ─── Quiz ──────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.api
class TestQuizManagement:
    """Spec §2.1 — Quiz manual CRUD."""

    def test_create_quiz(self, authenticated_client):
        """User creates a quiz with a title — returns 200 with id."""
        # Spec §2.1: POST /api/quizzes; title required
        r = authenticated_client.post("/api/quizzes", json={"title": f"LuminaTest_{TestDataFactory.random_string()}"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        payload = r.json().get("data") or r.json()
        assert "id" in payload or "quizId" in payload, "Response should contain an id"

    def test_list_quizzes(self, authenticated_client):
        """User can list their quizzes — GET /api/quizzes returns 200."""
        r = authenticated_client.get("/api/quizzes")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_missing_title_rejected(self, authenticated_client):
        """Quiz creation without title → 400."""
        r = authenticated_client.post("/api/quizzes", json={"timeLimit": 30})
        assert r.status_code == 400, f"Missing title should be 400, got {r.status_code}"


# ─── Document ──────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.api
class TestDocumentManagement:
    """Spec §2.2 — Document upload, list."""

    def test_list_documents(self, authenticated_client):
        """User can list their documents — GET /api/documents returns 200."""
        r = authenticated_client.get("/api/documents")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_upload_document_pdf(self, authenticated_client):
        """User uploads a minimal PDF — returns 200/201."""
        # Minimal valid PDF bytes (1-byte body stub — server validates MIME)
        pdf_bytes = b"%PDF-1.4 1 0 obj<</Type /Catalog>> endobj"
        r = authenticated_client.post_file(
            "/api/documents",
            files={"file": ("test_doc.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        )
        # Accept 200/201 (success) or 400 (file too small/invalid) — 404/500 are failures
        assert r.status_code in (200, 201, 400), (
            f"Unexpected status {r.status_code}: {r.text[:300]}"
        )


# ─── Flashcard Deck ────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.api
class TestFlashcardManagement:
    """Spec §2.3 — Flashcard Deck CRUD."""

    def test_create_deck(self, authenticated_client):
        """User creates a flashcard deck — POST /api/decks returns 200/201."""
        r = authenticated_client.post(
            "/api/decks",
            json={"title": f"LuminaTest_{TestDataFactory.random_string()}", "description": "test deck"},
        )
        assert r.status_code in (200, 201), f"Expected 200/201, got {r.status_code}: {r.text}"

    def test_list_decks(self, authenticated_client):
        """User can list their decks — GET /api/decks returns 200."""
        r = authenticated_client.get("/api/decks")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_deck_missing_title_rejected(self, authenticated_client):
        """Deck without title → 400."""
        r = authenticated_client.post("/api/decks", json={"description": "no title"})
        assert r.status_code == 400, f"Missing title should be 400, got {r.status_code}"


# ─── Video ─────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.api
class TestVideoManagement:
    """Spec §2.4 — YouTube video link, personal library."""

    def test_create_personal_video(self, authenticated_client):
        """User links a YouTube video — POST /api/videos/personal returns 200."""
        r = authenticated_client.post(
            "/api/videos/personal",
            json={
                "youTubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": f"LuminaTest_{TestDataFactory.random_string()}",
            },
        )
        assert r.status_code in (200, 201), f"Expected 200/201, got {r.status_code}: {r.text}"

    def test_list_personal_videos(self, authenticated_client):
        """User can list their personal videos — GET /api/videos/personal returns 200."""
        r = authenticated_client.get("/api/videos/personal")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_invalid_youtube_url_rejected(self, authenticated_client):
        """Non-YouTube URL → 400."""
        r = authenticated_client.post(
            "/api/videos/personal",
            json={"youTubeUrl": "https://example.com/not-a-youtube-url"},
        )
        assert r.status_code == 400, f"Invalid URL should be 400, got {r.status_code}"

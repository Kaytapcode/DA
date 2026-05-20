"""
FE display tests for QuizCreatePage (manual mode).
Spec 2.1 — Manual CRUD inputs must be visible and functional.
"""

import os
import pytest
import requests
from datetime import datetime

FE_BASE = os.getenv("FE_BASE_URL", "http://localhost:5173")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:5000")


def _register_and_login_ui(page, prefix="quizui"):
    ts = int(datetime.now().timestamp() * 1000)
    creds = {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }
    r = requests.post(
        f"{API_BASE}/api/auth/register",
        json={"username": creds["username"], "password": creds["password"], "email": creds["email"]},
        timeout=10,
    )
    assert r.status_code == 200, f"Pre-test register failed: {r.text}"

    page.goto(f"{FE_BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("[data-testid='login-identifier']").fill(creds["username"])
    page.locator("[data-testid='login-password']").fill(creds["password"])
    page.locator("[data-testid='login-submit']").click()
    page.wait_for_url("**/user/**", timeout=15000)
    return creds


def _open_quiz_create(page):
    """Navigate to quiz create page (FE route may vary; use the most common)."""
    for url in (f"{FE_BASE}/user/quizzes/create", f"{FE_BASE}/user/quiz/create", f"{FE_BASE}/user/create-quiz"):
        page.goto(url)
        page.wait_for_load_state("networkidle")
        if page.locator("[data-testid='quiz-title-input']").count() > 0:
            return True
    raise AssertionError("Could not find QuizCreatePage route")


@pytest.mark.ui
@pytest.mark.display
@pytest.mark.wave1
@pytest.mark.user
class TestQuizCreatePageManualMode:
    """Spec 2.1 — Manual quiz create UI renders all required controls."""

    def test_quiz_title_input_visible(self, page):
        _register_and_login_ui(page)
        _open_quiz_create(page)
        title_input = page.locator("[data-testid='quiz-title-input']")
        assert title_input.is_visible()
        assert title_input.is_enabled()

    def test_mode_buttons_present(self, page):
        """Spec 2.1 — Manual + AI mode toggles both visible."""
        _register_and_login_ui(page)
        _open_quiz_create(page)
        assert page.locator("[data-testid='quiz-mode-manual']").is_visible()
        assert page.locator("[data-testid='quiz-mode-ai']").is_visible()

    def test_first_question_inputs_render(self, page):
        """Spec 2.1 — At least one question card renders with text + options + explanation."""
        _register_and_login_ui(page)
        _open_quiz_create(page)
        page.locator("[data-testid='quiz-mode-manual']").click()

        # First question (qIdx=0)
        assert page.locator("[data-testid='quiz-question-0-text']").is_visible()
        # First two options
        for o_idx in (0, 1):
            assert page.locator(f"[data-testid='quiz-question-0-option-{o_idx}-text']").is_visible()
            assert page.locator(f"[data-testid='quiz-question-0-option-{o_idx}-correct']").is_visible()
        # Explanation field — marked "(optional)" per Spec 2.1
        assert page.locator("[data-testid='quiz-question-0-explanation']").is_visible()

    def test_save_and_add_question_buttons_visible(self, page):
        _register_and_login_ui(page)
        _open_quiz_create(page)
        page.locator("[data-testid='quiz-mode-manual']").click()
        assert page.locator("[data-testid='quiz-save-btn']").is_visible()
        assert page.locator("[data-testid='quiz-add-question-btn']").is_visible()

    def test_explanation_field_is_optional_marker(self, page):
        """Spec 2.1 — Explanation field exists and is empty by default (not required)."""
        _register_and_login_ui(page)
        _open_quiz_create(page)
        page.locator("[data-testid='quiz-mode-manual']").click()
        expl = page.locator("[data-testid='quiz-question-0-explanation']")
        assert expl.is_visible()
        # Default value must be empty (optional field)
        assert expl.input_value() == "", "Explanation must default to empty (optional per Spec 2.1)"

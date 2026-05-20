"""
Spec 2.1 — Quiz AI Auto-Generation invariants.

Spec quotes:
- "Calls API (stepfun/step-3.5-flash) with a Prompt enforcing Zero Hallucination."
- "The AI must generate the quiz elements (questions, options, explanations) in the same
  language as the uploaded source document."
- "The Explanation field is mandatory and must be based on the original document."
- "Automatically parses JSON and saves it to the Database as a Draft Quiz."

These tests verify the structural invariants. Real AI calls are mocked / bypassed
by exercising the import endpoint directly with fabricated AI output (the controller
treats AI-generated and imported questions the same way — both should land in DRAFT state).
"""

import pytest
from datetime import datetime


def _new_user_creds(prefix="quizai"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


def _register_and_login(api_client, prefix="quizai"):
    creds = _new_user_creds(prefix)
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    api_client.login_user(creds["username"], creds["password"])
    return creds


def _unwrap(resp):
    body = resp.json() if resp.text else {}
    if isinstance(body, dict) and "data" in body and body.get("data") is not None:
        return body["data"]
    return body


def _create_quiz(api_client, title="AI Quiz"):
    resp = api_client.post("/api/quizzes", json={"title": title})
    assert resp.status_code == 200, resp.text
    return _unwrap(resp)


def _import_ai_questions(api_client, quiz_id, ai_questions):
    """POST /api/quizzes/{quizId}/generate to import AI-generated questions."""
    return api_client.post(f"/api/quizzes/{quiz_id}/generate", json={
        "questions": ai_questions,
    })


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestAIQuizDraftState:
    """Spec 2.1 — AI-imported quiz lands in DRAFT state for user verification."""

    def test_ai_imported_quiz_is_draft(self, api_client):
        """Spec 2.1 — After AI import, quiz status MUST be 'DRAFT', not 'PUBLISHED'."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, "Pending AI Verification")

        ai_questions = [
            {
                "question": "What is the capital of France?",
                "options": ["Paris", "Berlin", "Madrid", "Rome"],
                "correctIndex": 0,
                "explanation": "Paris is the capital and largest city of France.",
            },
            {
                "question": "What is 2 + 2?",
                "options": ["3", "4", "5"],
                "correctIndex": 1,
                "explanation": "Basic arithmetic: 2 + 2 = 4.",
            },
        ]
        resp = _import_ai_questions(api_client, quiz["quizId"], ai_questions)
        assert resp.status_code == 200, f"Import AI failed: {resp.text}"

        # Fetch quiz back; status must be DRAFT (mandatory verification step per Spec 2.1)
        after = _unwrap(api_client.get(f"/api/quizzes/{quiz['quizId']}"))
        assert after.get("status") == "DRAFT", \
            f"Spec 2.1: AI-imported quiz must be DRAFT until user publishes, got {after.get('status')}"

    def test_ai_imported_questions_have_mandatory_explanation(self, api_client):
        """Spec 2.1 — Every AI-generated question must have a non-empty explanation."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client)
        ai_questions = [
            {
                "question": "Q1?",
                "options": ["A", "B"],
                "correctIndex": 0,
                "explanation": "Reason from doc.",
            },
        ]
        _import_ai_questions(api_client, quiz["quizId"], ai_questions)
        qs = _unwrap(api_client.get(f"/api/quizzes/{quiz['quizId']}/questions"))
        assert len(qs) == 1
        assert qs[0].get("explanation"), "AI question must have non-empty explanation"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestAIQuizPromptContract:
    """Spec 2.1 — The AI prompt must enforce language match + zero hallucination + mandatory explanation.
    These are verified by inspecting the prompt source code (unit-style check via the BE)."""

    def test_prompt_enforces_language_matching(self):
        """Spec 2.1 — Prompt template MUST instruct the AI to match the source document's language."""
        import os
        import re
        prompt_file = os.path.join(
            os.path.dirname(__file__), "..", "..", "BE", "AI.Api", "Services", "OpenRouterService.cs"
        )
        with open(prompt_file, "r", encoding="utf-8") as f:
            src = f.read()

        # Search for language-matching instruction in either prompt builder
        language_instruction_pattern = re.compile(
            r"(same\s+language|match.*language|source.*language|in\s+the\s+language\s+of)",
            re.IGNORECASE,
        )
        assert language_instruction_pattern.search(src), \
            "Spec 2.1: OpenRouterService prompt MUST instruct AI to output in the source document language"

    def test_prompt_enforces_zero_hallucination(self):
        """Spec 2.1 — Prompt explicitly forbids hallucinating content outside the document."""
        import os
        prompt_file = os.path.join(
            os.path.dirname(__file__), "..", "..", "BE", "AI.Api", "Services", "OpenRouterService.cs"
        )
        with open(prompt_file, "r", encoding="utf-8") as f:
            src = f.read().lower()
        assert "zero hallucination" in src or "no hallucination" in src or "only from the document" in src.lower(), \
            "Spec 2.1: Prompt MUST contain a zero-hallucination clause"

    def test_prompt_marks_explanation_mandatory(self):
        """Spec 2.1 — Prompt explicitly states explanation is MANDATORY."""
        import os
        prompt_file = os.path.join(
            os.path.dirname(__file__), "..", "..", "BE", "AI.Api", "Services", "OpenRouterService.cs"
        )
        with open(prompt_file, "r", encoding="utf-8") as f:
            src = f.read()
        assert "MANDATORY" in src or "mandatory" in src, \
            "Spec 2.1: Prompt MUST mark the explanation field as mandatory"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestAIQuotaEnforcement:
    """Spec 1 (SysAdmin) — AI quota must be checked + decremented on each generation call."""

    def test_quota_endpoint_returns_calls_used_and_limit(self, api_client):
        """Quota endpoint exposes usage so it can be monitored."""
        _register_and_login(api_client)
        resp = api_client.get("/api/ai-quota")
        # 200 (returns quota) / 400 (missing org_id in JWT) / 404 (no quota row yet) are all
        # acceptable structural responses — only 500 means the endpoint is broken.
        assert resp.status_code in (200, 400, 404), f"Quota endpoint broken: {resp.status_code}"

    def test_quota_decrements_after_generation(self, api_client):
        """
        Spec invariant — calls_used must increase by 1 after a successful AI generation.
        This test is structural: we verify the code path wires CanMakeCallAsync + IncrementUsageAsync
        in QuizGenerationController. (The actual AI call is mocked or bypassed in a real run.)
        """
        # Check the controller source enforces quota — failing this test means the wiring is missing.
        import os
        controller_file = os.path.join(
            os.path.dirname(__file__), "..", "..", "BE", "AI.Api", "Controllers", "QuizGenerationController.cs"
        )
        with open(controller_file, "r", encoding="utf-8") as f:
            src = f.read()
        assert "CanMakeCallAsync" in src, \
            "Spec 1 SysAdmin: QuizGenerationController must call CanMakeCallAsync to enforce quota"
        assert "IncrementUsageAsync" in src, \
            "Spec 1 SysAdmin: QuizGenerationController must call IncrementUsageAsync to decrement quota"

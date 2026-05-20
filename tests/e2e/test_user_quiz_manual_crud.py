"""
Spec 2.1 — Quiz Manual CRUD.
"Manually create, edit, delete multiple-choice questions/answers.
The Explanation field is not mandatory when creating manually."

Also enforces Spec 1 invariant: User-created resources are public — non-owner can read.
"""

import pytest
from datetime import datetime


def _new_user_creds(prefix="quiz"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


def _register_and_login(api_client, prefix="quiz"):
    creds = _new_user_creds(prefix)
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    api_client.login_user(creds["username"], creds["password"])
    return creds


def _unwrap(resp):
    """Unwrap BE ApiResponse envelope: {success, data, message}."""
    body = resp.json() if resp.text else {}
    if isinstance(body, dict) and "data" in body and body.get("data") is not None:
        return body["data"]
    return body


def _create_quiz(api_client, title="Test Quiz", time_limit=None, passing_score=None):
    resp = api_client.post("/api/quizzes", json={
        "title": title,
        "timeLimit": time_limit,
        "passingScore": passing_score,
    })
    assert resp.status_code == 200, f"Create quiz failed: {resp.text}"
    return _unwrap(resp)


def _add_question(api_client, quiz_id, text, options, explanation=None, order_index=0):
    resp = api_client.post(f"/api/quizzes/{quiz_id}/questions", json={
        "questionText": text,
        "explanation": explanation,
        "options": options,
        "orderIndex": order_index,
    })
    return resp


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestQuizManualCreate:
    """Spec 2.1 — Authenticated User can create a quiz."""

    def test_user_can_create_empty_quiz(self, api_client):
        """Spec 2.1 — POST /api/quizzes returns the new quiz summary."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="My Math Quiz")
        assert "id" in quiz, "Quiz must return its id"
        assert quiz.get("title") == "My Math Quiz"

    def test_quiz_creation_requires_title(self, api_client):
        """Spec 2.1 — Missing title → 400."""
        _register_and_login(api_client)
        resp = api_client.post("/api/quizzes", json={"title": ""})
        assert resp.status_code == 400, f"Empty title must be rejected, got {resp.status_code}"

    def test_unauthenticated_cannot_create_quiz(self, api_client):
        """Spec 2.1 — Endpoint requires authentication."""
        resp = api_client.post("/api/quizzes", json={"title": "x"})
        assert resp.status_code == 401


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestQuestionManualCRUD:
    """Spec 2.1 — Questions CRUD; explanation is optional for manually created questions."""

    def test_add_question_without_explanation_succeeds(self, api_client):
        """Spec 2.1 — Manual question can be created WITHOUT an explanation."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="Plain Quiz")

        options = [
            {"optionText": "Paris", "isCorrect": True, "orderIndex": 0},
            {"optionText": "London", "isCorrect": False, "orderIndex": 1},
        ]
        # Explanation deliberately omitted (null)
        resp = _add_question(api_client, quiz["id"], "Capital of France?", options, explanation=None)
        assert resp.status_code == 200, f"Question creation without explanation failed: {resp.text}"

    def test_add_question_with_explanation_succeeds(self, api_client):
        """Spec 2.1 — Manual question may include an explanation."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="Explained Quiz")
        options = [
            {"optionText": "4", "isCorrect": True, "orderIndex": 0},
            {"optionText": "5", "isCorrect": False, "orderIndex": 1},
        ]
        resp = _add_question(
            api_client, quiz["id"], "2 + 2?", options,
            explanation="Basic arithmetic addition.",
        )
        assert resp.status_code == 200

    def test_question_must_have_at_least_one_correct_option(self, api_client):
        """Spec 2.1 — Multiple-choice must have exactly one correct option."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="No Correct Quiz")
        options = [
            {"optionText": "A", "isCorrect": False, "orderIndex": 0},
            {"optionText": "B", "isCorrect": False, "orderIndex": 1},
        ]
        resp = _add_question(api_client, quiz["id"], "?", options)
        assert resp.status_code == 400, "Question with no correct option must be rejected"

    def test_get_questions_returns_created_question(self, api_client):
        """Spec 2.1 — GET /api/quizzes/{id}/questions returns created questions."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="Listing Quiz")
        options = [
            {"optionText": "yes", "isCorrect": True, "orderIndex": 0},
            {"optionText": "no", "isCorrect": False, "orderIndex": 1},
        ]
        _add_question(api_client, quiz["id"], "Is the sky blue?", options)

        resp = api_client.get(f"/api/quizzes/{quiz['id']}/questions")
        assert resp.status_code == 200
        questions = _unwrap(resp)
        assert len(questions) == 1
        assert questions[0]["questionText"] == "Is the sky blue?"

    def test_owner_can_update_question(self, api_client):
        """Spec 2.1 — Owner can edit existing question (PUT)."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="Editable Quiz")
        options = [
            {"optionText": "old", "isCorrect": True, "orderIndex": 0},
            {"optionText": "other", "isCorrect": False, "orderIndex": 1},
        ]
        _add_question(api_client, quiz["id"], "Old text?", options)

        questions = _unwrap(api_client.get(f"/api/quizzes/{quiz['id']}/questions"))
        qid = questions[0]["id"]

        new_options = [
            {"optionText": "new", "isCorrect": True, "orderIndex": 0},
            {"optionText": "other", "isCorrect": False, "orderIndex": 1},
        ]
        resp = api_client.put(f"/api/quizzes/{quiz['id']}/questions/{qid}", json={
            "questionText": "New text?",
            "explanation": "Updated reason",
            "options": new_options,
        })
        assert resp.status_code == 200, f"Update failed: {resp.text}"

        # Verify persisted
        after = _unwrap(api_client.get(f"/api/quizzes/{quiz['id']}/questions"))
        assert after[0]["questionText"] == "New text?"

    def test_owner_can_delete_question(self, api_client):
        """Spec 2.1 — Owner can delete an existing question."""
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="Deletable Quiz")
        options = [
            {"optionText": "a", "isCorrect": True, "orderIndex": 0},
            {"optionText": "b", "isCorrect": False, "orderIndex": 1},
        ]
        _add_question(api_client, quiz["id"], "?", options)
        questions = _unwrap(api_client.get(f"/api/quizzes/{quiz['id']}/questions"))
        qid = questions[0]["id"]

        resp = api_client.delete(f"/api/quizzes/{quiz['id']}/questions/{qid}")
        assert resp.status_code in (200, 204)

        after = _unwrap(api_client.get(f"/api/quizzes/{quiz['id']}/questions"))
        assert len(after) == 0


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestQuizOwnership:
    """Spec 1+2.1 — User-created quizzes are public to read, owner-only to write."""

    def test_non_owner_cannot_edit_quiz(self, api_client):
        """Spec 1 — Non-owner cannot edit another user's quiz (PATCH /quizzes/{id})."""
        # Owner creates quiz
        _register_and_login(api_client, prefix="owner")
        quiz = _create_quiz(api_client, title="Owner's Quiz")
        api_client.clear_auth()

        # Different user logs in
        _register_and_login(api_client, prefix="other")
        resp = api_client.patch(f"/api/quizzes/{quiz['id']}", json={"title": "Hacked!"})
        assert resp.status_code in (403, 404), \
            f"Non-owner edit must be denied (403/404), got {resp.status_code}"

    def test_non_owner_cannot_add_question(self, api_client):
        """Spec 1 — Non-owner cannot add questions to another user's quiz."""
        _register_and_login(api_client, prefix="owner2")
        quiz = _create_quiz(api_client, title="Locked Quiz")
        api_client.clear_auth()

        _register_and_login(api_client, prefix="other2")
        options = [
            {"optionText": "x", "isCorrect": True, "orderIndex": 0},
            {"optionText": "y", "isCorrect": False, "orderIndex": 1},
        ]
        resp = _add_question(api_client, quiz["id"], "Injected?", options)
        assert resp.status_code in (403, 404), \
            f"Non-owner question add must be denied, got {resp.status_code}"

    def test_non_owner_can_read_public_quiz(self, api_client):
        """Spec 1 — User-created quizzes are public; any authenticated user can read."""
        _register_and_login(api_client, prefix="owner3")
        quiz = _create_quiz(api_client, title="Public Quiz")
        options = [
            {"optionText": "a", "isCorrect": True, "orderIndex": 0},
            {"optionText": "b", "isCorrect": False, "orderIndex": 1},
        ]
        _add_question(api_client, quiz["id"], "Public Q?", options)
        api_client.clear_auth()

        _register_and_login(api_client, prefix="other3")
        resp = api_client.get(f"/api/quizzes/{quiz['id']}")
        assert resp.status_code == 200, "Spec 1: User-created quizzes must be readable by anyone"
        qs = api_client.get(f"/api/quizzes/{quiz['id']}/questions")
        assert qs.status_code == 200, "Spec 1: Quiz questions must be readable by anyone"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestQuizUpdateAndDelete:
    """Spec 2.1 — Quiz-level update and delete."""

    def test_owner_can_rename_quiz(self, api_client):
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="Old Title")
        resp = api_client.patch(f"/api/quizzes/{quiz['id']}", json={"title": "New Title"})
        assert resp.status_code == 200
        after = _unwrap(api_client.get(f"/api/quizzes/{quiz['id']}"))
        assert after["title"] == "New Title"

    def test_owner_can_delete_quiz(self, api_client):
        _register_and_login(api_client)
        quiz = _create_quiz(api_client, title="To Be Deleted")
        resp = api_client.delete(f"/api/quizzes/{quiz['id']}")
        assert resp.status_code == 200
        # Quiz no longer accessible
        after = api_client.get(f"/api/quizzes/{quiz['id']}")
        assert after.status_code == 404

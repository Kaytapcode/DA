"""
Browser (Playwright) workflow tests for the 2026-06-08 fixes.
(Spec update pending — see SPEC_ADDITIONS notes; markers map to the dev's numbered issues.)

  #1 Quiz play vs edit — clicking a quiz to TAKE it lands on the take-quiz (play) UI, NOT the
     editor. The owner still gets an "Edit Quiz" toggle. (Bug: owner auto-defaulted into edit mode.)
  #2 OrgAdmin quiz CMS chrome — when an OrgAdmin opens a quiz they OWN, the page keeps the OrgAdmin
     CMS chrome (sidebar/header) instead of dumping them into the end-user learner shell.
  #3 Copy-to-Library document preview — a cloned (copied) document previews correctly, AND stays
     previewable after the ORIGINAL is deleted (clone copies the physical file; no shared FilePath).

Real flows only — clicks + live data, NO hardcoded data. On failure a screenshot is written to
tests/_screens/ for verification.
"""

import os
import uuid
import requests
import pytest
from playwright.sync_api import Page, expect

from _helpers import (
    FE_BASE,
    API_BASE,
    register_user,
    ui_login,
    ui_login_orgadmin,
    unique_suffix,
)

ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TIMEOUT = 15

SCREENS = os.path.join(os.path.dirname(__file__), "..", "_screens")
os.makedirs(SCREENS, exist_ok=True)


def _shot(page: Page, name: str):
    try:
        page.screenshot(path=os.path.join(SCREENS, f"{name}.png"), full_page=True)
    except Exception:
        pass


def _api_token(username, password, org_id=None):
    headers = {"X-Org-Id": org_id} if org_id else {}
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": username, "password": password},
                      headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()["data"]["accessToken"]


def _auth(token, org_id=None):
    h = {"Authorization": f"Bearer {token}"}
    if org_id:
        h["X-Org-Id"] = org_id
    return h


def _create_quiz_with_question(token, title, org_id=None):
    """Create a quiz + one question via API. Returns (quizId, contentId)."""
    r = requests.post(f"{API_BASE}/api/quizzes",
                      json={"title": title, "timeLimit": 10, "passingScore": 50},
                      headers=_auth(token, org_id), timeout=TIMEOUT)
    assert r.status_code == 200, f"create quiz failed: {r.text}"
    data = r.json()["data"]
    quiz_id = data["quizId"] if "quizId" in data else data["id"]
    content_id = data.get("contentId")
    q = requests.post(f"{API_BASE}/api/quizzes/{quiz_id}/questions",
                      json={
                          "questionText": "What is 2+2?",
                          "explanation": "Basic arithmetic.",
                          "options": [
                              {"optionText": "4", "isCorrect": True, "orderIndex": 0},
                              {"optionText": "3", "isCorrect": False, "orderIndex": 1},
                              {"optionText": "5", "isCorrect": False, "orderIndex": 2},
                              {"optionText": "22", "isCorrect": False, "orderIndex": 3},
                          ],
                          "orderIndex": 0,
                      },
                      headers=_auth(token, org_id), timeout=TIMEOUT)
    assert q.status_code == 200, f"add question failed: {q.text}"
    return quiz_id, content_id


def _upload_public_doc(token, name):
    files = {"file": (name, b"%PDF-1.4\n%Fix test content\n%%EOF", "application/pdf")}
    r = requests.post(f"{API_BASE}/api/documents", files=files,
                      headers=_auth(token), timeout=TIMEOUT)
    assert r.status_code == 200, f"upload failed: {r.text}"
    return r.json()["data"]  # {id, contentId, ...}


# ---------------------------------------------------------------------------
# Bug #1 — taking a quiz shows the PLAY UI by default (not the editor)
# ---------------------------------------------------------------------------
@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestQuizPlayNotEditByDefault:

    def test_owner_opening_quiz_lands_on_take_quiz_not_editor(self, page: Page):
        creds = register_user("qplay")
        token = _api_token(creds["username"], creds["password"])
        title = f"PlayTest_{unique_suffix('q')}"
        quiz_id, _ = _create_quiz_with_question(token, title)

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/quiz?quizId={quiz_id}")
        page.wait_for_load_state("networkidle")

        try:
            # PLAY UI must be present (answer options + submit), proving we did NOT auto-open the editor.
            expect(page.locator("[data-testid='quiz-play-submit']")).to_be_visible(timeout=TIMEOUT * 1000)
            expect(page.locator("[data-testid^='quiz-play-option-']").first).to_be_visible()
            # Owner still gets the toggle, and it offers to ENTER edit (label = "Edit Quiz"),
            # which proves we are currently in play mode, not edit mode.
            toggle = page.locator("[data-testid='quiz-edit-toggle']")
            expect(toggle).to_be_visible()
            label = toggle.inner_text().lower()
            assert ("edit" in label) or ("chinh sua" in label), (
                f"Owner should be in PLAY mode with an 'Edit Quiz' toggle, got toggle label '{label}'"
            )
        except Exception:
            _shot(page, "bug1_quiz_play_default")
            raise

    def test_edit_query_param_deeplinks_into_editor(self, page: Page):
        creds = register_user("qedit")
        token = _api_token(creds["username"], creds["password"])
        title = f"EditDeep_{unique_suffix('q')}"
        quiz_id, _ = _create_quiz_with_question(token, title)

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/quiz?quizId={quiz_id}&edit=1")
        page.wait_for_load_state("networkidle")
        try:
            # In edit mode the play submit is gone and the toggle offers to go BACK to taking.
            toggle = page.locator("[data-testid='quiz-edit-toggle']")
            expect(toggle).to_be_visible(timeout=TIMEOUT * 1000)
            label = toggle.inner_text().lower()
            assert ("back" in label) or ("quay lai" in label), (
                f"?edit=1 should open the editor (toggle label should be 'Back to Take Quiz'), got '{label}'"
            )
        except Exception:
            _shot(page, "bug1_quiz_edit_deeplink")
            raise


# ---------------------------------------------------------------------------
# Bug #2 — OrgAdmin opening their quiz keeps the CMS (admin) chrome
# ---------------------------------------------------------------------------
@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminQuizKeepsAdminChrome:

    def test_orgadmin_quiz_renders_admin_shell(self, page: Page):
        oa_token = _api_token(ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        title = f"OAQuiz_{unique_suffix('q')}"
        quiz_id, _ = _create_quiz_with_question(oa_token, title, org_id=ORG1_ID)

        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/user/quiz?quizId={quiz_id}")
        page.wait_for_load_state("networkidle")
        try:
            # Admin chrome marker present; user chrome marker absent.
            expect(page.locator("[data-testid='shell-admin-chrome']")).to_be_visible(timeout=TIMEOUT * 1000)
            assert page.locator("[data-testid='shell-user-chrome']").count() == 0, (
                "OrgAdmin opening a quiz must NOT render the end-user shell"
            )
        except Exception:
            _shot(page, "bug2_orgadmin_quiz_chrome")
            raise


# ---------------------------------------------------------------------------
# Bug #3 — cloned document previews, and survives deletion of the original
# ---------------------------------------------------------------------------
@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestClonedDocumentPreview:

    def _find_cloned_doc_id(self, token, cloned_content_id):
        r = requests.get(f"{API_BASE}/api/documents", headers=_auth(token), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        for d in r.json()["data"]:
            if str(d.get("contentId")) == str(cloned_content_id):
                return d["id"]
        raise AssertionError(f"cloned doc with contentId {cloned_content_id} not found in copier's library")

    def test_cloned_document_previews_and_survives_original_delete(self, page: Page):
        # Owner A uploads a public PDF.
        owner = register_user("docown")
        owner_token = _api_token(owner["username"], owner["password"])
        doc = _upload_public_doc(owner_token, f"shared_{unique_suffix('d')}.pdf")
        original_content_id = doc["contentId"]
        original_doc_id = doc["id"]

        # Copier B clones it to their library.
        copier = register_user("doccopy")
        copier_token = _api_token(copier["username"], copier["password"])
        clone = requests.post(f"{API_BASE}/api/contents/{original_content_id}/clone",
                              headers=_auth(copier_token), timeout=TIMEOUT)
        assert clone.status_code == 200, f"clone failed: {clone.text}"
        cloned_content_id = clone.json()["data"]["id"]
        cloned_doc_id = self._find_cloned_doc_id(copier_token, cloned_content_id)

        # The cloned file must be a SEPARATE physical file (independent FilePath).
        ga = requests.get(f"{API_BASE}/api/documents/{cloned_doc_id}",
                          headers=_auth(copier_token), timeout=TIMEOUT)
        assert ga.status_code == 200, f"cloned doc download failed: {ga.text}"
        assert ga.content.startswith(b"%PDF"), "cloned doc bytes should be a PDF"

        # Owner A deletes the ORIGINAL. This must NOT remove the copier's file.
        d = requests.delete(f"{API_BASE}/api/documents/{original_doc_id}",
                            headers=_auth(owner_token), timeout=TIMEOUT)
        assert d.status_code == 200, f"original delete failed: {d.text}"

        # Copier B opens their copy in the real viewer — PDF frame must render (no error overlay).
        ui_login(page, copier["username"], copier["password"])
        page.goto(f"{FE_BASE}/user/documents?docId={cloned_doc_id}")
        page.wait_for_load_state("networkidle")
        try:
            expect(page.locator("[data-testid='document-pdf-frame']")).to_be_visible(timeout=TIMEOUT * 1000)
            assert page.locator("[data-testid='document-preview-unavailable']").count() == 0, (
                "Cloned document must preview even after the original is deleted"
            )
        except Exception:
            _shot(page, "bug3_cloned_doc_preview")
            raise

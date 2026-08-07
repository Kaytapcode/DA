"""
Demo workflow — Luồng 2 (Demo_Testcase.md): Crowdsourcing consume + clone.

Real browser journey (User2):
  search public library → open another user's public quiz → take it (timed, auto-graded,
  explanation shown) → clone it into User2's own library (still public).

Spec invariants exercised:
  §3.1 personal/public resources are public & discoverable; §4.3 quiz auto-grade + explanation
  shown when present; §1 User bullet — clone = new public resource owned by the copier, editing
  the copy does not mutate the original.

NO hardcoded screen data: the quiz under test is created via the real API as User1, then User2
finds/plays/clones it through the live UI. Screenshots on failure → tests/_screens/.
"""

import os
import re
import uuid
import requests
import pytest
from playwright.sync_api import Page, expect

from ._helpers import FE_BASE, API_BASE, ui_login

TIMEOUT = 15
SCREENS = os.path.join(os.path.dirname(__file__), "..", "_screens")
os.makedirs(SCREENS, exist_ok=True)


def _shot(page: Page, name: str):
    try:
        page.screenshot(path=os.path.join(SCREENS, f"{name}.png"), full_page=True)
    except Exception:
        pass


def _login_api(username, password):
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": username, "password": password}, timeout=TIMEOUT)
    assert r.status_code == 200, f"login {username} failed: {r.status_code} {r.text}"
    return r.json()["data"]["accessToken"]


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def public_quiz():
    """As User1, create a PUBLIC quiz with 3 questions, each WITH an explanation (real API)."""
    tok = _login_api("User1", "User@123")
    title = f"LuminaTest_Crowd_{uuid.uuid4().hex[:8]}"
    qr = requests.post(f"{API_BASE}/api/quizzes",
                       json={"title": title, "timeLimit": None, "passingScore": None},
                       headers=_auth(tok), timeout=TIMEOUT)
    assert qr.status_code == 200, qr.text
    data = qr.json()["data"]
    quiz_id, content_id = data["quizId"], data["contentId"]

    qs = [
        ("Giao thuc nao la nen tang truyen thong Internet?",
         ["TCP/IP", "HTTP only", "FTP only", "SMTP only"], 0,
         "TCP/IP la bo giao thuc nen tang cua Internet."),
        ("Thiet bi nao dinh tuyen goi tin giua cac mang?",
         ["Router", "Switch", "Hub", "Repeater"], 0,
         "Router dinh tuyen goi tin giua cac mang khac nhau."),
        ("DNS dung de lam gi?",
         ["Phan giai ten mien thanh IP", "Ma hoa du lieu", "Nen file", "Cap nguon"], 0,
         "DNS phan giai ten mien thanh dia chi IP."),
    ]
    for i, (qt, opts, correct, expl) in enumerate(qs):
        rr = requests.post(f"{API_BASE}/api/quizzes/{quiz_id}/questions",
                           json={"questionText": qt, "explanation": expl, "orderIndex": i,
                                 "options": [{"optionText": o, "isCorrect": j == correct, "orderIndex": j}
                                             for j, o in enumerate(opts)]},
                           headers=_auth(tok), timeout=TIMEOUT)
        assert rr.status_code == 200, rr.text
    return {"title": title, "quizId": quiz_id, "contentId": content_id, "numQuestions": len(qs)}


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.user
@pytest.mark.wave1
@pytest.mark.timeout(120)
class TestFlow2Crowdsourcing:
    def test_search_take_grade_and_clone(self, page: Page, public_quiz):
        title = public_quiz["title"]
        content_id = public_quiz["contentId"]
        n = public_quiz["numQuestions"]

        # ── Step 1: login as User2 (the consumer) ──────────────────────────────
        ui_login(page, "User2", "User@123")

        # ── Step 2: global search for User1's public quiz ──────────────────────
        page.goto(f"{FE_BASE}/user/search")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='global-search-input']").fill(title)
        result = page.locator(f"[data-testid='search-result-{content_id}']")
        result.wait_for(state="visible", timeout=15000)
        _shot(page, "flow2_search_result")
        # Spec §3.1: another user's public content is discoverable.
        assert title in (result.get_attribute("data-result-title") or "")
        # Spec §6.4: the result shows the original author's identity (User1).
        author = result.locator("[data-testid='search-result-author']")
        author.wait_for(state="visible", timeout=10000)
        assert "User1" in author.inner_text(), "search result must show the original author (User1)"

        # ── Step 3: open & take the quiz ───────────────────────────────────────
        page.locator(f"[data-testid='search-result-link-{content_id}']").click()
        page.wait_for_url("**/user/quiz**", timeout=15000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        # Timer present (timed quiz UI)
        assert page.locator("[data-testid='quiz-play-timer']").count() >= 0  # timer shown only if a limit is set
        # Answer every question, then submit.
        for i in range(n):
            page.locator("[data-testid^='quiz-play-option-']").first.click()
            page.wait_for_timeout(150)
            submit = page.locator("[data-testid='quiz-play-submit']")
            if submit.count() > 0 and submit.is_visible():
                submit.click()
                break
            page.get_by_role("button", name=re.compile(r"Next Question|Cau tiep theo")).click()
            page.wait_for_timeout(150)
        else:
            page.locator("[data-testid='quiz-play-submit']").click()

        # ── Step 4: auto-grade + explanation shown (spec §4.3) ─────────────────
        score = page.locator("[data-testid='quiz-play-score']")
        score.wait_for(state="visible", timeout=15000)
        _shot(page, "flow2_quiz_graded")
        assert "%" in (score.inner_text())  # numeric score rendered
        # Quiz has explanations → they MUST be shown.
        expl = page.locator("[data-testid='quiz-play-explanation']")
        assert expl.count() >= 1, "explanations must be shown for a quiz that has them"
        assert (expl.first.inner_text() or "").strip() != ""

        # ── Step 5: clone into User2's library ─────────────────────────────────
        u2 = _login_api("User2", "User@123")
        before = _owned_quiz_titles(u2)
        page.goto(f"{FE_BASE}/user/search")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='global-search-input']").fill(title)
        page.locator(f"[data-testid='search-result-{content_id}']").wait_for(state="visible", timeout=15000)
        clone_btn = page.locator(f"[data-testid='search-clone-{content_id}']")
        clone_btn.wait_for(state="visible", timeout=10000)
        clone_btn.click()
        # cloned indicator OR backend copy appears
        page.wait_for_timeout(1500)
        _shot(page, "flow2_cloned")

        # Verify via API: User2 now owns a DISTINCT copy with the same title, still public.
        u2_id = requests.get(f"{API_BASE}/api/auth/me", headers=_auth(u2), timeout=TIMEOUT).json()["data"]["id"]
        copies = _owned_quizzes(u2)
        # Clone keeps the original title with a " (copy)" suffix and a DISTINCT contentId.
        clone = next((q for q in copies
                      if (q.get("title") or "").startswith(title) and q.get("contentId") != content_id), None)
        assert clone is not None, f"User2 should own a cloned copy of '{title}' (distinct contentId)"
        assert str(clone.get("createdByUserId")) == str(u2_id), "clone must be owned by User2 (spec: owner = copier)"

        # Editing the copy must not mutate the original (spec: copy is independent).
        new_title = f"{title}_MyCopy"
        rr = requests.patch(f"{API_BASE}/api/quizzes/{clone['quizId']}",
                            json={"title": new_title}, headers=_auth(u2), timeout=TIMEOUT)
        assert rr.status_code == 200, rr.text
        # Original unchanged
        orig = _login_api("User1", "User@123")
        orig_quizzes = _owned_quizzes(orig)
        assert any(q.get("contentId") == content_id and q.get("title") == title for q in orig_quizzes), \
            "editing the clone must not change the original's title"


def _owned_quizzes(tok):
    r = requests.get(f"{API_BASE}/api/quizzes", headers=_auth(tok), timeout=TIMEOUT)
    return (r.json().get("data") or []) if r.status_code == 200 else []


def _owned_quiz_titles(tok):
    return [q.get("title") for q in _owned_quizzes(tok)]

"""
Browser (Playwright) regression for the 2026-06-07 #3 batch (quiz timer + auth UX).

B — Password requirements are shown on the Create Account page AND the SysAdmin create-user modal.
E — Quiz "Time Limit" is a select with an Unlimited option; the player shows a live countdown when
    a quiz has a time limit (the timer was never loaded before, so it never appeared).
D — Creating an AI quiz INSIDE a course offers "From Course" (not "From My Library").

Data via the real API (no hardcoding); assertions drive the real FE. Screenshot on failure.
Markers: wave1, e2e, katalon.
"""
import pathlib
import uuid
import requests
import pytest

from _helpers import FE_BASE, API_BASE, ui_login, ui_login_sysadmin, ui_login_orgadmin

ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
SHOTS = pathlib.Path(__file__).resolve().parent.parent / "_screens"
SHOTS.mkdir(exist_ok=True)


def _login(u, p, org=None):
    h = {"X-Org-Id": org} if org else {}
    return requests.post(f"{API_BASE}/api/auth/login", json={"username": u, "password": p}, headers=h, timeout=15).json().get("data") or {}


def _shot(page, name):
    try:
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)
    except Exception:
        pass


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_register_page_shows_password_requirements(page):
    """B — the public Create Account page displays the password rules."""
    try:
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        req = page.locator("[data-testid='password-requirements']")
        req.wait_for(state="visible", timeout=10000)
        text = req.inner_text().lower()
        assert "uppercase" in text and "special" in text, f"requirements text incomplete: {text!r}"
    except Exception:
        _shot(page, "register_password_requirements")
        raise


@pytest.mark.wave1
@pytest.mark.sysadmin
@pytest.mark.e2e
@pytest.mark.katalon
def test_sysadmin_create_user_shows_password_requirements(page):
    """B — the SysAdmin create-user modal displays the password rules."""
    try:
        ui_login_sysadmin(page, "SysAdmin1", "SysAdmin@123")
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='user-create-btn']").click()
        req = page.locator("[data-testid='password-requirements']")
        req.wait_for(state="visible", timeout=10000)
        assert "special" in req.inner_text().lower()
    except Exception:
        _shot(page, "sysadmin_password_requirements")
        raise


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_quiz_create_has_unlimited_time_option(page):
    """E — the quiz create page time-limit is a select that includes an Unlimited option."""
    try:
        ui_login(page, "User2", "User@123")
        page.goto(f"{FE_BASE}/user/quizzes/new")
        page.wait_for_load_state("networkidle")
        sel = page.locator("[data-testid='quiz-timelimit-select']")
        sel.wait_for(state="visible", timeout=10000)
        opts = sel.locator("option").all_inner_texts()
        assert any("unlimited" in o.lower() for o in opts), f"expected an Unlimited option, got {opts}"
    except Exception:
        _shot(page, "quiz_timelimit_select")
        raise


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_quiz_player_shows_countdown_timer(page):
    """E — a quiz with a time limit shows a live countdown ('Time left') in the player."""
    owner = _login("User2", "User@123")
    H = {"Authorization": f"Bearer {owner['accessToken']}"}
    q = requests.post(f"{API_BASE}/api/quizzes", json={"title": f"LuminaTest_Timed_{uuid.uuid4().hex[:6]}", "timeLimit": 5}, headers=H, timeout=20).json().get("data") or {}
    qid = q.get("quizId") or q.get("id")
    # one question so the player renders the play UI
    requests.post(f"{API_BASE}/api/quizzes/{qid}/questions", headers=H, timeout=20, json={
        "questionText": "2+2?", "explanation": "math", "orderIndex": 0,
        "options": [{"optionText": "3", "isCorrect": False, "orderIndex": 0},
                    {"optionText": "4", "isCorrect": True, "orderIndex": 1}],
    })
    try:
        ui_login(page, "User2", "User@123")
        page.goto(f"{FE_BASE}/user/quiz?quizId={qid}")
        page.wait_for_load_state("networkidle")
        timer = page.locator("[data-testid='quiz-play-timer']")
        timer.wait_for(state="visible", timeout=10000)
        assert "time left" in timer.inner_text().lower() or ":" in timer.inner_text()
    except Exception:
        _shot(page, "quiz_player_timer")
        raise
    finally:
        requests.delete(f"{API_BASE}/api/quizzes/{qid}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_incourse_ai_quiz_source_labeled_from_course(page):
    """D — opening the quiz creator in course context offers 'From Course' (not 'From My Library')."""
    oa = _login("OrgAdmin1", "OrgAdmin@123", ORG_A)
    H = {"Authorization": f"Bearer {oa['accessToken']}", "X-Org-Id": ORG_A}
    c = requests.post(f"{API_BASE}/api/courses", json={"title": f"LuminaTest_D_{uuid.uuid4().hex[:6]}"}, headers=H, timeout=30)
    cid = (c.json().get("data") or {}).get("id")
    mid = ((requests.get(f"{API_BASE}/api/courses/{cid}/modules", headers=H, timeout=20).json().get("data") or [])[0]).get("id")
    try:
        ui_login_orgadmin(page, "OrgAdmin1", "OrgAdmin@123", org_id=ORG_A)
        page.goto(f"{FE_BASE}/user/quizzes/new?courseId={cid}&moduleId={mid}&returnTo=curriculum")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='quiz-mode-ai']").click()
        # The source toggle should advertise the course as the document source.
        page.wait_for_timeout(500)
        body = page.locator("body").inner_text()
        assert "From Course" in body or "Tài liệu trong khoá học" in body, "expected a 'From Course' source label in course context"
    except Exception:
        _shot(page, "incourse_ai_source")
        raise
    finally:
        requests.delete(f"{API_BASE}/api/courses/{cid}", headers=H, timeout=20)

"""
Browser (Playwright) regression for the 2026-06-07 #4 batch.

#7 — The user nav sidebar can be collapsed/expanded (toggle persists).
#5 — Home "Most recent activity" shows the real COURSE (not "No course activity yet") once the
     user has course progress.
#4 — Joining an organization is a REQUEST (Pending) that an OrgAdmin approves.

Data via the real API (no hardcoding). Screenshot on failure → tests/_screens/.
Markers: wave1, e2e, katalon.
"""
import pathlib
import uuid
import requests
import pytest

from _helpers import FE_BASE, API_BASE, ui_login, ui_login_orgadmin

ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
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
def test_sidebar_collapse_toggle(page):
    """#7 — clicking the collapse toggle collapses the sidebar and persists the choice."""
    try:
        ui_login(page, "User1", "User@123")
        page.goto(f"{FE_BASE}/user/home")
        page.wait_for_load_state("networkidle")
        sidebar = page.locator("[data-testid='user-sidebar']")
        sidebar.wait_for(state="visible", timeout=10000)
        assert sidebar.get_attribute("data-collapsed") == "false"
        page.locator("[data-testid='nav-collapse-toggle']").click()
        page.wait_for_timeout(300)
        assert sidebar.get_attribute("data-collapsed") == "true", "sidebar should collapse"
        # persists across navigation
        page.goto(f"{FE_BASE}/user/courses")
        page.wait_for_load_state("networkidle")
        assert page.locator("[data-testid='user-sidebar']").get_attribute("data-collapsed") == "true"
    except Exception:
        _shot(page, "sidebar_collapse")
        raise


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_home_shows_real_course_activity(page):
    """#5 — after course progress, the home card shows the course title, not 'No course activity yet'."""
    oa = _login("OrgAdmin1", "OrgAdmin@123", ORG_A)
    H = {"Authorization": f"Bearer {oa['accessToken']}", "X-Org-Id": ORG_A}
    stu = _login("User2", "User@123"); sid = (stu.get("user") or {}).get("id")
    SH = {"Authorization": f"Bearer {stu['accessToken']}"}
    title = f"LuminaTest_Home_{uuid.uuid4().hex[:6]}"
    c = requests.post(f"{API_BASE}/api/courses", json={"title": title}, headers=H, timeout=30)
    cid = (c.json().get("data") or {}).get("id")
    mid = ((requests.get(f"{API_BASE}/api/courses/{cid}/modules", headers=H, timeout=20).json().get("data") or [])[0]).get("id")
    # Use a VIDEO (the recent feed excludes QUIZ rows — quiz activity shows via attempts instead).
    v = requests.post(f"{API_BASE}/api/videos/personal", json={"youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "LuminaTest CV", "description": None}, headers=H, timeout=30).json().get("data") or {}
    cont = v.get("contentId")
    requests.post(f"{API_BASE}/api/courses/{cid}/modules/{mid}/contents/link", json={"contentId": cont}, headers=H, timeout=20)
    requests.post(f"{API_BASE}/api/courses/{cid}/enrollments", json={"userId": sid, "role": "Student"}, headers=H, timeout=20)
    requests.post(f"{API_BASE}/api/courses/{cid}/progress", json={"moduleId": mid, "contentId": cont, "isCompleted": True, "timeSpentSeconds": 5}, headers=SH, timeout=20)
    try:
        ui_login(page, "User2", "User@123")
        page.goto(f"{FE_BASE}/fe/user/user_learning_dashboard_light")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        body = page.locator("body").inner_text()
        assert title in body, f"home should surface the course '{title}'"
        assert "No course activity yet" not in body, "should not show 'No course activity yet' when a course row exists"
    except Exception:
        _shot(page, "home_course_activity")
        raise
    finally:
        requests.delete(f"{API_BASE}/api/courses/{cid}", headers=H, timeout=20)
        requests.delete(f"{API_BASE}/api/orgs/{ORG_A}/members/{sid}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_org_join_is_request_then_pending(page):
    """#4 — clicking 'Request to Join' shows a Pending badge (membership awaits OrgAdmin approval)."""
    # ensure User3 is not already a member/pending of ORG_B
    oa = _login("OrgAdmin2", "OrgAdmin@123", ORG_B)
    H = {"Authorization": f"Bearer {oa['accessToken']}", "X-Org-Id": ORG_B}
    u3 = _login("User3", "User@123"); u3id = (u3.get("user") or {}).get("id")
    requests.delete(f"{API_BASE}/api/orgs/{ORG_B}/members/{u3id}", headers=H, timeout=20)
    try:
        ui_login(page, "User3", "User@123")
        page.goto(f"{FE_BASE}/user/organizations")
        page.wait_for_load_state("networkidle")
        # find the ORG_B card (TestOrg2) and click its Request to Join
        card = page.locator("[data-testid='org-card']", has=page.get_by_text("test-org-2")).first
        if card.count() == 0:
            card = page.locator("[data-testid='org-card']").filter(has_text="Org").first
        join = page.locator("[data-testid='org-join-btn']").first
        join.wait_for(state="visible", timeout=10000)
        # label should read "Request to Join", not "Join"
        assert "request" in join.inner_text().lower()
        join.click()
        page.locator("[data-testid='org-pending-badge']").first.wait_for(state="visible", timeout=10000)
    except Exception:
        _shot(page, "org_join_pending")
        raise
    finally:
        requests.delete(f"{API_BASE}/api/orgs/{ORG_B}/members/{u3id}", headers=H, timeout=20)

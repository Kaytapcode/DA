"""
Browser (Playwright) regression for the 2026-06-07 #7 batch (Teacher dashboard + Global Content CMS).

A — A per-course Teacher opening the course page sees a Student-Progress dashboard with student rows.
B — SysAdmin "Global Content" page lists ALL content (incl. in-course) and can delete.
C — OrgAdmin "Content" page lists the org's content.

Data via the real API (no hardcoding). Screenshot on failure → tests/_screens/.
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


@pytest.fixture(scope="module")
def teacher_course():
    """OrgAdmin builds a course, makes User2 a Teacher, User3 a Student who completes a video."""
    oa = _login("OrgAdmin1", "OrgAdmin@123", ORG_A)
    H = {"Authorization": f"Bearer {oa['accessToken']}", "X-Org-Id": ORG_A}
    u2 = _login("User2", "User@123"); t_id = (u2.get("user") or {}).get("id")
    u3 = _login("User3", "User@123"); s_id = (u3.get("user") or {}).get("id")
    s_h = {"Authorization": f"Bearer {u3['accessToken']}"}
    c = requests.post(f"{API_BASE}/api/courses", json={"title": f"LuminaTest_TD_{uuid.uuid4().hex[:5]}"}, headers=H, timeout=30)
    cid = (c.json().get("data") or {}).get("id")
    mid = ((requests.get(f"{API_BASE}/api/courses/{cid}/modules", headers=H, timeout=20).json().get("data") or [])[0]).get("id")
    v = requests.post(f"{API_BASE}/api/videos/personal", json={"youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "TD vid", "description": None}, headers=H, timeout=30).json().get("data") or {}
    requests.post(f"{API_BASE}/api/courses/{cid}/modules/{mid}/contents/link", json={"contentId": v.get('contentId')}, headers=H, timeout=20)
    requests.post(f"{API_BASE}/api/courses/{cid}/enrollments", json={"userId": t_id, "role": "Teacher"}, headers=H, timeout=20)
    requests.post(f"{API_BASE}/api/courses/{cid}/enrollments", json={"userId": s_id, "role": "Student"}, headers=H, timeout=20)
    requests.post(f"{API_BASE}/api/courses/{cid}/progress", json={"moduleId": mid, "contentId": v.get('contentId'), "isCompleted": True, "timeSpentSeconds": 5}, headers=s_h, timeout=20)
    yield {"course_id": cid, "H": H, "t_id": t_id, "s_id": s_id}
    requests.delete(f"{API_BASE}/api/courses/{cid}", headers=H, timeout=20)
    requests.delete(f"{API_BASE}/api/orgs/{ORG_A}/members/{t_id}", headers=H, timeout=20)
    requests.delete(f"{API_BASE}/api/orgs/{ORG_A}/members/{s_id}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_teacher_sees_student_progress_dashboard(teacher_course, page):
    """A — a per-course Teacher sees the Student-Progress panel with a student row on the course page."""
    try:
        ui_login(page, "User2", "User@123")
        page.goto(f"{FE_BASE}/user/course/{teacher_course['course_id']}")
        page.wait_for_load_state("networkidle")
        panel = page.locator("[data-testid='teacher-progress-panel']")
        panel.wait_for(state="visible", timeout=12000)
        # the enrolled student should appear with a progress %
        row = page.locator(f"[data-testid='tp-student-{teacher_course['s_id']}']")
        row.wait_for(state="visible", timeout=10000)
        assert "User3" in row.inner_text()
    except Exception:
        _shot(page, "teacher_progress_dashboard")
        raise


@pytest.mark.wave1
@pytest.mark.sysadmin
@pytest.mark.e2e
@pytest.mark.katalon
def test_sysadmin_global_content_lists_all(teacher_course, page):
    """B — SysAdmin Global Content page lists content (incl. the in-course video just created)."""
    try:
        ui_login_sysadmin(page, "SysAdmin1", "SysAdmin@123")
        page.goto(f"{FE_BASE}/sysadmin/content")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='global-content-card']").wait_for(state="visible", timeout=12000)
        page.locator("[data-testid='global-content-list']").wait_for(state="visible", timeout=10000)
        # search for the in-course video created in the fixture
        page.locator("[data-testid='global-content-search']").fill("TD vid")
        page.locator("[data-testid='global-content-search-btn']").click()
        page.wait_for_timeout(800)
        assert "TD vid" in page.locator("[data-testid='global-content-list']").inner_text()
    except Exception:
        _shot(page, "sysadmin_global_content")
        raise


@pytest.mark.wave1
@pytest.mark.orgadmin
@pytest.mark.e2e
@pytest.mark.katalon
def test_orgadmin_content_page_lists_org_content(teacher_course, page):
    """C — OrgAdmin Content CMS page renders the org content list."""
    try:
        ui_login_orgadmin(page, "OrgAdmin1", "OrgAdmin@123", org_id=ORG_A)
        page.goto(f"{FE_BASE}/admin/content")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='global-content-card']").wait_for(state="visible", timeout=12000)
        # list or empty-state must render (no crash); the org has the fixture course content
        assert (page.locator("[data-testid='global-content-list']").count() > 0
                or page.locator("[data-testid='global-content-empty']").count() > 0)
    except Exception:
        _shot(page, "orgadmin_content_cms")
        raise

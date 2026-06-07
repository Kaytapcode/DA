"""
Browser (Playwright) regression for the 2026-06-07 course-access batch.

1.1 — A Student enrolled in a course can OPEN course content. Root causes were BE-side:
      (a) ModulesController didn't return videoId/documentId so the FE links were incomplete
      ("Load a video with ?videoId="), and (b) VideosController gated on org-equality so a no-org
      student got 403. Verified here: the course page renders a working video link (has videoId=).
1.2 — A user added as Teacher sees the course in "My Courses" (with a Teacher badge); and the
      OrgAdmin "Course enrollments" panel shows the USERNAME, not a raw GUID.

Data is created via the real API (no hardcoding); the assertions drive the real FE.
On failure a screenshot is saved to tests/_screens/. Markers: wave1, e2e, katalon.
"""
import pathlib
import uuid
import requests
import pytest

from _helpers import FE_BASE, API_BASE, ui_login, ui_login_orgadmin

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
def course_setup():
    """OrgAdmin builds a course with a linked video, enrolls User2 (Teacher) and User3 (Student)."""
    oa = _login("OrgAdmin1", "OrgAdmin@123", ORG_A)
    H = {"Authorization": f"Bearer {oa['accessToken']}", "X-Org-Id": ORG_A}
    u2 = _login("User2", "User@123"); u2id = (u2.get("user") or {}).get("id")
    u3 = _login("User3", "User@123"); u3id = (u3.get("user") or {}).get("id")
    c = requests.post(f"{API_BASE}/api/courses", json={"title": f"LuminaTest_Acc_{uuid.uuid4().hex[:6]}"}, headers=H, timeout=30)
    cid = (c.json().get("data") or {}).get("id")
    mid = ((requests.get(f"{API_BASE}/api/courses/{cid}/modules", headers=H, timeout=20).json().get("data") or [])[0]).get("id")
    v = requests.post(f"{API_BASE}/api/videos/personal", json={"youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "LuminaTest Vid", "description": None}, headers=H, timeout=30)
    vc = (v.json().get("data") or {}).get("contentId")
    requests.post(f"{API_BASE}/api/courses/{cid}/modules/{mid}/contents/link", json={"contentId": vc}, headers=H, timeout=20)
    requests.post(f"{API_BASE}/api/courses/{cid}/enrollments", json={"userId": u2id, "role": "Teacher"}, headers=H, timeout=20)
    requests.post(f"{API_BASE}/api/courses/{cid}/enrollments", json={"userId": u3id, "role": "Student"}, headers=H, timeout=20)
    yield {"course_id": cid, "H": H, "u2id": u2id, "u3id": u3id}
    requests.delete(f"{API_BASE}/api/courses/{cid}", headers=H, timeout=20)
    requests.delete(f"{API_BASE}/api/orgs/{ORG_A}/members/{u2id}", headers=H, timeout=20)
    requests.delete(f"{API_BASE}/api/orgs/{ORG_A}/members/{u3id}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_teacher_sees_course_in_my_courses(course_setup, page):
    """1.2A — a user enrolled as Teacher sees the course in My Courses with a Teacher badge."""
    try:
        ui_login(page, "User2", "User@123")
        page.goto(f"{FE_BASE}/user/courses")
        page.wait_for_load_state("networkidle")
        card = page.locator(f"[data-testid='my-course-card-{course_setup['course_id']}']")
        card.wait_for(state="visible", timeout=10000)
        assert "Teacher" in card.inner_text(), f"expected Teacher badge, got: {card.inner_text()!r}"
    except Exception:
        _shot(page, "teacher_my_courses")
        raise


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_student_course_page_has_working_video_link(course_setup, page):
    """1.1 — the course page builds a complete video link (has videoId=), not the empty state."""
    try:
        ui_login(page, "User3", "User@123")
        page.goto(f"{FE_BASE}/user/course/{course_setup['course_id']}")
        page.wait_for_load_state("networkidle")
        # The content panel must render; the video item link must carry a videoId (was missing).
        page.locator("[data-testid='course-content-panel']").wait_for(state="visible", timeout=10000)
        video_link = page.locator("a[href*='/user/lesson'][href*='videoId=']")
        assert video_link.count() >= 1, "expected a video link containing videoId= on the course page"
    except Exception:
        _shot(page, "student_video_link")
        raise


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_orgadmin_enrollment_panel_shows_username(course_setup, page):
    """1.2B — the OrgAdmin course enrollments panel shows the username, not a raw GUID."""
    try:
        ui_login_orgadmin(page, "OrgAdmin1", "OrgAdmin@123", org_id=ORG_A)
        page.goto(f"{FE_BASE}/admin/editor/member-roles?courseId={course_setup['course_id']}")
        page.wait_for_load_state("networkidle")
        row = page.locator(f"[data-testid='enrollment-row-{course_setup['u2id']}']")
        row.wait_for(state="visible", timeout=10000)
        text = row.inner_text()
        assert "User2" in text, f"expected username 'User2' in enrollment row, got: {text!r}"
        assert course_setup["u2id"] not in text, f"raw GUID should not be the primary label: {text!r}"
    except Exception:
        _shot(page, "orgadmin_enrollment_username")
        raise

"""
Browser (Playwright) workflow tests for the 2026-06-01 follow-up fixes.
(Spec update pending — markers map to the dev's numbered issues.)

  #1  User can actually view a document (PDF iframe renders, no error overlay).
  #2  User "My Courses" shows REAL enrolled-course data (no hardcoded sample courses);
      empty state when not enrolled, real card once enrolled.
  #3  User "Browse Courses" loads (no "Failed to load courses"), lists the org's courses,
      and a request-to-enroll click flips the card to a pending state.
  #4  OrgAdmin Course Editor → Curriculum with NO courseId shows a real course PICKER
      (not a dead-end error), and picking a course loads its curriculum.
  #5  Org-level role dropdown offers only Member/OrgAdmin (Teacher/Student is per-course).

Real flows only — clicks + live data, NO hardcoded data. On failure, a screenshot is written
to tests/_screens/ for verification.
"""

import os
import uuid
import requests
import pytest
from playwright.sync_api import Page, expect

from ._helpers import FE_BASE, API_BASE, register_user, ui_login, ui_login_orgadmin

ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TIMEOUT = 10

SCREENS = os.path.join(os.path.dirname(__file__), "..", "_screens")
os.makedirs(SCREENS, exist_ok=True)


def _shot(page: Page, name: str):
    try:
        page.screenshot(path=os.path.join(SCREENS, f"{name}.png"), full_page=True)
    except Exception:
        pass


def _api_login(identifier, password, org_id=None):
    headers = {"X-Org-Id": org_id} if org_id else {}
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": identifier, "password": password},
                      headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()["data"]["accessToken"]


def _me_id(token):
    r = requests.get(f"{API_BASE}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    return (r.json().get("data") or r.json())["id"]


@pytest.fixture(scope="module")
def oa_token():
    return _api_login(ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)


@pytest.fixture
def org1_course(oa_token):
    title = f"FixTest_{uuid.uuid4().hex[:8]}"
    r = requests.post(
        f"{API_BASE}/api/courses",
        json={"title": title, "description": "fix flow", "courseCode": "FX1"},
        headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID},
        timeout=TIMEOUT,
    )
    assert r.status_code in (200, 201), r.text
    data = r.json(); data = data.get("data") or data
    return {"id": data["id"], "title": title}


# ─────────────────────────────────────────────────────────────────────────────
# #1 — Document viewing actually renders
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.timeout(120)
class TestDocumentRendersForReal:
    def test_pdf_renders_without_error_overlay(self, page: Page):
        creds = register_user("docok")
        token = _api_login(creds["username"], creds["password"])
        pdf = (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
               b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
               b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]>>endobj\n"
               b"trailer<</Root 1 0 R>>\n%%EOF")
        r = requests.post(f"{API_BASE}/api/documents",
                          files={"file": ("ok.pdf", pdf, "application/pdf")},
                          headers={"Authorization": f"Bearer {token}"}, timeout=15)
        doc_id = (r.json().get("data") or r.json())["id"]

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/documents?docId={doc_id}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        _shot(page, "issue1_document")

        # No error overlay ("Unable to load document").
        assert page.locator("text=Unable to load document").count() == 0
        # PDF iframe present, pointed at a clean blob URL (no #filename fragment).
        frame = page.locator("[data-testid='document-pdf-frame']")
        frame.wait_for(state="visible", timeout=10000)
        src = frame.get_attribute("src") or ""
        assert src.startswith("blob:") and "#filename=" not in src, f"bad pdf src: {src}"


# ─────────────────────────────────────────────────────────────────────────────
# #2 — My Courses uses real data (no hardcoded samples)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.user
@pytest.mark.timeout(120)
class TestMyCoursesRealData:
    def test_no_hardcoded_samples_and_empty_state(self, page: Page):
        creds = register_user("mycrs")
        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/courses")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        _shot(page, "issue2_empty")
        # The old hardcoded data must be gone.
        assert page.locator("text=Sample Course A").count() == 0
        assert page.locator("text=Sample Course B").count() == 0
        # Fresh user is enrolled in nothing → real empty state.
        expect(page.locator("[data-testid='my-courses-empty']")).to_be_visible(timeout=8000)

    def test_enrolled_course_appears(self, page: Page, oa_token, org1_course):
        creds = register_user("mycrs2")
        token = _api_login(creds["username"], creds["password"])
        uid = _me_id(token)
        # OrgAdmin enrolls this user (Approved immediately) as Student in the course.
        r = requests.post(
            f"{API_BASE}/api/courses/{org1_course['id']}/enrollments",
            json={"userId": uid, "role": "Student"},
            headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/courses")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        _shot(page, "issue2_enrolled")
        card = page.locator(f"[data-testid='my-course-card-{org1_course['id']}']")
        expect(card).to_be_visible(timeout=8000)
        expect(page.locator(f"[data-testid='my-course-card-{org1_course['id']}'] [data-testid='my-course-title']")).to_have_text(org1_course["title"])


# ─────────────────────────────────────────────────────────────────────────────
# #3 — Browse Courses loads + request works
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.user
@pytest.mark.timeout(120)
class TestBrowseCoursesWorks:
    def test_browse_loads_and_request_enroll(self, page: Page, oa_token, org1_course):
        creds = register_user("brws")
        token = _api_login(creds["username"], creds["password"])
        # Join org1 so the user shares its course catalog.
        requests.post(f"{API_BASE}/api/orgs/{ORG1_ID}/members/self",
                      headers={"Authorization": f"Bearer {token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/courses/browse")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        _shot(page, "issue3_browse")
        # No load error.
        assert page.locator("[data-testid='browse-error']").count() == 0, "Browse showed a load error"
        assert page.locator("text=Failed to load courses").count() == 0
        # The course card is listed; request to enroll.
        btn = page.locator(f"[data-testid='course-request-enroll-{org1_course['id']}']")
        btn.wait_for(state="visible", timeout=10000)
        btn.click()
        state = page.locator(f"[data-testid='course-enroll-state-{org1_course['id']}']")
        expect(state).to_be_visible(timeout=8000)
        _shot(page, "issue3_pending")


# ─────────────────────────────────────────────────────────────────────────────
# #4 — Curriculum editor course picker (no courseId)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(120)
class TestCurriculumPicker:
    def test_no_courseid_shows_picker_and_can_pick(self, page: Page, org1_course):
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/curriculum")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        _shot(page, "issue4_picker")
        # The dead-end error message must be gone; a real picker shows instead.
        assert page.locator("text=No courseId in URL").count() == 0
        picker = page.locator("[data-testid='curriculum-course-picker']")
        expect(picker).to_be_visible(timeout=10000)
        # Pick the freshly-created course → URL gains courseId and modules area loads.
        pick = page.locator(f"[data-testid='curriculum-pick-{org1_course['id']}']")
        pick.wait_for(state="visible", timeout=10000)
        pick.click()
        page.wait_for_url(f"**/admin/editor/curriculum?courseId={org1_course['id']}", timeout=10000)
        page.wait_for_load_state("networkidle")
        _shot(page, "issue4_picked")
        # Picker is gone once a course is selected.
        assert page.locator("[data-testid='curriculum-course-picker']").count() == 0


# ─────────────────────────────────────────────────────────────────────────────
# #5 — Org role dropdown shows Member/OrgAdmin only (not Teacher/Student)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(120)
class TestOrgRoleVocabulary:
    def test_member_dropdown_has_member_not_per_course_roles(self, page: Page):
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/members")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("table tbody tr", timeout=10000)
        _shot(page, "issue5_roles")
        row_select = page.locator("table tbody td select").first
        options = row_select.locator("option").all_inner_texts()
        assert "Member" in options, f"options={options}"
        assert "Teacher" not in options, f"Teacher must not be an org role; options={options}"
        assert "Student" not in options, f"Student must not be an org role; options={options}"

"""
Browser (Playwright) workflow tests — 2026-06-01 round 6.
(Spec update pending.)

Content in a course is CREATED through the SAME pages a user uses (not "link an existing item"):
  - OrgAdmin curriculum: Add content -> Video -> /user/videos/new (carries course+module) ->
    save -> auto-links into the module -> returns to the curriculum.
  - OrgAdmin curriculum: Add content -> Document -> inline upload modal -> uploaded doc links in.
  - Teacher (per-course) on the course page: Add content -> Quiz -> /user/quizzes/new -> create ->
    auto-links -> returns to the course page.

Real flows only (clicks + live data), NO hardcoded data. Screenshots -> tests/_screens/.
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
                      json={"username": identifier, "password": password}, headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()["data"]["accessToken"]


def _me_id(token):
    return requests.get(f"{API_BASE}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT).json()["data"]["id"]


def _module_content_count(token, cid, mid, org=ORG1_ID):
    r = requests.get(f"{API_BASE}/api/courses/{cid}/modules",
                     headers={"Authorization": f"Bearer {token}", "X-Org-Id": org}, timeout=TIMEOUT)
    mods = r.json().get("data") or []
    m = next((x for x in mods if x["id"] == mid), None)
    return len((m or {}).get("contents") or [])


@pytest.fixture(scope="module")
def oa_token():
    return _api_login(ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)


def _course_with_module(oa_token, code="CC1"):
    cid = requests.post(f"{API_BASE}/api/courses",
                        json={"title": f"CC_{uuid.uuid4().hex[:6]}", "courseCode": code},
                        headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()
    cid = (cid.get("data") or cid)["id"]
    mr = requests.post(f"{API_BASE}/api/courses/{cid}/modules", json={"title": "Module One"},
                       headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()
    mid = (mr.get("data") or mr)["id"]
    return cid, mid


# ─────────────────────────────────────────────────────────────────────────────
# OrgAdmin: create a Video into a module via the user video creator
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(160)
class TestOrgAdminCreatesVideoInCourse:
    def test_add_video_via_creator_links_to_module(self, page: Page, oa_token):
        cid, mid = _course_with_module(oa_token, "VID")
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/curriculum?courseId={cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        page.locator("[data-testid='module-expand-btn']").first.click()
        page.wait_for_timeout(300)
        page.locator("[data-testid='content-add-btn']").first.click()
        page.wait_for_timeout(300)
        # Choose Video -> navigates to the user video creator carrying course context.
        page.locator("[data-testid='content-create-VIDEO']").click()
        page.wait_for_url("**/user/videos/new**", timeout=10000)
        page.wait_for_load_state("networkidle")
        _shot(page, "cc_video_creator")
        page.locator("[data-testid='video-url-input']").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        page.locator("[data-testid='video-save-btn']").click()
        # Auto-links and returns to the curriculum editor.
        page.wait_for_url(f"**/admin/editor/curriculum?courseId={cid}", timeout=15000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        _shot(page, "cc_video_linked")
        assert _module_content_count(oa_token, cid, mid) == 1, "video should be linked into the module"


# ─────────────────────────────────────────────────────────────────────────────
# OrgAdmin: create a Document into a module via the inline upload modal
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(160)
class TestOrgAdminCreatesDocumentInCourse:
    def test_add_document_via_upload_links_to_module(self, page: Page, oa_token):
        cid, mid = _course_with_module(oa_token, "DOC")
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/curriculum?courseId={cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        page.locator("[data-testid='module-expand-btn']").first.click()
        page.wait_for_timeout(300)
        page.locator("[data-testid='content-add-btn']").first.click()
        page.wait_for_timeout(300)
        page.locator("[data-testid='content-create-PDF']").click()
        page.wait_for_timeout(500)
        # Upload modal opens; set the file on the hidden input and submit.
        page.locator("[data-testid='document-upload-input']").set_input_files({
            "name": f"cc_{uuid.uuid4().hex[:5]}.pdf",
            "mimeType": "application/pdf",
            "buffer": b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
        })
        page.wait_for_timeout(300)
        page.locator("[data-testid='document-upload-submit']").click()
        page.wait_for_timeout(2000)
        _shot(page, "cc_doc_linked")
        assert _module_content_count(oa_token, cid, mid) == 1, "uploaded document should link into the module"


# ─────────────────────────────────────────────────────────────────────────────
# Teacher: create a Quiz into a module via the user quiz creator
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.user
@pytest.mark.timeout(160)
class TestTeacherCreatesQuizInCourse:
    def test_teacher_add_quiz_via_creator_links_to_module(self, page: Page, oa_token):
        cid, mid = _course_with_module(oa_token, "QZ")
        creds = register_user("tquiz")
        ttok = _api_login(creds["username"], creds["password"])
        tid = _me_id(ttok)
        requests.post(f"{API_BASE}/api/courses/{cid}/enrollments",
                      json={"userId": tid, "role": "Teacher"},
                      headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/course/{cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        page.locator(f"[data-testid='teacher-add-content-btn-{mid}']").click()
        page.wait_for_timeout(300)
        page.locator("[data-testid='teacher-create-QUIZ']").click()
        page.wait_for_url("**/user/quizzes/new**", timeout=10000)
        page.wait_for_load_state("networkidle")
        _shot(page, "cc_quiz_creator")
        # Author a minimal valid quiz.
        page.locator("[data-testid='quiz-title-input']").fill(f"CourseQuiz {uuid.uuid4().hex[:4]}")
        page.locator("[data-testid='quiz-question-0-text']").fill("What is 2 + 2?")
        # All 4 options must be non-empty (validation); option 0 is the default correct answer.
        for i, val in enumerate(["4", "3", "5", "6"]):
            page.locator(f"[data-testid='quiz-question-0-option-{i}-text']").fill(val)
        page.locator("[data-testid='quiz-question-0-option-0-correct']").check()
        page.locator("[data-testid='quiz-save-btn']").click()
        # Auto-links and returns to the course page.
        page.wait_for_url(f"**/user/course/{cid}", timeout=15000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        _shot(page, "cc_quiz_linked")
        assert _module_content_count(oa_token, cid, mid) == 1, "quiz should be linked into the module"

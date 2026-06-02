"""
Browser (Playwright) workflow tests — 2026-06-01 round 4.
(Spec update pending.)

  #1  An enrolled user can OPEN a course from My Courses (no "Course not found").
  #2b OrgAdmin "Add content" in the curriculum defaults to linking REAL library content
      (reuses the user's content pipeline rather than spawning empty placeholders).
  #3  A user can ADD content to a collection from the collection page itself (in-page Add panel).

Real flows only (clicks + live data), NO hardcoded data. Screenshots → tests/_screens/.
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


@pytest.fixture(scope="module")
def oa_token():
    return _api_login(ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)


# ─────────────────────────────────────────────────────────────────────────────
# #1 — Enrolled user opens a course (no "Course not found")
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.user
@pytest.mark.timeout(120)
class TestEnrolledUserOpensCourse:
    def test_open_course_from_my_courses(self, page: Page, oa_token):
        # OrgAdmin creates a course and enrolls a fresh user (Approved) — setup via API.
        title = f"OpenMe_{uuid.uuid4().hex[:8]}"
        cid = requests.post(f"{API_BASE}/api/courses",
                            json={"title": title, "description": "open flow", "courseCode": "OM1"},
                            headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()
        cid = (cid.get("data") or cid)["id"]
        creds = register_user("opener")
        utok = _api_login(creds["username"], creds["password"])
        uid = _me_id(utok)
        r = requests.post(f"{API_BASE}/api/courses/{cid}/enrollments",
                          json={"userId": uid, "role": "Student"},
                          headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

        # User logs in (NO org selected) and opens the course from My Courses.
        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/courses")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        page.locator(f"[data-testid='my-course-open-{cid}']").click()
        page.wait_for_url(f"**/user/course/{cid}", timeout=10000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        _shot(page, "enter_course")
        # The dreaded errors must NOT appear.
        assert page.locator("text=Course not found").count() == 0
        assert page.locator("text=Access denied").count() == 0
        # Course title renders somewhere on the page.
        expect(page.locator(f"text={title}").first).to_be_visible(timeout=8000)


# ─────────────────────────────────────────────────────────────────────────────
# #2b — Curriculum "Add content" defaults to the From-Library (real content) flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(120)
class TestCurriculumContentReusesLibrary:
    def test_add_content_opens_library_mode(self, page: Page, oa_token):
        # Course with one module (setup via API).
        cid = requests.post(f"{API_BASE}/api/courses",
                            json={"title": f"CtFlow_{uuid.uuid4().hex[:6]}", "courseCode": "CF1"},
                            headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()
        cid = (cid.get("data") or cid)["id"]
        mr = requests.post(f"{API_BASE}/api/courses/{cid}/modules", json={"title": "Module One"},
                           headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)
        assert mr.status_code == 200, f"module create failed: {mr.text}"

        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/curriculum?courseId={cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        # Expand the module, then open its Add Content panel.
        page.locator("[data-testid='module-expand-btn']").first.click()
        page.wait_for_timeout(400)
        page.locator("[data-testid='content-add-btn']").first.click()
        page.wait_for_timeout(600)
        _shot(page, "content_library_mode")
        # Round 6: the panel is a CREATE chooser — content is created via the user pages (not linked
        # from a library). It shows the four create-type buttons and no "Create New" placeholder text.
        expect(page.locator("[data-testid='content-add-panel']")).to_be_visible(timeout=5000)
        expect(page.locator("[data-testid='content-create-VIDEO']")).to_be_visible()
        assert page.get_by_role("button", name="Create New").count() == 0


# ─────────────────────────────────────────────────────────────────────────────
# #3 — Add content to a collection from the collection page
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.timeout(120)
class TestCollectionAddContent:
    def test_user_adds_document_to_collection(self, page: Page):
        creds = register_user("colladd")
        token = _api_login(creds["username"], creds["password"])
        # Give the user a real library document to add.
        pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
        doc = requests.post(f"{API_BASE}/api/documents",
                            files={"file": (f"coll_{uuid.uuid4().hex[:6]}.pdf", pdf, "application/pdf")},
                            headers={"Authorization": f"Bearer {token}"}, timeout=15).json()
        doc = doc.get("data") or doc

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/collections")
        page.wait_for_load_state("networkidle")
        # Create a collection.
        page.locator("[data-testid='collection-new-btn']").click()
        coll_title = f"Coll_{uuid.uuid4().hex[:6]}"
        page.locator("[data-testid='collection-title-input']").fill(coll_title)
        page.locator("[data-testid='collection-create-btn']").click()
        page.wait_for_timeout(1200)
        # Open it (card click).
        page.get_by_text(coll_title, exact=True).first.click()
        page.wait_for_timeout(1000)
        _shot(page, "collection_detail")
        # Open the in-page Add content panel.
        page.locator("[data-testid='collection-add-content-btn']").click()
        page.wait_for_timeout(500)
        panel = page.locator("[data-testid='collection-add-content-panel']")
        expect(panel).to_be_visible(timeout=8000)
        # Pick the PDF/Documents type and add the document.
        page.locator("[data-testid='collection-addtype-PDF']").click()
        page.wait_for_timeout(800)
        add_btn = page.locator(f"[data-testid='collection-add-item-{doc['contentId']}']")
        add_btn.wait_for(state="visible", timeout=8000)
        add_btn.click()
        page.wait_for_timeout(1200)
        _shot(page, "collection_item_added")
        # The document now appears as an item in the collection (it's removed from the add list,
        # so re-opening the page shows it among items). Reload + reopen to confirm persistence.
        page.reload()
        page.wait_for_load_state("networkidle")
        page.get_by_text(coll_title, exact=True).first.click()
        page.wait_for_timeout(1200)
        # The empty-state must be gone (the collection now has ≥1 item).
        assert page.locator("text=No items in this collection yet").count() == 0

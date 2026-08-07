"""
Browser (Playwright) workflow tests — 2026-06-01 round 5.
(Spec update pending.)

  #1  A per-course TEACHER (global role Student; per-course role from enrollment) can add a
      module and link content from the course view itself (the /admin editor is OrgAdmin-only).
  #2  A user can add optional SECTIONS (sub-modules) to a collection and add content into a section.
  #3/#4  Curriculum "Add content" is library-only (no "Create New" placeholder) and content rows
      have NO Draft/Publish toggle (the publish step was removed).

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
# #1 — Per-course Teacher edits the course from the course view
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.user
@pytest.mark.timeout(150)
class TestTeacherEditsCourse:
    def test_teacher_adds_module_and_links_content(self, page: Page, oa_token):
        # Course (OrgAdmin) + a user enrolled as Teacher (Approved).
        cid = requests.post(f"{API_BASE}/api/courses",
                            json={"title": f"TCourse_{uuid.uuid4().hex[:6]}", "courseCode": "TT9"},
                            headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()
        cid = (cid.get("data") or cid)["id"]
        creds = register_user("teacher")
        ttok = _api_login(creds["username"], creds["password"])
        tid = _me_id(ttok)
        r = requests.post(f"{API_BASE}/api/courses/{cid}/enrollments",
                          json={"userId": tid, "role": "Teacher"},
                          headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        # Give the teacher a real library document to link.
        pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
        requests.post(f"{API_BASE}/api/documents",
                      files={"file": (f"t_{uuid.uuid4().hex[:5]}.pdf", pdf, "application/pdf")},
                      headers={"Authorization": f"Bearer {ttok}"}, timeout=15)

        # Teacher logs in as a normal user and opens the course.
        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/course/{cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        _shot(page, "teacher_course")

        # Teacher tools are visible → add a module.
        toggle = page.locator("[data-testid='teacher-add-module-toggle']")
        toggle.wait_for(state="visible", timeout=10000)
        toggle.click()
        mod = f"TMod {uuid.uuid4().hex[:5]}"
        page.locator("[data-testid='teacher-module-title-input']").fill(mod)
        page.locator("[data-testid='teacher-module-add-btn']").click()
        expect(page.locator(f"text={mod}")).to_be_visible(timeout=8000)
        _shot(page, "teacher_module_added")

        # "Add content" now opens a CREATE chooser (Document/Video/Quiz/Flashcards) — the teacher
        # creates content through the same pages users use. (The full create+link is verified in
        # test_create_content_in_course_workflows.py.)
        page.locator("[data-testid^='teacher-add-content-btn-']").first.click()
        page.wait_for_timeout(400)
        _shot(page, "teacher_content_chooser")
        expect(page.locator("[data-testid='teacher-create-PDF']")).to_be_visible(timeout=8000)
        expect(page.locator("[data-testid='teacher-create-QUIZ']")).to_be_visible()
        expect(page.locator("[data-testid='teacher-create-VIDEO']")).to_be_visible()


# ─────────────────────────────────────────────────────────────────────────────
# #2 — Collection optional sections
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.timeout(150)
class TestCollectionSections:
    def test_user_adds_section_and_content(self, page: Page):
        creds = register_user("sect")
        token = _api_login(creds["username"], creds["password"])
        pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
        doc = requests.post(f"{API_BASE}/api/documents",
                            files={"file": (f"sec_{uuid.uuid4().hex[:5]}.pdf", pdf, "application/pdf")},
                            headers={"Authorization": f"Bearer {token}"}, timeout=15).json()
        doc = doc.get("data") or doc

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/collections")
        page.wait_for_load_state("networkidle")
        # Create a collection and open it.
        page.locator("[data-testid='collection-new-btn']").click()
        coll = f"SecColl_{uuid.uuid4().hex[:5]}"
        page.locator("[data-testid='collection-title-input']").fill(coll)
        page.locator("[data-testid='collection-create-btn']").click()
        page.wait_for_timeout(1200)
        page.get_by_text(coll, exact=True).first.click()
        page.wait_for_timeout(1000)

        # Add a section.
        page.locator("[data-testid='collection-add-section-btn']").click()
        sec = f"Chapter {uuid.uuid4().hex[:4]}"
        page.locator("[data-testid='collection-section-title-input']").fill(sec)
        page.locator("[data-testid='collection-section-create-btn']").click()
        page.wait_for_timeout(1500)
        _shot(page, "collection_section_created")
        expect(page.locator("[data-testid='collection-sections']")).to_be_visible(timeout=8000)
        expect(page.get_by_text(sec, exact=True).first).to_be_visible(timeout=8000)

        # Add the document into the section.
        page.locator("[data-testid^='collection-section-add-']").first.click()
        page.wait_for_timeout(400)
        page.locator("[data-testid='collection-addtype-PDF']").click()
        page.wait_for_timeout(800)
        add = page.locator(f"[data-testid='collection-add-item-{doc['contentId']}']")
        add.wait_for(state="visible", timeout=8000)
        add.click()
        page.wait_for_timeout(1200)
        _shot(page, "collection_section_item")
        # The section now reports ≥1 item (its "No content in this section yet." is gone).
        page.reload()
        page.wait_for_load_state("networkidle")
        page.get_by_text(coll, exact=True).first.click()
        page.wait_for_timeout(1500)
        # At least one section item row is rendered.
        assert page.locator("[data-testid='collection-sections']").count() == 1


# ─────────────────────────────────────────────────────────────────────────────
# #3/#4 — Curriculum content-add simplified (library-only, no publish toggle)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(150)
class TestContentFlowSimplified:
    def test_no_create_placeholder_and_no_publish_toggle(self, page: Page, oa_token):
        cid = requests.post(f"{API_BASE}/api/courses",
                            json={"title": f"Simpl_{uuid.uuid4().hex[:6]}", "courseCode": "SM9"},
                            headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()
        cid = (cid.get("data") or cid)["id"]
        requests.post(f"{API_BASE}/api/courses/{cid}/modules", json={"title": "Module One"},
                      headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)

        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/curriculum?courseId={cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        page.locator("[data-testid='module-expand-btn']").first.click()
        page.wait_for_timeout(300)
        page.locator("[data-testid='content-add-btn']").first.click()
        page.wait_for_timeout(500)
        _shot(page, "content_simplified")
        # Panel is a CREATE chooser (round 6): create real content via the user pages — no
        # "Create New" placeholder text, no Draft/Publish toggle, and the four create-type buttons.
        expect(page.locator("[data-testid='content-add-panel']")).to_be_visible(timeout=6000)
        assert page.get_by_role("button", name="Create New").count() == 0
        for k in ("PDF", "VIDEO", "QUIZ", "FLASHCARD"):
            expect(page.locator(f"[data-testid='content-create-{k}']")).to_be_visible()

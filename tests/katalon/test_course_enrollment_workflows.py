"""
Browser (Playwright) workflow tests for the 2026-06-01 feature batch.
(Spec update pending — markers map to the dev's numbered requirements.)

  #1  Document viewer renders the uploaded PDF in an <iframe data-testid=document-pdf-frame>.
  #2  OrgAdmin adds a user to the org through the real Member Management UI.
  #5  User requests enrollment from the Browse Courses page; OrgAdmin approves it
      from the Course Editor → Member Roles tab.

Uses the seeded OrgAdmin1 / TestOrg1 accounts (see CLAUDE.md §Seeded test accounts).
"""

import uuid
import requests
import pytest
from playwright.sync_api import Page, expect

from ._helpers import FE_BASE, API_BASE, register_user, ui_login, ui_login_orgadmin

ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ORG1_SLUG = "test-org-1"
ORG1_NAME = "Test Organization 1"
TIMEOUT = 10


def _api_login(identifier, password, org_id=None):
    headers = {"X-Org-Id": org_id} if org_id else {}
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": identifier, "password": password},
                      headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()["data"]["accessToken"]


def _set_org_context(page, org_id=ORG1_ID, slug=ORG1_SLUG, name=ORG1_NAME):
    """Mirror what OrgContext writes after a user selects/joins an organization."""
    page.evaluate(
        """([id, slug, name]) => {
            localStorage.setItem('org_id', id);
            localStorage.setItem('org_slug', slug);
            localStorage.setItem('current_org', JSON.stringify({ id, slug, name }));
        }""",
        [org_id, slug, name],
    )


@pytest.fixture(scope="module")
def org1_course():
    """Create a fresh PUBLISHED-ish course in TestOrg1 as OrgAdmin1, via API."""
    token = _api_login(ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
    title = f"BrowseTest_{uuid.uuid4().hex[:8]}"
    r = requests.post(
        f"{API_BASE}/api/courses",
        json={"title": title, "description": "Browse+request flow", "courseCode": "BR1"},
        headers={"Authorization": f"Bearer {token}", "X-Org-Id": ORG1_ID},
        timeout=TIMEOUT,
    )
    assert r.status_code in (200, 201), r.text
    data = r.json()
    data = data.get("data") or data
    return {"id": data["id"], "title": title}


# ─────────────────────────────────────────────────────────────────────────────
# #1 — Document viewer renders the PDF
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.timeout(120)
class TestDocumentViewerRendersPdf:
    def test_pdf_iframe_present_after_open(self, page: Page):
        creds = register_user("docview")
        token = _api_login(creds["username"], creds["password"])
        pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
        r = requests.post(
            f"{API_BASE}/api/documents",
            files={"file": ("ui_view.pdf", pdf, "application/pdf")},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        doc_id = (r.json().get("data") or r.json())["id"]

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/documents?docId={doc_id}")
        page.wait_for_load_state("networkidle")

        # The PDF must be rendered in our iframe (no blob #fragment, reliable Chrome render).
        frame = page.locator("[data-testid='document-pdf-frame']")
        frame.wait_for(state="visible", timeout=10000)
        src = frame.get_attribute("src") or ""
        assert src.startswith("blob:"), f"PDF iframe should point at a blob URL, got: {src}"
        assert "#filename=" not in src, "blob URL must not carry a #filename fragment"


# ─────────────────────────────────────────────────────────────────────────────
# #2 — OrgAdmin adds an org member through the UI
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(120)
class TestOrgAdminAddsMemberUI:
    def test_orgadmin_searches_and_adds_member(self, page: Page):
        # A brand-new user to add to the org.
        creds = register_user("addmem")

        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/members")
        page.wait_for_load_state("networkidle")

        # Open the add-member panel.
        page.get_by_role("button", name="+ Add Member").click()
        page.wait_for_timeout(300)

        # Search for the new user by username, select, add as Member (default org role).
        search = page.get_by_placeholder("Search by username or email...").first
        search.fill(creds["username"])
        page.get_by_role("button", name="Search").click()

        # Result button should appear; click it to select.
        page.locator(f"button:has-text('{creds['username']}')").first.wait_for(state="visible", timeout=8000)
        page.locator(f"button:has-text('{creds['username']}')").first.click()

        # Confirm-add.
        page.get_by_role("button", name="Add", exact=True).click()

        # Success message (org-level role is 'Member'), then the member appears in the table.
        expect(page.locator("text=added as Member")).to_be_visible(timeout=8000)
        expect(page.locator(f"text={creds['username']}").first).to_be_visible(timeout=8000)


# ─────────────────────────────────────────────────────────────────────────────
# #5 — User requests enrollment; OrgAdmin approves
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.user
@pytest.mark.orgadmin
@pytest.mark.timeout(120)
class TestEnrollmentRequestWorkflow:
    def test_user_requests_then_orgadmin_approves(self, page: Page, org1_course):
        # Fresh user, joined to TestOrg1 so they share its course catalog.
        creds = register_user("enroll")
        token = _api_login(creds["username"], creds["password"])
        user_id = requests.get(
            f"{API_BASE}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT,
        ).json()
        user_id = (user_id.get("data") or user_id)["id"]
        # Join the org (self-service) so the browse page lists TestOrg1's courses.
        requests.post(f"{API_BASE}/api/orgs/{ORG1_ID}/members/self",
                      headers={"Authorization": f"Bearer {token}", "X-Org-Id": ORG1_ID},
                      timeout=TIMEOUT)

        # --- User side: browse + request ---
        ui_login(page, creds["username"], creds["password"])
        _set_org_context(page)
        page.goto(f"{FE_BASE}/user/courses/browse")
        page.wait_for_load_state("networkidle")

        req_btn = page.locator(f"[data-testid='course-request-enroll-{org1_course['id']}']")
        req_btn.wait_for(state="visible", timeout=10000)
        req_btn.click()

        # The card flips to a Pending state.
        state = page.locator(f"[data-testid='course-enroll-state-{org1_course['id']}']")
        expect(state).to_be_visible(timeout=8000)

        # --- OrgAdmin side: approve ---
        page.goto(f"{FE_BASE}/login")  # drop the student session
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/member-roles?courseId={org1_course['id']}")
        page.wait_for_load_state("networkidle")

        approve = page.locator(f"[data-testid='enrollment-approve-{user_id}']")
        approve.wait_for(state="visible", timeout=10000)
        approve.click()

        # After approval the user shows up as an active enrollment row.
        expect(page.locator(f"[data-testid='enrollment-row-{user_id}']")).to_be_visible(timeout=8000)

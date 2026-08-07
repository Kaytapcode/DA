"""
Demo workflow — Luồng 4 (Demo_Testcase.md): SysAdmin global oversight + absolute destructive right.

Real browser actions: SysAdmin logs in through the DEDICATED secure portal (/admin/login, no SSO),
lands on the global dashboard, and the dashboard metrics are proven to be REAL (cross-checked against
the analytics API — no hardcoded numbers). SysAdmin's cross-org visibility and absolute document
deletion are verified via the API.

Spec invariants: §1 SysAdmin dedicated portal (no SSO / no self-registration); global analytics
across all orgs (no access-control barrier); SysAdmin absolute destructive right (delete any content).

REPORTED MISMATCHES / MISSING FEATURES (see test_step4_suspend_org_missing):
  - "Suspend Organization" (Demo Result 3): NOT implemented anywhere (no org status field / endpoint).
  - A dedicated SysAdmin UI control for "Absolute Deletion" of content is not present; the backend
    capability exists (DocumentsController allows SysAdmin to delete any document) and is tested here
    via the API.

NO hardcoded screen data. Screenshots on failure → tests/_screens/.
"""

import io
import os
import re
import time
import uuid
import requests
import pytest
from playwright.sync_api import Page, expect

from ._helpers import FE_BASE, API_BASE

SYSADMIN, SYSADMIN_PW = "SysAdmin1", "SysAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TIMEOUT = 15
SCREENS = os.path.join(os.path.dirname(__file__), "..", "_screens")
os.makedirs(SCREENS, exist_ok=True)

_MIN_PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"


def _shot(page: Page, name: str):
    try:
        page.screenshot(path=os.path.join(SCREENS, f"{name}.png"), full_page=True)
    except Exception:
        pass


def _login_api(u, p):
    r = requests.post(f"{API_BASE}/api/auth/login", json={"username": u, "password": p}, timeout=TIMEOUT)
    assert r.status_code == 200, f"login {u}: {r.status_code} {r.text}"
    return r.json()["data"]["accessToken"]


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.sysadmin
@pytest.mark.wave1
@pytest.mark.timeout(120)
class TestFlow4SysAdmin:
    def test_step1_dedicated_portal_login_no_sso(self, page: Page):
        """Result 1: SysAdmin logs in via the dedicated /admin/login portal; NO public SSO there."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='sysadmin-login-form']")).to_be_visible(timeout=10000)
        # No SSO / no self-registration on the secure portal.
        assert page.get_by_role("button", name=re.compile(r"Google|Microsoft", re.I)).count() == 0, \
            "SysAdmin portal must NOT offer public SSO"
        assert page.get_by_text(re.compile(r"No SSO", re.I)).count() >= 1
        _shot(page, "flow4_portal")
        page.locator("[data-testid='sysadmin-login-username']").fill(SYSADMIN)
        page.locator("[data-testid='sysadmin-login-password']").fill(SYSADMIN_PW)
        page.locator("[data-testid='sysadmin-login-submit']").click()
        page.wait_for_url("**/sysadmin/**", timeout=15000)
        assert "/sysadmin/" in page.url

    def test_step2_global_dashboard_metrics_are_real(self, page: Page):
        """Result 2: global dashboard shows REAL cross-org metrics (cross-checked vs analytics API)."""
        # Login through the portal.
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sysadmin-login-username']").fill(SYSADMIN)
        page.locator("[data-testid='sysadmin-login-password']").fill(SYSADMIN_PW)
        page.locator("[data-testid='sysadmin-login-submit']").click()
        page.wait_for_url("**/sysadmin/**", timeout=15000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        expect(page.locator("[data-testid='sysadmin-stats-grid']")).to_be_visible(timeout=10000)
        _shot(page, "flow4_dashboard")

        # Cross-check "Total Courses" rendered value against the live analytics API → proves no hardcoding.
        tok = _login_api(SYSADMIN, SYSADMIN_PW)
        api = requests.get(f"{API_BASE}/api/analytics/sysadmin", headers={"Authorization": f"Bearer {tok}"}, timeout=TIMEOUT)
        assert api.status_code == 200, api.text
        total_courses = (api.json().get("data") or {}).get("totalCourses")
        assert total_courses is not None
        card = page.locator("[data-testid='sysadmin-stat-total-courses']")
        card.wait_for(state="visible", timeout=10000)
        assert str(total_courses) in card.inner_text(), \
            f"dashboard 'Total Courses' must match API ({total_courses})"

        # Cross-org visibility: SysAdmin reads any org's analytics without an access barrier (no JWT org_id).
        org_api = requests.get(f"{API_BASE}/api/analytics/orgs/{ORG1_ID}", headers={"Authorization": f"Bearer {tok}"}, timeout=TIMEOUT)
        assert org_api.status_code == 200, f"SysAdmin must see any org's analytics, got {org_api.status_code}"

    def test_step4_absolute_deletion_of_any_document(self):
        """Result 4: SysAdmin can permanently delete ANY user's document (absolute destructive right).

        Backend capability test (the dedicated SysAdmin UI control is not present — reported)."""
        # User1 uploads a public document.
        u1 = _login_api("User1", "User@123")
        up = requests.post(f"{API_BASE}/api/documents",
                           files={"file": (f"LuminaTest_Evil_{uuid.uuid4().hex[:6]}.pdf", io.BytesIO(_MIN_PDF), "application/pdf")},
                           headers={"Authorization": f"Bearer {u1}"}, timeout=TIMEOUT)
        assert up.status_code == 200, up.text
        doc_id = (up.json().get("data") or {}).get("id")
        assert doc_id, f"upload response missing id: {up.text[:200]}"

        # SysAdmin (NOT the owner) deletes it globally.
        sa = _login_api(SYSADMIN, SYSADMIN_PW)
        dele = requests.delete(f"{API_BASE}/api/documents/{doc_id}", headers={"Authorization": f"Bearer {sa}"}, timeout=TIMEOUT)
        assert dele.status_code in (200, 204), f"SysAdmin must delete any document, got {dele.status_code}: {dele.text}"

        # It is gone (owner can no longer fetch it).
        gone = requests.get(f"{API_BASE}/api/documents/{doc_id}", headers={"Authorization": f"Bearer {u1}"}, timeout=TIMEOUT)
        assert gone.status_code in (403, 404), f"deleted document must be gone, got {gone.status_code}"

    def test_step4b_absolute_deletion_via_ui(self, page: Page):
        """Result 4 (UI): SysAdmin permanently deletes a document from the moderation console (spec §6.5)."""
        # User1 uploads a public document with a unique title.
        u1 = _login_api("User1", "User@123")
        title = f"LuminaTest_ModUI_{uuid.uuid4().hex[:6]}"
        up = requests.post(f"{API_BASE}/api/documents",
                           files={"file": (f"{title}.pdf", io.BytesIO(_MIN_PDF), "application/pdf")},
                           headers={"Authorization": f"Bearer {u1}"}, timeout=TIMEOUT)
        assert up.status_code == 200, up.text
        # Resolve the search contentId (used in the delete button's testid).
        sa_tok = _login_api(SYSADMIN, SYSADMIN_PW)
        hit = None
        for _ in range(5):
            items = requests.get(f"{API_BASE}/api/search", params={"q": title},
                                 headers={"Authorization": f"Bearer {sa_tok}"}, timeout=TIMEOUT).json().get("data") or []
            hit = next((x for x in items if title in (x.get("title") or "")), None)
            if hit:
                break
        assert hit, "uploaded document must be searchable"
        content_id = hit["contentId"]

        # SysAdmin logs in via the portal and opens the moderation console.
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sysadmin-login-username']").fill(SYSADMIN)
        page.locator("[data-testid='sysadmin-login-password']").fill(SYSADMIN_PW)
        page.locator("[data-testid='sysadmin-login-submit']").click()
        page.wait_for_url("**/sysadmin/**", timeout=15000)
        page.goto(f"{FE_BASE}/sysadmin/courses")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='sysadmin-moderation-card']")).to_be_visible(timeout=10000)
        page.locator("[data-testid='sysadmin-content-search']").fill(title)
        page.locator("[data-testid='sysadmin-content-search-btn']").click()
        del_btn = page.locator(f"[data-testid='sysadmin-delete-{content_id}']")
        del_btn.wait_for(state="visible", timeout=10000)
        _shot(page, "flow4_moderation")
        del_btn.click()
        page.wait_for_timeout(1500)
        _shot(page, "flow4_moderation_deleted")
        # Verify gone via API (owner can no longer fetch it).
        doc_id = (up.json().get("data") or {}).get("id")
        gone = requests.get(f"{API_BASE}/api/documents/{doc_id}", headers={"Authorization": f"Bearer {u1}"}, timeout=TIMEOUT)
        assert gone.status_code in (403, 404), f"document must be gone after UI absolute-delete, got {gone.status_code}"

    @pytest.mark.timeout(150)
    def test_step3_suspend_and_reactivate_org(self, page: Page):
        """Result 3: SysAdmin suspends an org from the UI → its courses freeze (API denies); reactivate restores access (spec §6.6)."""
        import uuid as _uuid
        sa = _login_api(SYSADMIN, SYSADMIN_PW)
        oa = requests.post(f"{API_BASE}/api/auth/login", json={"username": "OrgAdmin1", "password": "OrgAdmin@123"},
                           headers={"X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()["data"]["accessToken"]
        oah = {"Authorization": f"Bearer {oa}", "X-Org-Id": ORG1_ID}
        # An approved student in an ORG1 course (has access before suspension).
        cid = (requests.post(f"{API_BASE}/api/courses", json={"title": f"LuminaTest_Frz_{_uuid.uuid4().hex[:6]}", "courseCode": "FRZ"},
                            headers=oah, timeout=TIMEOUT).json().get("data") or {})["id"]
        un = f"frz_{_uuid.uuid4().hex[:8]}"
        requests.post(f"{API_BASE}/api/auth/register", json={"username": un, "password": "TestPassword123!", "email": un + "@ex.com"}, timeout=TIMEOUT)
        ftok = _login_api(un, "TestPassword123!")
        fid = requests.get(f"{API_BASE}/api/auth/me", headers={"Authorization": f"Bearer {ftok}"}, timeout=TIMEOUT).json()["data"]["id"]
        requests.post(f"{API_BASE}/api/courses/{cid}/enrollments/request", headers={"Authorization": f"Bearer {ftok}"}, timeout=TIMEOUT)
        requests.post(f"{API_BASE}/api/courses/{cid}/enrollments/{fid}/approve", json={"role": "Student"}, headers=oah, timeout=TIMEOUT)

        def access():
            return requests.get(f"{API_BASE}/api/courses/{cid}/modules", headers={"Authorization": f"Bearer {ftok}"}, timeout=TIMEOUT).status_code

        try:
            assert access() == 200, "approved student should have access before suspension"
            # SysAdmin opens the org directory and SUSPENDS TestOrg1 via the real button.
            page.goto(f"{FE_BASE}/admin/login")
            page.wait_for_load_state("networkidle")
            page.locator("[data-testid='sysadmin-login-username']").fill(SYSADMIN)
            page.locator("[data-testid='sysadmin-login-password']").fill(SYSADMIN_PW)
            page.locator("[data-testid='sysadmin-login-submit']").click()
            page.wait_for_url("**/sysadmin/**", timeout=15000)
            page.goto(f"{FE_BASE}/sysadmin/orgs")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(800)
            suspend_btn = page.locator(f"[data-testid='org-suspend-{ORG1_ID}']")
            suspend_btn.wait_for(state="visible", timeout=10000)
            _shot(page, "flow4_org_before_suspend")
            suspend_btn.click()
            expect(page.locator(f"[data-testid='org-status-{ORG1_ID}']")).to_have_text(re.compile(r"Suspended|khoa", re.I), timeout=10000)
            _shot(page, "flow4_org_suspended")
            # Course access is now frozen (allow the 15s status cache to expire).
            time.sleep(16)
            assert access() in (403, 404), "suspended org's course access must be frozen"
            # Reactivate via the UI.
            react_btn = page.locator(f"[data-testid='org-reactivate-{ORG1_ID}']")
            react_btn.wait_for(state="visible", timeout=10000)
            react_btn.click()
            expect(page.locator(f"[data-testid='org-status-{ORG1_ID}']")).to_have_text(re.compile(r"Active|Hoat", re.I), timeout=10000)
            _shot(page, "flow4_org_reactivated")
            time.sleep(16)
            assert access() == 200, "access must be restored after reactivation"
        finally:
            # Safety net: never leave TestOrg1 suspended for other tests.
            requests.post(f"{API_BASE}/api/organizations/{ORG1_ID}/reactivate", headers={"Authorization": f"Bearer {sa}"}, timeout=TIMEOUT)

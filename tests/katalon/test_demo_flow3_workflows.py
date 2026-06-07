"""
Demo workflow — Luồng 3 (Demo_Testcase.md): course enrollment + course isolation + atomic
org auto-provisioning.

Real browser actions for the key steps (OrgAdmin creates a course; OrgAdmin approves a request;
the unapproved user is blocked by the course-isolation guard in the UI). The precise DB-transaction
invariants (Pending status, Approved status, auto-added org membership) are verified via the API.

Spec invariants: §4.x course enrollment request→approve lifecycle; course isolation
(CanAccess server-side); every new course auto-creates 3 default modules "Topic 1/2/3";
approval auto-provisions the user as an org Member (Demo Result 4/5).

NOTE (reported mismatch): Demo_Testcase has User2 find a *closed* course via a GLOBAL course search
and request to join while not yet an org member. The FE CourseBrowsePage requires the user to
already belong to an org, so the global-search-for-non-members UI does not exist; the enrollment
REQUEST is therefore issued via the real API while approval + isolation + create-course use the UI.
A FRESH user (not User2) is used as the enrollee so the "auto-added to org" assertion is meaningful.

NO hardcoded screen data. Screenshots on failure → tests/_screens/.
"""

import os
import uuid
import requests
import pytest
from playwright.sync_api import Page, expect

from ._helpers import FE_BASE, API_BASE, ui_login, ui_login_orgadmin, register_user

ORGADMIN1, ORGADMIN1_PW = "OrgAdmin1", "OrgAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TIMEOUT = 15
SCREENS = os.path.join(os.path.dirname(__file__), "..", "_screens")
os.makedirs(SCREENS, exist_ok=True)


def _shot(page: Page, name: str):
    try:
        page.screenshot(path=os.path.join(SCREENS, f"{name}.png"), full_page=True)
    except Exception:
        pass


def _login_api(u, p, org=None):
    h = {"X-Org-Id": org} if org else {}
    r = requests.post(f"{API_BASE}/api/auth/login", json={"username": u, "password": p}, headers=h, timeout=TIMEOUT)
    assert r.status_code == 200, f"login {u}: {r.status_code} {r.text}"
    return r.json()["data"]["accessToken"]


def _h(tok, org=ORG1_ID):
    return {"Authorization": f"Bearer {tok}", "X-Org-Id": org}


def _enrollment_status(oa, cid, uid):
    r = requests.get(f"{API_BASE}/api/courses/{cid}/enrollments", headers=_h(oa), timeout=TIMEOUT)
    rows = r.json().get("data") or []
    row = next((e for e in rows if e.get("userId") == uid), None)
    return row.get("status") if row else None


def _org_member_role(oa, uid):
    r = requests.get(f"{API_BASE}/api/orgs/{ORG1_ID}/members", headers=_h(oa), timeout=TIMEOUT)
    m = {x.get("userId"): x.get("role") for x in (r.json().get("data") or [])}
    return m.get(uid)


@pytest.fixture(scope="module")
def enroll_ctx():
    """OrgAdmin1 creates a course; a fresh user requests enrollment (→ Pending) via API."""
    oa = _login_api(ORGADMIN1, ORGADMIN1_PW, ORG1_ID)
    title = f"LuminaTest_MMTNC_{uuid.uuid4().hex[:8]}"
    cid = (requests.post(f"{API_BASE}/api/courses",
                         json={"title": title, "courseCode": "MMTNC"},
                         headers=_h(oa), timeout=TIMEOUT).json().get("data") or {})["id"]
    creds = register_user("enrollee")
    ftok = _login_api(creds["username"], creds["password"])
    fid = requests.get(f"{API_BASE}/api/auth/me", headers={"Authorization": f"Bearer {ftok}"}, timeout=TIMEOUT).json()["data"]["id"]
    rr = requests.post(f"{API_BASE}/api/courses/{cid}/enrollments/request", headers=_h(ftok), timeout=TIMEOUT)
    assert rr.status_code == 200, rr.text
    return {"oa": oa, "cid": cid, "title": title, "fid": fid, "creds": creds}


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.orgadmin
@pytest.mark.wave2
@pytest.mark.timeout(120)
class TestFlow3Enrollment:
    def test_step1_request_is_pending(self, enroll_ctx):
        """Result 1: a self-requested enrollment is created with status Pending."""
        assert _enrollment_status(enroll_ctx["oa"], enroll_ctx["cid"], enroll_ctx["fid"]) == "Pending"
        # And the user is NOT yet an org member.
        assert _org_member_role(enroll_ctx["oa"], enroll_ctx["fid"]) is None

    def test_step2_course_isolation_blocks_unapproved_user(self, page: Page, enroll_ctx):
        """Result 2: an unapproved user is denied access to the course (server-side + UI)."""
        cid, creds, fid = enroll_ctx["cid"], enroll_ctx["creds"], enroll_ctx["fid"]
        # API: modules endpoint must not return 200 for a pending (unapproved) user.
        ftok = _login_api(creds["username"], creds["password"])
        api = requests.get(f"{API_BASE}/api/courses/{cid}/modules", headers={"Authorization": f"Bearer {ftok}"}, timeout=TIMEOUT)
        assert api.status_code in (403, 404), f"isolation: expected 403/404, got {api.status_code}"
        # UI: the course page shows the access-denied state.
        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/course/{cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        _shot(page, "flow3_isolation")
        expect(page.locator("[data-testid='course-access-error']")).to_be_visible(timeout=10000)

    def test_step3_create_course_gets_3_default_modules(self, page: Page, enroll_ctx):
        """Result 3: a newly created course auto-initializes modules Topic 1/2/3."""
        ui_login_orgadmin(page, ORGADMIN1, ORGADMIN1_PW, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/courses")
        page.wait_for_load_state("networkidle")
        new_title = f"LuminaTest_LapTrinhMang_{uuid.uuid4().hex[:6]}"
        page.locator("[data-testid='course-create-toggle-btn']").click()
        page.locator("[data-testid='course-title-input']").fill(new_title)
        page.locator("[data-testid='course-code-input']").fill("LTM")
        page.locator("[data-testid='course-create-submit-btn']").click()
        page.wait_for_timeout(1500)
        _shot(page, "flow3_course_created")
        # Verify via API: the new course exists and has exactly Topic 1/2/3.
        oa = enroll_ctx["oa"]
        courses = requests.get(f"{API_BASE}/api/courses", headers=_h(oa), timeout=TIMEOUT).json().get("data") or []
        created = next((c for c in courses if c.get("title") == new_title), None)
        assert created is not None, "created course must appear in the org course list"
        mods = requests.get(f"{API_BASE}/api/courses/{created['id']}/modules", headers=_h(oa), timeout=TIMEOUT).json().get("data") or []
        names = sorted(m.get("title") for m in mods)
        assert names == ["Topic 1", "Topic 2", "Topic 3"], f"expected 3 default modules, got {names}"

    def test_step4_approve_promotes_and_auto_adds_to_org(self, page: Page, enroll_ctx):
        """Result 4/5: OrgAdmin approves the request → Approved + user auto-added as org Member."""
        oa, cid, fid = enroll_ctx["oa"], enroll_ctx["cid"], enroll_ctx["fid"]
        ui_login_orgadmin(page, ORGADMIN1, ORGADMIN1_PW, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/member-roles?courseId={cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        approve_btn = page.locator(f"[data-testid='enrollment-approve-{fid}']")
        approve_btn.wait_for(state="visible", timeout=10000)
        _shot(page, "flow3_pending_request")
        approve_btn.click()
        page.wait_for_timeout(1800)
        _shot(page, "flow3_after_approve")
        # Result 4: enrollment is Approved.
        assert _enrollment_status(oa, cid, fid) == "Approved", "enrollment must be Approved after clicking Approve"
        # Result 5: the user is now an org Member without any manual add (atomic auto-provisioning).
        role = _org_member_role(oa, fid)
        assert role is not None, "approved student must be auto-added to the organization"
        assert role == "Member", f"auto-provisioned org role should be 'Member', got '{role}'"

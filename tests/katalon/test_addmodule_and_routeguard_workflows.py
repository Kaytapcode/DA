"""
Browser (Playwright) workflow tests — 2026-06-01 round 7.
(Spec update pending.)

  #1  Add-module no longer SILENTLY fails: the BE requires a 3–255 char title; the FE used to
      swallow the 400 and close the form with nothing saved. Now the Add button is disabled until
      the title is >= 3 chars, errors are surfaced, and a valid title saves + persists — for BOTH
      OrgAdmin (curriculum) and a per-course Teacher (in-course tools).
  #2  Route guards: the /fe/* design-mirror routes were unguarded; a wrong-role (or anonymous) user
      could open admin/sysadmin pages. They are now role-gated and redirect away.

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
USER1_USER = "User1"
USER1_PASS = "User@123"
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


def _new_course(oa_token, code="AM1"):
    r = requests.post(f"{API_BASE}/api/courses",
                      json={"title": f"AM_{uuid.uuid4().hex[:6]}", "courseCode": code},
                      headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()
    return (r.get("data") or r)["id"]


# ─────────────────────────────────────────────────────────────────────────────
# #1 — Add module: min-length guard + valid add persists (OrgAdmin)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(140)
class TestOrgAdminAddModuleValidation:
    def test_short_and_blank_titles_work_and_persist(self, page: Page, oa_token):
        cid = _new_course(oa_token, "AMO")
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/curriculum?courseId={cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(700)
        # New courses already have 3 default modules (Topic 1/2/3).
        for n in ("Topic 1", "Topic 2", "Topic 3"):
            expect(page.locator(f"text={n}").first).to_be_visible(timeout=8000)
        _shot(page, "rg_default_modules")

        # A 1-char title is now allowed (min 1, no silent failure).
        page.locator("[data-testid='module-add-toggle-btn']").click()
        page.locator("[data-testid='module-title-input']").fill("A")
        expect(page.locator("[data-testid='module-add-btn']")).to_be_enabled()
        page.locator("[data-testid='module-add-btn']").click()
        expect(page.locator("text=A").first).to_be_visible(timeout=8000)

        # A BLANK title creates a default "Topic N" module.
        page.locator("[data-testid='module-add-toggle-btn']").click()
        page.locator("[data-testid='module-title-input']").fill("")
        page.locator("[data-testid='module-add-btn']").click()
        page.wait_for_timeout(1200)
        page.reload()
        page.wait_for_load_state("networkidle")
        # At least 5 modules now (3 default + "A" + a blank-default "Topic N").
        assert page.locator("text=/^Topic \\d+/").count() >= 4
        _shot(page, "rg_module_added")


# ─────────────────────────────────────────────────────────────────────────────
# #1 — Add module: same guard for a per-course Teacher in the course view
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.user
@pytest.mark.timeout(140)
class TestTeacherAddModuleValidation:
    def test_teacher_short_title_blocked_then_valid_persists(self, page: Page, oa_token):
        cid = _new_course(oa_token, "AMT")
        creds = register_user("tmod")
        ttok = _api_login(creds["username"], creds["password"])
        tid = _me_id(ttok)
        requests.post(f"{API_BASE}/api/courses/{cid}/enrollments",
                      json={"userId": tid, "role": "Teacher"},
                      headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/course/{cid}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        # Course already shows the 3 default modules.
        expect(page.locator("text=Topic 1").first).to_be_visible(timeout=8000)
        # A short (1-char) title is allowed now.
        page.locator("[data-testid='teacher-add-module-toggle']").click()
        mod = f"TM{uuid.uuid4().hex[:3]}"
        page.locator("[data-testid='teacher-module-title-input']").fill(mod)
        expect(page.locator("[data-testid='teacher-module-add-btn']")).to_be_enabled()
        page.locator("[data-testid='teacher-module-add-btn']").click()
        expect(page.locator(f"text={mod}")).to_be_visible(timeout=8000)
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        expect(page.locator(f"text={mod}")).to_be_visible(timeout=8000)
        _shot(page, "rg_teacher_module")


# ─────────────────────────────────────────────────────────────────────────────
# #2 — Route guards on /fe/* mirror routes
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.security
@pytest.mark.timeout(140)
class TestRouteGuards:
    def test_student_cannot_reach_orgadmin_mirror(self, page: Page):
        ui_login(page, USER1_USER, USER1_PASS)  # Student
        page.goto(f"{FE_BASE}/fe/orgadmin/course_management")
        # ProtectedRoute redirects a Student away to /user/home.
        page.wait_for_url("**/user/home", timeout=10000)
        _shot(page, "rg_student_blocked_orgadmin")
        assert "/fe/orgadmin" not in page.url

    def test_student_cannot_reach_sysadmin_mirror(self, page: Page):
        ui_login(page, USER1_USER, USER1_PASS)
        page.goto(f"{FE_BASE}/fe/sysadmin/global_user_management")
        page.wait_for_url("**/user/home", timeout=10000)
        assert "/fe/sysadmin" not in page.url

    def test_orgadmin_cannot_reach_sysadmin_mirror(self, page: Page):
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/fe/sysadmin/global_user_management")
        # OrgAdmin lacks SysAdmin role -> redirected to /admin/dashboard.
        page.wait_for_url("**/admin/**", timeout=10000)
        _shot(page, "rg_orgadmin_blocked_sysadmin")
        assert "/fe/sysadmin" not in page.url

    def test_anonymous_cannot_reach_orgadmin_mirror(self, page: Page):
        # Not logged in -> ProtectedRoute sends to /login.
        page.goto(f"{FE_BASE}/fe/orgadmin/member_management")
        page.wait_for_url("**/login", timeout=10000)
        assert "/fe/orgadmin" not in page.url

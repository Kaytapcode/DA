"""
Browser (Playwright) workflow tests for the OrgAdmin Course Editor (2026-06-01 round 3).
(Spec update pending.)

Covers the dev's reported issues:
  #1  Per-course Teacher/Student assignment is reachable and works (org roles are Member/OrgAdmin
      only; Teacher/Student is assigned in the course's Member Roles tab).
  #2  OrgAdmin can: add a module to a course, add a user to a course, and assign per-course role —
      all reachable from Course Management via real navigation (clicks), no manual URL editing.

Real flows only: navigate from Course Management → row actions → tabs → add module / enroll / set
role, asserting live data. NO hardcoded data. Screenshots to tests/_screens/ at each step.
"""

import os
import uuid
import requests
import pytest
from playwright.sync_api import Page, expect

from ._helpers import FE_BASE, API_BASE, register_user, ui_login_orgadmin

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


@pytest.fixture(scope="module")
def oa_token():
    return _api_login(ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)


@pytest.fixture
def course(oa_token):
    title = f"EditorTest_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{API_BASE}/api/courses",
                      json={"title": title, "description": "editor flow", "courseCode": "ED1"},
                      headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)
    assert r.status_code in (200, 201), r.text
    d = r.json(); d = d.get("data") or d
    return {"id": d["id"], "title": title}


@pytest.fixture
def org_member(oa_token):
    """A fresh user added to TestOrg1 as a plain Member (org role)."""
    creds = register_user("courseu")
    tok = _api_login(creds["username"], creds["password"])
    uid = requests.get(f"{API_BASE}/api/auth/me", headers={"Authorization": f"Bearer {tok}"}, timeout=TIMEOUT).json()["data"]["id"]
    r = requests.post(f"{API_BASE}/api/orgs/{ORG1_ID}/members",
                      json={"userId": uid, "role": "Member"},
                      headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    return {"id": uid, "username": creds["username"]}


# ─────────────────────────────────────────────────────────────────────────────
# #2a — Add a module, navigating from Course Management
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(120)
class TestOrgAdminAddsModule:
    def test_add_module_from_course_management(self, page: Page, course):
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/courses")
        page.wait_for_load_state("networkidle")
        # Navigate via the row's Curriculum action (no manual URL editing).
        page.locator(f"[data-testid='course-curriculum-btn-{course['id']}']").click()
        page.wait_for_url(f"**/admin/editor/curriculum?courseId={course['id']}", timeout=10000)
        page.wait_for_load_state("networkidle")
        _shot(page, "editor_curriculum")

        page.locator("[data-testid='module-add-toggle-btn']").click()
        mod_name = f"Module {uuid.uuid4().hex[:5]}"
        page.locator("[data-testid='module-title-input']").fill(mod_name)
        page.locator("[data-testid='module-add-btn']").click()
        # The new module renders in the list.
        expect(page.locator(f"text={mod_name}")).to_be_visible(timeout=8000)
        _shot(page, "editor_module_added")

        # Persists after reload.
        page.reload()
        page.wait_for_load_state("networkidle")
        expect(page.locator(f"text={mod_name}")).to_be_visible(timeout=8000)


# ─────────────────────────────────────────────────────────────────────────────
# #2b/#2c + #1 — Add user to course and assign per-course Teacher/Student role
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(120)
class TestOrgAdminEnrollsAndAssignsRole:
    def test_enroll_member_and_set_teacher(self, page: Page, course, org_member):
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/courses")
        page.wait_for_load_state("networkidle")
        # Navigate via the row's Members action.
        page.locator(f"[data-testid='course-members-btn-{course['id']}']").click()
        page.wait_for_url(f"**/admin/editor/member-roles?courseId={course['id']}", timeout=10000)
        page.wait_for_load_state("networkidle")
        _shot(page, "editor_members")

        # Search the org member, select, enroll (default Student).
        page.get_by_placeholder("Search org members...").fill(org_member["username"])
        page.wait_for_timeout(600)
        page.locator(f"button:has-text('{org_member['username']}')").first.click()
        page.locator("[data-testid='enrollment-submit-btn']").click()

        row = page.locator(f"[data-testid='enrollment-row-{org_member['id']}']")
        expect(row).to_be_visible(timeout=8000)
        _shot(page, "editor_enrolled")

        # Assign per-course role: change the row's select to Teacher.
        row.locator("select").select_option("Teacher")
        page.wait_for_timeout(1000)
        page.reload()
        page.wait_for_load_state("networkidle")
        row = page.locator(f"[data-testid='enrollment-row-{org_member['id']}']")
        expect(row).to_be_visible(timeout=8000)
        # The select now reflects Teacher (per-course role persisted).
        assert row.locator("select").input_value() == "Teacher"
        _shot(page, "editor_role_teacher")

    def test_enroll_role_select_offers_teacher_and_student(self, page: Page, course):
        """Per-course role assignment offers Teacher AND Student (this is where they live)."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/member-roles?courseId={course['id']}")
        page.wait_for_load_state("networkidle")
        opts = page.locator("[data-testid='enrollment-role-select']").locator("option").all_inner_texts()
        assert "Teacher" in opts and "Student" in opts, f"per-course role options={opts}"


# ─────────────────────────────────────────────────────────────────────────────
# Reachability — tabs + pickers (no manual URL editing required)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.timeout(120)
class TestCourseEditorReachability:
    def test_member_roles_no_courseid_shows_picker(self, page: Page, course):
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/member-roles")
        page.wait_for_load_state("networkidle")
        _shot(page, "members_picker")
        # No dead-end message; a real picker shows and can route into the course.
        assert page.locator("text=Open this page from a specific course").count() == 0
        expect(page.locator("[data-testid='curriculum-course-picker']")).to_be_visible(timeout=10000)
        pick = page.locator(f"[data-testid='curriculum-pick-{course['id']}']")
        pick.wait_for(state="visible", timeout=10000)
        pick.click()
        page.wait_for_url(f"**/admin/editor/member-roles?courseId={course['id']}", timeout=10000)

    def test_tab_navigation_preserves_courseid(self, page: Page, course):
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/editor/curriculum?courseId={course['id']}")
        page.wait_for_load_state("networkidle")
        # Switch to Members tab via the tab bar.
        page.locator("[data-testid='editor-tab-members']").click()
        page.wait_for_url(f"**/admin/editor/member-roles?courseId={course['id']}", timeout=10000)
        # And back to Curriculum.
        page.locator("[data-testid='editor-tab-curriculum']").click()
        page.wait_for_url(f"**/admin/editor/curriculum?courseId={course['id']}", timeout=10000)
        _shot(page, "tabs_nav")

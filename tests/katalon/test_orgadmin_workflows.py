"""
Browser E2E — OrgAdmin workflows (Wave 2, Spec 4.2 + Spec 3).

Validates:
  - OrgAdmin can login and land on /admin/courses
  - OrgAdmin creates a course via the UI
  - Created course title appears in the course list
  - OrgAdmin navigates to curriculum tab and adds a module
  - OrgAdmin enrolls a student via the member-roles tab
"""

import uuid
import requests
import pytest
from _helpers import FE_BASE, API_BASE, unique_suffix

SYSADMIN_USER = "SysAdmin1"
SYSADMIN_PASS = "SysAdmin@123"
TIMEOUT = 10


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _api_login(identifier: str, password: str, org_id: str | None = None) -> dict:
    headers = {}
    if org_id:
        headers["X-Org-Id"] = org_id
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": identifier, "password": password},
        headers=headers,
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"API login failed: {r.status_code} {r.text}"
    return r.json()["data"]


def _create_orgadmin_context() -> dict:
    """Create OrgAdmin user + org via API, return login data with org_id."""
    sa = _api_login(SYSADMIN_USER, SYSADMIN_PASS)
    sa_headers = {"Authorization": f"Bearer {sa['accessToken']}"}

    # Create OrgAdmin user
    username = unique_suffix("oadmin")
    password = "TestPassword123!"
    email = f"{username}@lumina.test"
    r = requests.post(
        f"{API_BASE}/api/users",
        json={"username": username, "password": password, "email": email, "role": "OrgAdmin"},
        headers=sa_headers,
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"Create OrgAdmin failed: {r.status_code} {r.text}"
    user_id = r.json()["data"]["id"]

    # Create org
    org_name = unique_suffix("Org")
    org_slug = org_name.lower().replace("_", "-")
    r = requests.post(
        f"{API_BASE}/api/organizations",
        json={"name": org_name, "slug": org_slug, "description": "E2E test org"},
        headers=sa_headers,
        timeout=TIMEOUT,
    )
    assert r.status_code in (200, 201), f"Create org failed: {r.status_code} {r.text}"
    org_data = r.json()
    if isinstance(org_data, dict) and "data" in org_data:
        org_data = org_data["data"]
    org_id = org_data["id"]

    # Add user to org as OrgAdmin
    r = requests.post(
        f"{API_BASE}/api/orgs/{org_id}/members",
        json={"orgId": org_id, "userId": user_id, "role": "OrgAdmin"},
        headers=sa_headers,
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"Add member failed: {r.status_code} {r.text}"

    return {
        "username": username,
        "password": password,
        "user_id": user_id,
        "org_id": org_id,
        "sa_token": sa["accessToken"],
        "sa_headers": sa_headers,
    }


def _create_student(sa_headers: dict) -> dict:
    """Create a student user, return {id, username, password}."""
    username = unique_suffix("stud")
    password = "TestPassword123!"
    email = f"{username}@lumina.test"
    r = requests.post(
        f"{API_BASE}/api/users",
        json={"username": username, "password": password, "email": email, "role": "Student"},
        headers=sa_headers,
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    return {"id": r.json()["data"]["id"], "username": username, "password": password}


def _ui_login_orgadmin(page, username: str, password: str, org_id: str):
    """Login via the real FE login form, then inject org_id into localStorage."""
    page.goto(f"{FE_BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("[data-testid='login-identifier']").fill(username)
    page.locator("[data-testid='login-password']").fill(password)
    page.locator("[data-testid='login-submit']").click()
    page.wait_for_url("**/user/**", timeout=15000)
    page.wait_for_load_state("networkidle")

    # Inject org context so FE sends X-Org-Id header on subsequent requests
    page.evaluate(f"localStorage.setItem('org_id', '{org_id}')")
    page.evaluate(f"localStorage.setItem('current_org', JSON.stringify({{id: '{org_id}', name: 'E2EOrg', slug: 'e2eorg'}}))")


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminLoginWorkflow:
    """OrgAdmin logs in and can reach the course management page."""

    def test_orgadmin_can_navigate_to_courses_page(self, page):
        """After login + org_id injection, OrgAdmin can reach /admin/courses."""
        ctx = _create_orgadmin_context()
        _ui_login_orgadmin(page, ctx["username"], ctx["password"], ctx["org_id"])

        page.goto(f"{FE_BASE}/admin/courses")
        page.wait_for_load_state("networkidle")

        # Page should render the Create Course button (not be redirected to /login)
        page.locator("[data-testid='course-create-toggle-btn']").wait_for(state="visible", timeout=10000)
        assert "/login" not in page.url, "OrgAdmin was redirected to login — org context may be missing"


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminCourseCreateWorkflow:
    """OrgAdmin creates a course and verifies it appears in the list."""

    def test_orgadmin_creates_course_via_ui(self, page):
        """Create course → course title visible in table."""
        ctx = _create_orgadmin_context()
        _ui_login_orgadmin(page, ctx["username"], ctx["password"], ctx["org_id"])

        page.goto(f"{FE_BASE}/admin/courses")
        page.wait_for_load_state("networkidle")

        title = f"E2E Course {unique_suffix('c')}"

        # Open create form
        page.locator("[data-testid='course-create-toggle-btn']").click()
        page.locator("[data-testid='course-title-input']").wait_for(state="visible", timeout=5000)
        page.locator("[data-testid='course-title-input']").fill(title)
        page.locator("[data-testid='course-code-input']").fill("E2E01")
        page.locator("[data-testid='course-create-submit-btn']").click()

        # Wait for the list to reload and contain the new title
        page.wait_for_timeout(2000)

        # Verify course appears somewhere on the page
        page.wait_for_load_state("networkidle")
        assert page.locator(f"text={title}").count() > 0, (
            f"Created course '{title}' not visible in the page"
        )


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminModuleCreateWorkflow:
    """OrgAdmin creates a module inside a course via the curriculum editor."""

    def test_orgadmin_adds_module_to_course(self, page):
        """Create course via API → navigate to curriculum editor → add module via UI."""
        ctx = _create_orgadmin_context()
        oa_login = _api_login(ctx["username"], ctx["password"], org_id=ctx["org_id"])
        oa_token = oa_login["accessToken"]
        org_id = ctx["org_id"]

        # Create course via API
        r = requests.post(
            f"{API_BASE}/api/courses",
            json={"title": f"E2EMod {unique_suffix('c')}", "description": ""},
            headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": org_id},
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 201), f"Create course failed: {r.status_code} {r.text}"
        course_id = r.json().get("data", r.json())["id"]

        _ui_login_orgadmin(page, ctx["username"], ctx["password"], org_id)

        page.goto(f"{FE_BASE}/admin/editor/curriculum?courseId={course_id}")
        page.wait_for_load_state("networkidle")

        module_title = f"E2E Module {unique_suffix('m')}"

        # Click "Add Module"
        page.locator("[data-testid='module-add-toggle-btn']").wait_for(state="visible", timeout=10000)
        page.locator("[data-testid='module-add-toggle-btn']").click()
        page.locator("[data-testid='module-title-input']").wait_for(state="visible", timeout=5000)
        page.locator("[data-testid='module-title-input']").fill(module_title)
        page.locator("[data-testid='module-add-btn']").click()
        page.wait_for_timeout(2000)

        # Verify module name appears on the page
        assert page.locator(f"text={module_title}").count() > 0, (
            f"Module '{module_title}' not visible after creation"
        )


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminEnrollmentWorkflow:
    """OrgAdmin enrolls a student in a course via the member-roles UI tab."""

    def test_orgadmin_enrolls_student_via_ui(self, page):
        """Enroll student UUID via UI → enrollment row appears."""
        ctx = _create_orgadmin_context()
        student = _create_student(ctx["sa_headers"])
        oa_login = _api_login(ctx["username"], ctx["password"], org_id=ctx["org_id"])
        oa_token = oa_login["accessToken"]
        org_id = ctx["org_id"]

        # Create course
        r = requests.post(
            f"{API_BASE}/api/courses",
            json={"title": f"E2EEnroll {unique_suffix('c')}", "description": ""},
            headers={"Authorization": f"Bearer {oa_token}", "X-Org-Id": org_id},
            timeout=TIMEOUT,
        )
        course_id = r.json().get("data", r.json())["id"]

        _ui_login_orgadmin(page, ctx["username"], ctx["password"], org_id)
        page.goto(f"{FE_BASE}/admin/editor/member-roles?courseId={course_id}")
        page.wait_for_load_state("networkidle")

        # Fill in student UUID
        page.locator("[data-testid='enrollment-userid-input']").wait_for(state="visible", timeout=10000)
        page.locator("[data-testid='enrollment-userid-input']").fill(student["id"])
        page.locator("[data-testid='enrollment-role-select']").select_option("Student")
        page.locator("[data-testid='enrollment-submit-btn']").click()
        page.wait_for_timeout(2000)
        page.wait_for_load_state("networkidle")

        # Enrollment row should appear
        row = page.locator(f"[data-testid='enrollment-row-{student['id']}']")
        assert row.count() > 0, (
            f"Enrollment row for student {student['id']} not found after enroll"
        )

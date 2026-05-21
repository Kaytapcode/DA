"""
Browser E2E — Role-based login workflows (Spec §1, §5).

Validates that each seeded role account:
  - Can log in via the FE form
  - Is redirected to the correct destination for their role
  - Has access to their role-specific pages
  - Cannot access pages outside their role

Seeded accounts (Spec §5):
  SysAdmin1 / SysAdmin@123   → /sysadmin/dashboard
  OrgAdmin1 / OrgAdmin@123   → /admin/dashboard  (org: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
  OrgAdmin2 / OrgAdmin@123   → /admin/dashboard  (org: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb)
  User1 / User@123            → /user/home
"""

import pytest
from _helpers import (
    FE_BASE,
    API_BASE,
    ui_login,
    ui_login_sysadmin,
    ui_login_orgadmin,
    register_user,
)

TIMEOUT = 12000  # ms

# ── Seeded credentials ──────────────────────────────────────────────────────

SYSADMIN1_USER = "SysAdmin1"
SYSADMIN1_PASS = "SysAdmin@123"

ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORGADMIN1_ORG_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

ORGADMIN2_USER = "OrgAdmin2"
ORGADMIN2_PASS = "OrgAdmin@123"
ORGADMIN2_ORG_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

USER1_USER = "User1"
USER1_PASS = "User@123"


# ─────────────────────────────────────────────────────────────────────────────
# Login Form Spec
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.sysadmin
@pytest.mark.orgadmin
class TestLoginPageElements:
    """Spec §1 — Login page must provide all required input fields."""

    def test_login_page_has_org_id_field(self, page):
        """Login page renders data-testid='login-org-id' for OrgAdmin login context."""
        # Spec §1 OrgAdmin — OrgAdmin needs to provide org ID at login time to get org context
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")

        org_field = page.locator("[data-testid='login-org-id']")
        assert org_field.count() > 0, "Login page must have data-testid='login-org-id' field"
        org_field.wait_for(state="visible", timeout=TIMEOUT)

    def test_login_page_has_required_fields(self, page):
        """Login form has identifier, password, and submit fields."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='login-identifier']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='login-password']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='login-submit']").wait_for(state="visible", timeout=TIMEOUT)

    def test_wrong_credentials_show_error_banner(self, page):
        """Invalid credentials surface data-testid='login-error' and stay on /login."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill("nonexistent_user_xyz_999")
        page.locator("[data-testid='login-password']").fill("WrongPassword1!")
        page.locator("[data-testid='login-submit']").click()

        page.wait_for_timeout(2500)
        assert "/login" in page.url, f"Bad-creds login must stay on /login, got: {page.url}"
        page.locator("[data-testid='login-error']").wait_for(state="visible", timeout=TIMEOUT)


# ─────────────────────────────────────────────────────────────────────────────
# SysAdmin Login Flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminLoginRedirect:
    """Spec §1 SysAdmin — SysAdmin login redirects to /sysadmin/dashboard."""

    def test_sysadmin_login_redirects_to_sysadmin_dashboard(self, page):
        """SysAdmin1 logs in → URL is /sysadmin/dashboard, not /user/home."""
        # Spec §1: SysAdmin has global administrative access
        ui_login_sysadmin(page, SYSADMIN1_USER, SYSADMIN1_PASS)
        assert "/sysadmin/" in page.url, (
            f"SysAdmin must land on /sysadmin/*, got: {page.url}"
        )
        assert "/user/" not in page.url, (
            f"SysAdmin must NOT land on /user/*, got: {page.url}"
        )

    def test_sysadmin_can_access_users_page(self, page):
        """After SysAdmin login, /sysadmin/users is accessible and not redirected to /login."""
        ui_login_sysadmin(page, SYSADMIN1_USER, SYSADMIN1_PASS)
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")

        assert "/login" not in page.url, (
            f"SysAdmin was redirected to login when accessing /sysadmin/users: {page.url}"
        )
        # User management page should render its search input
        page.locator("[data-testid='user-search-input']").wait_for(state="visible", timeout=TIMEOUT)

    def test_sysadmin_can_access_orgs_page(self, page):
        """SysAdmin can navigate to /sysadmin/orgs without being redirected to /login."""
        ui_login_sysadmin(page, SYSADMIN1_USER, SYSADMIN1_PASS)
        page.goto(f"{FE_BASE}/sysadmin/orgs")
        page.wait_for_load_state("networkidle")

        assert "/login" not in page.url, (
            f"SysAdmin was redirected to login when accessing /sysadmin/orgs: {page.url}"
        )

    def test_sysadmin_login_without_org_id_field_still_works(self, page):
        """SysAdmin does NOT need the org ID field — leaving it blank still succeeds."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill(SYSADMIN1_USER)
        page.locator("[data-testid='login-password']").fill(SYSADMIN1_PASS)
        # Leave org-id blank intentionally
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_url("**/sysadmin/**", timeout=15000)

        assert "/sysadmin/" in page.url, f"SysAdmin must still reach /sysadmin/, got: {page.url}"


# ─────────────────────────────────────────────────────────────────────────────
# OrgAdmin Login Flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.orgadmin
class TestOrgAdminLoginRedirect:
    """Spec §1 OrgAdmin — OrgAdmin login redirects to /admin/dashboard."""

    def test_orgadmin_login_with_org_id_redirects_to_admin_dashboard(self, page):
        """OrgAdmin1 logs in with org ID → lands on /admin/dashboard."""
        # Spec §1 OrgAdmin: OrgAdmin manages one org; must provide org ID for org context
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORGADMIN1_ORG_ID)
        assert "/admin/" in page.url, (
            f"OrgAdmin must land on /admin/*, got: {page.url}"
        )
        assert "/user/" not in page.url, (
            f"OrgAdmin must NOT land on /user/home, got: {page.url}"
        )

    def test_orgadmin_login_without_org_id_still_redirects_to_admin_dashboard(self, page):
        """OrgAdmin1 logs in WITHOUT org ID → still lands on /admin/*, but without org context."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill(ORGADMIN1_USER)
        page.locator("[data-testid='login-password']").fill(ORGADMIN1_PASS)
        # Leave org ID blank
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_url("**/admin/**", timeout=15000)
        page.wait_for_load_state("networkidle")

        assert "/admin/" in page.url, (
            f"OrgAdmin without org_id must still land on /admin/*, got: {page.url}"
        )

    def test_orgadmin_login_sets_org_context_in_localstorage(self, page):
        """OrgAdmin1 login with org ID stores org_id in localStorage."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORGADMIN1_ORG_ID)

        # Verify org_id was persisted (apiClient reads this for X-Org-Id header)
        stored_org_id = page.evaluate("() => localStorage.getItem('org_id')")
        assert stored_org_id == ORGADMIN1_ORG_ID, (
            f"Expected org_id '{ORGADMIN1_ORG_ID}' in localStorage, got '{stored_org_id}'"
        )

    def test_orgadmin_can_access_admin_courses_page(self, page):
        """OrgAdmin can access /admin/courses without being redirected to /login."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORGADMIN1_ORG_ID)
        page.goto(f"{FE_BASE}/admin/courses")
        page.wait_for_load_state("networkidle")

        assert "/login" not in page.url, (
            f"OrgAdmin was redirected to login at /admin/courses: {page.url}"
        )

    def test_orgadmin2_can_login_with_own_org(self, page):
        """OrgAdmin2 logs in with TestOrg2 ID → redirected to /admin/*, separate org context."""
        ui_login_orgadmin(page, ORGADMIN2_USER, ORGADMIN2_PASS, org_id=ORGADMIN2_ORG_ID)
        assert "/admin/" in page.url, (
            f"OrgAdmin2 must land on /admin/*, got: {page.url}"
        )
        stored_org_id = page.evaluate("() => localStorage.getItem('org_id')")
        assert stored_org_id == ORGADMIN2_ORG_ID, (
            f"OrgAdmin2 must have TestOrg2 ID in localStorage, got '{stored_org_id}'"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Regular User (Student) Login Flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestUserLoginRedirect:
    """Spec §1 User — Student login redirects to /user/home."""

    def test_user_login_redirects_to_user_home(self, page):
        """User1 logs in → URL is /user/home, not /sysadmin/* or /admin/*."""
        ui_login(page, USER1_USER, USER1_PASS)
        assert "/user/" in page.url, (
            f"User must land on /user/*, got: {page.url}"
        )
        assert "/sysadmin/" not in page.url, (
            f"User must NOT land on /sysadmin/*, got: {page.url}"
        )
        assert "/admin/" not in page.url, (
            f"User must NOT land on /admin/*, got: {page.url}"
        )

    def test_user_cannot_access_sysadmin_page(self, page):
        """Student cannot access /sysadmin/users — must be redirected."""
        ui_login(page, USER1_USER, USER1_PASS)
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        # ProtectedRoute should redirect Student away from SysAdmin pages
        assert "/sysadmin/users" not in page.url, (
            f"Student must NOT be able to access /sysadmin/users, got: {page.url}"
        )

    def test_newly_registered_user_redirected_to_user_home(self, page):
        """Newly registered Student always lands on /user/home, never on admin pages."""
        creds = register_user("roletest")
        ui_login(page, creds["username"], creds["password"])
        assert "/user/" in page.url, (
            f"Newly registered user must land on /user/*, got: {page.url}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Role Isolation — Cross-role access denied
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.security
class TestRoleIsolationAtFE:
    """Spec §5 invariant 7 — Role boundaries enforced at FE routing level."""

    def test_student_redirected_from_sysadmin_dashboard(self, page):
        """A logged-in Student navigating to /sysadmin/dashboard is turned away."""
        ui_login(page, USER1_USER, USER1_PASS)
        page.goto(f"{FE_BASE}/sysadmin/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)

        # Must not stay on /sysadmin/dashboard
        assert "/sysadmin/dashboard" not in page.url, (
            f"Student accessed SysAdmin dashboard: {page.url}"
        )

    def test_orgadmin_can_access_admin_routes(self, page):
        """OrgAdmin CAN access /admin/* routes (they are in the allowed roles)."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORGADMIN1_ORG_ID)
        page.goto(f"{FE_BASE}/admin/members")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)

        assert "/login" not in page.url, (
            f"OrgAdmin was redirected to login at /admin/members: {page.url}"
        )

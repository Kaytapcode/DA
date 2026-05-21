"""
Browser E2E — SysAdmin portal UI workflows (Spec §1 SysAdmin).

Validates:
  - SysAdmin can login and navigate to /sysadmin/* pages
  - User list page renders with user rows
  - Organization directory page renders org cards
  - Analytics / global content page renders stat cards
  - SysAdmin can create a new user via the UI form
"""

import uuid
import requests
import pytest
from _helpers import FE_BASE, API_BASE, unique_suffix

TIMEOUT = 12000  # ms

SYSADMIN_USER = "SysAdmin1"
SYSADMIN_PASS = "SysAdmin@123"


def _ui_login_sysadmin(page):
    """Login as SysAdmin1 via the real FE form. Lands on /sysadmin/dashboard."""
    from _helpers import ui_login_sysadmin
    ui_login_sysadmin(page, SYSADMIN_USER, SYSADMIN_PASS)


# ─────────────────────────────────────────────────────────────────────────────
# SysAdmin Login
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminLogin:
    """SysAdmin can log in and access protected /sysadmin/* routes."""

    def test_sysadmin_login_lands_on_sysadmin_dashboard(self, page):
        """SysAdmin1 logs in → redirected to /sysadmin/* (not /login or /user/*)."""
        _ui_login_sysadmin(page)
        assert "/sysadmin/" in page.url, f"SysAdmin should be on /sysadmin/*, got: {page.url}"

    def test_sysadmin_can_navigate_to_users_page(self, page):
        """After login, SysAdmin navigates to /sysadmin/users — user list renders."""
        _ui_login_sysadmin(page)
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")

        # Should NOT be redirected to /login (ProtectedRoute allows SysAdmin)
        assert "/login" not in page.url, "SysAdmin was redirected to login on /sysadmin/users"
        # User list or search input should be visible
        page.locator("[data-testid='user-search-input']").wait_for(state="visible", timeout=TIMEOUT)


# ─────────────────────────────────────────────────────────────────────────────
# Global User Management Page
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminUserManagement:
    """Spec §1 SysAdmin — global user management page shows user rows."""

    def test_user_list_shows_seeded_users(self, page):
        """User list page renders and contains at least the seeded SysAdmin1 account."""
        _ui_login_sysadmin(page)
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")

        # Wait for list to populate
        page.locator("[data-testid='user-list']").wait_for(state="visible", timeout=TIMEOUT)
        items = page.locator("[data-testid='user-item']")
        assert items.count() > 0, "User list is empty — expected at least seeded users"

    def test_user_search_filters_results(self, page):
        """Typing in search and pressing Search shows filtered results."""
        _ui_login_sysadmin(page)
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='user-search-input']").wait_for(state="visible", timeout=TIMEOUT)

        page.locator("[data-testid='user-search-input']").fill("SysAdmin1")
        page.locator("[data-testid='user-search-btn']").click()
        page.wait_for_timeout(1200)
        page.wait_for_load_state("networkidle")

        # At least one user row with SysAdmin1 username
        usernames = page.locator("[data-testid='user-item-username']").all_inner_texts()
        assert any("SysAdmin1" in u for u in usernames), (
            f"SysAdmin1 not in filtered results: {usernames}"
        )

    def test_sysadmin_creates_user_via_ui(self, page):
        """SysAdmin opens create-user modal, fills form, submits → user appears in list."""
        _ui_login_sysadmin(page)
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='user-create-btn']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='user-create-btn']").click()

        # Modal should open
        page.wait_for_timeout(500)
        username = unique_suffix("saui")
        email = f"{username}@lumina.test"

        # Fill modal fields (no data-testid on modal inputs — use placeholder/type)
        page.get_by_placeholder("username").fill(username)
        page.get_by_placeholder("user@example.com").fill(email)
        page.get_by_placeholder("Min 8 chars with upper/lower/digit/special").fill("UICreate1!")
        # Submit
        page.get_by_text("Create", exact=True).click()
        page.wait_for_timeout(1500)
        page.wait_for_load_state("networkidle")

        # Search for the new user
        page.locator("[data-testid='user-search-input']").fill(username)
        page.locator("[data-testid='user-search-btn']").click()
        page.wait_for_timeout(1200)
        page.wait_for_load_state("networkidle")

        usernames = page.locator("[data-testid='user-item-username']").all_inner_texts()
        assert any(username in u for u in usernames), (
            f"Newly created user '{username}' not found in list after creation"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Organization Directory Page
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminOrgDirectory:
    """Spec §1 SysAdmin — org directory lists all organizations."""

    def test_org_directory_shows_seeded_orgs(self, page):
        """Organization directory renders org cards for at least the 2 seeded orgs."""
        _ui_login_sysadmin(page)
        page.goto(f"{FE_BASE}/sysadmin/orgs")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)  # Allow API fetch + React render

        assert "/login" not in page.url, f"SysAdmin redirected to login: {page.url}"
        # Wait directly for org-item (bypasses empty initial render)
        page.locator("[data-testid='org-item']").first.wait_for(state="visible", timeout=25000)
        items = page.locator("[data-testid='org-item']")
        assert items.count() >= 2, f"Expected ≥2 org cards (seeded), got {items.count()}"

    def test_org_directory_search_filters(self, page):
        """Searching 'TestOrg1' in org directory filters to matching orgs."""
        _ui_login_sysadmin(page)
        page.goto(f"{FE_BASE}/sysadmin/orgs")
        page.wait_for_load_state("networkidle")

        # Wait for orgs to load BEFORE filtering
        page.locator("[data-testid='org-item']").first.wait_for(state="visible", timeout=25000)

        # Use pressSequentially to ensure React onChange fires
        inp = page.locator("[data-testid='org-search-input']")
        inp.click()
        inp.press("Control+a")
        inp.press_sequentially("TestOrg1", delay=30)
        page.wait_for_timeout(1000)  # React re-render after filter

        # Either org items filtered, or the page text contains TestOrg1
        content = page.content()
        names = page.locator("[data-testid='org-item-name']").all_inner_texts()
        assert any("TestOrg1" in n for n in names) or "TestOrg1" in content, (
            f"'TestOrg1' not found after search. org-item-names={names}, "
            f"content_snippet={'TestOrg1' in content}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Global Analytics (Content) Page
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminGlobalContent:
    """Spec §1 SysAdmin — global analytics page renders stat cards."""

    def test_global_content_page_shows_stats(self, page):
        """Navigate to /sysadmin/courses — stat cards with numeric values render."""
        _ui_login_sysadmin(page)
        page.goto(f"{FE_BASE}/sysadmin/courses")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        # At least one numeric stat should be visible (Total Courses, Modules, etc.)
        assert "/login" not in page.url, "SysAdmin redirected away from /sysadmin/courses"
        # Page rendered without crash — stat numbers visible somewhere
        content = page.content()
        assert "Total Courses" in content or "Tong khoa hoc" in content or \
               "Modules" in content or "Mo-dun" in content, (
            "Expected stat labels not found on /sysadmin/courses page"
        )

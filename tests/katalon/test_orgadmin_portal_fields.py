"""
Per-field Playwright tests for OrgAdmin portal pages.
Verifies every column header, form field, label, and role-dropdown option. Spec §1 OrgAdmin.
"""
import pytest
from playwright.sync_api import Page, expect
from ._helpers import FE_BASE, ui_login_orgadmin

ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


# ---------------------------------------------------------------------------
# Shared login fixture
# ---------------------------------------------------------------------------


@pytest.fixture()
def orgadmin_page(page: Page) -> Page:
    """Return a Page already logged in as OrgAdmin1 with TestOrg1 context."""
    ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
    return page


# ---------------------------------------------------------------------------
# OrgAdmin Dashboard
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminDashboard:
    """OrgAdmin dashboard landing page. Spec §1 OrgAdmin: 'View Organization analytics.'"""

    def test_dashboard_heading(self, orgadmin_page: Page):
        """'Organization Overview' heading is visible on dashboard."""
        orgadmin_page.goto(f"{FE_BASE}/admin/dashboard")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("text=Organization Overview")).to_be_visible()

    def test_total_members_stat_label(self, orgadmin_page: Page):
        """'Total Members' stat card label is visible."""
        orgadmin_page.goto(f"{FE_BASE}/admin/dashboard")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("text=Total Members")).to_be_visible()

    def test_active_courses_stat_label(self, orgadmin_page: Page):
        """'Active Courses' stat card label is visible."""
        orgadmin_page.goto(f"{FE_BASE}/admin/dashboard")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("text=Active Courses")).to_be_visible()

    def test_completed_attempts_stat_label(self, orgadmin_page: Page):
        """'Completed Attempts' stat card label is visible."""
        orgadmin_page.goto(f"{FE_BASE}/admin/dashboard")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("text=Completed Attempts")).to_be_visible()

    def test_recent_joins_stat_label(self, orgadmin_page: Page):
        """'Recent Joins (30d)' stat card label is visible."""
        orgadmin_page.goto(f"{FE_BASE}/admin/dashboard")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("text=Recent Joins (30d)")).to_be_visible()

    def test_recent_courses_section_heading(self, orgadmin_page: Page):
        """'Recent Courses' section heading is visible on dashboard."""
        orgadmin_page.goto(f"{FE_BASE}/admin/dashboard")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("text=Recent Courses")).to_be_visible()


# ---------------------------------------------------------------------------
# Course Management page
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminCourseManagementFields:
    """Per-field tests for /admin/courses. Spec §4.2: 'Course CRUD scoped to org.'"""

    def test_page_heading(self, orgadmin_page: Page):
        """'Course Management' heading is visible."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("h2:has-text('Course Management'), h1:has-text('Course Management')").first).to_be_visible()

    def test_page_subtitle(self, orgadmin_page: Page):
        """Page subtitle about managing publishing and enrollment is visible."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("text=Manage publishing, enrollment, and quality")).to_be_visible()

    def test_create_course_button_present(self, orgadmin_page: Page):
        """'Create Course' button (data-testid='course-create-toggle-btn') is present."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        btn = orgadmin_page.locator("[data-testid='course-create-toggle-btn']")
        expect(btn).to_be_visible()
        expect(btn).to_contain_text("Create Course")

    def test_create_form_appears_on_button_click(self, orgadmin_page: Page):
        """Clicking 'Create Course' reveals the course creation form."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.locator("[data-testid='course-create-toggle-btn']").click()
        expect(orgadmin_page.locator("[data-testid='course-title-input']")).to_be_visible()

    def test_create_form_title_field(self, orgadmin_page: Page):
        """Create form has a 'Title' input (data-testid='course-title-input')."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.locator("[data-testid='course-create-toggle-btn']").click()
        field = orgadmin_page.locator("[data-testid='course-title-input']")
        expect(field).to_be_visible()

    def test_create_form_title_label(self, orgadmin_page: Page):
        """Create form has 'Title' label text."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.locator("[data-testid='course-create-toggle-btn']").click()
        expect(orgadmin_page.locator("text=Title").first).to_be_visible()

    def test_create_form_title_placeholder(self, orgadmin_page: Page):
        """Title input placeholder is 'e.g. React Programming'."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.locator("[data-testid='course-create-toggle-btn']").click()
        field = orgadmin_page.locator("[data-testid='course-title-input']")
        expect(field).to_have_attribute("placeholder", "e.g. React Programming")

    def test_create_form_code_field(self, orgadmin_page: Page):
        """Create form has a 'Course Code' input (data-testid='course-code-input')."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.locator("[data-testid='course-create-toggle-btn']").click()
        field = orgadmin_page.locator("[data-testid='course-code-input']")
        expect(field).to_be_visible()

    def test_create_form_code_label(self, orgadmin_page: Page):
        """Create form has 'Course Code' label text."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.locator("[data-testid='course-create-toggle-btn']").click()
        expect(orgadmin_page.locator("text=Course Code")).to_be_visible()

    def test_create_form_description_field(self, orgadmin_page: Page):
        """Create form has a 'Description' input (data-testid='course-description-input')."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.locator("[data-testid='course-create-toggle-btn']").click()
        field = orgadmin_page.locator("[data-testid='course-description-input']")
        expect(field).to_be_visible()

    def test_create_form_submit_button(self, orgadmin_page: Page):
        """Create form has a 'Create' submit button (data-testid='course-create-submit-btn')."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.locator("[data-testid='course-create-toggle-btn']").click()
        btn = orgadmin_page.locator("[data-testid='course-create-submit-btn']")
        expect(btn).to_be_visible()
        expect(btn).to_contain_text("Create")

    def test_course_table_has_course_column(self, orgadmin_page: Page):
        """Course list table shows 'Course' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Course')")).to_be_visible()

    def test_course_table_has_code_column(self, orgadmin_page: Page):
        """Course list table shows 'Code' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Code')")).to_be_visible()

    def test_course_table_has_modules_column(self, orgadmin_page: Page):
        """Course list table shows 'Modules' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Modules')")).to_be_visible()

    def test_course_table_has_created_column(self, orgadmin_page: Page):
        """Course list table shows 'Created' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/courses")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Created')")).to_be_visible()


# ---------------------------------------------------------------------------
# Member Management page
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminMemberManagementFields:
    """Per-field tests for /admin/members. Spec §1 OrgAdmin: 'Manage Users within the Organization.'"""

    def test_page_heading(self, orgadmin_page: Page):
        """'Members' heading is visible."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("h2:has-text('Members')")).to_be_visible()

    def test_page_subtitle(self, orgadmin_page: Page):
        """'Manage organization members and roles' subtitle is visible."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("text=Manage organization members and roles")).to_be_visible()

    def test_search_input_present(self, orgadmin_page: Page):
        """Search input with placeholder 'Search by username or email...' is present."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        field = orgadmin_page.locator("input[placeholder='Search by username or email...']")
        expect(field).to_be_visible()

    def test_role_filter_dropdown_present(self, orgadmin_page: Page):
        """Role filter dropdown is present on the members page."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("select").first).to_be_visible()

    def test_role_filter_has_all_option(self, orgadmin_page: Page):
        """Role filter dropdown includes 'All Roles' option."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        select = orgadmin_page.locator("select").first
        options = select.locator("option").all_inner_texts()
        assert "All Roles" in options

    def test_role_filter_has_role_options(self, orgadmin_page: Page):
        """Role filter dropdown includes org-level roles Member and OrgAdmin.
        (Teacher/Student is NOT an org role — it is assigned per-course.)"""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        select = orgadmin_page.locator("select").first
        options = select.locator("option").all_inner_texts()
        assert "Member" in options
        assert "OrgAdmin" in options

    def test_refresh_button_present(self, orgadmin_page: Page):
        """'Refresh' button is present on the members page."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        expect(orgadmin_page.locator("button:has-text('Refresh')")).to_be_visible()

    def test_member_table_username_column(self, orgadmin_page: Page):
        """Members table shows 'Username' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Username')")).to_be_visible()

    def test_member_table_email_column(self, orgadmin_page: Page):
        """Members table shows 'Email' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Email')")).to_be_visible()

    def test_member_table_role_column(self, orgadmin_page: Page):
        """Members table shows 'Role' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Role')")).to_be_visible()

    def test_member_table_joined_column(self, orgadmin_page: Page):
        """Members table shows 'Joined' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Joined')")).to_be_visible()

    def test_member_table_actions_column(self, orgadmin_page: Page):
        """Members table shows 'Actions' column header."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator("th:has-text('Actions')")).to_be_visible()

    def test_orgadmin1_visible_in_members_list(self, orgadmin_page: Page):
        """OrgAdmin1 username appears in the members table (they are a member of TestOrg1)."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table", timeout=8000)
        expect(orgadmin_page.locator(f"td:has-text('{ORGADMIN1_USER}')").first).to_be_visible(timeout=8000)


# ---------------------------------------------------------------------------
# Role assignment dropdown in member rows
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminRoleAssignmentDropdown:
    """Verify the per-member role dropdown options in the Actions column. Spec §4.2."""

    def test_member_row_has_role_dropdown(self, orgadmin_page: Page):
        """A member row in the Actions column has a role-change dropdown."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table tbody tr", timeout=10000)
        # The row's Actions <td> contains a <select> for role change
        row_selects = orgadmin_page.locator("table tbody td select")
        assert row_selects.count() >= 1

    def test_role_dropdown_has_member_option(self, orgadmin_page: Page):
        """Member row role dropdown includes 'Member' option (org-level role)."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table tbody tr", timeout=10000)
        row_select = orgadmin_page.locator("table tbody td select").first
        options = row_select.locator("option").all_inner_texts()
        assert "Member" in options

    def test_role_dropdown_has_no_per_course_roles(self, orgadmin_page: Page):
        """Org member dropdown must NOT offer Teacher/Student — those are per-course only."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table tbody tr", timeout=10000)
        row_select = orgadmin_page.locator("table tbody td select").first
        options = row_select.locator("option").all_inner_texts()
        assert "Teacher" not in options
        assert "Student" not in options

    def test_role_dropdown_has_orgadmin_option(self, orgadmin_page: Page):
        """Member row role dropdown includes 'OrgAdmin' option."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table tbody tr", timeout=10000)
        row_select = orgadmin_page.locator("table tbody td select").first
        options = row_select.locator("option").all_inner_texts()
        assert "OrgAdmin" in options

    def test_member_row_has_remove_button(self, orgadmin_page: Page):
        """A member row in the Actions column has a 'Remove' button."""
        orgadmin_page.goto(f"{FE_BASE}/admin/members")
        orgadmin_page.wait_for_load_state("networkidle")
        orgadmin_page.wait_for_selector("table tbody tr", timeout=10000)
        expect(orgadmin_page.locator("table button:has-text('Remove')").first).to_be_visible()


# ---------------------------------------------------------------------------
# OrgAdmin cannot access SysAdmin pages
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave2
@pytest.mark.orgadmin
@pytest.mark.security
class TestOrgAdminAccessControl:
    """OrgAdmin is denied from SysAdmin-only pages. Spec §1: OrgAdmin scope is hard-bounded."""

    def test_orgadmin_denied_from_sysadmin_users_page(self, orgadmin_page: Page):
        """OrgAdmin navigating to /sysadmin/users is denied (redirect or error)."""
        orgadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        orgadmin_page.wait_for_load_state("networkidle")
        assert "/sysadmin/users" not in orgadmin_page.url or \
               orgadmin_page.locator("text=Access denied, text=Unauthorized, text=403").count() > 0

    def test_orgadmin_denied_from_sysadmin_ai_keys(self, orgadmin_page: Page):
        """OrgAdmin navigating to /sysadmin/ai-keys is denied."""
        orgadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        orgadmin_page.wait_for_load_state("networkidle")
        assert "/sysadmin/ai-keys" not in orgadmin_page.url or \
               orgadmin_page.locator("text=Access denied, text=Unauthorized, text=403").count() > 0

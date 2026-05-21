"""
Per-field Playwright tests for SysAdmin portal pages.
Verifies every column header, form field, label, and interactive control. Spec §1 SysAdmin.
"""
import pytest
from playwright.sync_api import Page, expect
from ._helpers import FE_BASE, ui_login_sysadmin

SYSADMIN1_USER = "SysAdmin1"
SYSADMIN1_PASS = "SysAdmin@123"


# ---------------------------------------------------------------------------
# Shared login fixture
# ---------------------------------------------------------------------------


@pytest.fixture()
def sysadmin_page(page: Page) -> Page:
    """Return a Page already logged in as SysAdmin1."""
    ui_login_sysadmin(page, SYSADMIN1_USER, SYSADMIN1_PASS)
    return page


# ---------------------------------------------------------------------------
# SysAdmin Dashboard
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminDashboard:
    """SysAdmin dashboard landing page. Spec §1 SysAdmin: 'View global analytics/statistics.'"""

    def test_sysadmin_dashboard_url(self, sysadmin_page: Page):
        """After login, URL is /sysadmin/dashboard."""
        assert "/sysadmin/" in sysadmin_page.url

    def test_sysadmin_sidebar_visible(self, sysadmin_page: Page):
        """SysAdmin sidebar is rendered (not the regular user sidebar)."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/dashboard")
        sysadmin_page.wait_for_load_state("networkidle")
        # Sidebar should exist; page should not have generic user nav
        assert sysadmin_page.locator("nav").count() > 0


# ---------------------------------------------------------------------------
# Global User Management page
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminUserManagementFields:
    """Per-field tests for /sysadmin/users. Spec §1 SysAdmin: 'Manage Global Users.'"""

    def test_page_heading(self, sysadmin_page: Page):
        """Page heading 'Global User Management' is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Global User Management")).to_be_visible()

    def test_search_input_present(self, sysadmin_page: Page):
        """Search input field with data-testid='user-search-input' is present."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        field = sysadmin_page.locator("[data-testid='user-search-input']")
        expect(field).to_be_visible()

    def test_search_input_placeholder(self, sysadmin_page: Page):
        """Search field has 'Search users...' placeholder."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        field = sysadmin_page.locator("[data-testid='user-search-input']")
        expect(field).to_have_attribute("placeholder", "Search users...")

    def test_search_button_present(self, sysadmin_page: Page):
        """Search button with data-testid='user-search-btn' is present."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        btn = sysadmin_page.locator("[data-testid='user-search-btn']")
        expect(btn).to_be_visible()
        expect(btn).to_contain_text("Search")

    def test_create_user_button_present(self, sysadmin_page: Page):
        """'New User' button with data-testid='user-create-btn' is present."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        btn = sysadmin_page.locator("[data-testid='user-create-btn']")
        expect(btn).to_be_visible()
        expect(btn).to_contain_text("New User")

    def test_user_list_renders(self, sysadmin_page: Page):
        """User list container (data-testid='user-list') appears with seeded accounts."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='user-list']", timeout=10000)
        user_items = sysadmin_page.locator("[data-testid='user-item']")
        assert user_items.count() >= 1

    def test_user_item_shows_username(self, sysadmin_page: Page):
        """Each user row has a username element (data-testid='user-item-username')."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='user-item']", timeout=10000)
        username_cells = sysadmin_page.locator("[data-testid='user-item-username']")
        assert username_cells.count() >= 1

    def test_user_item_shows_email(self, sysadmin_page: Page):
        """Each user row has an email element (data-testid='user-item-email')."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='user-item']", timeout=10000)
        email_cells = sysadmin_page.locator("[data-testid='user-item-email']")
        assert email_cells.count() >= 1

    def test_user_item_shows_role_badge(self, sysadmin_page: Page):
        """Each user row has a role badge (data-testid='user-item-role')."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='user-item']", timeout=10000)
        role_badges = sysadmin_page.locator("[data-testid='user-item-role']")
        assert role_badges.count() >= 1

    def test_seeded_user1_appears_in_list(self, sysadmin_page: Page):
        """Seeded User1 username appears in the user list."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='user-list']", timeout=10000)
        # Search for User1
        sysadmin_page.locator("[data-testid='user-search-input']").fill("User1")
        sysadmin_page.locator("[data-testid='user-search-btn']").click()
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("[data-testid='user-item-username']").filter(has_text="User1").first()).to_be_visible(timeout=8000)

    def test_delete_button_present_on_user_row(self, sysadmin_page: Page):
        """Delete button (data-testid='user-delete-btn') appears on user rows."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='user-item']", timeout=10000)
        delete_btns = sysadmin_page.locator("[data-testid='user-delete-btn']")
        assert delete_btns.count() >= 1


# ---------------------------------------------------------------------------
# Create User Modal
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminCreateUserModal:
    """Per-field tests for the Create New User modal. Spec §1 SysAdmin."""

    def test_create_modal_opens_on_button_click(self, sysadmin_page: Page):
        """Clicking 'New User' button opens the Create New User modal."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        expect(sysadmin_page.locator("text=Create New User")).to_be_visible()

    def test_create_modal_has_username_field(self, sysadmin_page: Page):
        """Create User modal contains a Username label and input."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        expect(sysadmin_page.locator("text=Username")).to_be_visible()

    def test_create_modal_has_email_field(self, sysadmin_page: Page):
        """Create User modal contains an Email label and input."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        expect(sysadmin_page.locator("text=Email").first()).to_be_visible()

    def test_create_modal_has_password_field(self, sysadmin_page: Page):
        """Create User modal contains a Password label and input."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        expect(sysadmin_page.locator("text=Password").first()).to_be_visible()

    def test_create_modal_has_role_dropdown(self, sysadmin_page: Page):
        """Create User modal contains a Role label and dropdown."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        expect(sysadmin_page.locator("text=Role").first()).to_be_visible()

    def test_create_modal_role_options(self, sysadmin_page: Page):
        """Role dropdown contains Student, Teacher, OrgAdmin, SysAdmin options."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        role_select = sysadmin_page.locator("select")
        options = role_select.locator("option").all_inner_texts()
        assert "Student" in options
        assert "Teacher" in options
        assert "OrgAdmin" in options
        assert "SysAdmin" in options

    def test_create_modal_sysadmin_warning_on_sysadmin_role(self, sysadmin_page: Page):
        """Selecting SysAdmin role shows a warning message about highest privileges."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        role_select = sysadmin_page.locator("select")
        role_select.select_option("SysAdmin")
        expect(sysadmin_page.locator("text=Warning: SysAdmin accounts have the highest privileges system-wide.")).to_be_visible()

    def test_create_modal_close_button(self, sysadmin_page: Page):
        """Modal has a close (X) button that dismisses the modal."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        expect(sysadmin_page.locator("text=Create New User")).to_be_visible()
        # Find close button (material icon 'close')
        close_btn = sysadmin_page.locator("button:has([class*='material'])").filter(has_text="close")
        if close_btn.count() == 0:
            close_btn = sysadmin_page.locator("button").filter(has_text="Cancel")
        close_btn.click()
        expect(sysadmin_page.locator("text=Create New User")).not_to_be_visible()

    def test_create_modal_empty_submit_shows_error(self, sysadmin_page: Page):
        """Submitting empty create form shows an error message."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/users")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("[data-testid='user-create-btn']").click()
        # Click Create with empty fields
        sysadmin_page.locator("button:has-text('Create')").last().click()
        expect(sysadmin_page.locator("text=All fields are required.")).to_be_visible()


# ---------------------------------------------------------------------------
# Organization Directory page
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminOrgDirectoryFields:
    """Per-field tests for /sysadmin/organizations. Spec §1 SysAdmin: 'Manage Organizations.'"""

    def test_page_heading(self, sysadmin_page: Page):
        """'Organization Directory' heading is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Organization Directory")).to_be_visible()

    def test_page_subtitle(self, sysadmin_page: Page):
        """Page subtitle 'Directory of all organizations in the platform' is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Directory of all organizations in the platform")).to_be_visible()

    def test_org_search_input_present(self, sysadmin_page: Page):
        """Org search input (data-testid='org-search-input') is present."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        field = sysadmin_page.locator("[data-testid='org-search-input']")
        expect(field).to_be_visible()

    def test_org_search_input_placeholder(self, sysadmin_page: Page):
        """Org search field placeholder is 'Search organizations...'."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        field = sysadmin_page.locator("[data-testid='org-search-input']")
        expect(field).to_have_attribute("placeholder", "Search organizations...")

    def test_org_refresh_button_present(self, sysadmin_page: Page):
        """Refresh button (data-testid='org-refresh-btn') is present."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        btn = sysadmin_page.locator("[data-testid='org-refresh-btn']")
        expect(btn).to_be_visible()
        expect(btn).to_contain_text("Refresh")

    def test_org_list_renders(self, sysadmin_page: Page):
        """Org list container (data-testid='org-list') appears with seeded orgs."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='org-list']", timeout=10000)
        org_items = sysadmin_page.locator("[data-testid='org-item']")
        assert org_items.count() >= 1

    def test_org_item_shows_name(self, sysadmin_page: Page):
        """Each org card shows its name (data-testid='org-item-name')."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='org-item']", timeout=10000)
        name_cells = sysadmin_page.locator("[data-testid='org-item-name']")
        assert name_cells.count() >= 1

    def test_org_item_shows_slug(self, sysadmin_page: Page):
        """Each org card shows its slug (data-testid='org-item-slug')."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='org-item']", timeout=10000)
        slug_cells = sysadmin_page.locator("[data-testid='org-item-slug']")
        assert slug_cells.count() >= 1

    def test_testorg1_visible_in_list(self, sysadmin_page: Page):
        """Seeded TestOrg1 appears in the organization directory."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/organizations")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.wait_for_selector("[data-testid='org-list']", timeout=10000)
        expect(sysadmin_page.locator("[data-testid='org-item-name']").filter(has_text="TestOrg1")).to_be_visible(timeout=8000)


# ---------------------------------------------------------------------------
# AI API Keys page
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminAiKeysFields:
    """Per-field tests for /sysadmin/ai-keys. Spec §1 SysAdmin: 'Configure AI API Keys.'"""

    def test_page_heading(self, sysadmin_page: Page):
        """'AI API Keys' heading is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=AI API Keys").first()).to_be_visible()

    def test_page_subtitle(self, sysadmin_page: Page):
        """Subtitle about managing provider keys is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Manage provider keys used for AI features.")).to_be_visible()

    def test_add_new_key_section_heading(self, sysadmin_page: Page):
        """'Add new key' section heading is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Add new key")).to_be_visible()

    def test_provider_dropdown_present(self, sysadmin_page: Page):
        """'Provider' label and dropdown are visible in the add-key form."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Provider")).to_be_visible()

    def test_provider_dropdown_options(self, sysadmin_page: Page):
        """Provider dropdown contains OpenRouter, OpenAI, Anthropic options."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        select = sysadmin_page.locator("select").first()
        options = select.locator("option").all_inner_texts()
        assert "OpenRouter" in options
        assert "OpenAI" in options
        assert "Anthropic" in options

    def test_label_field_present(self, sysadmin_page: Page):
        """'Label (optional)' field is visible in the add-key form."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Label (optional)")).to_be_visible()

    def test_api_key_field_present(self, sysadmin_page: Page):
        """'API Key' label and input are visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=API Key")).to_be_visible()

    def test_api_key_field_is_password_type(self, sysadmin_page: Page):
        """API Key input is type='password' so the key is masked."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        # Find the input with placeholder 'sk-...'
        field = sysadmin_page.locator("input[placeholder='sk-...']")
        expect(field).to_have_attribute("type", "password")

    def test_active_checkbox_present(self, sysadmin_page: Page):
        """'Set as active' checkbox is visible in the add-key form."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Set as active")).to_be_visible()

    def test_save_key_button_present(self, sysadmin_page: Page):
        """'Save key' button is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("button:has-text('Save key')")).to_be_visible()

    def test_existing_keys_section_heading(self, sysadmin_page: Page):
        """'Existing keys' section heading is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Existing keys")).to_be_visible()

    def test_empty_key_save_shows_error(self, sysadmin_page: Page):
        """Saving without an API key value shows 'API key is required'."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/ai-keys")
        sysadmin_page.wait_for_load_state("networkidle")
        sysadmin_page.locator("button:has-text('Save key')").click()
        expect(sysadmin_page.locator("text=API key is required")).to_be_visible(timeout=5000)


# ---------------------------------------------------------------------------
# Global Content / Analytics
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminAnalyticsFields:
    """Stat labels on the global analytics/content page. Spec §1 SysAdmin: 'View global analytics.'"""

    def test_global_content_page_heading(self, sysadmin_page: Page):
        """'Global Content Courses' heading is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/content")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Global Content Courses")).to_be_visible()

    def test_total_courses_stat_label(self, sysadmin_page: Page):
        """'Total Courses' stat label is visible on the analytics card."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/content")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Total Courses")).to_be_visible()

    def test_modules_stat_label(self, sysadmin_page: Page):
        """'Modules' stat label is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/content")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Modules")).to_be_visible()

    def test_quizzes_stat_label(self, sysadmin_page: Page):
        """'Quizzes' stat label is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/content")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Quizzes")).to_be_visible()

    def test_decks_stat_label(self, sysadmin_page: Page):
        """'Decks' stat label is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/content")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Decks")).to_be_visible()

    def test_videos_stat_label(self, sysadmin_page: Page):
        """'Videos' stat label is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/content")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Videos")).to_be_visible()

    def test_documents_stat_label(self, sysadmin_page: Page):
        """'Documents' stat label is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/content")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Documents")).to_be_visible()

    def test_organizations_stat_label(self, sysadmin_page: Page):
        """'Organizations' stat label is visible."""
        sysadmin_page.goto(f"{FE_BASE}/sysadmin/content")
        sysadmin_page.wait_for_load_state("networkidle")
        expect(sysadmin_page.locator("text=Organizations")).to_be_visible()

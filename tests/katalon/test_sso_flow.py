"""
Per-field Playwright tests for SSO-related flows.
Spec §1: "Third-Party SSO (Google & Microsoft) — SSO Registration (First-time Login)."
"""
import pytest
from playwright.sync_api import Page, expect
from ._helpers import FE_BASE


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestLoginPageSsoButtons:
    """SSO buttons on /login — currently hidden pending OAuth credentials.
    Spec §1 requires Google + Microsoft SSO; buttons are temporarily removed.
    Tests verify the ABSENCE of SSO UI (prevents regression when stubs reappear)."""

    def test_google_sso_button_present(self, page: Page):
        """SSO hidden: Google button (data-testid='login-sso-google') NOT present."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='login-sso-google']")
        expect(btn).not_to_be_visible()

    def test_google_sso_button_text(self, page: Page):
        """SSO hidden: no Google text in SSO button area."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='login-sso-google']")).not_to_be_visible()

    def test_microsoft_sso_button_present(self, page: Page):
        """SSO hidden: Microsoft button (data-testid='login-sso-microsoft') NOT present."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='login-sso-microsoft']")
        expect(btn).not_to_be_visible()

    def test_microsoft_sso_button_text(self, page: Page):
        """SSO hidden: no Microsoft text in SSO button area."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='login-sso-microsoft']")).not_to_be_visible()

    def test_sso_divider_or_sign_in_with_text(self, page: Page):
        """SSO hidden: 'Or Sign In With' divider is NOT present."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Or Sign In With")).not_to_be_visible()


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestRegisterPageSsoButtons:
    """SSO buttons on /register — currently hidden pending OAuth credentials."""

    def test_google_sso_button_on_register(self, page: Page):
        """SSO hidden: Google button NOT present on /register."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='register-sso-google']")
        expect(btn).not_to_be_visible()

    def test_microsoft_sso_button_on_register(self, page: Page):
        """SSO hidden: Microsoft button NOT present on /register."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='register-sso-microsoft']")
        expect(btn).not_to_be_visible()


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestSsoRoleSelectionPage:
    """SSO Role Selection Intermediary Page (/sso/complete-profile). Spec §1."""

    def test_page_heading(self, page: Page):
        """'Complete your profile.' heading is visible."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        heading = page.locator("[data-testid='sso-complete-heading']")
        expect(heading).to_be_visible()
        expect(heading).to_contain_text("Complete your profile.")

    def test_role_selector_present(self, page: Page):
        """Role selector (data-testid='sso-role-selector') is present."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        selector = page.locator("[data-testid='sso-role-selector']")
        expect(selector).to_be_visible()

    def test_user_role_option_present(self, page: Page):
        """'User' role option (data-testid='sso-role-user') is present."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='sso-role-user']")).to_be_visible()
        expect(page.locator("[data-testid='sso-role-user']")).to_contain_text("User")

    def test_orgadmin_role_option_present(self, page: Page):
        """'OrgAdmin' role option (data-testid='sso-role-orgadmin') is present."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='sso-role-orgadmin']")).to_be_visible()
        expect(page.locator("[data-testid='sso-role-orgadmin']")).to_contain_text("OrgAdmin")

    def test_user_role_selected_by_default(self, page: Page):
        """'User' role is selected by default on the SSO intermediary page."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        user_radio = page.locator("[data-testid='sso-role-user'] input[type='radio']")
        expect(user_radio).to_be_checked()

    def test_org_fields_hidden_when_user_selected(self, page: Page):
        """Organization fields are hidden when 'User' role is selected."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        # Ensure User is selected
        page.locator("[data-testid='sso-role-user'] input[type='radio']").check()
        assert page.locator("[data-testid='sso-org-fields']").count() == 0

    def test_org_fields_revealed_when_orgadmin_selected(self, page: Page):
        """Organization fields appear when 'OrgAdmin' role is selected."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sso-role-orgadmin']").click()
        expect(page.locator("[data-testid='sso-org-fields']")).to_be_visible()

    def test_org_name_field_present(self, page: Page):
        """Organization Name field (data-testid='sso-org-name') is visible after OrgAdmin selection."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sso-role-orgadmin']").click()
        expect(page.locator("[data-testid='sso-org-name']")).to_be_visible()

    def test_org_slug_field_present(self, page: Page):
        """Organization Slug field (data-testid='sso-org-slug') is visible after OrgAdmin selection."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sso-role-orgadmin']").click()
        expect(page.locator("[data-testid='sso-org-slug']")).to_be_visible()

    def test_slug_auto_derived_from_org_name(self, page: Page):
        """Typing in org name auto-populates the slug field in kebab-case."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sso-role-orgadmin']").click()
        page.locator("[data-testid='sso-org-name']").fill("My Great University")
        slug = page.locator("[data-testid='sso-org-slug']")
        expect(slug).to_have_value("my-great-university")

    def test_submit_button_text(self, page: Page):
        """Submit button text is 'Continue to Lumina →'."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='sso-complete-submit']")
        expect(btn).to_be_visible()
        expect(btn).to_contain_text("Continue to Lumina")

    def test_select_your_role_label(self, page: Page):
        """'Select Your Role' label text is visible."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Select Your Role")).to_be_visible()

    def test_sysadmin_not_in_role_options(self, page: Page):
        """SysAdmin is NOT offered as a role on the SSO intermediary page. Spec §1."""
        page.goto(f"{FE_BASE}/sso/complete-profile")
        page.wait_for_load_state("networkidle")
        # There should be no SysAdmin option
        assert page.locator("text=SysAdmin").count() == 0
        assert page.locator("input[value='SysAdmin']").count() == 0

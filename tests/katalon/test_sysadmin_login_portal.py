"""
Per-field Playwright tests for the SysAdmin dedicated login portal (/admin/login).
Spec §1: "SysAdmin logs in via a dedicated secure Admin portal. Cannot use SSO."
"""
import pytest
from playwright.sync_api import Page, expect
from ._helpers import FE_BASE

SYSADMIN1_USER = "SysAdmin1"
SYSADMIN1_PASS = "SysAdmin@123"


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminPortalStructure:
    """Verify every element on /admin/login renders correctly."""

    def test_heading_text(self, page: Page):
        """'System Administrator' heading is visible."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        heading = page.locator("[data-testid='sysadmin-login-heading']")
        expect(heading).to_be_visible()
        expect(heading).to_contain_text("System Administrator")

    def test_subtitle_text(self, page: Page):
        """Subtitle about portal being restricted to SysAdmin is visible."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        subtitle = page.locator("[data-testid='sysadmin-login-subtitle']")
        expect(subtitle).to_be_visible()
        expect(subtitle).to_contain_text("restricted to SysAdmin accounts only")

    def test_restricted_admin_portal_badge(self, page: Page):
        """'Restricted Admin Portal' badge text is visible."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Restricted Admin Portal")).to_be_visible()

    def test_username_field_present(self, page: Page):
        """Username input (data-testid='sysadmin-login-username') is present."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='sysadmin-login-username']")
        expect(field).to_be_visible()

    def test_username_field_placeholder(self, page: Page):
        """Username field placeholder is 'SysAdmin username'."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='sysadmin-login-username']")
        expect(field).to_have_attribute("placeholder", "SysAdmin username")

    def test_username_label(self, page: Page):
        """'Username' label is visible above the username field."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Username").first).to_be_visible()

    def test_password_field_present(self, page: Page):
        """Password input (data-testid='sysadmin-login-password') is present."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='sysadmin-login-password']")
        expect(field).to_be_visible()

    def test_password_field_type_hidden(self, page: Page):
        """Password field type is 'password' (hidden) by default."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='sysadmin-login-password']")
        expect(field).to_have_attribute("type", "password")

    def test_password_label(self, page: Page):
        """'Password' label is visible above the password field."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Password").first).to_be_visible()

    def test_password_toggle_present(self, page: Page):
        """Password visibility toggle button is present."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        toggle = page.locator("[data-testid='sysadmin-login-password-toggle']")
        expect(toggle).to_be_visible()

    def test_password_toggle_reveals_text(self, page: Page):
        """Clicking toggle changes password field type to 'text'."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        pwd = page.locator("[data-testid='sysadmin-login-password']")
        pwd.fill("secret")
        page.locator("[data-testid='sysadmin-login-password-toggle']").click()
        expect(pwd).to_have_attribute("type", "text")

    def test_submit_button_text(self, page: Page):
        """Submit button text is 'Access Admin Portal'."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='sysadmin-login-submit']")
        expect(btn).to_contain_text("Access Admin Portal")

    def test_no_sso_buttons(self, page: Page):
        """No Google/Microsoft SSO buttons on the SysAdmin portal. Spec §1: cannot use SSO."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        # The portal must NOT have SSO buttons
        assert page.locator("[data-testid='login-sso-google']").count() == 0
        assert page.locator("[data-testid='login-sso-microsoft']").count() == 0
        # Also check text
        assert page.locator("text=Google").count() == 0
        assert page.locator("text=Microsoft").count() == 0

    def test_no_org_id_field(self, page: Page):
        """No Organization ID field on the SysAdmin portal (it's a SysAdmin-only form)."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        assert page.locator("[data-testid='login-org-id']").count() == 0

    def test_no_self_register_link(self, page: Page):
        """No 'Create account' / 'Register' link on the SysAdmin portal."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        assert page.locator("a:has-text('Create')").count() == 0
        assert page.locator("a:has-text('Register')").count() == 0

    def test_no_credentials_provisioning_note(self, page: Page):
        """Note about credentials being provisioned by another SysAdmin is visible."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Credentials must be provisioned by another SysAdmin.")).to_be_visible()

    def test_back_to_public_login_link(self, page: Page):
        """'Regular login →' link pointing to /login is present."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        link = page.locator("a:has-text('Regular login')")
        expect(link).to_be_visible()
        expect(link).to_have_attribute("href", "/login")


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminPortalValidation:
    """Validation errors on the SysAdmin portal. Spec §1."""

    def test_empty_submit_shows_username_error(self, page: Page):
        """Submitting empty form shows 'Username is required' error."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sysadmin-login-submit']").click()
        expect(page.locator("[data-testid='sysadmin-login-error-username']")).to_be_visible()
        expect(page.locator("text=Username is required")).to_be_visible()

    def test_empty_submit_shows_password_error(self, page: Page):
        """Submitting empty form shows 'Password is required' error."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sysadmin-login-submit']").click()
        expect(page.locator("[data-testid='sysadmin-login-error-password']")).to_be_visible()
        expect(page.locator("text=Password is required")).to_be_visible()

    def test_short_password_error(self, page: Page):
        """Password under 6 chars shows 'Password must be at least 6 characters'."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sysadmin-login-username']").fill("SysAdmin1")
        page.locator("[data-testid='sysadmin-login-password']").fill("abc")
        page.locator("[data-testid='sysadmin-login-submit']").click()
        expect(page.locator("text=Password must be at least 6 characters")).to_be_visible()

    def test_wrong_credentials_shows_error(self, page: Page):
        """Wrong credentials shows error banner (data-testid='sysadmin-login-error')."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sysadmin-login-username']").fill("wrong")
        page.locator("[data-testid='sysadmin-login-password']").fill("wrongpass1")
        page.locator("[data-testid='sysadmin-login-submit']").click()
        expect(page.locator("[data-testid='sysadmin-login-error']")).to_be_visible(timeout=10000)

    def test_non_sysadmin_account_rejected(self, page: Page):
        """Logging in with a User account on the SysAdmin portal shows access-restricted error."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sysadmin-login-username']").fill("User1")
        page.locator("[data-testid='sysadmin-login-password']").fill("User@123")
        page.locator("[data-testid='sysadmin-login-submit']").click()
        error = page.locator("[data-testid='sysadmin-login-error']")
        expect(error).to_be_visible(timeout=10000)
        expect(error).to_contain_text("System Administrators only")


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminPortalLogin:
    """Successful login flow via the SysAdmin portal. Spec §1."""

    def test_sysadmin1_login_redirects_to_dashboard(self, page: Page):
        """SysAdmin1 logs in via /admin/login → lands on /sysadmin/dashboard."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='sysadmin-login-username']").fill(SYSADMIN1_USER)
        page.locator("[data-testid='sysadmin-login-password']").fill(SYSADMIN1_PASS)
        page.locator("[data-testid='sysadmin-login-submit']").click()
        page.wait_for_url("**/sysadmin/**", timeout=15000)
        assert "/sysadmin/" in page.url

    def test_portal_is_separate_from_public_login(self, page: Page):
        """/admin/login is a different page from /login (different heading text)."""
        page.goto(f"{FE_BASE}/admin/login")
        page.wait_for_load_state("networkidle")
        # Public /login has "Welcome back." heading; this portal has "System Administrator"
        assert page.locator("text=Welcome back.").count() == 0
        expect(page.locator("[data-testid='sysadmin-login-heading']")).to_be_visible()

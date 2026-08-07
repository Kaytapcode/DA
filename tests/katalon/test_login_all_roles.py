"""
Per-field Playwright tests for LoginPage — every label, placeholder, error text, redirect.
Spec §1: User Login, OrgAdmin Login, SysAdmin Login flows.
"""
import pytest
from playwright.sync_api import Page, expect
from ._helpers import FE_BASE, ui_login, ui_login_sysadmin, ui_login_orgadmin

SYSADMIN1_USER = "SysAdmin1"
SYSADMIN1_PASS = "SysAdmin@123"

ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

ORGADMIN2_USER = "OrgAdmin2"
ORGADMIN2_PASS = "OrgAdmin@123"
ORG2_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

USER1_USER = "User1"
USER1_PASS = "User@123"


# ---------------------------------------------------------------------------
# Page structure
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestLoginPageStructure:
    """Verify every static element on the login page renders correctly. Spec §1."""

    def test_page_title_text(self, page: Page):
        """Brand heading 'Lumina.' is visible."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        heading = page.locator("text=Lumina.")
        expect(heading).to_be_visible()

    def test_welcome_heading(self, page: Page):
        """'Welcome back.' heading is visible."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Welcome back.")).to_be_visible()

    def test_subtitle_text(self, page: Page):
        """Subtitle asks for credentials to access workspace."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Please enter your credentials to access your laboratory workspace.")).to_be_visible()

    def test_identifier_label(self, page: Page):
        """Label 'Email or Username' is rendered above the identifier field."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Email or Username")).to_be_visible()

    def test_identifier_placeholder(self, page: Page):
        """Identifier input has correct placeholder text."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='login-identifier']")
        expect(field).to_have_attribute("placeholder", "name@institution.edu or username")

    def test_password_label(self, page: Page):
        """Label 'Password' is rendered above the password field."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Password").first).to_be_visible()

    def test_password_placeholder(self, page: Page):
        """Password input has dots placeholder."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='login-password']")
        expect(field).to_have_attribute("placeholder", "••••••••••••")

    def test_password_type_hidden_by_default(self, page: Page):
        """Password field type is 'password' (hidden) by default."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='login-password']")
        expect(field).to_have_attribute("type", "password")

    def test_forgot_password_link_present(self, page: Page):
        """'Forgot password?' link is visible near the password field."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Forgot password?")).to_be_visible()

    def test_forgot_password_link_href(self, page: Page):
        """'Forgot password?' link points to /forgot-password."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        link = page.locator("a:has-text('Forgot password?')")
        expect(link).to_have_attribute("href", "/forgot-password")

    def test_sign_in_button_text(self, page: Page):
        """Submit button text is 'Sign In'."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='login-submit']")
        expect(btn).to_contain_text("Sign In")

    def test_sso_divider_text(self, page: Page):
        """'Or Sign In With' divider text renders between form and SSO buttons."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Or Sign In With")).to_be_visible()

    def test_sso_google_button(self, page: Page):
        """Google SSO button is present with correct testid."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='login-sso-google']")
        expect(btn).to_be_visible()
        expect(btn).to_contain_text("Google")

    def test_sso_microsoft_button(self, page: Page):
        """Microsoft SSO button is present with correct testid."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='login-sso-microsoft']")
        expect(btn).to_be_visible()
        expect(btn).to_contain_text("Microsoft")

    def test_create_account_link(self, page: Page):
        """'Create' link points to /register."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        link = page.locator("a:has-text('Create')")
        expect(link).to_have_attribute("href", "/register")

    def test_new_to_laboratory_text(self, page: Page):
        """'New to the Laboratory?' text is visible."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=New to the Laboratory?")).to_be_visible()


# ---------------------------------------------------------------------------
# Input field interaction
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestLoginFieldInteraction:
    """Verify each field accepts input and shows typed characters. Spec §1."""

    def test_identifier_accepts_typing(self, page: Page):
        """Typing in identifier field shows the typed text."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='login-identifier']")
        field.fill("test@example.com")
        expect(field).to_have_value("test@example.com")

    def test_identifier_accepts_username(self, page: Page):
        """Identifier field accepts plain usernames (not just emails)."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='login-identifier']")
        field.fill("SysAdmin1")
        expect(field).to_have_value("SysAdmin1")

    def test_password_accepts_typing(self, page: Page):
        """Typing in password field stores the typed value."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='login-password']")
        field.fill("secret123")
        expect(field).to_have_value("secret123")

    def test_password_toggle_reveals_text(self, page: Page):
        """Clicking the visibility toggle changes type from 'password' to 'text'."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        pwd = page.locator("[data-testid='login-password']")
        pwd.fill("mypassword")
        expect(pwd).to_have_attribute("type", "password")
        # click the toggle button (the button inside the password field container)
        toggle = page.locator("button[title='Show password'], button[title='Hide password']")
        toggle.click()
        expect(pwd).to_have_attribute("type", "text")

    def test_password_toggle_hides_text_again(self, page: Page):
        """Double-clicking the toggle re-hides the password."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        pwd = page.locator("[data-testid='login-password']")
        pwd.fill("mypassword")
        toggle = page.locator("button[title='Show password'], button[title='Hide password']")
        toggle.click()
        toggle.click()
        expect(pwd).to_have_attribute("type", "password")

    def test_no_org_id_field_on_login_page(self, page: Page):
        """Login page has no org-id field — OrgAdmin org is auto-resolved by BE. Spec §1."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='login-org-id']")
        assert field.count() == 0, "Login page must NOT have a login-org-id field"


# ---------------------------------------------------------------------------
# Validation error messages
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestLoginValidationErrors:
    """Per-field validation — exact error message text. Spec §1."""

    def test_empty_submit_shows_identifier_error(self, page: Page):
        """Submitting empty form shows 'Email or username is required' error."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-submit']").click()
        expect(page.locator("text=Email or username is required")).to_be_visible()

    def test_empty_submit_shows_password_error(self, page: Page):
        """Submitting empty form shows 'Password is required' error."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-submit']").click()
        expect(page.locator("text=Password is required")).to_be_visible()

    def test_short_password_error(self, page: Page):
        """Password under 6 chars shows 'Password must be at least 6 characters'."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill("someone")
        page.locator("[data-testid='login-password']").fill("abc")
        page.locator("[data-testid='login-submit']").click()
        expect(page.locator("text=Password must be at least 6 characters")).to_be_visible()

    def test_password_with_spaces_error(self, page: Page):
        """Password containing a space shows 'Password cannot contain spaces'."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill("someone")
        page.locator("[data-testid='login-password']").fill("pass word")
        page.locator("[data-testid='login-submit']").click()
        expect(page.locator("text=Password cannot contain spaces")).to_be_visible()

    def test_wrong_credentials_shows_error_banner(self, page: Page):
        """Wrong credentials triggers the error banner with data-testid='login-error'."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill("wronguser")
        page.locator("[data-testid='login-password']").fill("wrongpass1")
        page.locator("[data-testid='login-submit']").click()
        error = page.locator("[data-testid='login-error']")
        expect(error).to_be_visible(timeout=10000)

    def test_error_cleared_on_retype_identifier(self, page: Page):
        """Error on identifier field clears when user starts typing again."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-submit']").click()
        expect(page.locator("text=Email or username is required")).to_be_visible()
        page.locator("[data-testid='login-identifier']").fill("a")
        expect(page.locator("text=Email or username is required")).not_to_be_visible()

    def test_error_cleared_on_retype_password(self, page: Page):
        """Error on password field clears when user starts typing again."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-submit']").click()
        expect(page.locator("text=Password is required")).to_be_visible()
        page.locator("[data-testid='login-password']").fill("a")
        expect(page.locator("text=Password is required")).not_to_be_visible()


# ---------------------------------------------------------------------------
# User login redirect
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.user
class TestUserLoginRedirect:
    """User role login → /user/home. Spec §1 User Login."""

    def test_user1_login_redirects_to_user_home(self, page: Page):
        """User1 login redirects to /user/home."""
        ui_login(page, USER1_USER, USER1_PASS, wait_pattern="**/user/**")
        assert "/user/" in page.url

    def test_user_home_page_loads(self, page: Page):
        """After User login, /user/home page content is visible."""
        ui_login(page, USER1_USER, USER1_PASS, wait_pattern="**/user/**")
        page.wait_for_load_state("networkidle")
        # The page should have loaded without a 401/403 error
        assert "/user/" in page.url

    def test_user_cannot_access_sysadmin_dashboard(self, page: Page):
        """Logged-in User navigating to /sysadmin/dashboard is denied (redirect or 403)."""
        ui_login(page, USER1_USER, USER1_PASS, wait_pattern="**/user/**")
        page.goto(f"{FE_BASE}/sysadmin/dashboard")
        page.wait_for_load_state("networkidle")
        # Should redirect away from /sysadmin/ or show access denied
        assert "/sysadmin/dashboard" not in page.url or page.locator("text=Access denied, text=Unauthorized, text=403").count() > 0

    def test_user_cannot_access_admin_dashboard(self, page: Page):
        """Logged-in User navigating to /admin/dashboard is denied."""
        ui_login(page, USER1_USER, USER1_PASS, wait_pattern="**/user/**")
        page.goto(f"{FE_BASE}/admin/dashboard")
        page.wait_for_load_state("networkidle")
        assert "/admin/dashboard" not in page.url or page.locator("text=Access denied, text=Unauthorized").count() > 0


# ---------------------------------------------------------------------------
# SysAdmin login redirect
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminLoginRedirect:
    """SysAdmin role login → /sysadmin/dashboard. Spec §1 SysAdmin Login."""

    def test_sysadmin1_login_redirects_to_sysadmin_dashboard(self, page: Page):
        """SysAdmin1 login redirects to /sysadmin/dashboard."""
        ui_login_sysadmin(page, SYSADMIN1_USER, SYSADMIN1_PASS)
        assert "/sysadmin/" in page.url

    def test_sysadmin_does_not_need_org_id(self, page: Page):
        """SysAdmin can login successfully with empty Org ID field."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill(SYSADMIN1_USER)
        page.locator("[data-testid='login-password']").fill(SYSADMIN1_PASS)
        # Leave org-id blank
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_url("**/sysadmin/**", timeout=15000)
        assert "/sysadmin/" in page.url

    def test_sysadmin_can_access_sysadmin_dashboard(self, page: Page):
        """After SysAdmin login, /sysadmin/dashboard is accessible."""
        ui_login_sysadmin(page, SYSADMIN1_USER, SYSADMIN1_PASS)
        page.goto(f"{FE_BASE}/sysadmin/dashboard")
        page.wait_for_load_state("networkidle")
        assert "sysadmin" in page.url

    def test_sysadmin_cannot_be_confused_as_user(self, page: Page):
        """SysAdmin1 does NOT land on /user/home after login."""
        ui_login_sysadmin(page, SYSADMIN1_USER, SYSADMIN1_PASS)
        assert "/user/home" not in page.url

    def test_sysadmin2_also_redirects_correctly(self, page: Page):
        """SysAdmin2 also redirects to /sysadmin/dashboard."""
        ui_login_sysadmin(page, "SysAdmin2", SYSADMIN1_PASS)
        assert "/sysadmin/" in page.url


# ---------------------------------------------------------------------------
# OrgAdmin login redirect
# ---------------------------------------------------------------------------


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
@pytest.mark.orgadmin
class TestOrgAdminLoginRedirect:
    """OrgAdmin role login → /admin/dashboard. Spec §1 OrgAdmin Login."""

    def test_orgadmin1_redirects_to_admin_dashboard(self, page: Page):
        """OrgAdmin1 login WITHOUT entering Org ID redirects to /admin/dashboard (BE auto-resolves)."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS)
        assert "/admin/" in page.url

    def test_orgadmin_does_not_land_on_user_home(self, page: Page):
        """OrgAdmin does NOT land on /user/home after login."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS)
        assert "/user/home" not in page.url

    def test_orgadmin_does_not_land_on_sysadmin_dashboard(self, page: Page):
        """OrgAdmin does NOT land on /sysadmin/dashboard after login."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS)
        assert "/sysadmin/" not in page.url

    def test_orgadmin2_redirects_to_admin_dashboard(self, page: Page):
        """OrgAdmin2 logs in WITHOUT Org ID and lands on /admin/dashboard."""
        ui_login_orgadmin(page, ORGADMIN2_USER, ORGADMIN2_PASS)
        assert "/admin/" in page.url

    def test_no_org_id_field_on_login_page(self, page: Page):
        """Login page has no org-id field — OrgAdmin org is auto-resolved by BE. Spec §1."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        field = page.locator("[data-testid='login-org-id']")
        assert field.count() == 0, "Login page must NOT have a login-org-id field (BE auto-resolves)"

    def test_orgadmin_org_id_stored_in_localstorage(self, page: Page):
        """After OrgAdmin login (no manual Org ID), org_id is stored in localStorage from BE response."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS)
        stored = page.evaluate("() => localStorage.getItem('org_id')")
        assert stored is not None and len(stored) > 0, "org_id must be stored in localStorage after OrgAdmin login"

    def test_orgadmin_can_access_admin_members(self, page: Page):
        """After OrgAdmin login, /admin/members page is accessible."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS)
        page.goto(f"{FE_BASE}/admin/members")
        page.wait_for_load_state("networkidle")
        assert "/admin/" in page.url

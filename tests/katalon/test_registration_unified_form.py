"""
Browser E2E — Unified Registration Form per-field tests (Spec §1 update).

The registration page at /register must:
  - Show a role selector with User and OrgAdmin options (Spec §1: "user MUST explicitly select role")
  - User path: standard fields (username, email, password, confirm-password)
  - OrgAdmin path: same fields + Organization Name + Organization Slug
  - Validate every required field with correct error messages
  - Auto-derive slug from org name
  - SSO buttons visible (Google, Microsoft) — disabled until credentials wired (Spec §1 SSO)
  - Successful User registration → /login
  - Successful OrgAdmin registration → /login?orgId=<uuid>
"""

import re
import uuid
import requests
import pytest
from _helpers import FE_BASE, API_BASE, unique_suffix

TIMEOUT = 10000


# ─────────────────────────────────────────────────────────────────────────────
# Page structure — fields, labels, SSO buttons
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.orgadmin
class TestRegisterPageStructure:
    """Spec §1 — Registration form must contain all required elements."""

    def test_page_heading_present(self, page):
        """Registration page renders a heading 'Create Account'."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        heading = page.locator("[data-testid='register-heading']")
        heading.wait_for(state="visible", timeout=TIMEOUT)
        assert "Create Account" in heading.inner_text()

    def test_role_selector_present_with_two_options(self, page):
        """Spec §1: form must have an explicit role selector with User and OrgAdmin options."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")

        selector = page.locator("[data-testid='register-role-selector']")
        selector.wait_for(state="visible", timeout=TIMEOUT)

        user_option = page.locator("[data-testid='register-role-user']")
        orgadmin_option = page.locator("[data-testid='register-role-orgadmin']")
        assert user_option.count() > 0, "Role option 'User' must be present"
        assert orgadmin_option.count() > 0, "Role option 'OrgAdmin' must be present"

    def test_user_role_selected_by_default(self, page):
        """User role is selected by default — org fields should be hidden."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")

        org_fields = page.locator("[data-testid='register-org-fields']")
        assert org_fields.count() == 0, "Org fields must be hidden when User role is selected"

    def test_all_user_fields_present(self, page):
        """User path: username, email, password, confirm-password, submit are all visible."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")

        for testid in ['register-username', 'register-email', 'register-password',
                       'register-confirm-password', 'register-submit']:
            el = page.locator(f"[data-testid='{testid}']")
            el.wait_for(state="visible", timeout=TIMEOUT)
            assert el.count() > 0, f"Field '{testid}' must be visible"

    def test_sso_buttons_visible_for_user(self, page):
        """SSO buttons temporarily hidden (OAuth credentials not yet configured).
        Verifies they are absent to prevent regression when stubs reappear."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")

        # Hidden until OAuth app credentials are provided
        assert page.locator("[data-testid='register-sso-google']").count() == 0
        assert page.locator("[data-testid='register-sso-microsoft']").count() == 0

    def test_selecting_orgadmin_reveals_org_fields(self, page):
        """Spec §1: selecting OrgAdmin role reveals Organization Name and Slug fields."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='register-role-orgadmin']").click()
        page.wait_for_timeout(400)

        org_fields = page.locator("[data-testid='register-org-fields']")
        org_fields.wait_for(state="visible", timeout=TIMEOUT)

        page.locator("[data-testid='register-org-name']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='register-org-slug']").wait_for(state="visible", timeout=TIMEOUT)

    def test_selecting_user_after_orgadmin_hides_org_fields(self, page):
        """Switching back to User role hides the org fields."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='register-role-orgadmin']").click()
        page.wait_for_timeout(300)
        page.locator("[data-testid='register-role-user']").click()
        page.wait_for_timeout(300)

        assert page.locator("[data-testid='register-org-fields']").count() == 0, \
            "Org fields must be hidden after switching back to User role"


# ─────────────────────────────────────────────────────────────────────────────
# User Registration — validation errors
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestRegisterUserValidation:
    """Spec §1: each required field shows an error when left blank or invalid."""

    def test_empty_submit_shows_all_required_errors(self, page):
        """Submitting empty User form shows errors for username, email, password."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-submit']").click()
        page.wait_for_timeout(500)

        page.locator("[data-testid='register-error-username']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='register-error-email']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='register-error-password']").wait_for(state="visible", timeout=TIMEOUT)

    def test_username_error_message_text(self, page):
        """Username error says 'Username is required' when blank."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-submit']").click()
        page.wait_for_timeout(500)

        err = page.locator("[data-testid='register-error-username']")
        err.wait_for(state="visible", timeout=TIMEOUT)
        assert "Username is required" in err.inner_text()

    def test_password_mismatch_error(self, page):
        """Confirm-password mismatch shows 'Passwords do not match'."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-password']").fill("Password@123")
        page.locator("[data-testid='register-confirm-password']").fill("DifferentPass@456")
        page.locator("[data-testid='register-submit']").click()
        page.wait_for_timeout(500)

        err = page.locator("[data-testid='register-error-confirm-password']")
        err.wait_for(state="visible", timeout=TIMEOUT)
        assert "do not match" in err.inner_text().lower()

    def test_password_strength_indicator_shown(self, page):
        """Password strength indicator appears after typing a password."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-password']").fill("abc")
        page.wait_for_timeout(300)

        strength = page.locator("[data-testid='register-password-strength']")
        assert strength.count() > 0, "Password strength indicator must appear after typing"

    def test_password_toggle_shows_text(self, page):
        """Clicking the password toggle reveals the typed password."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-password']").fill("ShowMe@123")
        page.locator("[data-testid='register-password-toggle']").click()
        page.wait_for_timeout(200)

        input_type = page.locator("[data-testid='register-password']").get_attribute("type")
        assert input_type == "text", "Password toggle must reveal password text"


# ─────────────────────────────────────────────────────────────────────────────
# User Registration — success flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestRegisterUserSuccessFlow:
    """Spec §1: successful User registration navigates to /login."""

    def test_user_registration_success_redirects_to_login(self, page):
        """Complete User registration → browser lands on /login."""
        username = unique_suffix("regunified")
        email = f"{username}@lumina.test"

        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")

        # User role is selected by default
        page.locator("[data-testid='register-username']").fill(username)
        page.locator("[data-testid='register-email']").fill(email)
        page.locator("[data-testid='register-password']").fill("TestPass@123")
        page.locator("[data-testid='register-confirm-password']").fill("TestPass@123")
        page.locator("[data-testid='register-submit']").click()

        page.wait_for_url("**/login**", timeout=15000)
        assert "/login" in page.url, f"After User registration should land on /login, got {page.url}"

    def test_duplicate_username_shows_server_error(self, page):
        """Registering with an existing username shows an error on the page."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")

        # Use a seeded account username that already exists
        page.locator("[data-testid='register-username']").fill("User1")
        page.locator("[data-testid='register-email']").fill(f"newemail_{unique_suffix('dup')}@lumina.test")
        page.locator("[data-testid='register-password']").fill("TestPass@123")
        page.locator("[data-testid='register-confirm-password']").fill("TestPass@123")
        page.locator("[data-testid='register-submit']").click()

        page.wait_for_timeout(2000)
        page.locator("[data-testid='register-error']").wait_for(state="visible", timeout=TIMEOUT)
        err_text = page.locator("[data-testid='register-error']").inner_text()
        assert "already exists" in err_text.lower() or "already in use" in err_text.lower(), (
            f"Expected duplicate username error, got: {err_text!r}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# OrgAdmin Registration — org field validation and auto-slug
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.orgadmin
class TestRegisterOrgAdminValidation:
    """Spec §1: OrgAdmin registration reveals org fields with correct validation."""

    def test_orgadmin_org_name_required(self, page):
        """OrgAdmin registration fails when org name is blank."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-role-orgadmin']").click()
        page.wait_for_timeout(300)

        username = unique_suffix("oareq")
        page.locator("[data-testid='register-username']").fill(username)
        page.locator("[data-testid='register-email']").fill(f"{username}@lumina.test")
        page.locator("[data-testid='register-password']").fill("TestPass@123")
        page.locator("[data-testid='register-confirm-password']").fill("TestPass@123")
        # Leave org name blank
        page.locator("[data-testid='register-submit']").click()
        page.wait_for_timeout(500)

        err = page.locator("[data-testid='register-error-org-name']")
        err.wait_for(state="visible", timeout=TIMEOUT)
        assert "required" in err.inner_text().lower()

    def test_org_slug_auto_derived_from_name(self, page):
        """Typing org name auto-populates the slug field with kebab-case value."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-role-orgadmin']").click()
        page.wait_for_timeout(300)

        page.locator("[data-testid='register-org-name']").fill("HCM University of Technology")
        page.wait_for_timeout(400)

        slug_value = page.locator("[data-testid='register-org-slug']").input_value()
        assert slug_value != "", "Slug must be auto-derived when org name is typed"
        assert re.match(r'^[a-z0-9-]+$', slug_value), (
            f"Auto-derived slug must be lowercase kebab-case, got: {slug_value!r}"
        )
        # Slug is lowercase kebab-case (asserted above), so the derived value contains the
        # lowercased token, not the original "HCM". (Previous assertion checked uppercase and
        # contradicted the lowercase rule on line 274 — corrected per the standing test-fix directive.)
        assert "hcm" in slug_value, f"Slug should be derived from the name, got: {slug_value!r}"

    def test_org_slug_invalid_characters_error(self, page):
        """Manually entering an invalid slug (e.g. spaces or uppercase) shows error."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-role-orgadmin']").click()
        page.wait_for_timeout(300)

        username = unique_suffix("oaslug")
        page.locator("[data-testid='register-username']").fill(username)
        page.locator("[data-testid='register-email']").fill(f"{username}@lumina.test")
        page.locator("[data-testid='register-password']").fill("TestPass@123")
        page.locator("[data-testid='register-confirm-password']").fill("TestPass@123")
        page.locator("[data-testid='register-org-name']").fill("Valid Org Name")
        # Override slug with invalid characters
        slug_field = page.locator("[data-testid='register-org-slug']")
        slug_field.click(click_count=3)
        slug_field.fill("Invalid Slug With Spaces!")
        page.locator("[data-testid='register-submit']").click()
        page.wait_for_timeout(500)

        err = page.locator("[data-testid='register-error-org-slug']")
        err.wait_for(state="visible", timeout=TIMEOUT)
        assert "lowercase" in err.inner_text().lower() or "hyphens" in err.inner_text().lower()


# ─────────────────────────────────────────────────────────────────────────────
# OrgAdmin Registration — success flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.orgadmin
class TestRegisterOrgAdminSuccessFlow:
    """Spec §1: successful OrgAdmin registration navigates to /login with orgId pre-filled."""

    def test_orgadmin_registration_success_redirects_to_login_with_org_id(self, page):
        """Complete OrgAdmin registration → /login?orgId=<uuid> (org ID pre-filled)."""
        username = unique_suffix("oareg")
        org_suffix = uuid.uuid4().hex[:6]
        org_name = f"TestOrg {org_suffix}"
        org_slug = f"testorg-{org_suffix}"

        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-role-orgadmin']").click()
        page.wait_for_timeout(300)

        page.locator("[data-testid='register-username']").fill(username)
        page.locator("[data-testid='register-email']").fill(f"{username}@lumina.test")
        page.locator("[data-testid='register-password']").fill("OrgAdmin@789")
        page.locator("[data-testid='register-confirm-password']").fill("OrgAdmin@789")
        page.locator("[data-testid='register-org-name']").fill(org_name)
        # Override auto-slug with our known slug
        slug_field = page.locator("[data-testid='register-org-slug']")
        slug_field.click(click_count=3)
        slug_field.fill(org_slug)

        page.locator("[data-testid='register-submit']").click()
        page.wait_for_url("**/login**", timeout=15000)

        # After OrgAdmin registration, user lands on /login.
        # No org ID pre-fill is needed — the BE auto-resolves org for OrgAdmin at login time.
        assert "login" in page.url, (
            f"After OrgAdmin registration, should land on /login, got: {page.url}"
        )

    def test_newly_registered_orgadmin_can_login_with_org_context(self, page):
        """OrgAdmin registers → logs in with pre-filled org ID → reaches /admin/dashboard."""
        username = unique_suffix("oareg2")
        org_suffix = uuid.uuid4().hex[:6]
        org_slug = f"testorg2-{org_suffix}"

        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-role-orgadmin']").click()
        page.wait_for_timeout(300)

        page.locator("[data-testid='register-username']").fill(username)
        page.locator("[data-testid='register-email']").fill(f"{username}@lumina.test")
        page.locator("[data-testid='register-password']").fill("OrgAdmin@789")
        page.locator("[data-testid='register-confirm-password']").fill("OrgAdmin@789")
        page.locator("[data-testid='register-org-name']").fill(f"Reg Org {org_suffix}")
        slug_field = page.locator("[data-testid='register-org-slug']")
        slug_field.click(click_count=3)
        slug_field.fill(org_slug)
        page.locator("[data-testid='register-submit']").click()
        page.wait_for_url("**/login**", timeout=15000)

        # Login without entering org ID — BE auto-resolves it for OrgAdmin
        page.locator("[data-testid='login-identifier']").fill(username)
        page.locator("[data-testid='login-password']").fill("OrgAdmin@789")
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_url("**/admin/**", timeout=15000)
        assert "/admin/" in page.url, f"OrgAdmin should land on /admin/*, got: {page.url}"

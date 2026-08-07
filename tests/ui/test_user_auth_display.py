"""
FE display tests for Login / Register pages.
Spec 1: Authentication & Authorization — UI must render the required form controls
with the data-testids declared in FE/TESTID_CONVENTION.md.
"""

import os
import pytest

FE_BASE = os.getenv("FE_BASE_URL", "http://localhost:5173")


@pytest.mark.ui
@pytest.mark.display
@pytest.mark.wave1
@pytest.mark.user
class TestLoginPageDisplay:
    """Spec 1 — Login form renders the controls a user needs to authenticate."""

    def test_login_form_is_present(self, page):
        """Spec 1 — Login page exposes a form with data-testid='login-form'."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        assert page.locator("[data-testid='login-form']").count() == 1

    def test_login_identifier_input_visible(self, page):
        """Spec 1 — Login accepts email or username."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        identifier = page.locator("[data-testid='login-identifier']")
        assert identifier.is_visible(), "Identifier input must be visible"
        assert identifier.is_enabled(), "Identifier input must be enabled"

    def test_login_password_input_visible(self, page):
        """Spec 1 — Login form must include a password input."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        pw = page.locator("[data-testid='login-password']")
        assert pw.is_visible()
        assert pw.get_attribute("type") in ("password", "text")  # toggleable

    def test_login_submit_button_visible(self, page):
        """Spec 1 — Login form has a submit button."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='login-submit']")
        assert btn.is_visible()
        assert btn.is_enabled()


@pytest.mark.ui
@pytest.mark.display
@pytest.mark.wave1
@pytest.mark.user
class TestRegisterPageDisplay:
    """Spec 1 — Register form renders the controls for new account creation."""

    def test_register_form_is_present(self, page):
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        assert page.locator("[data-testid='register-form']").count() == 1

    def test_register_inputs_visible(self, page):
        """Spec 1 — Register accepts username, email, password, confirm password."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        for testid in ("register-username", "register-email", "register-password", "register-confirm-password"):
            elem = page.locator(f"[data-testid='{testid}']")
            assert elem.is_visible(), f"{testid} must be visible"
            assert elem.is_enabled(), f"{testid} must be enabled"

    def test_register_submit_button_visible(self, page):
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        btn = page.locator("[data-testid='register-submit']")
        assert btn.is_visible()

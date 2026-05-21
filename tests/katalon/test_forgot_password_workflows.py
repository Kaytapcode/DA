"""
Browser E2E — Forgot / Reset Password UI workflows (Spec §1).

Validates:
  - User navigates to /forgot-password and submits email → sees success state
  - Using devToken from API, user can navigate to /reset-password?token=... and reset
  - After reset, user can log in with new password
  - Invalid / expired tokens show error on /reset-password
"""

import uuid
import requests
import pytest
from _helpers import FE_BASE, API_BASE, register_user, unique_suffix

TIMEOUT = 12000  # ms for Playwright


def _get_dev_token_for(email: str) -> str:
    """POST /auth/forgot-password and return devToken from response (dev mode only)."""
    r = requests.post(
        f"{API_BASE}/api/auth/forgot-password",
        json={"email": email},
        timeout=10,
    )
    assert r.status_code == 200, f"forgot-password failed: {r.status_code} {r.text}"
    data = r.json()
    # In dev mode the BE returns devToken in the response body
    token = (data.get("data") or {}).get("devToken") or data.get("devToken")
    assert token, f"No devToken in response — check ASPNETCORE_ENVIRONMENT=Development. Response: {data}"
    return token


# ─────────────────────────────────────────────────────────────────────────────
# Forgot Password UI — page renders and accepts email
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestForgotPasswordPage:
    """Spec §1 — unauthenticated users can request a password reset."""

    def test_forgot_password_form_renders(self, page):
        """Navigate to /forgot-password — form is visible with email field and submit."""
        page.goto(f"{FE_BASE}/forgot-password")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='forgot-password-form']").wait_for(state="visible", timeout=TIMEOUT)
        assert page.locator("[data-testid='forgot-password-email']").count() > 0
        assert page.locator("[data-testid='forgot-password-submit']").count() > 0

    def test_forgot_password_shows_success_state_on_known_email(self, page):
        """Submit a known email → success banner appears (spec: anti-enumeration → always 200)."""
        creds = register_user("fptest")
        page.goto(f"{FE_BASE}/forgot-password")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='forgot-password-email']").fill(creds["email"])
        page.locator("[data-testid='forgot-password-submit']").click()

        # Expect success message to appear
        page.locator("[data-testid='forgot-password-email-sent']").wait_for(state="visible", timeout=TIMEOUT)

    def test_forgot_password_shows_success_state_on_unknown_email(self, page):
        """Submit an unknown email → still shows success (anti-enumeration, Spec §1)."""
        page.goto(f"{FE_BASE}/forgot-password")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='forgot-password-email']").fill("definitely_not_registered@nope.test")
        page.locator("[data-testid='forgot-password-submit']").click()

        page.locator("[data-testid='forgot-password-email-sent']").wait_for(state="visible", timeout=TIMEOUT)

    def test_forgot_password_login_link_navigates_to_login(self, page):
        """'Back to Login' link at bottom of form navigates to /login."""
        page.goto(f"{FE_BASE}/forgot-password")
        page.wait_for_load_state("networkidle")

        # forgot-password-login-link is always visible at the bottom of the form
        page.locator("[data-testid='forgot-password-login-link']").wait_for(state="visible", timeout=TIMEOUT)
        page.locator("[data-testid='forgot-password-login-link']").click()
        page.wait_for_url("**/login**", timeout=TIMEOUT)


# ─────────────────────────────────────────────────────────────────────────────
# Reset Password UI — token-based reset flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestResetPasswordPage:
    """Spec §1 — reset-password page validates token and updates password."""

    def test_reset_password_form_renders(self, page):
        """Navigate to /reset-password?token=anything — form renders."""
        page.goto(f"{FE_BASE}/reset-password?token=testtoken")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='reset-password-form']").wait_for(state="visible", timeout=TIMEOUT)
        assert page.locator("[data-testid='reset-password-new']").count() > 0
        assert page.locator("[data-testid='reset-password-confirm']").count() > 0
        assert page.locator("[data-testid='reset-password-submit']").count() > 0

    def test_reset_password_invalid_token_shows_error(self, page):
        """Submitting an invalid token → error message shown on the page."""
        page.goto(f"{FE_BASE}/reset-password?token=invalidtoken123")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='reset-password-new']").fill("NewPassword123!")
        page.locator("[data-testid='reset-password-confirm']").fill("NewPassword123!")
        page.locator("[data-testid='reset-password-submit']").click()

        page.locator("[data-testid='reset-password-error']").wait_for(state="visible", timeout=TIMEOUT)

    def test_full_forgot_reset_login_cycle(self, page):
        """Full cycle: request reset → use devToken → login with new password."""
        creds = register_user("frcycle")
        token = _get_dev_token_for(creds["email"])
        new_password = "NewCycle789!@#"

        # Navigate to reset page with real token
        page.goto(f"{FE_BASE}/reset-password?token={token}")
        page.wait_for_load_state("networkidle")

        page.locator("[data-testid='reset-password-new']").fill(new_password)
        page.locator("[data-testid='reset-password-confirm']").fill(new_password)
        page.locator("[data-testid='reset-password-submit']").click()

        # Success message should appear
        page.locator("[data-testid='reset-password-success-msg']").wait_for(state="visible", timeout=TIMEOUT)

        # Now login with new password
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill(creds["username"])
        page.locator("[data-testid='login-password']").fill(new_password)
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_url("**/user/**", timeout=15000)
        assert "/login" not in page.url, "Login with new password failed — still on login page"

    def test_token_single_use_second_reset_fails(self, page):
        """Using the same reset token twice → second attempt shows error (Spec §1)."""
        creds = register_user("frsingle")
        token = _get_dev_token_for(creds["email"])

        # Use token once
        r = requests.post(
            f"{API_BASE}/api/auth/reset-password",
            json={"token": token, "newPassword": "First_Use_456!"},
            timeout=10,
        )
        assert r.status_code == 200

        # Second use via UI
        page.goto(f"{FE_BASE}/reset-password?token={token}")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='reset-password-new']").fill("Second_Use_789!")
        page.locator("[data-testid='reset-password-confirm']").fill("Second_Use_789!")
        page.locator("[data-testid='reset-password-submit']").click()

        page.locator("[data-testid='reset-password-error']").wait_for(state="visible", timeout=TIMEOUT)

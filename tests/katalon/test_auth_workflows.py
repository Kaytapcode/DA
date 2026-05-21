"""
Browser E2E — Auth workflows (Spec 1).

End-to-end:
- Successful UI register → login → land on /user/home
- Wrong password shows login-error and stays on /login
- Logging in with the email (not username) also works
"""

import requests
import pytest
from _helpers import (
    FE_BASE,
    API_BASE,
    register_user,
    unique_suffix,
)


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestRegisterAndLoginWorkflow:
    """Spec 1 — End-to-end registration via the FE form then login."""

    def test_user_registers_via_ui_and_can_login(self, page):
        username = unique_suffix("regui")
        email = f"{username}@example.com"
        password = "TestPassword123!"

        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-username']").fill(username)
        page.locator("[data-testid='register-email']").fill(email)
        page.locator("[data-testid='register-password']").fill(password)
        page.locator("[data-testid='register-confirm-password']").fill(password)
        page.locator("[data-testid='register-submit']").click()

        # Capture network and console state for debugging if the navigation hangs
        try:
            page.wait_for_function(
                "() => window.location.pathname === '/login'",
                timeout=15000,
            )
        except Exception:
            # Print diagnostic info to fail informatively
            err_text = ""
            for sel in ("p.text-red-500", "[data-testid='login-error']"):
                err_locator = page.locator(sel)
                if err_locator.count() > 0:
                    err_text = err_locator.first.inner_text()
                    break
            raise AssertionError(
                f"Register did not navigate to /login. Current URL: {page.url}. "
                f"On-page error: '{err_text}'"
            )

        # Now log in via UI
        page.locator("[data-testid='login-identifier']").wait_for(state="visible")
        page.locator("[data-testid='login-identifier']").fill(username)
        page.locator("[data-testid='login-password']").fill(password)
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_function(
            "() => window.location.pathname.startsWith('/user/')",
            timeout=15000,
        )


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestLoginFailureWorkflow:
    """Spec 1 — Bad credentials surface a visible error in the UI."""

    def test_wrong_password_shows_error_and_does_not_navigate(self, page):
        creds = register_user("authfail")

        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill(creds["username"])
        page.locator("[data-testid='login-password']").fill("WrongPassword999!")
        page.locator("[data-testid='login-submit']").click()

        # Should NOT navigate away from /login
        page.wait_for_timeout(2500)
        assert "/login" in page.url, "Failed login must keep user on /login"
        # Error banner should be visible
        page.locator("[data-testid='login-error']").wait_for(state="visible", timeout=5000)


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestLoginByEmailWorkflow:
    """Spec 1 — Login accepts email as the identifier."""

    def test_login_with_email_succeeds(self, page):
        creds = register_user("loginemail")

        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill(creds["email"])
        page.locator("[data-testid='login-password']").fill(creds["password"])
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_url("**/user/**", timeout=15000)

"""
Katalon-style E2E: User registers via API, then logs in via the FE form, lands on /user/home.
Demonstrates the Katalon Recorder → pytest port path using stable data-testid selectors.
"""

import os
import pytest
import requests
from datetime import datetime

FE_BASE = os.getenv("FE_BASE_URL", "http://localhost:5173")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:5000")


def _make_user():
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"katalon_{ts}",
        "email": f"katalon_{ts}@example.com",
        "password": "TestPassword123!",
    }


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_login_lands_on_user_home(page):
    """Spec 1 — Logging in successfully redirects the user to /user/home."""
    creds = _make_user()
    # Pre-register via API so the login form has an account to authenticate
    resp = requests.post(
        f"{API_BASE}/api/auth/register",
        json={"username": creds["username"], "password": creds["password"], "email": creds["email"]},
        timeout=10,
    )
    assert resp.status_code == 200, f"Pre-test registration failed: {resp.status_code} {resp.text}"

    page.goto(f"{FE_BASE}/login")
    page.wait_for_load_state("networkidle")

    page.locator("[data-testid='login-identifier']").fill(creds["username"])
    page.locator("[data-testid='login-password']").fill(creds["password"])
    page.locator("[data-testid='login-submit']").click()

    page.wait_for_url("**/user/**", timeout=15000)
    assert "/user/" in page.url, f"Expected redirect to /user/*, got {page.url}"


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_login_with_wrong_password_shows_error(page):
    """Spec 1 — Invalid credentials surface an error in the UI, no redirect."""
    creds = _make_user()
    requests.post(
        f"{API_BASE}/api/auth/register",
        json={"username": creds["username"], "password": creds["password"], "email": creds["email"]},
        timeout=10,
    )

    page.goto(f"{FE_BASE}/login")
    page.wait_for_load_state("networkidle")

    page.locator("[data-testid='login-identifier']").fill(creds["username"])
    page.locator("[data-testid='login-password']").fill("WrongPassword999!")
    page.locator("[data-testid='login-submit']").click()

    # Wait a moment for the FE to render the error; should NOT redirect away from /login
    page.wait_for_timeout(2000)
    assert "/login" in page.url, "Failed login must not navigate away from /login"
    error = page.locator("[data-testid='login-error']")
    assert error.count() >= 1, "FE must display a login-error element on bad credentials"

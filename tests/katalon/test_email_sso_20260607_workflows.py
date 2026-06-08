"""
Browser (Playwright) regression for the 2026-06-07 #5 batch (Forgot Password + Google SSO).

Forgot Password — when SMTP is not configured, the page must surface the reset link on-screen
(the BE returned a raw object instead of the ApiResponse envelope, so the FE never showed it).
Google SSO — the button must be READY (GSI script loaded + client id configured): clicking it
must NOT show "chưa load xong"/"chưa được cấu hình". (The actual Google account popup can't be
automated; the BE /api/auth/google verifier is covered by an API probe — invalid token → 401.)

Screenshot on failure → tests/_screens/. Markers: wave1, e2e, katalon.
"""
import pathlib
import uuid
import requests
import pytest

from _helpers import FE_BASE, API_BASE

SHOTS = pathlib.Path(__file__).resolve().parent.parent / "_screens"
SHOTS.mkdir(exist_ok=True)


def _shot(page, name):
    try:
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)
    except Exception:
        pass


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_forgot_password_shows_reset_link_when_smtp_unconfigured(page):
    """Forgot Password surfaces the on-screen reset link (SMTP not configured fallback)."""
    u = f"fp_{uuid.uuid4().hex[:8]}"
    email = f"{u}@example.com"
    r = requests.post(f"{API_BASE}/api/auth/register", json={"username": u, "email": email, "password": "User@123!"}, timeout=15)
    assert r.status_code == 200, r.text
    try:
        page.goto(f"{FE_BASE}/forgot-password")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='forgot-password-email']").fill(email)
        page.locator("[data-testid='forgot-password-submit']").click()
        link = page.locator("[data-testid='forgot-password-reset-link']")
        link.wait_for(state="visible", timeout=10000)
        href = (link.get_attribute("href") or link.inner_text() or "")
        assert "reset-password?token=" in href, f"expected a reset link, got: {href!r}"
    except Exception:
        _shot(page, "forgot_password_reset_link")
        raise


@pytest.mark.wave1
@pytest.mark.e2e
@pytest.mark.katalon
def test_google_sso_button_is_ready(page):
    """The Google SSO button is configured + GSI is loaded: clicking shows no config/load error."""
    try:
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        # GSI script (added to index.html) must populate window.google.
        page.wait_for_function("() => !!(window.google && window.google.accounts && window.google.accounts.id)", timeout=15000)
        btn = page.locator("[data-testid='login-sso-google']")
        btn.wait_for(state="visible", timeout=10000)
        btn.click()
        page.wait_for_timeout(800)
        # The precondition errors must NOT appear (client id is set + GSI loaded).
        err = page.locator("[data-testid='login-error'], .text-error")
        body = page.locator("body").inner_text().lower()
        assert "chưa load xong" not in body and "chưa được cấu hình" not in body, \
            "Google button still shows a not-ready / not-configured error"
    except Exception:
        _shot(page, "google_sso_button_ready")
        raise

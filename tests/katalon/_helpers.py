"""
Shared helpers for browser-driven E2E workflow tests.
Pairs with tests/conftest.py Playwright fixtures.
"""

import os
import time
import uuid
import requests

FE_BASE = os.getenv("FE_BASE_URL", "http://localhost:5173")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:5000")


def unique_suffix(prefix="e2e"):
    """Generate a short unique identifier ≤20 chars (FE username max).
    Uses 8 hex chars of a random uuid — collision probability is negligible per-test."""
    short = uuid.uuid4().hex[:8]
    # Truncate prefix so the full string stays ≤20 chars (prefix + '_' + 8 hex).
    max_prefix = 20 - 1 - 8
    return f"{prefix[:max_prefix]}_{short}"


def register_user(suffix="e2e"):
    """Register a fresh user via API and return creds dict."""
    creds = {
        "username": unique_suffix(suffix),
        "password": "TestPassword123!",
    }
    creds["email"] = f"{creds['username']}@example.com"
    r = requests.post(
        f"{API_BASE}/api/auth/register",
        json={"username": creds["username"], "password": creds["password"], "email": creds["email"]},
        timeout=10,
    )
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    return creds


def ui_login(page, identifier, password, wait_pattern="**/user/**"):
    """Drive the real FE login form; wait until redirected into the given URL pattern.

    Use wait_pattern="**/sysadmin/**" for SysAdmin logins,
    "**/admin/**" for OrgAdmin logins, or the default "**/user/**" for Students.
    """
    page.goto(f"{FE_BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("[data-testid='login-identifier']").fill(identifier)
    page.locator("[data-testid='login-password']").fill(password)
    page.locator("[data-testid='login-submit']").click()
    page.wait_for_url(wait_pattern, timeout=15000)
    page.wait_for_load_state("networkidle")


def ui_login_sysadmin(page, identifier, password):
    """Login as SysAdmin via FE form; waits for redirect to /sysadmin/** ."""
    ui_login(page, identifier, password, wait_pattern="**/sysadmin/**")


def ui_login_orgadmin(page, identifier, password, org_id=None):
    """Login as OrgAdmin via FE form (with optional org_id field); waits for /admin/**."""
    page.goto(f"{FE_BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("[data-testid='login-identifier']").fill(identifier)
    page.locator("[data-testid='login-password']").fill(password)
    if org_id:
        org_field = page.locator("[data-testid='login-org-id']")
        if org_field.count() > 0:
            org_field.fill(org_id)
    page.locator("[data-testid='login-submit']").click()
    page.wait_for_url("**/admin/**", timeout=15000)
    page.wait_for_load_state("networkidle")


def login_fresh_user(page, suffix="e2e"):
    """Register + UI login a brand new user. Returns creds."""
    creds = register_user(suffix)
    ui_login(page, creds["username"], creds["password"])
    return creds


def assert_visible_text(page, selector, expected_substring, timeout=10000):
    """Wait for an element to be visible and assert it contains the expected text."""
    locator = page.locator(selector)
    locator.first.wait_for(state="visible", timeout=timeout)
    actual = locator.first.inner_text()
    assert expected_substring.lower() in actual.lower(), (
        f"Expected '{expected_substring}' in element '{selector}', got '{actual}'"
    )

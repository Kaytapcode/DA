"""
UI Auth fixtures for Playwright (sync API) — log in through the real login form.

Pairs with `tests/fixtures/auth.py` (API helpers) and matches the FE selectors
declared in FE/TESTID_CONVENTION.md.
"""

import pytest
import requests
import os
from datetime import datetime
from playwright.sync_api import Page


FE_BASE = os.getenv("FE_BASE_URL", "http://localhost:5173")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:5000")


def _register_via_api(username: str, password: str, email: str) -> None:
    """Register a user via the BE so the FE login form has a real account to use."""
    resp = requests.post(
        f"{API_BASE}/api/auth/register",
        json={"username": username, "password": password, "email": email},
        timeout=10,
    )
    if resp.status_code not in (200, 400):
        raise AssertionError(f"Pre-test register failed: {resp.status_code} {resp.text}")


def _ui_login(page: Page, identifier: str, password: str) -> None:
    """Drive the real FE login form with the given credentials."""
    page.goto(f"{FE_BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("[data-testid='login-identifier']").fill(identifier)
    page.locator("[data-testid='login-password']").fill(password)
    page.locator("[data-testid='login-submit']").click()
    page.wait_for_url("**/user/**", timeout=15000)
    page.wait_for_load_state("networkidle")


@pytest.fixture
def fresh_user_credentials():
    """Generate a fresh username/email/password triple for a single test."""
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"ui_user_{ts}",
        "email": f"ui_user_{ts}@example.com",
        "password": "TestPassword123!",
    }


@pytest.fixture
def logged_in_page_owner(page: Page, fresh_user_credentials) -> Page:
    """Register + log in a regular User; return a Playwright Page on /user/home."""
    creds = fresh_user_credentials
    _register_via_api(creds["username"], creds["password"], creds["email"])
    _ui_login(page, creds["username"], creds["password"])
    page.context.lumina_user = creds  # stash for assertions in tests
    return page


@pytest.fixture
def logged_in_page_non_owner(page: Page) -> Page:
    """Register + log in a second User (non-owner) for permission tests."""
    ts = int(datetime.now().timestamp() * 1000)
    creds = {
        "username": f"ui_nonowner_{ts}",
        "email": f"ui_nonowner_{ts}@example.com",
        "password": "TestPassword123!",
    }
    _register_via_api(creds["username"], creds["password"], creds["email"])
    _ui_login(page, creds["username"], creds["password"])
    page.context.lumina_user = creds
    return page


@pytest.fixture
def sysadmin_logged_in_page(page: Page) -> Page:
    """Log in as a pre-seeded SysAdmin account (see tests/README.md)."""
    _ui_login(page, "test_sysadmin", "TestPassword123!")
    return page

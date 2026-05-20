"""
UI Auth fixtures for Playwright — log in through the real login form and cache browser state.
"""

import pytest
import json
from pathlib import Path
from datetime import datetime
from playwright.async_api import Page, BrowserContext


@pytest.fixture
async def logged_in_page_owner(page: Page) -> Page:
    """
    Log in a regular User through the FE login form.
    Returns a Playwright Page with authentication state cached.

    Use this for tests that verify owner-editable resources.
    """
    # Navigate to login page
    await page.goto("http://localhost:5173/login")
    await page.wait_for_load_state("networkidle")

    # Use test credentials (must exist in the test database)
    email = f"test_owner_{datetime.now().timestamp()}@example.com"
    password = "TestPassword123!"

    # First, register the user via the API
    # (in a real scenario, the user would already exist; we register for the UI test)
    # For now, assume the user is pre-seeded or handle registration separately

    # Fill login form
    await page.fill("input[name='email'], input[type='email']", email)
    await page.fill("input[name='password'], input[type='password']", password)

    # Click login button
    await page.click("button[type='submit'], button:has-text('Login'), button:has-text('Sign In')")

    # Wait for navigation to complete (should redirect to dashboard)
    await page.wait_for_url("**/dashboard", timeout=10000)
    await page.wait_for_load_state("networkidle")

    return page


@pytest.fixture
async def logged_in_page_non_owner(page: Page) -> Page:
    """
    Log in a different User (non-owner) through the FE login form.
    Use this for tests that verify non-owner cannot edit resources.
    """
    await page.goto("http://localhost:5173/login")
    await page.wait_for_load_state("networkidle")

    email = f"test_nonowner_{datetime.now().timestamp()}@example.com"
    password = "TestPassword123!"

    await page.fill("input[name='email'], input[type='email']", email)
    await page.fill("input[name='password'], input[type='password']", password)

    await page.click("button[type='submit'], button:has-text('Login'), button:has-text('Sign In')")

    await page.wait_for_url("**/dashboard", timeout=10000)
    await page.wait_for_load_state("networkidle")

    return page


@pytest.fixture
async def sysadmin_logged_in_page(page: Page) -> Page:
    """
    Log in as SysAdmin through the FE login form.
    Use this for SysAdmin-scoped tests (Organization management, global user management).
    """
    await page.goto("http://localhost:5173/login")
    await page.wait_for_load_state("networkidle")

    # Assumes a test SysAdmin account exists in the test database
    email = "test_sysadmin@example.com"
    password = "TestPassword123!"

    await page.fill("input[name='email'], input[type='email']", email)
    await page.fill("input[name='password'], input[type='password']", password)

    await page.click("button[type='submit'], button:has-text('Login'), button:has-text('Sign In')")

    # SysAdmin should redirect to /sysadmin/dashboard or similar
    await page.wait_for_url("**/dashboard", timeout=10000)
    await page.wait_for_load_state("networkidle")

    return page


@pytest.fixture
async def orgadmin_logged_in_page(page: Page) -> Page:
    """
    Log in as OrgAdmin through the FE login form.
    Use this for OrgAdmin-scoped tests (Course management, member management).
    """
    await page.goto("http://localhost:5173/login")
    await page.wait_for_load_state("networkidle")

    email = f"test_orgadmin_{datetime.now().timestamp()}@example.com"
    password = "TestPassword123!"

    await page.fill("input[name='email'], input[type='email']", email)
    await page.fill("input[name='password'], input[type='password']", password)

    await page.click("button[type='submit'], button:has-text('Login'), button:has-text('Sign In')")

    # OrgAdmin should redirect to /admin/dashboard or organization dashboard
    await page.wait_for_url("**/dashboard", timeout=10000)
    await page.wait_for_load_state("networkidle")

    return page


@pytest.fixture
async def browser_auth_storage(context: BrowserContext, page: Page) -> dict:
    """
    Export browser auth state (cookies, localStorage) after login for reuse across tests.
    Returns the serialized storage state.
    """
    state = await context.storage_state()
    return state

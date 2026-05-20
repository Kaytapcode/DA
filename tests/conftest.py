"""
Root conftest — shared fixtures for all test directories (api/, ui/, e2e/, katalon/).
"""

import os
import pytest
from pathlib import Path

# Re-export API fixtures (APIClient, test_user, authenticated_client, etc.) from fixtures/
from fixtures.conftest import *  # noqa: F401,F403


# ============================================================================
# Playwright fixtures (session-scoped so ui/ and katalon/ share one browser)
# ============================================================================

try:
    from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page
    _PLAYWRIGHT_AVAILABLE = True
except ImportError:
    _PLAYWRIGHT_AVAILABLE = False


@pytest.fixture(scope="session")
def playwright_instance():
    """Session-scoped Playwright instance shared across ui/ and katalon/."""
    if not _PLAYWRIGHT_AVAILABLE:
        pytest.skip("Playwright is not installed.")
    pw = sync_playwright().start()
    yield pw
    pw.stop()


@pytest.fixture(scope="session")
def browser(playwright_instance) -> "Browser":
    """Session-scoped Chromium browser."""
    browser = playwright_instance.chromium.launch(
        headless=os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() == "true",
        args=["--disable-blink-features=AutomationControlled"],
    )
    yield browser
    browser.close()


@pytest.fixture(scope="function")
def context(browser) -> "BrowserContext":
    """Fresh browser context per test."""
    context = browser.new_context(ignore_https_errors=True, viewport={"width": 1280, "height": 720})
    yield context
    context.close()


@pytest.fixture(scope="function")
def page(context) -> "Page":
    """Fresh browser page per test."""
    page = context.new_page()
    page.set_default_timeout(10000)
    page.set_default_navigation_timeout(30000)
    yield page
    page.close()

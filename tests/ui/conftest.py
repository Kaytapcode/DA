"""
Pytest configuration and Playwright fixtures for UI tests
Provides browser, page, and context fixtures for Playwright tests
"""

import pytest
import os
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page


@pytest.fixture(scope="session")
def playwright_instance():
    """
    Session-scoped Playwright instance
    Starts Playwright for the entire test session
    """
    pw = sync_playwright().start()
    yield pw
    pw.stop()


@pytest.fixture(scope="session")
def browser(playwright_instance) -> Browser:
    """
    Session-scoped browser instance
    Launches Chromium browser for all tests in session
    Reuses same browser to speed up tests
    """
    browser = playwright_instance.chromium.launch(
        headless=os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() == "true",
        args=["--disable-blink-features=AutomationControlled"]
    )
    yield browser
    browser.close()


@pytest.fixture(scope="function")
def context(browser) -> BrowserContext:
    """
    Function-scoped browser context
    Creates fresh context for each test to isolate state
    """
    context = browser.new_context(
        ignore_https_errors=True,
        viewport={"width": 1280, "height": 720}
    )
    yield context
    context.close()


@pytest.fixture(scope="function")
def page(context) -> Page:
    """
    Function-scoped page fixture
    Creates fresh page for each test
    Provides isolated browser tab for test execution
    """
    page = context.new_page()
    
    # Configure page settings
    page.set_default_timeout(10000)  # 10 seconds default timeout
    page.set_default_navigation_timeout(30000)  # 30 seconds for navigation
    
    yield page
    page.close()


# ============================================================================
# PYTEST HOOKS & CONFIGURATION
# ============================================================================

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line("markers", "ui: mark test as UI test")
    config.addinivalue_line("markers", "browser: mark test as browser automation test")
    config.addinivalue_line("markers", "slow: mark test as slow")


@pytest.fixture(autouse=True)
def reset_page_state(page):
    """Reset page state before each test"""
    # Clear all cookies and local storage
    page.context.clear_cookies()
    yield


def pytest_collection_modifyitems(config, items):
    """
    Modify test items during collection
    Auto-mark all tests in ui/ directory with 'ui' marker
    """
    for item in items:
        if "ui" in item.nodeid:
            item.add_marker(pytest.mark.ui)

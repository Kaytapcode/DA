"""
Katalon E2E tests — Playwright fixtures for browser automation.
"""

import pytest
from pathlib import Path


@pytest.fixture(scope="session")
def katalon_reports_dir():
    """Create katalon reports directory"""
    reports = Path(__file__).parent.parent / "reports" / "katalon"
    reports.mkdir(parents=True, exist_ok=True)
    return reports


@pytest.fixture
def browser_options():
    """Chrome options for Katalon tests"""
    try:
        from playwright.sync_api import sync_playwright
        # Options would be passed to browser.chromium.launch(args=[...])
        return {
            "headless": True,
            "args": [
                "--start-maximized",
                "--no-sandbox",
                "--disable-dev-shm-usage"
            ]
        }
    except ImportError:
        return {}

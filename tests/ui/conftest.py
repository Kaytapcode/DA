"""
UI test conftest. Playwright fixtures are defined in the root tests/conftest.py
so they can be shared with katalon/ (session scope spans both directories).

This file only contains UI-specific hooks.
"""

import pytest


def pytest_configure(config):
    """Add markers used by UI tests."""
    config.addinivalue_line("markers", "ui: mark test as UI test")
    config.addinivalue_line("markers", "browser: mark test as browser automation test")
    config.addinivalue_line("markers", "slow: mark test as slow")


@pytest.fixture(autouse=True)
def reset_page_state(page):
    """Clear cookies before each UI test."""
    page.context.clear_cookies()
    yield


def pytest_collection_modifyitems(config, items):
    """Auto-mark all tests in ui/ directory with 'ui' marker."""
    for item in items:
        if "tests/ui/" in item.nodeid.replace("\\", "/"):
            item.add_marker(pytest.mark.ui)

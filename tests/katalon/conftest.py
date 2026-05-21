"""
Katalon-style E2E tests.

Playwright fixtures (page, context, browser, playwright_instance) come from
tests/conftest.py — shared with the ui/ suite.
"""

import sys
import pytest
from pathlib import Path

# Make local _helpers module importable from test files in this directory
sys.path.insert(0, str(Path(__file__).parent))


@pytest.fixture(scope="session")
def katalon_reports_dir():
    """Create katalon reports directory."""
    reports = Path(__file__).parent.parent / "reports" / "katalon"
    reports.mkdir(parents=True, exist_ok=True)
    return reports

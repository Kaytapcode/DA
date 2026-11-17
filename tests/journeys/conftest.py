"""Journey fixtures: fresh context per test, strict failure on JS errors / 5xx, screenshots on failure.

Overrides the root `page` fixture for this directory only (reuses the root session `browser`).
"""
import os
from pathlib import Path

import pytest
from playwright.sync_api import expect

BASE_URL = os.getenv("FE_BASE_URL", "http://localhost:5173")
SCREENS = Path(__file__).resolve().parent.parent / "_screens" / "journeys"

expect.set_options(timeout=15000)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, "rep_" + rep.when, rep)


def _new_page(browser, errors):
    ctx = browser.new_context(base_url=BASE_URL, ignore_https_errors=True, viewport={"width": 1280, "height": 800})
    ctx.set_default_timeout(15000)
    ctx.set_default_navigation_timeout(15000)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("response", lambda r: errors.append(f"HTTP {r.status} {r.url}") if r.status >= 500 else None)
    return ctx, pg


@pytest.fixture
def js_errors():
    return []


@pytest.fixture
def page(browser, js_errors, request):
    ctx, pg = _new_page(browser, js_errors)
    yield pg
    rep = getattr(request.node, "rep_call", None)
    if rep is not None and rep.failed:
        SCREENS.mkdir(parents=True, exist_ok=True)
        pg.screenshot(path=str(SCREENS / f"{request.node.name}.png"))
    ctx.close()
    assert not js_errors, f"uncaught JS errors / API 5xx during test: {js_errors}"


@pytest.fixture
def page2(browser, js_errors):
    """A second, fully independent browser context + page (other user: owner vs non-owner, student vs admin)."""
    ctx, pg = _new_page(browser, js_errors)
    yield pg
    ctx.close()

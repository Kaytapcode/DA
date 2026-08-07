"""
Browser (Playwright) regression for the 2026-06-07 FE fixes.

1.3 — SysAdmin "Create New User" used to show a generic "Failed to create user." for any
      validation/duplicate failure (apiClient swallowed RFC7807). Now the real reason is shown.
1.4 — A SysAdmin must not see a Delete control on their OWN row (BE blocks self-delete; the FE
      now hides it and shows a "You" badge instead).

Real clicks, real data, no hardcoding. On failure a screenshot is saved to tests/_screens/.
Markers: wave1, sysadmin, e2e, katalon.
"""
import os
import pathlib
import uuid
import pytest

from _helpers import FE_BASE, ui_login_sysadmin

SHOTS = pathlib.Path(__file__).resolve().parent.parent / "_screens"
SHOTS.mkdir(exist_ok=True)


def _shot(page, name):
    try:
        page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=True)
    except Exception:
        pass


@pytest.mark.wave1
@pytest.mark.sysadmin
@pytest.mark.e2e
@pytest.mark.katalon
def test_create_user_duplicate_shows_specific_error(page):
    """1.3 — creating a user with an already-taken username surfaces the real BE message."""
    try:
        ui_login_sysadmin(page, "SysAdmin1", "SysAdmin@123")
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='user-create-btn']").click()
        page.locator("[data-testid='create-user-username']").fill("SysAdmin1")  # already exists
        page.locator("[data-testid='create-user-email']").fill(f"dup_{uuid.uuid4().hex[:8]}@ex.com")
        page.locator("[data-testid='create-user-password']").fill("User@123")
        page.locator("[data-testid='create-user-submit']").click()
        err = page.locator("[data-testid='create-user-error']")
        err.wait_for(state="visible", timeout=10000)
        text = err.inner_text().lower()
        # Must be the SPECIFIC reason, not the old generic fallback.
        assert "exist" in text or "already" in text, f"expected a specific duplicate error, got: {text!r}"
        assert "failed to create user" not in text, f"still showing generic error: {text!r}"
    except Exception:
        _shot(page, "create_user_duplicate_error")
        raise


@pytest.mark.wave1
@pytest.mark.sysadmin
@pytest.mark.e2e
@pytest.mark.katalon
def test_sysadmin_own_row_has_no_delete(page):
    """1.4 — the logged-in SysAdmin's own row shows a 'You' badge and no Delete button."""
    try:
        ui_login_sysadmin(page, "SysAdmin1", "SysAdmin@123")
        page.goto(f"{FE_BASE}/sysadmin/users")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='user-search-input']").fill("SysAdmin1")
        page.locator("[data-testid='user-search-btn']").click()
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='user-list']").wait_for(state="visible", timeout=10000)
        # The own row marks itself; that row must not carry a delete control.
        self_badge = page.locator("[data-testid='user-item-self']")
        assert self_badge.count() >= 1, "expected a 'You' badge on the caller's own row"
        # The own user-item must not contain a delete button.
        own_item = page.locator("[data-testid='user-item']").filter(has=self_badge.first)
        assert own_item.locator("[data-testid='user-delete-btn']").count() == 0, \
            "own row must not show a Delete button"
    except Exception:
        _shot(page, "sysadmin_own_row_no_delete")
        raise

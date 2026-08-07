"""
Browser (Playwright) workflow tests for the 2026-06-05 fixes (dev report).
⚠️ SPEC UPDATE PENDING — see SPEC_ADDITIONS.md.

  #1 Forgot Password actually delivers a usable reset link.
     Spec §1: "Forgot Password (via secure email-bound OTP/Reset tokens)".
     When no SMTP transport is configured, the FE surfaces the reset link on-screen
     (fallback) so the flow is never a dead end; full request→reset→login cycle works.
  #2 OrgAdmin "Settings" page removed (was static, unwired, not in spec).
     Sidebar has no Settings entry; /admin/settings no longer renders the old page.
  #3 User can reach Organizations from the sidebar (was missing), and the
     join-org → browse-courses → request-enrollment flow is clearly guided (spec §4.2).

Real flows only — clicks + live data, NO hardcoded data. On failure a screenshot is
written to tests/_screens/ for verification.
"""

import os
import requests
import pytest
from playwright.sync_api import Page

from _helpers import (
    FE_BASE,
    API_BASE,
    register_user,
    ui_login,
    ui_login_orgadmin,
)

ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TIMEOUT = 12000  # ms

SCREENS = os.path.join(os.path.dirname(__file__), "..", "_screens")
os.makedirs(SCREENS, exist_ok=True)


def _shot(page: Page, name: str):
    try:
        page.screenshot(path=os.path.join(SCREENS, f"{name}.png"), full_page=True)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# #1 — Forgot Password on-screen reset-link fallback + full cycle
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestForgotPasswordDelivers:
    """Spec §1 — reset flow yields a usable link even without a mailbox (dev fallback)."""

    def test_reset_link_shown_onscreen_when_no_smtp(self, page: Page):
        """Submit a known email → an on-screen reset link box appears (SMTP not configured)."""
        creds = register_user("fp1")
        page.goto(f"{FE_BASE}/forgot-password")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='forgot-password-email']").fill(creds["email"])
        page.locator("[data-testid='forgot-password-submit']").click()
        try:
            page.locator("[data-testid='forgot-password-reset-link-box']").wait_for(
                state="visible", timeout=TIMEOUT
            )
            link = page.locator("[data-testid='forgot-password-reset-link']")
            assert link.count() > 0, "reset link element missing"
            href = link.first.get_attribute("href") or ""
            assert "/reset-password" in href and "token=" in href, f"bad reset link href: {href}"
        except Exception:
            _shot(page, "fp1_reset_link_box")
            raise

    def test_full_cycle_via_onscreen_link(self, page: Page):
        """Click the on-screen reset link → set a new password → log in with it."""
        creds = register_user("fp2")
        new_password = "Reborn_Pass_456!"
        page.goto(f"{FE_BASE}/forgot-password")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='forgot-password-email']").fill(creds["email"])
        page.locator("[data-testid='forgot-password-submit']").click()
        try:
            page.locator("[data-testid='forgot-password-reset-link']").wait_for(
                state="visible", timeout=TIMEOUT
            )
            page.locator("[data-testid='forgot-password-reset-link']").click()
            page.wait_for_url("**/reset-password**", timeout=TIMEOUT)
            page.locator("[data-testid='reset-password-new']").fill(new_password)
            page.locator("[data-testid='reset-password-confirm']").fill(new_password)
            page.locator("[data-testid='reset-password-submit']").click()
            page.locator("[data-testid='reset-password-success-msg']").wait_for(
                state="visible", timeout=TIMEOUT
            )
        except Exception:
            _shot(page, "fp2_full_cycle")
            raise

        # Log in with the new password
        ui_login(page, creds["username"], new_password)
        assert "/login" not in page.url, "login with new password failed"


# ─────────────────────────────────────────────────────────────────────────────
# #2 — OrgAdmin Settings page removed
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminSettingsRemoved:
    """Dev request — the unwired OrgAdmin Settings page is gone."""

    def test_sidebar_has_no_settings_link(self, page: Page):
        """After OrgAdmin login the sidebar exposes no /admin/settings entry."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        try:
            assert page.locator("a[href='/admin/settings']").count() == 0, (
                "Settings link still present in OrgAdmin sidebar"
            )
        except Exception:
            _shot(page, "settings_sidebar_present")
            raise

    def test_settings_route_does_not_render_old_page(self, page: Page):
        """Direct nav to /admin/settings must not render the old 'Learning Configuration' page."""
        ui_login_orgadmin(page, ORGADMIN1_USER, ORGADMIN1_PASS, org_id=ORG1_ID)
        page.goto(f"{FE_BASE}/admin/settings")
        page.wait_for_load_state("networkidle")
        try:
            assert page.get_by_text("Learning Configuration").count() == 0, (
                "Old settings page content still rendered at /admin/settings"
            )
            assert page.get_by_text("Notification Rules").count() == 0
        except Exception:
            _shot(page, "settings_route_renders_old")
            raise


# ─────────────────────────────────────────────────────────────────────────────
# #3 — User Organizations nav + join → browse-courses flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestUserOrganizationNav:
    """Spec §4.2 — user can reach Organizations and is guided to enroll via courses."""

    def test_sidebar_has_organizations_link(self, page: Page):
        """A logged-in user sees an Organizations entry in the sidebar."""
        creds = register_user("orgnav")
        ui_login(page, creds["username"], creds["password"])
        try:
            link = page.locator("a[href='/user/organizations']")
            link.first.wait_for(state="visible", timeout=TIMEOUT)
            assert link.count() > 0
        except Exception:
            _shot(page, "user_org_nav_missing")
            raise

    def test_navigate_to_organizations_loads_list_and_hint(self, page: Page):
        """Click Organizations → page loads with the flow hint and real org cards (seeded orgs)."""
        creds = register_user("orgnav2")
        ui_login(page, creds["username"], creds["password"])
        try:
            page.locator("a[href='/user/organizations']").first.click()
            page.wait_for_url("**/user/organizations", timeout=TIMEOUT)
            page.wait_for_load_state("networkidle")
            # Flow guidance clarifying join-org vs enroll-course
            page.locator("[data-testid='org-flow-hint']").wait_for(state="visible", timeout=TIMEOUT)
            page.locator("[data-testid='org-browse-courses-cta']").wait_for(state="visible", timeout=TIMEOUT)
            # Real data: seeded TestOrg1/TestOrg2 should produce cards
            page.locator("[data-testid='org-card']").first.wait_for(state="visible", timeout=TIMEOUT)
            assert page.locator("[data-testid='org-card-name']").count() > 0
        except Exception:
            _shot(page, "user_org_list_load")
            raise

    def test_user_can_join_org_and_see_browse_cta(self, page: Page):
        """A fresh user joins an org → card flips to Joined + a Browse courses CTA appears."""
        creds = register_user("orgjoin")
        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/organizations")
        page.wait_for_load_state("networkidle")
        try:
            join_btn = page.locator("[data-testid='org-join-btn']")
            join_btn.first.wait_for(state="visible", timeout=TIMEOUT)
            join_btn.first.click()
            # After joining, the joined badge + per-card browse CTA appear
            page.locator("[data-testid='org-joined-badge']").first.wait_for(
                state="visible", timeout=TIMEOUT
            )
            assert page.locator("[data-testid='org-card-browse-courses']").count() > 0
        except Exception:
            _shot(page, "user_org_join")
            raise

    def test_membership_persists_after_reload(self, page: Page):
        """Join persists: after reload the org still shows Joined (server-resolved membership)."""
        creds = register_user("orgpersist")
        # Join via API so the test is deterministic, then verify FE reflects it
        token = requests.post(
            f"{API_BASE}/api/auth/login",
            json={"username": creds["username"], "password": creds["password"]},
            timeout=10,
        ).json()["data"]["accessToken"]
        orgs = requests.get(
            f"{API_BASE}/api/organizations?pageIndex=0&pageSize=50",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        ).json()
        org_list = orgs.get("data") if isinstance(orgs.get("data"), list) else (orgs.get("data") or {}).get("data", [])
        assert org_list, "no seeded organizations to join"
        target = org_list[0]["id"]
        jr = requests.post(
            f"{API_BASE}/api/orgs/{target}/members/self",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert jr.status_code == 200, f"join failed: {jr.status_code} {jr.text}"

        ui_login(page, creds["username"], creds["password"])
        page.goto(f"{FE_BASE}/user/organizations")
        page.wait_for_load_state("networkidle")
        try:
            page.locator("[data-testid='org-joined-badge']").first.wait_for(
                state="visible", timeout=TIMEOUT
            )
        except Exception:
            _shot(page, "user_org_persist")
            raise

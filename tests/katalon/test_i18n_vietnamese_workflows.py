"""
Browser (Playwright) workflow tests for Vietnamese i18n (2026-06-09).

Verifies:
  #1 System UI text renders in Vietnamese WITH diacritics (dấu) when language = vi
     (e.g. "Khóa Học" not "Khoa Hoc"; "Hoạt động gần đây" not "Hoat dong gan day").
  #2 Switching language on the profile page actually re-renders the app (reload) so the
     new language takes effect everywhere — the i18n live-switch fix.

Real flows only — UI login + clicks, NO hardcoded data. Screenshot to tests/_screens/ on failure.
"""

import os
import pytest
from playwright.sync_api import Page, expect

from _helpers import FE_BASE, register_user, ui_login

SCREENS = os.path.join(os.path.dirname(__file__), "..", "_screens")
os.makedirs(SCREENS, exist_ok=True)


def _shot(page: Page, name: str):
    try:
        page.screenshot(path=os.path.join(SCREENS, f"{name}.png"), full_page=True)
    except Exception:
        pass


def _set_vi_via_localstorage(page: Page):
    page.evaluate("() => localStorage.setItem('language', 'vi')")


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestVietnameseDiacritics:

    def test_sidebar_and_dashboard_render_diacritics(self, page: Page):
        creds = register_user("vidia")
        ui_login(page, creds["username"], creds["password"])

        # Force Vietnamese and reload so every component re-reads getCurrentLanguage().
        _set_vi_via_localstorage(page)
        page.goto(f"{FE_BASE}/user/learning")
        page.wait_for_load_state("networkidle")

        try:
            body = page.locator("body").inner_text()
            # Proper diacritics must appear...
            assert "Khóa" in body or "Hoạt động" in body or "Lịch sử" in body, (
                "Expected Vietnamese WITH diacritics in the rendered page"
            )
            # ...and the broken non-diacritic forms must NOT.
            for bad in ["Hoat dong", "Khoa hoc", "Lich su", "Tai lieu", "Bo suu tap"]:
                assert bad not in body, f"Found non-diacritic Vietnamese '{bad}' in rendered page"
        except Exception:
            _shot(page, "i18n_diacritics_dashboard")
            raise


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestLanguageSwitchReRenders:

    def test_switching_to_vi_on_profile_applies_everywhere(self, page: Page):
        creds = register_user("vlangsw")
        ui_login(page, creds["username"], creds["password"])

        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")

        try:
            # Open the Language tab, then switch to Vietnamese via the real UI control.
            lang_tab = page.locator("[data-testid='profile-tab-language']")
            lang_tab.wait_for(state="visible", timeout=10000)
            lang_tab.click()
            vi_opt = page.locator("[data-testid='language-option-vi']")
            vi_opt.wait_for(state="visible", timeout=10000)
            vi_opt.click()

            # Success banner shows the Vietnamese confirmation, then the app reloads.
            expect(page.locator("[data-testid='language-success']")).to_be_visible(timeout=10000)

            # After the reload settles, the sidebar/nav is in Vietnamese with diacritics.
            page.wait_for_timeout(2000)  # allow the 700ms reload + boot
            page.wait_for_load_state("networkidle")
            assert page.evaluate("() => localStorage.getItem('language')") == "vi", (
                "Language preference should persist as 'vi' after switch"
            )
            body = page.locator("body").inner_text()
            assert "Khóa" in body or "Hồ Sơ" in body or "Cài Đặt" in body or "Ngôn Ngữ" in body, (
                "After switching to VI the chrome should render Vietnamese with diacritics"
            )
        except Exception:
            _shot(page, "i18n_language_switch")
            raise

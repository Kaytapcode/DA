"""
Browser E2E — Profile / Security / Language workflows (Spec 1).

End-to-end:
- Profile page shows the logged-in user's actual username + email
- Username edit via UI persists across reload
- Change password via UI succeeds AND new password works for fresh login
- Language preference click persists across logout/login
"""

import time
import requests
import pytest
from _helpers import (
    FE_BASE,
    API_BASE,
    login_fresh_user,
    ui_login,
    register_user,
    unique_suffix,
)


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestProfileDisplayWorkflow:
    """Spec 1 — Profile page shows the correct values for the logged-in user."""

    def test_profile_prefilled_with_current_user_data(self, page):
        creds = login_fresh_user(page, "profview")
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-username-input']").wait_for(state="visible", timeout=10000)

        assert page.locator("[data-testid='profile-username-input']").input_value() == creds["username"]
        assert page.locator("[data-testid='profile-email-input']").input_value() == creds["email"]


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestProfileEditWorkflow:
    """Spec 1 — User changes their username through the UI; reload preserves it."""

    def test_user_edits_username_through_ui_and_persists(self, page):
        creds = login_fresh_user(page, "profedit")
        new_username = f"renamed_{unique_suffix('u')}"

        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-username-input']").wait_for(state="visible", timeout=10000)
        page.locator("[data-testid='profile-username-input']").fill(new_username)
        page.locator("[data-testid='profile-save-btn']").click()

        page.locator("[data-testid='profile-success']").wait_for(state="visible", timeout=10000)

        # BE must reflect the new username on /api/auth/me
        login = requests.post(f"{API_BASE}/api/auth/login",
                              json={"username": new_username, "password": creds["password"]},
                              timeout=10)
        assert login.status_code == 200, (
            f"After UI rename, login with new username must work; got {login.status_code} {login.text}"
        )


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestChangePasswordWorkflow:
    """Spec 1 — Change password via UI; old credentials stop working, new ones work."""

    def test_user_changes_password_and_new_password_works(self, page):
        creds = login_fresh_user(page, "pwchange")
        new_password = "NewStrongPwd789!"

        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        # Switch to Security tab
        page.locator("[data-testid='profile-tab-security']").click()
        page.locator("[data-testid='change-password-current']").wait_for(state="visible", timeout=5000)

        page.locator("[data-testid='change-password-current']").fill(creds["password"])
        page.locator("[data-testid='change-password-new']").fill(new_password)
        page.locator("[data-testid='change-password-confirm']").fill(new_password)
        page.locator("[data-testid='change-password-submit']").click()

        page.locator("[data-testid='change-password-success']").wait_for(state="visible", timeout=10000)

        # Old password must NO LONGER work
        old = requests.post(f"{API_BASE}/api/auth/login",
                            json={"username": creds["username"], "password": creds["password"]},
                            timeout=10)
        assert old.status_code == 401, "Old password must be rejected after change"

        # New password must work
        new = requests.post(f"{API_BASE}/api/auth/login",
                            json={"username": creds["username"], "password": new_password},
                            timeout=10)
        assert new.status_code == 200, "New password must allow login"


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestLanguagePreferenceWorkflow:
    """Spec 1 — Picking a language persists on the user profile across sessions."""

    def test_language_choice_persists_across_login_sessions(self, page):
        creds = login_fresh_user(page, "i18nflow")

        # Set Japanese via UI
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-tab-language']").click()
        page.locator("[data-testid='language-option-ja']").wait_for(state="visible", timeout=5000)
        page.locator("[data-testid='language-option-ja']").click()
        page.locator("[data-testid='language-success']").wait_for(state="visible", timeout=10000)

        # Fresh session: log in via the API and check the persisted language
        # (The FE may cache the choice locally; the durable proof is on the BE.)
        login = requests.post(f"{API_BASE}/api/auth/login",
                              json={"username": creds["username"], "password": creds["password"]},
                              timeout=10).json()["data"]
        token = login["accessToken"]
        me = requests.get(f"{API_BASE}/api/auth/me",
                          headers={"Authorization": f"Bearer {token}"}, timeout=10).json()
        # GET /me wraps in ApiResponse envelope
        user = me.get("data") if isinstance(me, dict) and "data" in me else me
        assert user.get("language") == "ja", (
            f"Spec 1: language preference 'ja' must persist on user profile; got {user.get('language')}"
        )

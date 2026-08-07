"""
Spec 1 — i18n preference persistence (vi / ja / en).
Stores the user's selected language preference in their profile, persists across sessions.
"""

import pytest
from datetime import datetime


def _new_creds(prefix="i18n"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


def _set_language(client, language):
    """Helper — PATCH /api/auth/me/language."""
    return client.patch("/api/auth/me/language", json={"language": language})


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestI18nPreference:
    """Spec 1 — i18n preference (vi/ja/en) stored on user profile."""

    def test_new_user_has_default_language(self, api_client):
        """Spec 1 — A newly registered user has a default language (en) on their profile."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        me = api_client.get_me()
        assert me["status_code"] == 200
        # Must expose a language field; default is "en" until the user picks one
        assert "language" in me["data"], "GET /me must include a 'language' field"
        assert me["data"]["language"] in (None, "en"), "Default language should be 'en' (or null)"

    @pytest.mark.parametrize("language", ["vi", "ja", "en"])
    def test_user_can_set_supported_language(self, api_client, language):
        """Spec 1 — User can persist any of the 3 supported languages."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        resp = _set_language(api_client, language)
        assert resp.status_code == 200, f"PATCH /me/language failed: {resp.text}"

        me = api_client.get_me()
        assert me["data"]["language"] == language, \
            f"Language should be '{language}' after update, got {me['data'].get('language')}"

    @pytest.mark.parametrize("bad_lang", ["fr", "de", "zh", "", "english", "VI"])
    def test_unsupported_language_rejected(self, api_client, bad_lang):
        """Spec 1 — Only vi/ja/en are accepted; anything else returns 400."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        resp = _set_language(api_client, bad_lang)
        assert resp.status_code == 400, \
            f"Unsupported language '{bad_lang}' must be rejected with 400, got {resp.status_code}"

    def test_language_persists_across_login_sessions(self, api_client):
        """Spec 1 — Language preference applies on next login from any device."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])
        _set_language(api_client, "ja").raise_for_status() if hasattr(_set_language(api_client, "ja"), "raise_for_status") else None

        # Simulate a fresh session: clear tokens and log in again
        api_client.clear_auth()
        api_client.login_user(creds["username"], creds["password"])
        me = api_client.get_me()
        assert me["data"]["language"] == "ja", \
            "Language preference must persist across login sessions"

    def test_unauthenticated_cannot_change_language(self, api_client):
        """Spec 1 — Language endpoint requires authentication."""
        resp = api_client.patch("/api/auth/me/language", json={"language": "vi"})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"

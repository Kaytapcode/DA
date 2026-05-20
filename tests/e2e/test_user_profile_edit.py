"""
Spec 1 — Profile Management.
"Users can view and edit their profile information, including name, email, and other details."
"""

import pytest
from datetime import datetime


def _new_creds(prefix="profile"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestProfileEdit:
    """Spec 1 — Authenticated user edits their own profile via PATCH /api/auth/me."""

    def test_user_can_view_own_profile(self, api_client):
        """Spec 1 — GET /api/auth/me returns the current user's profile."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        me = api_client.get_me()
        assert me["status_code"] == 200
        assert me["data"]["username"] == creds["username"]
        assert me["data"]["email"] == creds["email"]

    def test_user_can_update_email(self, api_client):
        """Spec 1 — User can change their email via PATCH /me."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        new_email = f"updated_{int(datetime.now().timestamp() * 1000)}@example.com"
        resp = api_client.patch("/api/auth/me", json={"email": new_email})
        assert resp.status_code == 200, f"PATCH /me failed: {resp.text}"

        me = api_client.get_me()
        assert me["data"]["email"] == new_email, "Email must be updated"

    def test_user_can_update_username(self, api_client):
        """Spec 1 — User can change their username."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        new_username = f"renamed_{int(datetime.now().timestamp() * 1000)}"
        resp = api_client.patch("/api/auth/me", json={"username": new_username})
        assert resp.status_code == 200

        me = api_client.get_me()
        assert me["data"]["username"] == new_username

    def test_duplicate_email_rejected(self, api_client):
        """Spec 1 — Updating to an email already used by another account → 400."""
        # Create user A
        a = _new_creds("alpha")
        api_client.register_user(a["username"], a["password"], a["email"])

        # Create user B and try to set email = A's email
        b = _new_creds("beta")
        api_client.register_user(b["username"], b["password"], b["email"])
        api_client.login_user(b["username"], b["password"])

        resp = api_client.patch("/api/auth/me", json={"email": a["email"]})
        assert resp.status_code == 400, \
            f"Duplicate email must be rejected with 400, got {resp.status_code}"

    def test_duplicate_username_rejected(self, api_client):
        """Spec 1 — Updating to an existing username → 400."""
        a = _new_creds("ualpha")
        api_client.register_user(a["username"], a["password"], a["email"])

        b = _new_creds("ubeta")
        api_client.register_user(b["username"], b["password"], b["email"])
        api_client.login_user(b["username"], b["password"])

        resp = api_client.patch("/api/auth/me", json={"username": a["username"]})
        assert resp.status_code == 400

    def test_invalid_email_format_rejected(self, api_client):
        """Spec 1 — Invalid email format → 400."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        for bad in ["notanemail", "@no-local.com", "spaces in@example.com", ""]:
            resp = api_client.patch("/api/auth/me", json={"email": bad})
            assert resp.status_code == 400, \
                f"Bad email '{bad}' must be rejected, got {resp.status_code}"

    def test_unauthenticated_cannot_edit_profile(self, api_client):
        """Spec 1 — PATCH /me requires authentication."""
        resp = api_client.patch("/api/auth/me", json={"email": "x@example.com"})
        assert resp.status_code == 401

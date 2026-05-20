"""
Spec 1 — Change Password.
"Allows authenticated users to change their current password by providing the old password,
a new password, and a password confirmation."
"""

import pytest
from datetime import datetime


def _new_creds(prefix="chpw"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestChangePassword:
    """Spec 1 — Authenticated user changes their password via dedicated endpoint."""

    def test_user_can_change_password_with_correct_old_password(self, api_client):
        """Spec 1 — Correct current password + valid new password → 200."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        new_password = "NewStrongPwd456!"
        resp = api_client.post(
            "/api/auth/change-password",
            json={"currentPassword": creds["password"], "newPassword": new_password},
        )
        assert resp.status_code == 200, f"Change password failed: {resp.text}"

    def test_new_password_works_after_change(self, api_client):
        """Spec 1 — After change, user can log in with the new password."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        new_password = "FreshPwd789!"
        api_client.post(
            "/api/auth/change-password",
            json={"currentPassword": creds["password"], "newPassword": new_password},
        )

        # Logout, then log in with the NEW password
        api_client.clear_auth()
        result = api_client.login_user(creds["username"], new_password)
        assert result["status_code"] == 200, "New password must allow login after change"

    def test_old_password_rejected_after_change(self, api_client):
        """Spec 1 — After change, the old password no longer works."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        new_password = "AnotherPwd321!"
        api_client.post(
            "/api/auth/change-password",
            json={"currentPassword": creds["password"], "newPassword": new_password},
        )

        api_client.clear_auth()
        result = api_client.login_user(creds["username"], creds["password"])
        assert result["status_code"] == 401, "Old password must be rejected after change"

    def test_wrong_current_password_rejected(self, api_client):
        """Spec 1 — Wrong current password → 401, password not changed."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        resp = api_client.post(
            "/api/auth/change-password",
            json={"currentPassword": "TotallyWrong999!", "newPassword": "NewStrongPwd456!"},
        )
        assert resp.status_code == 401, f"Wrong current password must return 401, got {resp.status_code}"

        # Original password must still work
        api_client.clear_auth()
        result = api_client.login_user(creds["username"], creds["password"])
        assert result["status_code"] == 200, "Original password must still work after failed change"

    def test_weak_new_password_rejected(self, api_client):
        """Spec 1 — Weak new password (< 8 chars or missing complexity) → 400."""
        creds = _new_creds()
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])

        for weak in ["short", "alllowercase", "ALLUPPERCASE", "12345678", "NoSpecial1"]:
            resp = api_client.post(
                "/api/auth/change-password",
                json={"currentPassword": creds["password"], "newPassword": weak},
            )
            assert resp.status_code == 400, \
                f"Weak password '{weak}' must be rejected with 400, got {resp.status_code}"

    def test_unauthenticated_cannot_change_password(self, api_client):
        """Spec 1 — Endpoint requires authentication."""
        resp = api_client.post(
            "/api/auth/change-password",
            json={"currentPassword": "x", "newPassword": "NewStrongPwd456!"},
        )
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"

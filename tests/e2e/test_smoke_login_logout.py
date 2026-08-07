"""
E2E: Smoke test — User can register, log in, refresh, and log out.
Spec 1: Authentication & Authorization.
"""

import pytest
from datetime import datetime


def _new_creds(prefix="smoke"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_registers_successfully(api_client):
    """Spec 1 — Registration (Authentication). New user can register via API."""
    creds = _new_creds("register")
    result = api_client.register_user(creds["username"], creds["password"], creds["email"])
    assert result["status_code"] == 200, f"Registration failed: {result['data']}"
    assert result["data"].get("success") is True or "successful" in str(result["data"]).lower()


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_logs_in_after_register(api_client):
    """Spec 1 — Login (Authentication). Login returns access + refresh tokens."""
    creds = _new_creds("login")
    api_client.register_user(creds["username"], creds["password"], creds["email"])

    result = api_client.login_user(creds["username"], creds["password"])
    assert result["status_code"] == 200, f"Login failed: {result['data']}"

    data = result["data"]
    assert data.get("accessToken"), "Login response must include accessToken"
    assert data.get("refreshToken"), "Login response must include refreshToken"
    assert data.get("accessTokenExpiresInSeconds"), "Login response must include accessTokenExpiresInSeconds"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_can_login_with_email(api_client):
    """Spec 1 — Login accepts email as identifier (Username field may be username or email)."""
    creds = _new_creds("emaillogin")
    api_client.register_user(creds["username"], creds["password"], creds["email"])

    result = api_client.login_user(creds["email"], creds["password"])
    assert result["status_code"] == 200, f"Email login failed: {result['data']}"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_authenticated_user_can_access_me_endpoint(api_client):
    """Spec 1 — Profile Management. GET /api/auth/me returns the authenticated user."""
    creds = _new_creds("me")
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    api_client.login_user(creds["username"], creds["password"])

    result = api_client.get_me()
    assert result["status_code"] == 200, f"GET /me failed: {result['data']}"
    assert result["data"].get("username") == creds["username"]
    assert result["data"].get("email") == creds["email"]


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_unauthenticated_user_cannot_access_me(api_client):
    """Spec 1 — Authorization. GET /api/auth/me without token returns 401."""
    response = api_client.get("/api/auth/me")
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_refresh_token_returns_new_tokens(api_client):
    """Spec 1 — Refresh token flow. Refreshing rotates both access and refresh tokens."""
    creds = _new_creds("refresh")
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    login = api_client.login_user(creds["username"], creds["password"])
    old_refresh = login["data"]["refreshToken"]

    refresh_result = api_client.refresh_token(old_refresh)
    assert refresh_result["status_code"] == 200, f"Refresh failed: {refresh_result['data']}"

    new_refresh = refresh_result["data"].get("refreshToken")
    assert new_refresh, "Refresh response must include a new refreshToken"
    assert new_refresh != old_refresh, "Spec 1: refresh tokens must rotate (security invariant)"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_logout_revokes_refresh_token(api_client):
    """Spec 1 — Logout. After logout, the refresh token cannot be reused."""
    creds = _new_creds("logout")
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    login = api_client.login_user(creds["username"], creds["password"])
    refresh_token = login["data"]["refreshToken"]

    logout_result = api_client.logout_user(refresh_token)
    assert logout_result["status_code"] == 200, "Logout should be idempotent (200)"

    # Try to use the revoked refresh token — must fail
    bad_refresh = api_client.refresh_token(refresh_token)
    assert bad_refresh["status_code"] in (401, 400), \
        f"Revoked refresh token must not be accepted, got {bad_refresh['status_code']}"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_duplicate_username_rejected(api_client):
    """Spec 1 — Registration validation. Duplicate username returns 400."""
    creds = _new_creds("dup")
    api_client.register_user(creds["username"], creds["password"], creds["email"])

    # Second register with same username, different email
    second = api_client.register_user(creds["username"], creds["password"], f"alt_{creds['email']}")
    assert second["status_code"] == 400, f"Duplicate username must be rejected, got {second['status_code']}"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_wrong_password_rejected(api_client):
    """Spec 1 — Login validation. Wrong password returns 401."""
    creds = _new_creds("wrongpw")
    api_client.register_user(creds["username"], creds["password"], creds["email"])

    result = api_client.login_user(creds["username"], "WrongPassword999!")
    assert result["status_code"] == 401, f"Wrong password must return 401, got {result['status_code']}"

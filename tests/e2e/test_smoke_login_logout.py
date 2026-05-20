"""
E2E: Smoke test — User can log in and log out.
Spec 1: Authentication & Authorization — Login / Logout workflow.
"""

import pytest
from datetime import datetime


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_registers_and_logs_in(api_client):
    """
    User can register and log in via API.
    Spec 1 — Registration/Login (Authentication).
    """
    # Register
    email = f"smoke_test_{datetime.now().timestamp()}@example.com"
    password = "TestPassword123!"
    name = "Smoke Test User"

    register_result = api_client.register_user(email, password, name)
    assert register_result["status_code"] == 201, f"Registration failed: {register_result['data']}"

    # Log in
    login_result = api_client.login_user(email, password)
    assert login_result["status_code"] == 200, f"Login failed: {login_result['data']}"

    # Verify tokens are returned
    data = login_result["data"]
    assert data.get("token") or data.get("accessToken"), "No access token in response"
    assert data.get("refreshToken"), "No refresh token in response"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_logs_out(authenticated_client):
    """
    User can log out (clear session).
    Spec 1 — Logout.
    """
    # User is already authenticated via authenticated_client fixture
    # Log out
    authenticated_client.clear_auth()

    # Verify token is cleared
    assert authenticated_client.auth_token is None, "Auth token should be cleared"
    assert authenticated_client.session.headers.get("Authorization") is None, "Authorization header should be removed"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_can_access_profile_when_logged_in(authenticated_client):
    """
    Authenticated user can access their profile.
    Spec 1 — Profile Management.
    """
    # Call a protected endpoint (e.g. GET /api/auth/profile or /api/users/me)
    response = authenticated_client.get("/api/auth/profile")

    # Should return 200 for authenticated user
    assert response.status_code == 200, f"Profile access failed: {response.text}"

    # Verify response contains user data
    data = response.json()
    assert "email" in data or "id" in data, "Profile response missing user data"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_unauthenticated_user_cannot_access_protected_endpoint(api_client):
    """
    Unauthenticated user cannot access protected endpoints.
    Spec 1 — Authorization.
    """
    # Make request without auth token
    response = api_client.get("/api/auth/profile")

    # Should return 401 or 403
    assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

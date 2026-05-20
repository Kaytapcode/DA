"""
Auth helpers for registering and logging in test users with different roles.
Provides fixtures to get authenticated sessions for User, SysAdmin, OrgAdmin.
"""

import pytest
from datetime import datetime
from typing import Dict, Any
from .conftest import APIClient


def create_test_user(api_client: APIClient, role: str = "user") -> Dict[str, Any]:
    """
    Register a new test user via the API.
    Spec 1: registration accepts {Username, Password, Email}, defaults role to Student.
    SysAdmin/OrgAdmin must be promoted via /api/users PATCH (SysAdmin-only).
    """
    timestamp = str(int(datetime.now().timestamp() * 1000))
    username = f"test_{role}_{timestamp}"
    email = f"test_{role}_{timestamp}@example.com"
    password = "TestPassword123!"

    result = api_client.register_user(username, password, email)
    assert result["status_code"] == 200, f"Registration failed: {result['data']}"

    return {
        "username": username,
        "email": email,
        "password": password,
        "role": role,
    }


def login_test_user(api_client: APIClient, identifier: str, password: str) -> Dict[str, Any]:
    """Log in an existing user. identifier = username or email."""
    result = api_client.login_user(identifier, password)
    assert result["status_code"] == 200, f"Login failed: {result['data']}"

    return {
        "identifier": identifier,
        "tokens": {
            "access": result["data"].get("accessToken"),
            "refresh": result["data"].get("refreshToken"),
        },
        "status_code": result["status_code"]
    }


# ============================================================================
# PYTEST FIXTURES — role-based authenticated clients
# ============================================================================

@pytest.fixture
def user_session(api_client) -> Dict[str, Any]:
    """Create + log in a regular User. Returns the authenticated client + user info."""
    user = create_test_user(api_client, role="user")
    login_test_user(api_client, user["username"], user["password"])

    return {
        "client": api_client,
        "user": user,
        "username": user["username"],
        "email": user["email"],
        "password": user["password"],
    }


@pytest.fixture
def sysadmin_session(api_client) -> Dict[str, Any]:
    """
    Create a SysAdmin session.

    Note: SysAdmin users must be seeded in the test database beforehand or set via
    an internal admin endpoint. This fixture assumes a test SysAdmin already exists.
    If you need to create one dynamically, you must provide the internal API endpoint.

    For now, this fixture returns a placeholder. Update it when the SysAdmin
    creation endpoint is available.
    """
    # TODO: Implement SysAdmin creation when internal endpoint is ready
    # For testing, use a pre-seeded test sysadmin account
    email = "test_sysadmin@example.com"
    password = "TestPassword123!"

    login_result = login_test_user(api_client, email, password)

    return {
        "client": api_client,
        "email": email,
        "password": password,
        "is_sysadmin": True
    }


@pytest.fixture
def orgadmin_session(api_client) -> Dict[str, Any]:
    """
    Create an OrgAdmin session.
    NOTE: Promotion to OrgAdmin requires SysAdmin action (PATCH /api/users/{id}).
    This fixture creates a user + org, but OrgAdmin role assignment must happen
    once Wave 2 OrgAdmin endpoints are implemented.
    """
    user = create_test_user(api_client, role="orgadmin")
    login_test_user(api_client, user["username"], user["password"])

    org_name = f"TestOrg_{int(datetime.now().timestamp() * 1000)}"
    org_result = api_client.create_organization(org_name, "Test Organization for OrgAdmin")
    assert org_result["status_code"] in (200, 201), f"Org creation failed: {org_result['data']}"

    org = org_result["data"]

    return {
        "client": api_client,
        "user": user,
        "organization": org,
        "username": user["username"],
        "password": user["password"],
        "org_id": org.get("id")
    }

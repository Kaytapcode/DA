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

    Args:
        api_client: APIClient instance
        role: "user", "sysadmin", or "orgadmin" (affects login/setup)

    Returns:
        Dict with keys: email, password, name, id, role, tokens
    """
    email = f"test_{role}_{datetime.now().timestamp()}@example.com"
    password = "TestPassword123!"
    name = f"Test {role.capitalize()} User"

    result = api_client.register_user(email, password, name)
    assert result["status_code"] == 201, f"Registration failed: {result['data']}"

    user_id = result["data"].get("id")

    # For SysAdmin role, you would need to call an internal endpoint or seed the DB
    # For now, we register as a regular user and note that SysAdmin setup is manual
    # (the spec implies SysAdmin is set up by the system, not self-registered)

    return {
        "email": email,
        "password": password,
        "name": name,
        "id": user_id,
        "role": role,
        "tokens": result["data"].get("tokens", {})
    }


def login_test_user(api_client: APIClient, email: str, password: str) -> Dict[str, Any]:
    """
    Log in an existing user and return authenticated session.

    Args:
        api_client: APIClient instance (will be modified with auth token)
        email: User email
        password: User password

    Returns:
        Dict with keys: email, tokens (access + refresh), status_code
    """
    result = api_client.login_user(email, password)
    assert result["status_code"] == 200, f"Login failed: {result['data']}"

    return {
        "email": email,
        "tokens": {
            "access": result["data"].get("accessToken") or result["data"].get("token"),
            "refresh": result["data"].get("refreshToken")
        },
        "status_code": result["status_code"]
    }


# ============================================================================
# PYTEST FIXTURES — role-based authenticated clients
# ============================================================================

@pytest.fixture
def user_session(api_client) -> Dict[str, Any]:
    """
    Create a regular User session.
    Returns a fresh APIClient authenticated as a test User.
    """
    user = create_test_user(api_client, role="user")
    login_result = login_test_user(api_client, user["email"], user["password"])

    # api_client now has auth token set by login_test_user
    return {
        "client": api_client,
        "user": user,
        "email": user["email"],
        "password": user["password"]
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
    Create an OrgAdmin session (User added as admin to an Organization).

    Steps:
    1. Register a new User
    2. Create an Organization
    3. Assign the User as OrgAdmin to that Organization
    """
    # Register the user
    user = create_test_user(api_client, role="orgadmin")
    login_result = login_test_user(api_client, user["email"], user["password"])

    # Create an organization (as the newly logged-in user)
    org_name = f"TestOrg_{datetime.now().timestamp()}"
    org_result = api_client.create_organization(org_name, "Test Organization for OrgAdmin")
    assert org_result["status_code"] == 201, f"Org creation failed: {org_result['data']}"

    org = org_result["data"]

    return {
        "client": api_client,
        "user": user,
        "organization": org,
        "email": user["email"],
        "password": user["password"],
        "org_id": org.get("id")
    }

"""
Pytest configuration and fixtures for Tiny-LMS API testing
Provides reusable fixtures, API client, test data, and environment setup
"""

import os
import pytest
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import requests
from pathlib import Path


class APIClient:
    """Wrapper around requests library for Tiny-LMS API"""
    
    def __init__(self, base_url: str = "http://localhost:5000", timeout: int = 10):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.auth_token = None
        self.refresh_token = None
        
    def set_auth_token(self, token: str, refresh_token: str = None):
        """Set JWT token for authenticated requests"""
        self.auth_token = token
        if refresh_token:
            self.refresh_token = refresh_token
        self._update_headers()
    
    def clear_auth(self):
        """Clear authentication tokens"""
        self.auth_token = None
        self.refresh_token = None
        self._update_headers()
    
    def _update_headers(self):
        """Update session headers with current auth token"""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        self.session.headers.update(headers)
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request and return response"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=self.timeout, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Request failed: {e}")
    
    # HTTP Methods
    def get(self, endpoint: str, **kwargs) -> requests.Response:
        return self._make_request("GET", endpoint, **kwargs)
    
    def post(self, endpoint: str, **kwargs) -> requests.Response:
        return self._make_request("POST", endpoint, **kwargs)
    
    def put(self, endpoint: str, **kwargs) -> requests.Response:
        return self._make_request("PUT", endpoint, **kwargs)
    
    def patch(self, endpoint: str, **kwargs) -> requests.Response:
        return self._make_request("PATCH", endpoint, **kwargs)
    
    def delete(self, endpoint: str, **kwargs) -> requests.Response:
        return self._make_request("DELETE", endpoint, **kwargs)
    
    # Convenience methods for common operations
    def register_user(self, username: str, password: str, email: str) -> Dict[str, Any]:
        """
        Register a new user.
        Spec 1: POST /api/auth/register accepts {Username, Password, Email}, returns 200 on success (no tokens).
        """
        response = self.post(
            "/api/auth/register",
            json={"username": username, "password": password, "email": email}
        )
        return {"response": response, "status_code": response.status_code, "data": response.json() if response.text else {}}

    def login_user(self, identifier: str, password: str) -> Dict[str, Any]:
        """
        Login user and store tokens.
        Spec 1: POST /api/auth/login accepts {Username, Password} where Username may be either username or email.
        Returns LoginResponseDto with AccessToken, RefreshToken, AccessTokenExpiresInSeconds, RefreshTokenExpiresAt, User, OrgId.
        """
        response = self.post(
            "/api/auth/login",
            json={"username": identifier, "password": password}
        )
        data = response.json() if response.text else {}
        if response.status_code == 200:
            self.set_auth_token(data.get("accessToken"), data.get("refreshToken"))
        return {"response": response, "status_code": response.status_code, "data": data}

    def refresh_token(self, refresh_token: str = None) -> Dict[str, Any]:
        """Refresh access token. Spec 1: POST /api/auth/refresh rotates refresh tokens."""
        rt = refresh_token or self.refresh_token
        response = self.post("/api/auth/refresh", json={"refreshToken": rt})
        data = response.json() if response.text else {}
        if response.status_code == 200:
            self.set_auth_token(data.get("accessToken"), data.get("refreshToken"))
        return {"response": response, "status_code": response.status_code, "data": data}

    def logout_user(self, refresh_token: str = None) -> Dict[str, Any]:
        """Logout (revoke refresh token). Spec 1: POST /api/auth/logout is idempotent."""
        rt = refresh_token or self.refresh_token
        response = self.post("/api/auth/logout", json={"refreshToken": rt}) if rt else None
        self.clear_auth()
        if response is None:
            return {"response": None, "status_code": 200, "data": {}}
        return {"response": response, "status_code": response.status_code, "data": response.json() if response.text else {}}

    def get_me(self) -> Dict[str, Any]:
        """
        Get current user profile. Spec 1: GET /api/auth/me requires JWT.
        BE wraps the response as ApiResponse<UserInfoDto> { success, data, message };
        unwrap so callers see the UserInfoDto directly.
        """
        response = self.get("/api/auth/me")
        raw = response.json() if response.text else {}
        # Unwrap ApiResponse envelope when present
        if isinstance(raw, dict) and "data" in raw and isinstance(raw.get("data"), dict):
            payload = raw["data"]
        else:
            payload = raw
        return {"response": response, "status_code": response.status_code, "data": payload}
    
    def logout(self):
        """Logout user"""
        self.clear_auth()
    
    def create_organization(self, name: str, description: str = "", logo_url: str = "") -> Dict[str, Any]:
        """Create a new organization"""
        response = self.post(
            "/api/organizations",
            json={"name": name, "description": description, "logo": logo_url}
        )
        return {"response": response, "status_code": response.status_code, "data": response.json() if response.text else {}}
    
    def get_organization(self, org_id: int) -> Dict[str, Any]:
        """Get organization details"""
        response = self.get(f"/api/organizations/{org_id}")
        return {"response": response, "status_code": response.status_code, "data": response.json() if response.text else {}}
    
    def create_course(self, org_id: int, name: str, description: str = "", icon: str = "") -> Dict[str, Any]:
        """Create a new course"""
        response = self.post(
            f"/api/organizations/{org_id}/courses",
            json={"name": name, "description": description, "icon": icon}
        )
        return {"response": response, "status_code": response.status_code, "data": response.json() if response.text else {}}
    
    def get_course(self, course_id: int) -> Dict[str, Any]:
        """Get course details"""
        response = self.get(f"/api/courses/{course_id}")
        return {"response": response, "status_code": response.status_code, "data": response.json() if response.text else {}}


# ============================================================================
# PYTEST FIXTURES
# ============================================================================

@pytest.fixture(scope="session")
def api_base_url():
    """Get API base URL from environment or use default"""
    return os.getenv("API_BASE_URL", "http://localhost:5000")


@pytest.fixture(scope="session")
def api_client_factory(api_base_url):
    """Factory fixture to create API clients"""
    def _create_client():
        return APIClient(base_url=api_base_url)
    return _create_client


@pytest.fixture
def api_client(api_client_factory):
    """Fresh API client for each test"""
    client = api_client_factory()
    yield client
    # Cleanup: logout
    client.logout()


@pytest.fixture
def authenticated_client(api_client, test_user):
    """API client with authenticated user. Logs in using username (BE accepts username or email)."""
    result = api_client.login_user(test_user["username"], test_user["password"])
    assert result["status_code"] == 200, f"Login failed: {result['data']}"
    yield api_client
    api_client.logout()


@pytest.fixture
def test_user(api_client):
    """Create a test user. Spec 1: registration returns 200 (not 201)."""
    timestamp = str(int(datetime.now().timestamp() * 1000))
    username = f"testuser_{timestamp}"
    email = f"test_{timestamp}@example.com"
    password = "TestPassword123!"

    result = api_client.register_user(username, password, email)
    assert result["status_code"] == 200, f"Registration failed: {result['data']}"

    return {"username": username, "email": email, "password": password, "id": result["data"].get("id")}


@pytest.fixture
def test_organization(authenticated_client):
    """Create a test organization"""
    org_name = f"TestOrg_{datetime.now().timestamp()}"
    result = authenticated_client.create_organization(org_name, "Test Organization")
    assert result["status_code"] == 201, f"Org creation failed: {result['data']}"
    return result["data"]


@pytest.fixture
def test_course(authenticated_client, test_organization):
    """Create a test course"""
    course_name = f"TestCourse_{datetime.now().timestamp()}"
    result = authenticated_client.create_course(
        test_organization["id"],
        course_name,
        "Test Course Description"
    )
    assert result["status_code"] == 201, f"Course creation failed: {result['data']}"
    return result["data"]


# ============================================================================
# PYTEST HOOKS & CONFIGURATION
# ============================================================================

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line("markers", "api: mark test as API test")
    config.addinivalue_line("markers", "slow: mark test as slow")
    config.addinivalue_line("markers", "auth: mark test as authentication test")
    config.addinivalue_line("markers", "security: mark test as security test")


@pytest.fixture(autouse=True)
def reset_session(api_client):
    """Reset client session before each test"""
    api_client.logout()
    yield

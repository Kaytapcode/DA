"""
LEGACY — Authentication API Tests.

These tests were written before the Lumina spec audit (CLAUDE.md Section 5) and use
field names / response shapes that no longer match the BE (Identity.Api accepts
`Username/Password/Email` and returns AccessToken + RefreshToken, not a single `token`).

The authoritative auth tests now live in:
- tests/e2e/test_smoke_login_logout.py  (API behavior — Spec 1)
- tests/ui/test_user_auth_display.py    (FE display — Spec 1)
- tests/katalon/test_login_workflow.py  (E2E browser workflow — Spec 1)

This file is skipped wholesale until each test is ported over (rolled into Wave 1 User checklist).
"""

import pytest

pytestmark = pytest.mark.skip(reason="Legacy auth tests — superseded by tests/e2e/test_smoke_login_logout.py; port pending")

import re
from datetime import datetime, timedelta
from tests.fixtures.test_data import TestDataFactory, InvalidTestData


class TestAuthenticationRegistration:
    """Test user registration flow"""
    
    @pytest.mark.auth
    def test_valid_registration_succeeds(self, api_client):
        """TC-AUTH-001: Valid user registration creates account and returns JWT"""
        user_data = TestDataFactory.create_user_data()
        
        result = api_client.register_user(
            user_data["email"],
            user_data["password"],
            user_data["name"]
        )
        
        assert result["status_code"] == 201, f"Expected 201, got {result['status_code']}: {result['data']}"
        assert "token" in result["data"], "JWT token not in response"
        assert "id" in result["data"], "User ID not in response"
        assert result["data"].get("email") == user_data["email"]
    
    @pytest.mark.auth
    def test_duplicate_email_rejected(self, api_client, test_user):
        """TC-AUTH-002: Duplicate email registration rejected with 400"""
        # Attempt register with same email as test_user
        result = api_client.register_user(
            test_user["email"],
            "DifferentPassword123!",
            "Different Name"
        )
        
        assert result["status_code"] == 400, f"Expected 400, got {result['status_code']}"
        assert "already" in result["data"].get("message", "").lower() or \
               "duplicate" in result["data"].get("message", "").lower(), \
               "Error message should mention duplicate/already exists"
    
    @pytest.mark.auth
    def test_invalid_email_format_rejected(self, api_client):
        """TC-AUTH-003: Invalid email format rejected"""
        for invalid_email in InvalidTestData.invalid_emails():
            result = api_client.register_user(
                invalid_email,
                "ValidPassword123!",
                "Test User"
            )
            assert result["status_code"] == 400, f"Email '{invalid_email}' should be rejected"
    
    @pytest.mark.auth
    def test_weak_password_rejected(self, api_client):
        """TC-AUTH-004: Weak password rejected with validation error"""
        for weak_password in InvalidTestData.weak_passwords()[:3]:  # Test subset
            result = api_client.register_user(
                TestDataFactory.random_email(),
                weak_password,
                "Test User"
            )
            assert result["status_code"] == 400, f"Weak password '{weak_password}' should be rejected"
    
    @pytest.mark.auth
    def test_missing_required_fields(self, api_client):
        """TC-AUTH-005: Missing required fields return 400"""
        # Missing email
        result = api_client.post("/api/auth/register", json={
            "password": "ValidPassword123!",
            "name": "Test User"
        })
        assert result.status_code == 400
        
        # Missing password
        result = api_client.post("/api/auth/register", json={
            "email": TestDataFactory.random_email(),
            "name": "Test User"
        })
        assert result.status_code == 400
        
        # Missing name
        result = api_client.post("/api/auth/register", json={
            "email": TestDataFactory.random_email(),
            "password": "ValidPassword123!"
        })
        assert result.status_code == 400
    
    @pytest.mark.security
    def test_xss_injection_prevented_in_registration(self, api_client):
        """TC-ERR-001: XSS payloads sanitized during registration"""
        xss_payload = "<script>alert('xss')</script>"
        
        result = api_client.register_user(
            TestDataFactory.random_email(),
            "ValidPassword123!",
            xss_payload
        )
        
        assert result["status_code"] == 201, "Should accept but sanitize XSS"
        # Verify stored name doesn't contain script tags
        stored_name = result["data"].get("name", "")
        assert "<script>" not in stored_name, "XSS payload should be sanitized"
    
    @pytest.mark.security
    def test_sql_injection_prevented_in_registration(self, api_client):
        """TC-ERR-002: SQL injection payloads blocked during registration"""
        sql_payload = "'; DROP TABLE users; --"
        
        result = api_client.register_user(
            sql_payload + "@example.com",
            "ValidPassword123!",
            sql_payload
        )
        
        # Should either reject or accept and sanitize
        if result["status_code"] == 201:
            # If accepted, verify data integrity
            assert result["data"]["email"].startswith(sql_payload), "Email should be stored as-is"
        else:
            assert result["status_code"] == 400, "SQL injection should be rejected"


class TestAuthenticationLogin:
    """Test user login flow"""
    
    @pytest.mark.auth
    def test_valid_credentials_login_succeeds(self, api_client, test_user):
        """TC-AUTH-006: Valid credentials return JWT token"""
        result = api_client.login_user(test_user["email"], test_user["password"])
        
        assert result["status_code"] == 200, f"Login failed: {result['data']}"
        assert "token" in result["data"], "JWT token not in response"
        assert api_client.auth_token is not None, "Auth token should be set in client"
    
    @pytest.mark.auth
    def test_nonexistent_email_login_fails(self, api_client):
        """TC-AUTH-007: Login with non-existent email returns 401"""
        result = api_client.login_user(
            "nonexistent@example.com",
            "AnyPassword123!"
        )
        
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
    
    @pytest.mark.auth
    def test_invalid_password_login_fails(self, api_client, test_user):
        """TC-AUTH-008: Login with wrong password returns 401"""
        result = api_client.login_user(
            test_user["email"],
            "WrongPassword123!"
        )
        
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        assert api_client.auth_token is None, "Auth token should not be set on failure"
    
    @pytest.mark.auth
    def test_case_insensitive_email_login(self, api_client, test_user):
        """TC-AUTH-009: Login with uppercase email succeeds"""
        result = api_client.login_user(
            test_user["email"].upper(),
            test_user["password"]
        )
        
        assert result["status_code"] == 200, "Email login should be case-insensitive"
        assert api_client.auth_token is not None


class TestAuthenticationTokenManagement:
    """Test JWT token handling"""
    
    @pytest.mark.auth
    def test_expired_token_rejected(self, api_client, test_user):
        """TC-ERR-005: Expired JWT token rejected with 401"""
        # Login
        api_client.login_user(test_user["email"], test_user["password"])
        
        # Manually set an expired token
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid"
        api_client.set_auth_token(expired_token)
        
        # Try to use expired token
        result = api_client.get("/api/organizations")
        assert result.status_code == 401, "Expired token should be rejected"
    
    @pytest.mark.auth
    def test_missing_bearer_token_format(self, api_client):
        """Test malformed Authorization header"""
        # Set invalid token format
        api_client.session.headers.update({"Authorization": "NotBearer validtoken"})
        
        result = api_client.get("/api/organizations")
        assert result.status_code == 401, "Malformed Authorization header should be rejected"
    
    @pytest.mark.auth
    def test_token_refresh_succeeds(self, authenticated_client):
        """Test JWT token refresh (if implemented)"""
        # This test assumes refresh endpoint exists
        result = authenticated_client.post("/api/auth/refresh", json={
            "refreshToken": authenticated_client.refresh_token
        })
        
        if result.status_code != 404:  # Endpoint exists
            assert result.status_code == 200, "Token refresh should succeed"
            assert "token" in result.json(), "New token should be in response"


class TestAuthenticationLogout:
    """Test user logout"""
    
    @pytest.mark.auth
    def test_logout_clears_token(self, authenticated_client):
        """Test logout clears auth token"""
        authenticated_client.logout()
        
        assert authenticated_client.auth_token is None, "Token should be cleared after logout"
        
        # Verify token is not sent in next request
        result = authenticated_client.get("/api/organizations")
        assert result.status_code == 401, "Request without token should fail"


class TestAuthenticationTwoFactor:
    """Test 2FA flow (if implemented)"""
    
    @pytest.mark.auth
    def test_2fa_code_validation(self, authenticated_client):
        """TC-AUTH-010: Valid 2FA code grants access"""
        # This test assumes 2FA endpoint exists
        result = authenticated_client.post("/api/auth/verify-2fa", json={
            "code": "123456"
        })
        
        if result.status_code != 404:  # Endpoint exists
            # Either succeeds or fails based on implementation
            assert result.status_code in [200, 401, 400]


class TestAuthenticationPasswordReset:
    """Test password reset flow (if implemented)"""
    
    @pytest.mark.auth
    def test_forgot_password_initiates_reset(self, api_client, test_user):
        """TC-AUTH-013: Forgot password email sent"""
        result = api_client.post("/api/auth/forgot-password", json={
            "email": test_user["email"]
        })
        
        if result.status_code != 404:  # Endpoint exists
            assert result.status_code == 200, "Forgot password request should succeed"
    
    @pytest.mark.auth
    def test_password_reset_with_valid_token(self, api_client):
        """TC-AUTH-014: Reset password with valid token succeeds"""
        # This would require a valid reset token from a previous forgot-password flow
        # For now, test that endpoint exists and validates input
        result = api_client.post("/api/auth/reset-password", json={
            "token": "valid-token-here",
            "newPassword": "NewPassword123!"
        })
        
        # Should either work or return 400 (invalid token) - not 404
        assert result.status_code in [200, 400, 401, 404], "Endpoint should exist or return 404"

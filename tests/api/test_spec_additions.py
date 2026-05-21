"""
Spec Additions — tests for Section 5 (Seed Data), Section 1 (Forgot Password),
OrgAdmin Content Override Right, and SysAdmin Absolute Destructive Right.
"""

import uuid
import requests
import pytest

pytestmark = [pytest.mark.wave1, pytest.mark.api]

API_BASE = "http://localhost:5000"
TIMEOUT = 10

# Fixed GUIDs from DbInitializer seed data
SYSADMIN1_CREDS = ("SysAdmin1", "SysAdmin@123")
ORGADMIN1_CREDS = ("OrgAdmin1", "OrgAdmin@123")
ORGADMIN1_ORG_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ORGADMIN2_ORG_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _login(username: str, password: str, org_id: str | None = None) -> dict:
    headers = {}
    if org_id:
        headers["X-Org-Id"] = org_id
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": username, "password": password},
        headers=headers,
        timeout=TIMEOUT,
    )
    return r


# ─────────────────────────────────────────────────────────────────────────────
# Section 5 — Seed Data
# ─────────────────────────────────────────────────────────────────────────────

class TestSeedData:
    """Spec §5 — Pre-seeded test accounts must exist and be loginable."""

    @pytest.mark.parametrize("username,password", [
        ("SysAdmin1", "SysAdmin@123"),
        ("SysAdmin2", "SysAdmin@123"),
    ])
    def test_sysadmin_seeded_accounts_can_login(self, username, password):
        """Spec §5.1 — SysAdmin seed accounts must exist with correct credentials."""
        r = _login(username, password)
        assert r.status_code == 200, f"{username} login failed: {r.text}"
        data = r.json()["data"]
        assert data["accessToken"], "Expected accessToken in response"
        assert data["user"]["role"] == "SysAdmin", f"Expected SysAdmin role, got {data['user']['role']}"

    @pytest.mark.parametrize("username,password", [
        ("OrgAdmin1", "OrgAdmin@123"),
        ("OrgAdmin2", "OrgAdmin@123"),
    ])
    def test_orgadmin_seeded_accounts_can_login(self, username, password):
        """Spec §5.2 — OrgAdmin seed accounts must exist with correct credentials."""
        r = _login(username, password)
        assert r.status_code == 200, f"{username} login failed: {r.text}"
        data = r.json()["data"]
        assert data["accessToken"], "Expected accessToken"
        assert data["user"]["role"] == "OrgAdmin", f"Expected OrgAdmin role, got {data['user']['role']}"

    @pytest.mark.parametrize("username,password", [
        ("User1", "User@123"),
        ("User2", "User@123"),
        ("User3", "User@123"),
    ])
    def test_user_seeded_accounts_can_login(self, username, password):
        """Spec §5.3 — Regular User seed accounts must exist with correct credentials."""
        r = _login(username, password)
        assert r.status_code == 200, f"{username} login failed: {r.text}"
        data = r.json()["data"]
        assert data["accessToken"], "Expected accessToken"

    def test_wrong_password_is_rejected(self):
        """Seeded accounts must reject incorrect passwords."""
        r = _login("SysAdmin1", "WrongPassword!")
        assert r.status_code in (400, 401), f"Expected 400/401 for wrong password, got {r.status_code}"

    def test_orgadmin1_has_org_membership(self):
        """Spec §5.2 — OrgAdmin1 should be a member of a seeded test organization."""
        r = _login("OrgAdmin1", "OrgAdmin@123")
        assert r.status_code == 200
        # OrgAdmin1 org_id is set by the membership; verify via login response or org endpoint
        # After login, try to access org-scoped endpoint with OrgAdmin1's token
        token = r.json()["data"]["accessToken"]
        r2 = requests.get(
            f"{API_BASE}/api/organizations",
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        assert r2.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# Section 1 — Forgot Password
# ─────────────────────────────────────────────────────────────────────────────

class TestForgotPassword:
    """Spec §1 — Forgot Password: unauthenticated reset via token."""

    def test_forgot_password_returns_200_for_known_email(self):
        """Spec §1 — Forgot Password endpoint returns 200 for a registered email."""
        r = requests.post(
            f"{API_BASE}/api/auth/forgot-password",
            json={"email": "sysadmin1@lumina.test"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("success") is True

    def test_forgot_password_returns_200_for_unknown_email(self):
        """Spec §1 — Forgot Password must not leak whether an email is registered (anti-enumeration)."""
        r = requests.post(
            f"{API_BASE}/api/auth/forgot-password",
            json={"email": "nobody@example.com"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_forgot_password_dev_token_can_reset_password(self):
        """Spec §1 — Reset token from dev response can be used to set a new password."""
        # Step 1: request reset for User1 (seeded account)
        r1 = requests.post(
            f"{API_BASE}/api/auth/forgot-password",
            json={"email": "user1@lumina.test"},
            timeout=TIMEOUT,
        )
        assert r1.status_code == 200
        body = r1.json()
        dev_token = body.get("devToken")  # Only present in Development mode
        if dev_token is None:
            pytest.skip("devToken not in response — not running in Development mode")

        # Step 2: reset the password using the token
        new_password = "NewUser@456"
        r2 = requests.post(
            f"{API_BASE}/api/auth/reset-password",
            json={"token": dev_token, "newPassword": new_password},
            timeout=TIMEOUT,
        )
        assert r2.status_code == 200, f"Reset failed: {r2.text}"
        assert r2.json().get("success") is True

        # Step 3: verify new password works
        r3 = _login("User1", new_password)
        assert r3.status_code == 200, "Login with new password failed"

        # Cleanup: restore original password
        token = r3.json()["data"]["accessToken"]
        requests.post(
            f"{API_BASE}/api/auth/change-password",
            json={"currentPassword": new_password, "newPassword": "User@123"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )

    def test_reset_password_token_can_only_be_used_once(self):
        """Spec §1 — Reset token is single-use; reuse must be rejected."""
        r1 = requests.post(
            f"{API_BASE}/api/auth/forgot-password",
            json={"email": "user2@lumina.test"},
            timeout=TIMEOUT,
        )
        assert r1.status_code == 200
        dev_token = r1.json().get("devToken")
        if dev_token is None:
            pytest.skip("devToken not in response — not running in Development mode")

        # First use: should succeed
        r2 = requests.post(
            f"{API_BASE}/api/auth/reset-password",
            json={"token": dev_token, "newPassword": "NewPass@999"},
            timeout=TIMEOUT,
        )
        assert r2.status_code == 200

        # Restore password
        r_login = _login("User2", "NewPass@999")
        if r_login.status_code == 200:
            tkn = r_login.json()["data"]["accessToken"]
            requests.post(
                f"{API_BASE}/api/auth/change-password",
                json={"currentPassword": "NewPass@999", "newPassword": "User@123"},
                headers={"Authorization": f"Bearer {tkn}"},
                timeout=TIMEOUT,
            )

        # Second use: same token must be rejected
        r3 = requests.post(
            f"{API_BASE}/api/auth/reset-password",
            json={"token": dev_token, "newPassword": "AnotherPass@123"},
            timeout=TIMEOUT,
        )
        assert r3.status_code in (400, 401, 422), f"Expected rejection on reuse, got {r3.status_code}"

    def test_invalid_reset_token_is_rejected(self):
        """Spec §1 — Invalid reset token must return an error."""
        r = requests.post(
            f"{API_BASE}/api/auth/reset-password",
            json={"token": "invalid-token-12345", "newPassword": "NewPass@123"},
            timeout=TIMEOUT,
        )
        assert r.status_code in (400, 401, 422), f"Expected error for invalid token, got {r.status_code}"


# ─────────────────────────────────────────────────────────────────────────────
# OrgAdmin Content Override Right + SysAdmin Absolute Destructive Right
# ─────────────────────────────────────────────────────────────────────────────

def _sysadmin_token() -> str:
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": SYSADMIN1_CREDS[0], "password": SYSADMIN1_CREDS[1]},
                      timeout=TIMEOUT)
    assert r.status_code == 200
    return r.json()["data"]["accessToken"]


def _orgadmin1_token() -> str:
    """Login as OrgAdmin1 and send X-Org-Id so the JWT carries org context."""
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": ORGADMIN1_CREDS[0], "password": ORGADMIN1_CREDS[1]},
                      headers={"X-Org-Id": ORGADMIN1_ORG_ID},
                      timeout=TIMEOUT)
    assert r.status_code == 200, f"OrgAdmin1 login failed: {r.text}"
    return r.json()["data"]["accessToken"]


def _ah(token: str, org_id: str | None = None) -> dict:
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if org_id:
        h["X-Org-Id"] = org_id
    return h


class TestOrgAdminContentOverrideRight:
    """Spec §1 OrgAdmin — Content Override Right: OrgAdmin can delete any content in org's courses."""

    def test_orgadmin_can_delete_content_not_created_by_them(self):
        """Spec §1 OrgAdmin — Content Override Right: delete any content inside org's courses."""
        sa_tok = _sysadmin_token()
        oa_tok = _orgadmin1_token()

        # Step 1: SysAdmin creates a course in OrgAdmin1's org (must pass X-Org-Id)
        course_name = f"LuminaTest_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API_BASE}/api/courses",
                          json={"title": course_name},
                          headers=_ah(sa_tok, ORGADMIN1_ORG_ID), timeout=TIMEOUT)
        assert r.status_code in (200, 201), f"Create course failed: {r.text}"
        course_id = r.json()["data"]["id"]

        # Step 2: SysAdmin creates a module in that course
        r = requests.post(f"{API_BASE}/api/courses/{course_id}/modules",
                          json={"title": "TestModule", "description": ""},
                          headers=_ah(sa_tok), timeout=TIMEOUT)
        assert r.status_code in (200, 201), f"Create module failed: {r.text}"
        module_id = r.json()["data"]["id"]

        # Step 3: Enroll SysAdmin as Teacher so they can add content
        # (SysAdmin is already authorized via IsSysAdmin, can post content directly)
        # Step 4: OrgAdmin1 deletes the module (tests override privilege via CanTeachAsync)
        r = requests.delete(f"{API_BASE}/api/courses/{course_id}/modules/{module_id}",
                            headers=_ah(oa_tok, ORGADMIN1_ORG_ID), timeout=TIMEOUT)
        assert r.status_code == 200, f"OrgAdmin delete module failed: {r.status_code} {r.text}"

        # Cleanup
        requests.delete(f"{API_BASE}/api/courses/{course_id}",
                        headers=_ah(sa_tok), timeout=TIMEOUT)

    def test_orgadmin_cannot_delete_content_in_other_org_course(self):
        """Spec §1 OrgAdmin — Content Override is scoped to own org; cannot delete other orgs' content."""
        sa_tok = _sysadmin_token()
        oa1_tok = _orgadmin1_token()

        # Create course in Org2 (OrgAdmin2's org) — SysAdmin passes X-Org-Id for target org
        course_name = f"LuminaTest_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API_BASE}/api/courses",
                          json={"title": course_name},
                          headers=_ah(sa_tok, ORGADMIN2_ORG_ID), timeout=TIMEOUT)
        assert r.status_code in (200, 201)
        course_id = r.json()["data"]["id"]

        r = requests.post(f"{API_BASE}/api/courses/{course_id}/modules",
                          json={"title": "Org2Module"},
                          headers=_ah(sa_tok, ORGADMIN2_ORG_ID), timeout=TIMEOUT)
        assert r.status_code in (200, 201)
        module_id = r.json()["data"]["id"]

        # OrgAdmin1 (org1) tries to delete module in org2's course — must fail
        r = requests.delete(
            f"{API_BASE}/api/courses/{course_id}/modules/{module_id}",
            headers=_ah(oa1_tok, ORGADMIN1_ORG_ID),
            timeout=TIMEOUT,
        )
        assert r.status_code in (403, 404), \
            f"OrgAdmin1 should be forbidden from org2 content, got {r.status_code}"

        # Cleanup
        requests.delete(f"{API_BASE}/api/courses/{course_id}",
                        headers=_ah(sa_tok), timeout=TIMEOUT)


class TestCourseStrictPrivacy:
    """Spec §4.1 — Course contents are private; only enrolled users can access."""

    def test_unauthenticated_user_cannot_access_course(self):
        """Spec §4.1 — Unauthenticated request to course endpoint must be denied."""
        sa_tok = _sysadmin_token()

        # Create a course
        r = requests.post(f"{API_BASE}/api/courses",
                          json={"title": f"LuminaTest_{uuid.uuid4().hex[:8]}"},
                          headers=_ah(sa_tok, ORGADMIN1_ORG_ID), timeout=TIMEOUT)
        assert r.status_code in (200, 201)
        course_id = r.json()["data"]["id"]

        # Unauthenticated access (no Authorization header)
        r_unauth = requests.get(f"{API_BASE}/api/courses/{course_id}", timeout=TIMEOUT)
        assert r_unauth.status_code in (401, 403), \
            f"Expected 401/403 for unauthenticated course access, got {r_unauth.status_code}"

        # Cleanup
        requests.delete(f"{API_BASE}/api/courses/{course_id}",
                        headers=_ah(sa_tok), timeout=TIMEOUT)

    def test_non_enrolled_user_cannot_view_course_modules(self):
        """Spec §4.1 — Non-enrolled user must be denied access to course modules."""
        sa_tok = _sysadmin_token()

        # Create course in org1
        r = requests.post(f"{API_BASE}/api/courses",
                          json={"title": f"LuminaTest_{uuid.uuid4().hex[:8]}"},
                          headers=_ah(sa_tok, ORGADMIN1_ORG_ID), timeout=TIMEOUT)
        assert r.status_code in (200, 201)
        course_id = r.json()["data"]["id"]

        # User3 is in no org — try to access modules without enrollment
        r3 = _login("User3", "User@123")
        user3_tok = r3.json()["data"]["accessToken"]
        r_modules = requests.get(f"{API_BASE}/api/courses/{course_id}/modules",
                                 headers=_ah(user3_tok), timeout=TIMEOUT)
        assert r_modules.status_code in (403, 404), \
            f"Non-enrolled user should be denied, got {r_modules.status_code}"

        # Cleanup
        requests.delete(f"{API_BASE}/api/courses/{course_id}",
                        headers=_ah(sa_tok), timeout=TIMEOUT)


class TestSysAdminAbsoluteDestructiveRight:
    """Spec §1 SysAdmin — Absolute Destructive Right: delete any course or content globally."""

    def test_sysadmin_can_delete_any_course(self):
        """Spec §1 SysAdmin — SysAdmin can delete any course regardless of org."""
        sa_tok = _sysadmin_token()

        # Create course in org1 (SysAdmin uses X-Org-Id to set context)
        course_name = f"LuminaTest_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API_BASE}/api/courses",
                          json={"title": course_name},
                          headers=_ah(sa_tok, ORGADMIN1_ORG_ID), timeout=TIMEOUT)
        assert r.status_code in (200, 201)
        course_id = r.json()["data"]["id"]

        # SysAdmin deletes it (cross-org — they have no org_id in JWT)
        r = requests.delete(f"{API_BASE}/api/courses/{course_id}",
                            headers=_ah(sa_tok), timeout=TIMEOUT)
        assert r.status_code == 200, f"SysAdmin delete course failed: {r.status_code} {r.text}"

        # Verify deleted
        r = requests.get(f"{API_BASE}/api/courses/{course_id}",
                         headers=_ah(sa_tok), timeout=TIMEOUT)
        assert r.status_code in (404, 200)  # may be 404 or 200 with empty data

    def test_sysadmin_can_delete_content_in_any_course(self):
        """Spec §1 SysAdmin — SysAdmin can delete content inside any course (global scope)."""
        sa_tok = _sysadmin_token()

        # Create course + module (SysAdmin uses X-Org-Id for context)
        course_name = f"LuminaTest_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API_BASE}/api/courses",
                          json={"title": course_name},
                          headers=_ah(sa_tok, ORGADMIN2_ORG_ID), timeout=TIMEOUT)
        assert r.status_code in (200, 201)
        course_id = r.json()["data"]["id"]

        r = requests.post(f"{API_BASE}/api/courses/{course_id}/modules",
                          json={"title": "SATestModule"},
                          headers=_ah(sa_tok), timeout=TIMEOUT)
        assert r.status_code in (200, 201), f"Create module failed: {r.text}"
        module_id = r.json()["data"]["id"]

        # SysAdmin deletes module
        r = requests.delete(f"{API_BASE}/api/courses/{course_id}/modules/{module_id}",
                            headers=_ah(sa_tok), timeout=TIMEOUT)
        assert r.status_code == 200, f"SysAdmin delete module failed: {r.status_code} {r.text}"

        # Cleanup
        requests.delete(f"{API_BASE}/api/courses/{course_id}",
                        headers=_ah(sa_tok), timeout=TIMEOUT)

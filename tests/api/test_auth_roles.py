"""
API tests — Authentication flows per role (Spec §1 Auth & RBAC + §5 Seed Data).

Validates:
  - All 7 seeded accounts can log in with correct credentials
  - Each account returns the correct role in the JWT/response
  - SysAdmin login works without X-Org-Id (global scope)
  - OrgAdmin login works with X-Org-Id → org_id present in response
  - OrgAdmin login without X-Org-Id → still succeeds but no org_id
  - Public registration always creates Student role (not elevated)
  - SysAdmin can create OrgAdmin/SysAdmin accounts via POST /api/users
  - Token refresh preserves org context when X-Org-Id header is included
  - Wrong credentials return 401
  - OrgAdmin for wrong org is denied org context
"""

import pytest
import requests

API_BASE = "http://localhost:5000"

# Seeded accounts — Spec §5
SYSADMIN1 = ("SysAdmin1", "SysAdmin@123")
SYSADMIN2 = ("SysAdmin2", "SysAdmin@123")
ORGADMIN1 = ("OrgAdmin1", "OrgAdmin@123")
ORGADMIN2 = ("OrgAdmin2", "OrgAdmin@123")
USER1 = ("User1", "User@123")
USER2 = ("User2", "User@123")
USER3 = ("User3", "User@123")

ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ORG2_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def _login(username: str, password: str, org_id: str | None = None) -> requests.Response:
    headers = {"X-Org-Id": org_id} if org_id else {}
    return requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": username, "password": password},
        headers=headers,
        timeout=10,
    )


def _token(username: str, password: str, org_id: str | None = None) -> str:
    r = _login(username, password, org_id)
    assert r.status_code == 200, f"Login failed for {username}: {r.status_code} {r.text}"
    return r.json()["data"]["accessToken"]


def _ah(token: str, org_id: str | None = None) -> dict:
    h = {"Authorization": f"Bearer {token}"}
    if org_id:
        h["X-Org-Id"] = org_id
    return h


# ─────────────────────────────────────────────────────────────────────────────
# §5 Seed Data — all seeded accounts can log in
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.sysadmin
@pytest.mark.api
class TestSeedDataLogin:
    """Spec §5 — all 7 seeded accounts must be loginable with their specified credentials."""

    @pytest.mark.parametrize("username,password,expected_role", [
        ("SysAdmin1", "SysAdmin@123", "SysAdmin"),
        ("SysAdmin2", "SysAdmin@123", "SysAdmin"),
        ("OrgAdmin1", "OrgAdmin@123", "OrgAdmin"),
        ("OrgAdmin2", "OrgAdmin@123", "OrgAdmin"),
        ("User1",     "User@123",     "Student"),
        ("User2",     "User@123",     "Student"),
        ("User3",     "User@123",     "Student"),
    ])
    def test_seeded_account_login(self, username, password, expected_role):
        """Spec §5: each seeded account can log in and returns the correct role."""
        r = _login(username, password)
        assert r.status_code == 200, f"{username} login failed: {r.status_code} {r.text}"
        data = r.json()["data"]
        assert data.get("accessToken"), f"{username}: no accessToken in response"
        assert data.get("refreshToken"), f"{username}: no refreshToken in response"
        assert data["user"]["role"] == expected_role, (
            f"{username}: expected role {expected_role!r}, got {data['user']['role']!r}"
        )

    def test_wrong_password_returns_401(self):
        """Spec §1: invalid credentials → 401 Unauthorized."""
        r = _login("SysAdmin1", "WrongPassword!")
        assert r.status_code == 401

    def test_nonexistent_user_returns_401(self):
        """Spec §1: unknown username → 401 (no user enumeration)."""
        r = _login("NoSuchUser999", "Password@123")
        assert r.status_code == 401

    def test_wrong_org_admin_wrong_password_returns_401(self):
        """OrgAdmin with wrong password → 401."""
        r = _login("OrgAdmin1", "WrongPass@123", ORG1_ID)
        assert r.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# SysAdmin login — no org context needed (Spec §1 SysAdmin)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.sysadmin
@pytest.mark.api
class TestSysAdminAuthFlow:
    """Spec §1 SysAdmin — SysAdmin login and global scope."""

    def test_sysadmin1_login_no_org_id(self):
        """SysAdmin logs in WITHOUT X-Org-Id → succeeds with role=SysAdmin, no orgId."""
        r = _login(*SYSADMIN1)
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["user"]["role"] == "SysAdmin"
        # SysAdmin without explicit org header should not have orgId set
        assert data.get("orgId") is None or data.get("orgId") == ""

    def test_sysadmin_with_org_id_header(self):
        """SysAdmin CAN log in with X-Org-Id and gets org context (global override)."""
        r = _login(*SYSADMIN1, org_id=ORG1_ID)
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["user"]["role"] == "SysAdmin"
        # SysAdmin with X-Org-Id should get org context (no membership check required)
        assert data.get("orgId") == ORG1_ID

    def test_sysadmin_token_works_for_sysadmin_endpoints(self):
        """SysAdmin token grants access to SysAdmin-only endpoints."""
        token = _token(*SYSADMIN1)
        r = requests.get(
            f"{API_BASE}/api/users",
            headers=_ah(token),
            timeout=10,
        )
        assert r.status_code == 200, f"SysAdmin /api/users failed: {r.status_code} {r.text}"

    def test_student_token_cannot_access_sysadmin_endpoints(self):
        """Student token must be denied from SysAdmin-only endpoints."""
        token = _token(*USER1)
        r = requests.get(
            f"{API_BASE}/api/users",
            headers=_ah(token),
            timeout=10,
        )
        assert r.status_code in (401, 403), (
            f"Student should be denied /api/users but got {r.status_code}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# OrgAdmin login — requires X-Org-Id for org context (Spec §1 OrgAdmin)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.orgadmin
@pytest.mark.api
class TestOrgAdminAuthFlow:
    """Spec §1 OrgAdmin — OrgAdmin login with and without org context."""

    def test_orgadmin1_login_with_org_context(self):
        """OrgAdmin1 logs in WITH X-Org-Id for their org → orgId present in response."""
        r = _login(*ORGADMIN1, org_id=ORG1_ID)
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["user"]["role"] == "OrgAdmin"
        assert data.get("orgId") == ORG1_ID, (
            f"Expected orgId={ORG1_ID!r}, got {data.get('orgId')!r}"
        )

    def test_orgadmin1_login_without_org_context(self):
        """OrgAdmin1 logs in WITHOUT X-Org-Id → BE auto-resolves their org via GetOrgIdForAdminAsync."""
        # Spec §1: OrgAdmin has a fixed org; system resolves org context automatically.
        r = _login(*ORGADMIN1)
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["user"]["role"] == "OrgAdmin"
        # Auto-resolved → orgId equals their seeded org (ORG1_ID)
        assert data.get("orgId") == ORG1_ID, (
            f"OrgAdmin1 should auto-get their org even without X-Org-Id header, got: {data.get('orgId')!r}"
        )

    def test_orgadmin1_cannot_use_org2_context(self):
        """OrgAdmin1 cannot claim Org2 context — not a member."""
        r = _login(*ORGADMIN1, org_id=ORG2_ID)
        # Should succeed but NOT get ORG2 orgId — org context silently dropped
        assert r.status_code == 200
        data = r.json()["data"]
        assert data.get("orgId") != ORG2_ID, (
            "OrgAdmin1 should NOT get orgId for an org they don't belong to"
        )

    def test_orgadmin2_login_with_own_org_context(self):
        """OrgAdmin2 logs in with their own org (Org2) → orgId=ORG2_ID."""
        r = _login(*ORGADMIN2, org_id=ORG2_ID)
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["user"]["role"] == "OrgAdmin"
        assert data.get("orgId") == ORG2_ID

    def test_orgadmin_token_with_org_context_can_access_org_courses(self):
        """OrgAdmin with org context can access org's courses endpoint."""
        token = _token(*ORGADMIN1, org_id=ORG1_ID)
        r = requests.get(
            f"{API_BASE}/api/courses",
            headers=_ah(token, ORG1_ID),
            timeout=10,
        )
        assert r.status_code == 200, (
            f"OrgAdmin1 should access courses with org context: {r.status_code} {r.text}"
        )

    def test_student_cannot_access_org_admin_analytics(self):
        """Student token denied from OrgAdmin analytics endpoint. Spec §1 invariant 7."""
        # Correct endpoint: GET /api/analytics/orgs/{orgId} (Content.Api AnalyticsController)
        token = _token(*USER1)
        r = requests.get(
            f"{API_BASE}/api/analytics/orgs/{ORG1_ID}",
            headers=_ah(token, ORG1_ID),
            timeout=10,
        )
        assert r.status_code in (401, 403)


# ─────────────────────────────────────────────────────────────────────────────
# Token refresh preserves org context (Bug fix verification)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.orgadmin
@pytest.mark.api
class TestTokenRefreshOrgContext:
    """Verify that token refresh preserves org context when X-Org-Id is sent."""

    def test_refresh_without_org_id_header_loses_context(self):
        """Refresh WITHOUT X-Org-Id → new token has no orgId (expected, not a bug)."""
        r = _login(*ORGADMIN1, org_id=ORG1_ID)
        refresh_token = r.json()["data"]["refreshToken"]

        r2 = requests.post(
            f"{API_BASE}/api/auth/refresh",
            json={"refreshToken": refresh_token},
            timeout=10,
        )
        assert r2.status_code == 200
        data = r2.json()["data"]
        assert data.get("accessToken"), "Refresh should return new accessToken"
        # Without X-Org-Id, new token should have no orgId
        assert data.get("orgId") is None or data.get("orgId") == ""

    def test_refresh_with_org_id_header_preserves_context(self):
        """Refresh WITH X-Org-Id header → new token retains org context (bug fix §1)."""
        r = _login(*ORGADMIN1, org_id=ORG1_ID)
        refresh_token = r.json()["data"]["refreshToken"]

        r2 = requests.post(
            f"{API_BASE}/api/auth/refresh",
            json={"refreshToken": refresh_token},
            headers={"X-Org-Id": ORG1_ID},
            timeout=10,
        )
        assert r2.status_code == 200
        data = r2.json()["data"]
        assert data.get("accessToken"), "Refresh should return new accessToken"
        assert data.get("orgId") == ORG1_ID, (
            f"Refresh with X-Org-Id should preserve orgId, got {data.get('orgId')!r}"
        )

    def test_refresh_with_wrong_org_id_does_not_grant_access(self):
        """OrgAdmin1 cannot use refresh to claim Org2 context."""
        r = _login(*ORGADMIN1, org_id=ORG1_ID)
        refresh_token = r.json()["data"]["refreshToken"]

        r2 = requests.post(
            f"{API_BASE}/api/auth/refresh",
            json={"refreshToken": refresh_token},
            headers={"X-Org-Id": ORG2_ID},
            timeout=10,
        )
        assert r2.status_code == 200
        data = r2.json()["data"]
        # Should NOT grant ORG2 context to OrgAdmin1
        assert data.get("orgId") != ORG2_ID, (
            "OrgAdmin1 must not get Org2 context through refresh"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Public registration always creates Student (Spec §1)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.user
@pytest.mark.api
class TestPublicRegistrationRole:
    """Spec §1: public registration endpoint always creates Student role accounts."""

    def test_public_register_creates_student_role(self, unique_suffix):
        """POST /api/auth/register always assigns role=Student. Elevated roles need SysAdmin."""
        username = f"regtest_{unique_suffix}"
        r = requests.post(
            f"{API_BASE}/api/auth/register",
            json={
                "username": username,
                "email": f"{username}@lumina.test",
                "password": "TestPass@123",
            },
            timeout=10,
        )
        assert r.status_code == 200, f"Registration failed: {r.status_code} {r.text}"

        # Login and verify role
        lr = _login(username, "TestPass@123")
        assert lr.status_code == 200
        assert lr.json()["data"]["user"]["role"] == "Student", (
            "Public registration must always produce Student role"
        )


# ─────────────────────────────────────────────────────────────────────────────
# SysAdmin creates elevated accounts (Spec §1 SysAdmin)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.sysadmin
@pytest.mark.api
class TestSysAdminCreatesAccounts:
    """Spec §1 SysAdmin: SysAdmin creates OrgAdmin and SysAdmin accounts via POST /api/users."""

    def test_sysadmin_creates_orgadmin_account(self, unique_suffix):
        """SysAdmin creates a new OrgAdmin account — role must be OrgAdmin after login."""
        sa_token = _token(*SYSADMIN1)
        username = f"newoa_{unique_suffix}"

        r = requests.post(
            f"{API_BASE}/api/users",
            json={
                "username": username,
                "email": f"{username}@lumina.test",
                "password": "OrgAdmin@999",
                "role": "OrgAdmin",
            },
            headers=_ah(sa_token),
            timeout=10,
        )
        assert r.status_code in (200, 201), (
            f"SysAdmin creating OrgAdmin account failed: {r.status_code} {r.text}"
        )

        # Verify the created account has OrgAdmin role
        lr = _login(username, "OrgAdmin@999")
        assert lr.status_code == 200
        assert lr.json()["data"]["user"]["role"] == "OrgAdmin"

    def test_sysadmin_creates_sysadmin_account(self, unique_suffix):
        """Spec §1 SysAdmin: SysAdmin can create another SysAdmin via the admin API."""
        sa_token = _token(*SYSADMIN1)
        username = f"newsa_{unique_suffix}"

        r = requests.post(
            f"{API_BASE}/api/users",
            json={
                "username": username,
                "email": f"{username}@lumina.test",
                "password": "SysAdmin@999",
                "role": "SysAdmin",
            },
            headers=_ah(sa_token),
            timeout=10,
        )
        assert r.status_code in (200, 201), (
            f"SysAdmin creating SysAdmin account failed: {r.status_code} {r.text}"
        )

        lr = _login(username, "SysAdmin@999")
        assert lr.status_code == 200
        assert lr.json()["data"]["user"]["role"] == "SysAdmin"

    def test_non_sysadmin_cannot_create_elevated_accounts(self, unique_suffix):
        """OrgAdmin cannot create accounts via the admin endpoint — 403 expected."""
        oa_token = _token(*ORGADMIN1, org_id=ORG1_ID)
        username = f"denied_{unique_suffix}"

        r = requests.post(
            f"{API_BASE}/api/users",
            json={
                "username": username,
                "email": f"{username}@lumina.test",
                "password": "TestPass@123",
                "role": "OrgAdmin",
            },
            headers=_ah(oa_token),
            timeout=10,
        )
        assert r.status_code in (401, 403), (
            f"OrgAdmin should be denied /api/users but got {r.status_code}"
        )

    def test_student_cannot_create_accounts(self, unique_suffix):
        """Student cannot create accounts via admin endpoint."""
        student_token = _token(*USER1)
        username = f"stddenied_{unique_suffix}"

        r = requests.post(
            f"{API_BASE}/api/users",
            json={
                "username": username,
                "email": f"{username}@lumina.test",
                "password": "TestPass@123",
                "role": "Student",
            },
            headers=_ah(student_token),
            timeout=10,
        )
        assert r.status_code in (401, 403)


# ─────────────────────────────────────────────────────────────────────────────
# OrgAdmin self-registration with org details (Spec §1)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.wave1
@pytest.mark.orgadmin
@pytest.mark.api
class TestOrgAdminSelfRegistration:
    """Spec §1: OrgAdmin can self-register by providing Organization details."""

    def test_orgadmin_self_register_creates_user_and_org(self, unique_suffix):
        """POST /api/auth/register/orgadmin creates OrgAdmin user + org in one call."""
        username = f"selfoa_{unique_suffix}"
        org_name = f"SelfRegOrg_{unique_suffix}"

        r = requests.post(
            f"{API_BASE}/api/auth/register/orgadmin",
            json={
                "username": username,
                "email": f"{username}@lumina.test",
                "password": "OrgAdmin@789",
                "organizationName": org_name,
                "organizationSlug": f"self-{unique_suffix}",
            },
            timeout=10,
        )
        assert r.status_code in (200, 201), (
            f"OrgAdmin self-registration failed: {r.status_code} {r.text}\n"
            "NOTE: This endpoint may not be implemented yet — see Spec §1 gap."
        )

        # Verify account was created with OrgAdmin role
        lr = _login(username, "OrgAdmin@789")
        assert lr.status_code == 200
        assert lr.json()["data"]["user"]["role"] == "OrgAdmin"

        # Verify they can log in with their new org context
        org_id = r.json().get("data", {}).get("orgId") or r.json().get("data", {}).get("organizationId")
        if org_id:
            lr2 = _login(username, "OrgAdmin@789", org_id)
            assert lr2.status_code == 200
            assert lr2.json()["data"].get("orgId") == org_id

    def test_orgadmin_self_register_endpoint_rejects_empty_body(self):
        """Endpoint returns 400 (validation error) not 404 (not found) — endpoint exists."""
        r = requests.post(
            f"{API_BASE}/api/auth/register/orgadmin",
            json={},
            timeout=10,
        )
        assert r.status_code == 400, (
            f"Empty body should return 400 (validation), got {r.status_code}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Shared fixture
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def unique_suffix():
    import uuid
    return uuid.uuid4().hex[:8]

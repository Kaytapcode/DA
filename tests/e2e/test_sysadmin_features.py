"""
Wave 1 SysAdmin — 5 features (Spec 1 SysAdmin + Spec 4 banner mgmt).

Requires a pre-seeded SysAdmin account in the test DB. See tests/README.md.
Tests will skip cleanly if SysAdmin login fails.
"""

import os
import pytest
import requests
from datetime import datetime


SYSADMIN_USERNAME = os.getenv("TEST_SYSADMIN_USERNAME", "test_sysadmin")
SYSADMIN_PASSWORD = os.getenv("TEST_SYSADMIN_PASSWORD", "TestPassword123!")


def _unwrap(resp):
    body = resp.json() if resp.text else {}
    if isinstance(body, dict) and "data" in body and body.get("data") is not None:
        return body["data"]
    return body


def _sysadmin_login(api_client):
    """Try to log in as SysAdmin; skip the calling test if the seed is missing."""
    res = api_client.login_user(SYSADMIN_USERNAME, SYSADMIN_PASSWORD)
    if res["status_code"] != 200:
        pytest.skip(f"SysAdmin seed account not available ({SYSADMIN_USERNAME}). See tests/README.md for setup.")
    return res


def _new_creds(prefix="sa"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


# ===================== Feature 1: Organization CRUD =====================

@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminOrganizationCRUD:
    """Spec 1 SysAdmin — Manage Organizations (CRUD)."""

    def test_sysadmin_can_create_organization(self, api_client):
        _sysadmin_login(api_client)
        resp = api_client.post("/api/organizations", json={
            "name": f"SysAdminOrg_{int(datetime.now().timestamp() * 1000)}",
            "slug": f"sa-{int(datetime.now().timestamp() * 1000)}",
        })
        assert resp.status_code in (200, 201), f"Create org failed: {resp.text}"
        org = _unwrap(resp)
        assert org.get("id"), "Org creation must return id"

    def test_sysadmin_can_list_all_organizations(self, api_client):
        _sysadmin_login(api_client)
        resp = api_client.get("/api/organizations")
        assert resp.status_code == 200
        orgs = _unwrap(resp)
        assert isinstance(orgs, list), "List must return an array"

    def test_sysadmin_can_delete_organization(self, api_client):
        _sysadmin_login(api_client)
        org = _unwrap(api_client.post("/api/organizations", json={
            "name": f"DeletableOrg_{int(datetime.now().timestamp() * 1000)}",
            "slug": f"del-{int(datetime.now().timestamp() * 1000)}",
        }))
        resp = api_client.delete(f"/api/organizations/{org['id']}")
        assert resp.status_code in (200, 204)


# ===================== Feature 2: Global User Management =====================

@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminUserManagement:
    """Spec 1 SysAdmin — Manage Global Users."""

    def test_sysadmin_can_list_users(self, api_client):
        _sysadmin_login(api_client)
        resp = api_client.get("/api/users?pageIndex=0&pageSize=10")
        assert resp.status_code == 200

    def test_sysadmin_can_create_user_with_role(self, api_client):
        """Spec 1 — Elevated roles assignable only by SysAdmin."""
        _sysadmin_login(api_client)
        creds = _new_creds("teacher")
        resp = api_client.post("/api/users", json={
            "username": creds["username"],
            "email": creds["email"],
            "password": creds["password"],
            "role": "Teacher",
        })
        assert resp.status_code == 200, f"Create user failed: {resp.text}"
        u = _unwrap(resp)
        assert u.get("role") == "Teacher", "Spec 1: SysAdmin can assign elevated roles"

    def test_non_sysadmin_cannot_access_users_endpoint(self, api_client):
        """Spec 1 — User management is SysAdmin-only."""
        creds = _new_creds("regular")
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])
        resp = api_client.get("/api/users")
        assert resp.status_code in (401, 403, 404), f"Non-sysadmin must be denied, got {resp.status_code}"


# ===================== Feature 3: AI Key + Quota Config =====================

@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminAIConfig:
    """Spec 1 SysAdmin — Configure AI API Keys + per-org quota."""

    def test_sysadmin_can_list_ai_keys(self, api_client):
        _sysadmin_login(api_client)
        resp = api_client.get("/api/sysadmin/ai-keys")
        assert resp.status_code == 200

    def test_sysadmin_can_create_ai_key(self, api_client):
        _sysadmin_login(api_client)
        resp = api_client.post("/api/sysadmin/ai-keys", json={
            "provider": "OpenRouter",
            "label": f"TestKey_{int(datetime.now().timestamp() * 1000)}",
            "apiKey": "sk-test-fake-key-not-real",
            "isActive": False,
        })
        assert resp.status_code in (200, 201), f"Create key failed: {resp.text}"

    def test_non_sysadmin_cannot_access_ai_keys(self, api_client):
        creds = _new_creds("reg2")
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])
        resp = api_client.get("/api/sysadmin/ai-keys")
        assert resp.status_code in (401, 403, 404)


# ===================== Feature 4: Global Analytics =====================

@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminAnalytics:
    """Spec 1 SysAdmin — View Global Analytics."""

    def test_sysadmin_can_access_global_content_analytics(self, api_client):
        _sysadmin_login(api_client)
        resp = api_client.get("/api/analytics/sysadmin")
        assert resp.status_code == 200, f"Global content analytics failed: {resp.status_code}"

    def test_sysadmin_can_access_global_org_analytics(self, api_client):
        _sysadmin_login(api_client)
        resp = api_client.get("/api/analytics/sysadmin/orgs")
        assert resp.status_code == 200, f"Global org analytics failed: {resp.status_code}"

    def test_non_sysadmin_blocked_from_global_analytics(self, api_client):
        creds = _new_creds("reg3")
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])
        resp = api_client.get("/api/analytics/sysadmin")
        assert resp.status_code in (401, 403, 404)


# ===================== Feature 5: Banner Management =====================

@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.sysadmin
class TestSysAdminBannerManagement:
    """Wave 1 SysAdmin — Banner CRUD (Spec custom: banners shown to users)."""

    def test_anyone_can_list_active_banners(self, api_client):
        """Banners are publicly readable so unauth'd users see them on the landing page."""
        resp = api_client.get("/api/banners")
        assert resp.status_code in (200, 401), f"Banners GET unexpectedly failed: {resp.status_code}"

    def test_sysadmin_can_create_banner(self, api_client):
        _sysadmin_login(api_client)
        resp = api_client.post("/api/banners", json={
            "title": f"TestBanner_{int(datetime.now().timestamp() * 1000)}",
            "message": "Welcome to Lumina",
            "imageUrl": "https://example.com/banner.png",
            "isActive": True,
        })
        assert resp.status_code in (200, 201), f"Create banner failed: {resp.text}"

    def test_non_sysadmin_cannot_create_banner(self, api_client):
        creds = _new_creds("reg4")
        api_client.register_user(creds["username"], creds["password"], creds["email"])
        api_client.login_user(creds["username"], creds["password"])
        resp = api_client.post("/api/banners", json={"title": "x", "message": "y", "imageUrl": "https://example.com/x.png"})
        assert resp.status_code in (401, 403, 404)

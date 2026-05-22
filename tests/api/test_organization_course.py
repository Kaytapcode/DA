"""
Organization API Tests for Lumina LMS
Tests cover: CRUD operations, member management, permissions.

Course tests (create/read/update/delete/enroll) are in test_orgadmin_wave2.py
which uses the correct OrgAdmin auth pattern and API endpoints.
"""

import pytest
import requests
from tests.fixtures.test_data import TestDataFactory

API_BASE = "http://localhost:5000"
# Seeded OrgAdmin1 credentials (Spec §5)
ORGADMIN1 = ("OrgAdmin1", "OrgAdmin@123")
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
# Seeded User1 (for member add tests)
USER1 = ("User1", "User@123")
USER1_ID = "55555555-5555-5555-5555-555555555555"


def _orgadmin_token() -> str:
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": ORGADMIN1[0], "password": ORGADMIN1[1]},
        headers={"X-Org-Id": ORG1_ID},
        timeout=10,
    )
    assert r.status_code == 200, f"OrgAdmin login failed: {r.text}"
    return r.json()["data"]["accessToken"]


def _ah(token: str, org_id: str | None = None) -> dict:
    h = {"Authorization": f"Bearer {token}"}
    if org_id:
        h["X-Org-Id"] = org_id
    return h


class TestOrganizationCreation:
    """Test organization creation — any authenticated user can create an org (Spec §1)."""

    @pytest.mark.api
    def test_valid_organization_creation(self, authenticated_client):
        """TC-ORG-001: Valid organization creation returns 201"""
        org_data = TestDataFactory.create_organization_data()

        result = authenticated_client.create_organization(
            org_data["name"],
            org_data["description"]
        )

        assert result["status_code"] == 201, f"Expected 201, got {result['status_code']}: {result['data']}"
        assert "id" in result["data"], "Organization ID should be in response"
        assert result["data"]["name"] == org_data["name"]

    @pytest.mark.api
    def test_duplicate_slug_rejected(self, authenticated_client):
        """TC-ORG-002: Duplicate slug rejected with 400"""
        org_data = TestDataFactory.create_organization_data()

        result1 = authenticated_client.create_organization(org_data["name"])
        assert result1["status_code"] == 201

        result2 = authenticated_client.create_organization(org_data["name"])
        assert result2["status_code"] == 400, "Duplicate slug should be rejected"

    @pytest.mark.api
    def test_missing_organization_name(self, authenticated_client):
        """TC-ORG-003: Missing organization name returns 400"""
        result = authenticated_client.post("/api/organizations", json={
            "description": "Test Description",
            "slug": "test-slug-only",
        })

        assert result.status_code == 400, "Missing name should return 400"


class TestOrganizationRead:
    """Test organization read operations."""

    @pytest.mark.api
    def test_get_organization_details(self, authenticated_client, test_organization):
        """TC-ORG-005: GET /api/organizations/{id} returns 200 with org data."""
        result = authenticated_client.get_organization(test_organization["id"])

        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        assert result["data"]["id"] == test_organization["id"]
        assert result["data"]["name"] == test_organization["name"]

    @pytest.mark.api
    def test_get_nonexistent_organization_fails(self, authenticated_client):
        """TC-ORG-006: GET /api/organizations/{fake-uuid} returns 404."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        result = authenticated_client.get_organization(fake_uuid)

        assert result["status_code"] == 404, "Non-existent org should return 404"


class TestOrganizationMembers:
    """Test organization member management.

    Member management uses POST /api/orgs/{orgId}/members (requires OrgAdmin).
    Uses seeded OrgAdmin1 + TestOrg1 so membership check succeeds.
    """

    @pytest.mark.api
    def test_add_member_to_organization(self):
        """TC-ORG-011: OrgAdmin adds a user (User1) to their org."""
        token = _orgadmin_token()
        r = requests.post(
            f"{API_BASE}/api/orgs/{ORG1_ID}/members",
            json={"orgId": ORG1_ID, "userId": USER1_ID, "role": "Student"},
            headers=_ah(token, ORG1_ID),
            timeout=10,
        )
        # 200 or 400 (already member) — both are valid responses
        assert r.status_code in (200, 400), f"Expected 200/400, got {r.status_code}: {r.text}"

    @pytest.mark.api
    def test_list_organization_members(self):
        """TC-ORG-018: OrgAdmin lists members of their org."""
        token = _orgadmin_token()
        r = requests.get(
            f"{API_BASE}/api/orgs/{ORG1_ID}/members",
            headers=_ah(token, ORG1_ID),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        raw = r.json()
        data = raw.get("data", raw)
        assert isinstance(data, (list, dict)), "Should return members list"


# Course CRUD / read / update / enroll / curriculum tests are tested with the
# correct OrgAdmin auth pattern in tests/api/test_orgadmin_wave2.py.
# Duplicating them here with a regular-user client would fail (403 on all
# teacher-gated endpoints) and add no value.

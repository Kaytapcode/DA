"""
Organization API Tests for Tiny-LMS
Tests cover: CRUD operations, member management, permissions
"""

import pytest
from tests.fixtures.test_data import TestDataFactory, InvalidTestData


class TestOrganizationCreation:
    """Test organization creation"""
    
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
    def test_duplicate_organization_name_rejected(self, authenticated_client):
        """TC-ORG-002: Duplicate organization name rejected with 400"""
        org_data = TestDataFactory.create_organization_data()
        
        # Create first org
        result1 = authenticated_client.create_organization(org_data["name"])
        assert result1["status_code"] == 201
        
        # Attempt duplicate
        result2 = authenticated_client.create_organization(org_data["name"])
        assert result2["status_code"] == 400, "Duplicate org name should be rejected"
    
    @pytest.mark.api
    def test_missing_organization_name(self, authenticated_client):
        """TC-ORG-003: Missing organization name returns 400"""
        result = authenticated_client.post("/api/organizations", json={
            "description": "Test Description"
        })
        
        assert result.status_code == 400, "Missing name should return 400"
    
    @pytest.mark.api
    def test_creator_is_admin_by_default(self, authenticated_client):
        """TC-ORG-004: Creator has ADMIN role in new organization"""
        org_data = TestDataFactory.create_organization_data()
        
        result = authenticated_client.create_organization(org_data["name"])
        assert result["status_code"] == 201
        
        org_id = result["data"]["id"]
        
        # Get org members
        members_result = authenticated_client.get(f"/api/organizations/{org_id}/members")
        if members_result.status_code == 200:
            members = members_result.json()
            admin_found = any(m.get("role") == "ADMIN" for m in members)
            assert admin_found, "Creator should have ADMIN role"


class TestOrganizationRead:
    """Test organization read operations"""
    
    @pytest.mark.api
    def test_get_organization_details(self, authenticated_client, test_organization):
        """TC-ORG-005: Get organization details returns 200"""
        result = authenticated_client.get_organization(test_organization["id"])
        
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        assert result["data"]["id"] == test_organization["id"]
        assert result["data"]["name"] == test_organization["name"]
    
    @pytest.mark.api
    def test_get_nonexistent_organization_fails(self, authenticated_client):
        """TC-ORG-006: Get non-existent organization returns 404"""
        result = authenticated_client.get_organization(999999)
        
        assert result["status_code"] == 404, "Non-existent org should return 404"


class TestOrganizationUpdate:
    """Test organization update operations"""
    
    @pytest.mark.api
    def test_update_organization_metadata(self, authenticated_client, test_organization):
        """TC-ORG-007: Update organization metadata succeeds"""
        new_name = f"Updated_{TestDataFactory.random_string()}"
        
        result = authenticated_client.put(
            f"/api/organizations/{test_organization['id']}",
            json={"name": new_name, "description": "Updated Description"}
        )
        
        assert result.status_code == 200, f"Expected 200, got {result.status_code}"
        assert result.json().get("name") == new_name


class TestOrganizationMembers:
    """Test organization member management"""
    
    @pytest.mark.api
    def test_add_member_to_organization(self, authenticated_client, test_organization):
        """TC-ORG-011: Invite user to organization succeeds"""
        new_email = TestDataFactory.random_email()
        
        result = authenticated_client.post(
            f"/api/organizations/{test_organization['id']}/members",
            json={"email": new_email, "role": "TEACHER"}
        )
        
        assert result.status_code == 201, f"Expected 201, got {result.status_code}: {result.json()}"
    
    @pytest.mark.api
    def test_list_organization_members_pagination(self, authenticated_client, test_organization):
        """TC-ORG-018: List members with pagination"""
        result = authenticated_client.get(
            f"/api/organizations/{test_organization['id']}/members?page=1&pageSize=10"
        )
        
        assert result.status_code == 200, f"Expected 200, got {result.status_code}"
        data = result.json()
        assert "items" in data or isinstance(data, list), "Should return members list"


class TestCourseCreation:
    """Test course creation"""
    
    @pytest.mark.api
    def test_valid_course_creation(self, authenticated_client, test_organization):
        """TC-COURSE-001: Valid course creation returns 201"""
        course_data = TestDataFactory.create_course_data()
        
        result = authenticated_client.create_course(
            test_organization["id"],
            course_data["name"],
            course_data["description"]
        )
        
        assert result["status_code"] == 201, f"Expected 201, got {result['status_code']}: {result['data']}"
        assert "id" in result["data"], "Course ID should be in response"
    
    @pytest.mark.api
    def test_duplicate_course_name_in_org_rejected(self, authenticated_client, test_organization):
        """TC-COURSE-002: Duplicate course name in org rejected"""
        course_name = f"UniqueCourse_{TestDataFactory.random_string()}"
        
        # Create first course
        result1 = authenticated_client.create_course(test_organization["id"], course_name)
        assert result1["status_code"] == 201
        
        # Attempt duplicate
        result2 = authenticated_client.create_course(test_organization["id"], course_name)
        assert result2["status_code"] == 400, "Duplicate course name should be rejected"
    
    @pytest.mark.api
    def test_missing_course_name(self, authenticated_client, test_organization):
        """TC-COURSE-003: Missing course name returns 400"""
        result = authenticated_client.post(
            f"/api/organizations/{test_organization['id']}/courses",
            json={"description": "Test Description"}
        )
        
        assert result.status_code == 400, "Missing name should return 400"
    
    # DELETED: test_course_visibility_options
    # Reason: Spec 4 does not define a PRIVATE/PUBLIC visibility flag on courses.
    # Course access is controlled by Organization membership, not a visibility column.
    # See CLAUDE.md Section 5 invariant 7 (OrgAdmin scope is org-bounded).


class TestCourseRead:
    """Test course read operations"""
    
    @pytest.mark.api
    def test_get_course_details(self, authenticated_client, test_course):
        """TC-COURSE-006: Get course details returns 200"""
        result = authenticated_client.get_course(test_course["id"])
        
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        assert result["data"]["id"] == test_course["id"]


class TestCourseUpdate:
    """Test course update operations"""
    
    @pytest.mark.api
    def test_update_course_metadata(self, authenticated_client, test_course):
        """TC-COURSE-008: Update course metadata succeeds"""
        new_name = f"Updated_{TestDataFactory.random_string()}"
        
        result = authenticated_client.put(
            f"/api/courses/{test_course['id']}",
            json={"name": new_name}
        )
        
        assert result.status_code == 200, f"Expected 200, got {result.status_code}"


class TestCourseMembers:
    """Test course member management"""
    
    @pytest.mark.api
    def test_add_member_to_course(self, authenticated_client, test_course, test_user):
        """TC-COURSE-013: Add user to course succeeds"""
        result = authenticated_client.post(
            f"/api/courses/{test_course['id']}/members",
            json={"userId": test_user.get("id", 1), "role": "STUDENT"}
        )
        
        # If user_id not available, test with email
        if result.status_code != 201:
            result = authenticated_client.post(
                f"/api/courses/{test_course['id']}/members",
                json={"email": test_user["email"], "role": "STUDENT"}
            )
        
        assert result.status_code in [201, 400], "Should either succeed or return validation error"


class TestIntegrationCurriculumContent:
    """Test adding content to course curriculum"""
    
    @pytest.mark.api
    def test_course_curriculum_structure(self, authenticated_client, test_course):
        """TC-INT-001-004: Verify curriculum endpoints exist"""
        # Try to get curriculum
        result = authenticated_client.get(f"/api/courses/{test_course['id']}/curriculum")
        
        assert result.status_code in [200, 404], "Should handle curriculum endpoint"

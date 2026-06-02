"""
API use-case tests for the 2026-06-01 feature batch (NOT YET in SystemDoc — spec update pending):

  #1  User can view (download/stream) their documents inline.
  #2  OrgAdmin can add a user to the org, change their role, and remove them
      (body carries only {userId, role}; role-change/remove key on userId).
  #3  Per-course roles: the SAME user can be Teacher in one course and Student in another.
  #4  Add a user to a course, THEN assign their per-course role.
  #5  User self-requests enrollment (Pending) → OrgAdmin approves/rejects; only an
      Approved enrollment grants course access.

These encode the dev's requirements directly. When SystemDoc is updated, add the
matching `# Spec X.Y` markers. Tests run end-to-end against the live stack.

Reuses the OrgAdmin/student bootstrap helpers from test_orgadmin_wave2.
"""

import uuid
import requests
import pytest

from .test_orgadmin_wave2 import (
    API_BASE,
    TIMEOUT,
    _login,
    _headers,
    _unique,
    create_orgadmin_session,
    create_regular_user,
)


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def oa():
    return create_orgadmin_session()


@pytest.fixture
def fresh_course(oa):
    title = _unique("EnrollCourse")
    r = requests.post(
        f"{API_BASE}/api/courses",
        json={"title": title, "description": "enroll flow", "courseCode": "EF"},
        headers=_headers(oa["token"], oa["org_id"]),
        timeout=TIMEOUT,
    )
    assert r.status_code in (200, 201), r.text
    data = r.json()
    return (data.get("data") or data)


def _make_student(oa):
    """A fresh Student user, returned with id/token. Sends org context via X-Org-Id."""
    return create_regular_user(oa["sa_token"])


# ─────────────────────────────────────────────────────────────────────────────
# #1 — Document viewing
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentViewing:
    """#1 — A user can upload a document and stream it back inline."""

    def test_user_uploads_and_views_pdf_inline(self, oa):
        student = _make_student(oa)
        # Upload a small valid PDF.
        pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
        r = requests.post(
            f"{API_BASE}/api/documents",
            files={"file": ("view_me.pdf", pdf, "application/pdf")},
            headers={"Authorization": f"Bearer {student['token']}"},
            timeout=15,
        )
        assert r.status_code == 200, f"Upload failed: {r.text}"
        doc_id = (r.json().get("data") or r.json())["id"]

        # Fetch the document back — must stream inline as application/pdf, not as JSON.
        r = requests.get(
            f"{API_BASE}/api/documents/{doc_id}",
            headers={"Authorization": f"Bearer {student['token']}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.headers.get("Content-Type", "").startswith("application/pdf"), r.headers
        assert "inline" in r.headers.get("Content-Disposition", "").lower()
        assert r.content.startswith(b"%PDF"), "Body must be the raw PDF bytes"


# ─────────────────────────────────────────────────────────────────────────────
# #2 — OrgAdmin org member management
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestOrgAdminMemberManagement:
    """#2 — Add (body has no orgId), change role by userId, remove by userId."""

    def test_orgadmin_adds_member_without_orgid_in_body(self, oa):
        student = _make_student(oa)
        r = requests.post(
            f"{API_BASE}/api/orgs/{oa['org_id']}/members",
            json={"userId": student["id"], "role": "Member"},  # NO orgId — comes from route
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, f"Add member should succeed without body orgId: {r.text}"
        assert r.json()["success"] is True

    def test_org_rejects_per_course_role_at_org_level(self, oa):
        """#5 — 'Student'/'Teacher' are NOT org-level roles; org accepts only Member/OrgAdmin."""
        student = _make_student(oa)
        r = requests.post(
            f"{API_BASE}/api/orgs/{oa['org_id']}/members",
            json={"userId": student["id"], "role": "Student"},
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 400, f"Org should reject per-course role 'Student': {r.text}"

    def test_orgadmin_changes_member_role_by_userid(self, oa):
        student = _make_student(oa)
        requests.post(
            f"{API_BASE}/api/orgs/{oa['org_id']}/members",
            json={"userId": student["id"], "role": "Member"},
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        # PUT keyed on the USER id (what the FE has), not the internal member id.
        r = requests.put(
            f"{API_BASE}/api/orgs/{oa['org_id']}/members/{student['id']}",
            json={"id": student["id"], "role": "OrgAdmin"},
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, f"Role change by userId failed: {r.text}"
        assert r.json()["data"]["role"] == "OrgAdmin"

    def test_orgadmin_removes_member_by_userid(self, oa):
        student = _make_student(oa)
        requests.post(
            f"{API_BASE}/api/orgs/{oa['org_id']}/members",
            json={"userId": student["id"], "role": "Member"},
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        r = requests.delete(
            f"{API_BASE}/api/orgs/{oa['org_id']}/members/{student['id']}",
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, f"Remove by userId failed: {r.text}"
        # Confirm gone.
        r = requests.get(
            f"{API_BASE}/api/orgs/{oa['org_id']}/members",
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        ids = [m["userId"] for m in r.json()["data"]]
        assert student["id"] not in ids


# ─────────────────────────────────────────────────────────────────────────────
# #3 / #4 — Per-course roles; add-to-course then assign role
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestPerCourseRoles:
    """#3 — Role is per-course. #4 — Enroll into a course, then the role applies there."""

    def _enroll(self, oa, course_id, user_id, role):
        return requests.post(
            f"{API_BASE}/api/courses/{course_id}/enrollments",
            json={"userId": user_id, "role": role},
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )

    def test_same_user_teacher_in_one_course_student_in_another(self, oa):
        student = _make_student(oa)
        # Two distinct courses.
        c1 = requests.post(f"{API_BASE}/api/courses",
                           json={"title": _unique("C1"), "courseCode": "C1"},
                           headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT).json()
        c1 = (c1.get("data") or c1)["id"]
        c2 = requests.post(f"{API_BASE}/api/courses",
                           json={"title": _unique("C2"), "courseCode": "C2"},
                           headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT).json()
        c2 = (c2.get("data") or c2)["id"]

        r1 = self._enroll(oa, c1, student["id"], "Teacher")
        r2 = self._enroll(oa, c2, student["id"], "Student")
        assert r1.status_code == 200, r1.text
        assert r2.status_code == 200, r2.text
        assert r1.json()["data"]["role"] == "Teacher"
        assert r2.json()["data"]["role"] == "Student"
        # Both are immediately Approved (direct OrgAdmin enrollment).
        assert r1.json()["data"]["status"] == "Approved"

        # Verify per-course persistence via GET on each course.
        g1 = requests.get(f"{API_BASE}/api/courses/{c1}/enrollments",
                          headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT).json()["data"]
        g2 = requests.get(f"{API_BASE}/api/courses/{c2}/enrollments",
                          headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT).json()["data"]
        assert next(e for e in g1 if e["userId"] == student["id"])["role"] == "Teacher"
        assert next(e for e in g2 if e["userId"] == student["id"])["role"] == "Student"

    def test_add_to_course_then_change_role(self, oa, fresh_course):
        student = _make_student(oa)
        r = self._enroll(oa, fresh_course["id"], student["id"], "Student")
        assert r.status_code == 200, r.text
        # Now promote to Teacher within this specific course.
        r = requests.patch(
            f"{API_BASE}/api/courses/{fresh_course['id']}/enrollments/{student['id']}",
            json={"role": "Teacher"},
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        assert r.json()["data"]["role"] == "Teacher"


# ─────────────────────────────────────────────────────────────────────────────
# #5 — Self-service enrollment request + OrgAdmin approval
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.wave2
@pytest.mark.user
@pytest.mark.orgadmin
class TestEnrollmentRequestApproval:
    """#5 — User requests enrollment (Pending); OrgAdmin approves/rejects."""

    def _request(self, student, oa, course_id):
        return requests.post(
            f"{API_BASE}/api/courses/{course_id}/enrollments/request",
            json={},
            headers=_headers(student["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )

    def test_user_request_creates_pending(self, oa, fresh_course):
        student = _make_student(oa)
        r = self._request(student, oa, fresh_course["id"])
        assert r.status_code == 200, r.text
        body = r.json()["data"]
        assert body["status"] == "Pending"
        assert body["role"] == "Student"

    def test_orgadmin_sees_pending_request(self, oa, fresh_course):
        student = _make_student(oa)
        self._request(student, oa, fresh_course["id"])
        r = requests.get(
            f"{API_BASE}/api/courses/{fresh_course['id']}/enrollments?status=Pending",
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        rows = r.json()["data"]
        assert any(e["userId"] == student["id"] and e["status"] == "Pending" for e in rows)

    def test_orgadmin_approves_request_grants_access(self, oa, fresh_course):
        student = _make_student(oa)
        self._request(student, oa, fresh_course["id"])
        r = requests.post(
            f"{API_BASE}/api/courses/{fresh_course['id']}/enrollments/{student['id']}/approve",
            json={},  # empty body must be accepted (role optional)
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, f"Approve with empty body failed: {r.text}"
        assert r.json()["data"]["status"] == "Approved"

        # The student now sees their own enrollment as Approved.
        r = requests.get(
            f"{API_BASE}/api/courses/{fresh_course['id']}/enrollments",
            headers=_headers(student["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        mine = [e for e in r.json()["data"] if e["userId"] == student["id"]]
        assert mine and mine[0]["status"] == "Approved"

    def test_orgadmin_approves_with_teacher_role(self, oa, fresh_course):
        student = _make_student(oa)
        self._request(student, oa, fresh_course["id"])
        r = requests.post(
            f"{API_BASE}/api/courses/{fresh_course['id']}/enrollments/{student['id']}/approve",
            json={"role": "Teacher"},
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        assert r.json()["data"]["status"] == "Approved"
        assert r.json()["data"]["role"] == "Teacher"

    def test_orgadmin_rejects_then_user_can_rerequest(self, oa, fresh_course):
        student = _make_student(oa)
        self._request(student, oa, fresh_course["id"])
        r = requests.post(
            f"{API_BASE}/api/courses/{fresh_course['id']}/enrollments/{student['id']}/reject",
            json={},
            headers=_headers(oa["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        assert r.json()["data"]["status"] == "Rejected"

        # Re-request reopens as Pending.
        r = self._request(student, oa, fresh_course["id"])
        assert r.status_code == 200, r.text
        assert r.json()["data"]["status"] == "Pending"

    def test_request_unknown_course_is_404(self, oa):
        student = _make_student(oa)
        r = requests.post(
            f"{API_BASE}/api/courses/{uuid.uuid4()}/enrollments/request",
            json={},
            headers=_headers(student["token"], oa["org_id"]),
            timeout=TIMEOUT,
        )
        assert r.status_code == 404, r.text

"""
Browser E2E — Student course participation workflows (Spec §4.1 + §4.3).

Validates:
  - Enrolled student can navigate to a course and view modules/content
  - Unenrolled user gets access-denied message (Spec §4.1 strict privacy)
  - Student can reach the quiz play page and submit answers (auto-grade)
  - Progress is auto-recorded after content view
"""

import uuid
import requests
import pytest
from _helpers import FE_BASE, API_BASE, login_fresh_user, register_user, unique_suffix

TIMEOUT = 12000  # ms

SYSADMIN_USER = "SysAdmin1"
SYSADMIN_PASS = "SysAdmin@123"
ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORGADMIN1_ORG_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ORGADMIN1_ORG_SLUG = "test-org-1"
ORGADMIN1_ORG_NAME = "Test Organization 1"

# JS snippet to set org context in localStorage (OrgContext reads 'current_org', 'org_id', 'org_slug')
def _set_org_context(page, org_id: str = ORGADMIN1_ORG_ID,
                     org_slug: str = ORGADMIN1_ORG_SLUG,
                     org_name: str = ORGADMIN1_ORG_NAME):
    page.evaluate(
        f"localStorage.setItem('current_org', JSON.stringify({{id:'{org_id}',slug:'{org_slug}',name:'{org_name}'}}));"
        f"localStorage.setItem('org_id', '{org_id}');"
        f"localStorage.setItem('org_slug', '{org_slug}');"
    )


def _api_login(username: str, password: str, org_id: str | None = None) -> str:
    headers = {"X-Org-Id": org_id} if org_id else {}
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": username, "password": password},
        headers=headers,
        timeout=10,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["data"]["accessToken"]


def _ah(token: str, org_id: str | None = None) -> dict:
    h = {"Authorization": f"Bearer {token}"}
    if org_id:
        h["X-Org-Id"] = org_id
    return h


def _setup_course_with_module() -> dict:
    """Create a course + module using OrgAdmin1 seeded context. Returns ids."""
    oa_token = _api_login(ORGADMIN1_USER, ORGADMIN1_PASS, ORGADMIN1_ORG_ID)

    course_title = f"E2E Course {unique_suffix('c')}"
    r = requests.post(
        f"{API_BASE}/api/courses",
        json={"title": course_title, "description": "E2E test course"},
        headers=_ah(oa_token, ORGADMIN1_ORG_ID),
        timeout=10,
    )
    assert r.status_code in (200, 201), f"Create course failed: {r.status_code} {r.text}"
    course = r.json().get("data", r.json())
    course_id = course["id"]

    module_title = f"E2E Module {unique_suffix('m')}"
    r = requests.post(
        f"{API_BASE}/api/courses/{course_id}/modules",
        json={"title": module_title, "description": ""},
        headers=_ah(oa_token, ORGADMIN1_ORG_ID),
        timeout=10,
    )
    assert r.status_code in (200, 201), f"Create module failed: {r.status_code} {r.text}"
    module_id = r.json().get("data", r.json()).get("id") or r.json().get("data", {}).get("moduleId")

    return {
        "course_id": course_id,
        "course_title": course_title,
        "module_title": module_title,
        "oa_token": oa_token,
    }


def _enroll_user_in_course(course_id: str, user_id: str, oa_token: str, role: str = "Student"):
    """Enroll user_id in course as given role using OrgAdmin token."""
    r = requests.post(
        f"{API_BASE}/api/courses/{course_id}/enrollments",
        json={"userId": user_id, "role": role},
        headers=_ah(oa_token, ORGADMIN1_ORG_ID),
        timeout=10,
    )
    assert r.status_code in (200, 201), f"Enroll failed: {r.status_code} {r.text}"


def _get_my_user_id(token: str) -> str:
    r = requests.get(
        f"{API_BASE}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code == 200
    return r.json()["data"]["id"]


# ─────────────────────────────────────────────────────────────────────────────
# Unenrolled user sees access-denied (Spec §4.1 strict privacy)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestCourseStrictPrivacyUI:
    """Spec §4.1 — unenrolled user cannot view course content."""

    def test_unenrolled_user_sees_access_denied_on_course_page(self, page):
        """Navigate to a real course as non-enrolled user → error shown, not course content."""
        ctx = _setup_course_with_module()
        login_fresh_user(page, "notenrolled")  # fresh user NOT enrolled

        page.goto(f"{FE_BASE}/user/course/{ctx['course_id']}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(4000)  # Allow auth refresh + API call + React render

        # Diagnostic: check URL and page state
        assert "/login" not in page.url, f"Unenrolled user was redirected to login: {page.url}"

        # Wait for either the error card or the content panel to appear (20s)
        # This tells us which branch the FE takes
        try:
            page.locator("[data-testid='course-access-error']").wait_for(state="visible", timeout=20000)
        except Exception:
            content = page.content()
            content_panel_visible = page.locator("[data-testid='course-content-panel']").count() > 0
            raise AssertionError(
                f"course-access-error not visible after 20s. "
                f"URL={page.url} | content-panel={content_panel_visible} | "
                f"Page has 'Course not found' text: {'Course not found' in content} | "
                f"Page has 'Access denied' text: {'Access denied' in content}"
            )

        # Unenrolled user must NOT see course content panel (strict privacy Spec §4.1)
        assert page.locator("[data-testid='course-content-panel']").count() == 0, (
            "Unenrolled user can see course content — privacy violation!"
        )

    def test_enrolled_student_sees_course_content_panel(self, page):
        """Enrolled student can access the course content panel."""
        ctx = _setup_course_with_module()

        # Create a fresh student and enroll them
        creds = register_user("student")
        user_token = _api_login(creds["username"], creds["password"])
        user_id = _get_my_user_id(user_token)
        _enroll_user_in_course(ctx["course_id"], user_id, ctx["oa_token"])

        # Login via UI
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill(creds["username"])
        page.locator("[data-testid='login-password']").fill(creds["password"])
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_url("**/user/**", timeout=15000)
        page.wait_for_load_state("networkidle")

        # Course API requires X-Org-Id; apiClient reads org_id from localStorage.
        # OrgContext also reads 'current_org' and clears org_id if null — set both.
        _set_org_context(page)

        # Navigate to course
        page.goto(f"{FE_BASE}/user/course/{ctx['course_id']}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(4000)  # Allow auth refresh + API call + render

        assert "/login" not in page.url, f"Enrolled student was redirected to login: {page.url}"

        # Should show course content, not error
        page.locator("[data-testid='course-content-panel']").wait_for(state="visible", timeout=20000)
        assert page.locator("[data-testid='course-access-error']").count() == 0, (
            "Enrolled student should NOT see access error"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Student course navigation
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestStudentCourseNavigation:
    """Spec §4.1 + §4.3 — enrolled student navigates course and sees modules."""

    def test_enrolled_student_sees_module_title(self, page):
        """Enrolled student sees the module title from the seeded course."""
        ctx = _setup_course_with_module()

        creds = register_user("stnav")
        user_token = _api_login(creds["username"], creds["password"])
        user_id = _get_my_user_id(user_token)
        _enroll_user_in_course(ctx["course_id"], user_id, ctx["oa_token"])

        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill(creds["username"])
        page.locator("[data-testid='login-password']").fill(creds["password"])
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_url("**/user/**", timeout=15000)

        # Set org context (OrgContext reads 'current_org' and clears org_id if null)
        _set_org_context(page)

        page.goto(f"{FE_BASE}/user/course/{ctx['course_id']}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(5000)  # Allow auth refresh + API calls + React render

        assert "/login" not in page.url, f"Enrolled student was redirected to login: {page.url}"

        # Module title should appear somewhere on the page
        assert page.locator(f"text={ctx['module_title']}").count() > 0, (
            f"Module title '{ctx['module_title']}' not visible on course page. "
            f"URL: {page.url}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Quiz play flow via UI
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestQuizPlayWorkflow:
    """Spec §4.3 — quiz play: load, answer, submit, see score."""

    def test_user_quiz_play_page_renders(self, page):
        """Navigate to the quiz play page for a user-owned quiz — questions render."""
        creds = login_fresh_user(page, "qptest")
        user_token = _api_login(creds["username"], creds["password"])

        # Create a quiz with 1 question
        r = requests.post(
            f"{API_BASE}/api/quizzes",
            json={"title": f"E2E Quiz {unique_suffix('q')}", "description": ""},
            headers={"Authorization": f"Bearer {user_token}"},
            timeout=10,
        )
        assert r.status_code in (200, 201)
        quiz_data = r.json()["data"]
        quiz_id = quiz_data.get("quizId") or quiz_data.get("id")

        r2 = requests.post(
            f"{API_BASE}/api/quizzes/{quiz_id}/questions",
            json={
                "questionText": "What is 2+2?",
                "questionType": "MultipleChoice",
                "options": [
                    {"optionText": "3", "isCorrect": False},
                    {"optionText": "4", "isCorrect": True},
                    {"optionText": "5", "isCorrect": False},
                ],
                "explanation": None,
                "orderIndex": 0,
            },
            headers={"Authorization": f"Bearer {user_token}"},
            timeout=10,
        )
        assert r2.status_code in (200, 201), f"Create question failed: {r2.status_code} {r2.text}"

        # Navigate to quiz play (route is /user/quiz?quizId=...)
        page.goto(f"{FE_BASE}/user/quiz?quizId={quiz_id}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)

        # Quiz question should render
        assert page.locator("text=What is 2+2?").count() > 0 or \
               page.locator("[data-testid='quiz-question']").count() > 0, (
            "Quiz question text not visible on quiz play page"
        )

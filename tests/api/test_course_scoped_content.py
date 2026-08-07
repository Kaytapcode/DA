"""
API use-case tests — 2026-06-06 dev requirement (SPEC UPDATE PENDING, see SPEC_ADDITIONS.md).

Content CREATED INSIDE a course (via the in-course "add content" flow) must be **course-scoped**:
it is saved into the course module, but is HIDDEN from the creator's personal Library and from
public search/clone — visible ONLY inside the course.

This narrows spec §5 invariant 1 ("All User-created resources are public"): resources authored
*inside a course* are an explicit exception. NOT yet in SystemDoc — back-fill the `# Spec X.Y`
markers when the dev updates the spec.

The in-course flow the FE performs is: create the resource through the SAME user creation
endpoint (POST /api/quizzes | /api/videos/personal | /api/decks), then link it into the course
module (POST /api/courses/{cid}/modules/{mid}/contents/link). Linking is what marks the content
course-scoped. These tests replicate that exact two-step flow and assert the resulting visibility.

Runs end-to-end against the live stack. Reuses the OrgAdmin/student bootstrap from test_orgadmin_wave2.
"""

import uuid
import requests
import pytest

from .test_orgadmin_wave2 import API_BASE, TIMEOUT, _headers, _unique

# Seeded OrgAdmin1 + TestOrg1 (Spec §5 seed data) — guaranteed present, no SysAdmin dependency.
ORGADMIN1_USER = "OrgAdmin1"
ORGADMIN1_PASS = "OrgAdmin@123"
ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures + helpers
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def oa():
    """Log in as the seeded OrgAdmin1 (with TestOrg1 context)."""
    r = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"username": ORGADMIN1_USER, "password": ORGADMIN1_PASS},
        headers={"X-Org-Id": ORG1_ID},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"OrgAdmin1 login failed: {r.status_code} {r.text}"
    return {"token": r.json()["data"]["accessToken"], "org_id": ORG1_ID}


@pytest.fixture
def course_module(oa):
    """A fresh course (auto-creates default modules) + the id of its first module."""
    r = requests.post(
        f"{API_BASE}/api/courses",
        json={"title": _unique("ScopedCourse"), "description": "course-scope flow", "courseCode": "CS"},
        headers=_headers(oa["token"], oa["org_id"]),
        timeout=TIMEOUT,
    )
    assert r.status_code in (200, 201), r.text
    cid = (r.json().get("data") or r.json())["id"]
    mods = requests.get(
        f"{API_BASE}/api/courses/{cid}/modules",
        headers=_headers(oa["token"], oa["org_id"]),
        timeout=TIMEOUT,
    ).json()
    mid = (mods.get("data") or mods)[0]["id"]
    return cid, mid


def _link(oa, cid, mid, content_id):
    r = requests.post(
        f"{API_BASE}/api/courses/{cid}/modules/{mid}/contents/link",
        json={"contentId": content_id},
        headers=_headers(oa["token"], oa["org_id"]),
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"link failed: {r.status_code} {r.text}"
    return r


def _module_content_ids(oa, cid, mid):
    r = requests.get(
        f"{API_BASE}/api/courses/{cid}/modules/{mid}/contents",
        headers=_headers(oa["token"], oa["org_id"]),
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, r.text
    items = r.json().get("data") or []
    return [it["id"] for it in items]


def _library_content_ids(oa, path):
    """contentIds present in a personal-library list endpoint (quizzes/videos/decks)."""
    r = requests.get(f"{API_BASE}/api/{path}", headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    items = r.json().get("data") or []
    return [it.get("contentId") for it in items]


def _search_ids(oa, q, type_=None):
    params = {"q": q}
    if type_:
        params["type"] = type_
    r = requests.get(f"{API_BASE}/api/search", params=params,
                     headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    items = r.json().get("data") or []
    # SearchResultDto.id == the content id
    return [it.get("id") for it in items]


# ─────────────────────────────────────────────────────────────────────────────
# QUIZ
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestCourseScopedQuiz:
    def _create_quiz(self, oa, title):
        r = requests.post(f"{API_BASE}/api/quizzes",
                          json={"title": title, "timeLimit": None, "passingScore": None},
                          headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        return (r.json().get("data") or r.json())["contentId"]

    def test_quiz_created_in_course_is_saved_to_course(self, oa, course_module):
        """Spec-pending: in-course content is actually persisted into the module."""
        cid, mid = course_module
        content_id = self._create_quiz(oa, _unique("CQuiz"))
        _link(oa, cid, mid, content_id)
        assert content_id in _module_content_ids(oa, cid, mid), "quiz must be saved into the course module"

    def test_quiz_created_in_course_hidden_from_library(self, oa, course_module):
        """Spec-pending: a personal quiz is in the library BEFORE linking, GONE after (course-scoped)."""
        cid, mid = course_module
        title = _unique("CQuizLib")
        content_id = self._create_quiz(oa, title)
        assert content_id in _library_content_ids(oa, "quizzes"), "freshly created quiz should be in library pre-link"
        _link(oa, cid, mid, content_id)
        assert content_id not in _library_content_ids(oa, "quizzes"), "course-scoped quiz must be hidden from library"

    def test_quiz_created_in_course_hidden_from_search(self, oa, course_module):
        """Spec-pending: course-scoped quiz never appears in public search."""
        cid, mid = course_module
        title = _unique("CQuizSearch")
        content_id = self._create_quiz(oa, title)
        _link(oa, cid, mid, content_id)
        assert content_id not in _search_ids(oa, title, "QUIZ"), "course-scoped quiz must not appear in search"

    def test_quiz_created_in_course_cannot_be_cloned(self, oa, course_module):
        """Spec-pending: course-scoped content is not public → clone is forbidden."""
        cid, mid = course_module
        content_id = self._create_quiz(oa, _unique("CQuizClone"))
        _link(oa, cid, mid, content_id)
        r = requests.post(f"{API_BASE}/api/contents/{content_id}/clone",
                          headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT)
        assert r.status_code == 403, f"clone of course-scoped content must be 403, got {r.status_code}: {r.text}"


# ─────────────────────────────────────────────────────────────────────────────
# VIDEO
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestCourseScopedVideo:
    def _create_video(self, oa, title):
        r = requests.post(f"{API_BASE}/api/videos/personal",
                          json={"youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                                "title": title, "description": None},
                          headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        return (r.json().get("data") or r.json())["contentId"]

    def test_video_created_in_course_saved_and_hidden_from_library(self, oa, course_module):
        cid, mid = course_module
        content_id = self._create_video(oa, _unique("CVid"))
        assert content_id in _library_content_ids(oa, "videos/personal"), "video should be in library pre-link"
        _link(oa, cid, mid, content_id)
        assert content_id in _module_content_ids(oa, cid, mid), "video must be saved into the course module"
        assert content_id not in _library_content_ids(oa, "videos/personal"), "course-scoped video must be hidden from library"


# ─────────────────────────────────────────────────────────────────────────────
# DECK (Flashcards)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.api
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestCourseScopedDeck:
    def _create_deck(self, oa, title):
        r = requests.post(f"{API_BASE}/api/decks",
                          json={"title": title, "theme": None},
                          headers=_headers(oa["token"], oa["org_id"]), timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        return (r.json().get("data") or r.json())["contentId"]

    def test_deck_created_in_course_saved_and_hidden_from_library(self, oa, course_module):
        cid, mid = course_module
        content_id = self._create_deck(oa, _unique("CDeck"))
        assert content_id in _library_content_ids(oa, "decks"), "deck should be in library pre-link"
        _link(oa, cid, mid, content_id)
        assert content_id in _module_content_ids(oa, cid, mid), "deck must be saved into the course module"
        assert content_id not in _library_content_ids(oa, "decks"), "course-scoped deck must be hidden from library"

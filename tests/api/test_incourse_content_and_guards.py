"""
Regression tests for the 2026-06-07 bug batch (OrgAdmin/User/SysAdmin).

Root cause (1.1/1.2): per-resource access gated on strict org_id equality, so an enrolled
student (who has NO globally-selected org) got 404 on in-course quizzes/decks and on every
course-progress write → "content interaction not working" + all course/home counters stayed 0.
Fix: gates fall back to CourseAccessService.CanViewAsync / CanViewContentAsync (per-course).

Also covers 1.4 role guards: last-OrgAdmin cannot be removed/demoted; SysAdmin cannot self-delete;
and 1.3 create-user validation surfaces a real error (not a generic one).

Markers: wave1, api. Uses seeded accounts (CLAUDE.md §"Seeded test accounts").
"""
import uuid
import requests
import pytest

API = "http://localhost:5000"
ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


def _login(username, password, org=None):
    headers = {"X-Org-Id": org} if org else {}
    r = requests.post(f"{API}/api/auth/login", json={"username": username, "password": password}, headers=headers, timeout=15)
    assert r.status_code == 200, f"login {username}: {r.status_code} {r.text}"
    return r.json().get("data") or {}


@pytest.fixture(scope="module")
def orgadmin():
    d = _login("OrgAdmin1", "OrgAdmin@123", ORG_A)
    return {"h": {"Authorization": f"Bearer {d['accessToken']}", "X-Org-Id": ORG_A}, "id": (d.get("user") or {}).get("id")}


@pytest.fixture(scope="module")
def student():
    d = _login("User2", "User@123")
    return {"h": {"Authorization": f"Bearer {d['accessToken']}"}, "id": (d.get("user") or {}).get("id")}


@pytest.fixture(scope="module")
def course_with_quiz(orgadmin, student):
    """OrgAdmin builds a course, links an in-course quiz, enrolls the student (Approved). Cleans up."""
    H = orgadmin["h"]
    c = requests.post(f"{API}/api/courses", json={"title": f"LuminaTest_Course_{uuid.uuid4().hex[:6]}"}, headers=H, timeout=30)
    assert c.status_code in (200, 201), c.text
    course_id = (c.json().get("data") or {}).get("id")
    module_id = ((requests.get(f"{API}/api/courses/{course_id}/modules", headers=H, timeout=20).json().get("data") or [])[0]).get("id")
    q = requests.post(f"{API}/api/quizzes", json={"title": "LuminaTest_Quiz"}, headers=H, timeout=20)
    qd = q.json().get("data") or {}
    quiz_id, content_id = qd.get("quizId") or qd.get("id"), qd.get("contentId")
    requests.post(f"{API}/api/courses/{course_id}/modules/{module_id}/contents/link", json={"contentId": content_id}, headers=H, timeout=20)
    requests.post(f"{API}/api/courses/{course_id}/enrollments", json={"userId": student["id"], "role": "Student"}, headers=H, timeout=20)
    yield {"course_id": course_id, "module_id": module_id, "quiz_id": quiz_id, "content_id": content_id}
    # teardown — remove transient data
    requests.delete(f"{API}/api/quizzes/{quiz_id}", headers=H, timeout=20)
    requests.delete(f"{API}/api/courses/{course_id}", headers=H, timeout=20)
    requests.delete(f"{API}/api/orgs/{ORG_A}/members/{student['id']}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.api
def test_enrolled_student_can_open_incourse_quiz(course_with_quiz, student):
    """1.2 — an enrolled student with no selected org can open in-course quiz content (was 404)."""
    r = requests.get(f"{API}/api/quizzes/{course_with_quiz['quiz_id']}/questions", headers=student["h"], timeout=20)
    assert r.status_code == 200, f"expected 200, got {r.status_code} {r.text}"


@pytest.mark.wave1
@pytest.mark.api
def test_enrolled_student_records_course_progress(course_with_quiz, student):
    """1.1/1.2 — course-scoped progress writes succeed and the % bar computes (was 404 → counters 0)."""
    cw = course_with_quiz
    r = requests.post(f"{API}/api/courses/{cw['course_id']}/progress",
                      json={"moduleId": cw["module_id"], "contentId": cw["content_id"], "isCompleted": True, "timeSpentSeconds": 5},
                      headers=student["h"], timeout=20)
    assert r.status_code == 200, f"record progress: {r.status_code} {r.text}"
    g = requests.get(f"{API}/api/courses/{cw['course_id']}/progress", headers=student["h"], timeout=20)
    assert g.status_code == 200, g.text
    data = g.json().get("data") or {}
    assert (data.get("overallProgressPercentage") or 0) > 0, f"progress % should be >0: {data}"
    assert (data.get("completedItems") or 0) >= 1, data


@pytest.fixture(scope="module")
def course_with_doc(orgadmin, student):
    """OrgAdmin uploads a doc and links it into a course (→ course-scoped). Enrolls the student."""
    H = orgadmin["h"]
    c = requests.post(f"{API}/api/courses", json={"title": f"LuminaTest_Doc_{uuid.uuid4().hex[:6]}"}, headers=H, timeout=30)
    course_id = (c.json().get("data") or {}).get("id")
    module_id = ((requests.get(f"{API}/api/courses/{course_id}/modules", headers=H, timeout=20).json().get("data") or [])[0]).get("id")
    up = requests.post(f"{API}/api/documents", headers=H,
                       files={"file": ("course.txt", b"Secret course material for enrolled only.", "text/plain")},
                       data={"isPublic": "true"}, timeout=30)
    dd = up.json().get("data") or {}
    doc_id, content_id = dd.get("id"), dd.get("contentId")
    requests.post(f"{API}/api/courses/{course_id}/modules/{module_id}/contents/link", json={"contentId": content_id}, headers=H, timeout=20)
    requests.post(f"{API}/api/courses/{course_id}/enrollments", json={"userId": student["id"], "role": "Student"}, headers=H, timeout=20)
    yield {"course_id": course_id, "doc_id": doc_id}
    requests.delete(f"{API}/api/documents/{doc_id}", headers=H, timeout=20)
    requests.delete(f"{API}/api/courses/{course_id}", headers=H, timeout=20)
    requests.delete(f"{API}/api/orgs/{ORG_A}/members/{student['id']}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.api
def test_course_document_isolated_from_non_enrolled(course_with_doc, orgadmin, student):
    """Strict isolation: a course-scoped PDF/doc is 403 for a non-enrolled user, 200 for the
    owner and an enrolled student (per-course access, not org-equality)."""
    doc_id = course_with_doc["doc_id"]
    outsider = _login("User3", "User@123")  # not enrolled, no selected org
    OH = {"Authorization": f"Bearer {outsider['accessToken']}"}
    assert requests.get(f"{API}/api/documents/{doc_id}", headers=orgadmin["h"], timeout=20).status_code == 200
    assert requests.get(f"{API}/api/documents/{doc_id}", headers=student["h"], timeout=20).status_code == 200
    assert requests.get(f"{API}/api/documents/{doc_id}", headers=OH, timeout=20).status_code == 403


@pytest.mark.wave1
@pytest.mark.api
def test_personal_public_document_still_readable_by_others():
    """No regression: a PERSONAL public document (not course-scoped) stays readable by any user
    (spec §1 — personal resources are public)."""
    u1 = _login("User1", "User@123")
    H1 = {"Authorization": f"Bearer {u1['accessToken']}"}
    up = requests.post(f"{API}/api/documents", headers=H1,
                       files={"file": ("personal.txt", b"A public personal document.", "text/plain")},
                       data={"isPublic": "true"}, timeout=30)
    doc_id = (up.json().get("data") or {}).get("id")
    try:
        other = _login("User3", "User@123")
        OH = {"Authorization": f"Bearer {other['accessToken']}"}
        assert requests.get(f"{API}/api/documents/{doc_id}", headers=OH, timeout=20).status_code == 200
    finally:
        requests.delete(f"{API}/api/documents/{doc_id}", headers=H1, timeout=20)


@pytest.fixture(scope="module")
def course_with_video(orgadmin, student):
    """OrgAdmin creates a course, links a VIDEO, enrolls the student. For the 2026-06-07 batch."""
    H = orgadmin["h"]
    c = requests.post(f"{API}/api/courses", json={"title": f"LuminaTest_Vid_{uuid.uuid4().hex[:6]}"}, headers=H, timeout=30)
    course_id = (c.json().get("data") or {}).get("id")
    module_id = ((requests.get(f"{API}/api/courses/{course_id}/modules", headers=H, timeout=20).json().get("data") or [])[0]).get("id")
    v = requests.post(f"{API}/api/videos/personal", json={"youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "LuminaTest Vid", "description": None}, headers=H, timeout=30)
    content_id = (v.json().get("data") or {}).get("contentId")
    requests.post(f"{API}/api/courses/{course_id}/modules/{module_id}/contents/link", json={"contentId": content_id}, headers=H, timeout=20)
    requests.post(f"{API}/api/courses/{course_id}/enrollments", json={"userId": student["id"], "role": "Student"}, headers=H, timeout=20)
    yield {"course_id": course_id, "content_id": content_id}
    requests.delete(f"{API}/api/courses/{course_id}", headers=H, timeout=20)
    requests.delete(f"{API}/api/orgs/{ORG_A}/members/{student['id']}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.api
def test_modules_dto_includes_video_id_and_student_can_open_video(course_with_video, orgadmin, student):
    """1.1 — GET modules returns the concrete videoId (FE link needs it), and an enrolled student
    (no selected org) can fetch the video (was 403 — VideosController org-equality gate)."""
    cid = course_with_video["course_id"]
    mods = requests.get(f"{API}/api/courses/{cid}/modules", headers=student["h"], timeout=20).json().get("data") or []
    contents = [ct for m in mods for ct in (m.get("contents") or [])]
    vrow = next((x for x in contents if x.get("contentType") == "VIDEO"), None)
    assert vrow and vrow.get("videoId"), f"VIDEO content must carry videoId, got: {vrow}"
    r = requests.get(f"{API}/api/videos/{vrow['videoId']}", headers=student["h"], timeout=20)
    assert r.status_code == 200, f"enrolled student should open the video, got {r.status_code} {r.text}"


@pytest.mark.wave1
@pytest.mark.api
def test_enrollment_list_resolves_username(course_with_video, orgadmin):
    """1.2B — the enrollments roster resolves a username instead of returning only a raw GUID."""
    cid = course_with_video["course_id"]
    rows = requests.get(f"{API}/api/courses/{cid}/enrollments", headers=orgadmin["h"], timeout=20).json().get("data") or []
    assert rows, "expected at least one enrollment"
    assert any(r.get("username") for r in rows), f"at least one row must carry a username: {rows}"


@pytest.mark.wave1
@pytest.mark.api
def test_progress_persists_per_content_in_same_module(orgadmin, student):
    """2026-06-07 #3 (F) — two contents in the SAME module each keep their own completion; opening
    a second content must NOT wipe the first's completed state (upsert key now includes ContentId)."""
    H = orgadmin["h"]
    c = requests.post(f"{API}/api/courses", json={"title": f"LuminaTest_F_{uuid.uuid4().hex[:6]}"}, headers=H, timeout=30)
    cid = (c.json().get("data") or {}).get("id")
    mid = ((requests.get(f"{API}/api/courses/{cid}/modules", headers=H, timeout=20).json().get("data") or [])[0]).get("id")
    q1 = requests.post(f"{API}/api/quizzes", json={"title": "LuminaTest Q1"}, headers=H, timeout=20).json().get("data") or {}
    q2 = requests.post(f"{API}/api/quizzes", json={"title": "LuminaTest Q2"}, headers=H, timeout=20).json().get("data") or {}
    c1, c2 = q1.get("contentId"), q2.get("contentId")
    for cc in (c1, c2):
        requests.post(f"{API}/api/courses/{cid}/modules/{mid}/contents/link", json={"contentId": cc}, headers=H, timeout=20)
    requests.post(f"{API}/api/courses/{cid}/enrollments", json={"userId": student['id'], "role": "Student"}, headers=H, timeout=20)
    try:
        for cc in (c1, c2):
            requests.post(f"{API}/api/courses/{cid}/progress", json={"moduleId": mid, "contentId": cc, "isCompleted": True, "timeSpentSeconds": 3}, headers=student["h"], timeout=20)
        items = requests.get(f"{API}/api/courses/{cid}/progress/items", headers=student["h"], timeout=20).json().get("data") or []
        done = {i.get("contentId") for i in items if i.get("isCompleted")}
        assert c1 in done and c2 in done, f"both contents must stay completed, got {done}"
    finally:
        requests.delete(f"{API}/api/courses/{cid}", headers=H, timeout=20)
        for q in (q1, q2):
            requests.delete(f"{API}/api/quizzes/{q.get('quizId') or q.get('id')}", headers=H, timeout=20)
        requests.delete(f"{API}/api/orgs/{ORG_A}/members/{student['id']}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.api
def test_quiz_time_limit_is_returned(orgadmin):
    """2026-06-07 #3 (E) — a quiz's time limit (minutes) is returned by GET /quizzes/{id} so the
    player can show/enforce a countdown (it was never loaded → timer never appeared)."""
    H = orgadmin["h"]
    q = requests.post(f"{API}/api/quizzes", json={"title": f"LuminaTest_TL_{uuid.uuid4().hex[:6]}", "timeLimit": 15}, headers=H, timeout=20).json().get("data") or {}
    qid = q.get("quizId") or q.get("id")
    try:
        meta = requests.get(f"{API}/api/quizzes/{qid}", headers=H, timeout=20).json().get("data") or {}
        assert meta.get("timeLimit") == 15, f"expected timeLimit 15, got {meta.get('timeLimit')}"
    finally:
        requests.delete(f"{API}/api/quizzes/{qid}", headers=H, timeout=20)


@pytest.mark.wave1
@pytest.mark.api
def test_cannot_remove_last_orgadmin(orgadmin):
    """1.4 — the sole OrgAdmin of an org cannot be removed (would orphan the org)."""
    r = requests.delete(f"{API}/api/orgs/{ORG_A}/members/{orgadmin['id']}", headers=orgadmin["h"], timeout=20)
    assert r.status_code == 400 and "OrgAdmin" in (r.json().get("message") or ""), r.text


@pytest.mark.wave1
@pytest.mark.api
def test_cannot_demote_last_orgadmin(orgadmin):
    """1.4 — the sole OrgAdmin cannot be demoted to Member."""
    r = requests.put(f"{API}/api/orgs/{ORG_A}/members/{orgadmin['id']}", json={"role": "Member"}, headers=orgadmin["h"], timeout=20)
    assert r.status_code == 400 and "OrgAdmin" in (r.json().get("message") or ""), r.text


@pytest.mark.wave1
@pytest.mark.api
def test_sysadmin_cannot_delete_self():
    """1.4 — a SysAdmin cannot delete their own account (FE also hides the control on the own row)."""
    d = _login("SysAdmin1", "SysAdmin@123")
    H = {"Authorization": f"Bearer {d['accessToken']}"}
    me = (d.get("user") or {}).get("id")
    r = requests.delete(f"{API}/api/users/{me}", headers=H, timeout=20)
    assert r.status_code == 400 and "own account" in (r.json().get("message") or "").lower(), r.text


@pytest.mark.wave1
@pytest.mark.api
def test_create_user_invalid_input_returns_actionable_error():
    """1.3 — create-user with an invalid role returns a 400 with a specific validation message
    (the FE apiClient now maps RFC7807 .errors → a readable message instead of 'Failed to create')."""
    d = _login("SysAdmin1", "SysAdmin@123")
    H = {"Authorization": f"Bearer {d['accessToken']}"}
    u = f"LuminaTest_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{API}/api/users", json={"username": u, "email": f"{u}@ex.com", "password": "User@123", "role": "User"}, headers=H, timeout=20)
    assert r.status_code == 400, r.text
    body = r.json()
    # RFC7807 validation problem with a field-level message the FE can surface.
    assert "errors" in body or "message" in body, body

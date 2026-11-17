"""
CONTRACT.md Phase B behaviours (sections 6 and 7) verified against the live stack via the gateway only.
All data is LuminaTest_<uuid>-named and cleaned up; seeded accounts are only logged in, never modified.
"""
import json
import re
import uuid

import pytest
import requests

from fixtures.auth import SYSADMIN_USERNAME, SYSADMIN_PASSWORD

API = "http://localhost:5000"
T = 15
ORG1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
ORG2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
PW = "TestPassword123!"


def _u(prefix="x"):
    return f"LuminaTest_{prefix}_{uuid.uuid4().hex[:8]}"


def _login(user, pw, org=None):
    r = requests.post(f"{API}/api/auth/login", json={"username": user, "password": pw},
                      headers={"X-Org-Id": org} if org else {}, timeout=T)
    assert r.status_code == 200, f"login {user}: {r.status_code} {r.text}"
    return r.json()["data"]["accessToken"]


def H(token, org=None):
    h = {"Authorization": f"Bearer {token}"}
    if org:
        h["X-Org-Id"] = org
    return h


def _data(r):
    j = r.json()
    return j.get("data", j) if isinstance(j, dict) else j


def _items(r):
    d = _data(r)
    if isinstance(d, dict):
        d = d.get("items") or d.get("data") or []
    return d


@pytest.fixture(scope="module")
def sa():
    return _login(SYSADMIN_USERNAME, SYSADMIN_PASSWORD)


@pytest.fixture(scope="module")
def oa1():
    return _login("OrgAdmin1", "OrgAdmin@123", ORG1)


@pytest.fixture
def cleanup():
    fns = []
    yield fns.append
    for f in reversed(fns):
        try:
            f()
        except Exception:
            pass


@pytest.fixture
def new_user(sa, cleanup):
    """Factory: fresh Student user (via SysAdmin) -> {id, token, username}."""
    def make():
        name = _u("usr").lower()
        r = requests.post(f"{API}/api/users", json={"username": name, "password": PW,
                          "email": f"{name}@lumina.test", "role": "Student"}, headers=H(sa), timeout=T)
        assert r.status_code == 200, r.text
        uid = _data(r)["id"]
        cleanup(lambda: requests.delete(f"{API}/api/users/{uid}", headers=H(sa), timeout=T))
        return {"id": uid, "username": name, "token": _login(name, PW)}
    return make


@pytest.fixture
def mk_course(oa1, cleanup):
    """Factory: course in TestOrg1 owned by OrgAdmin1 (DRAFT)."""
    def make():
        r = requests.post(f"{API}/api/courses", json={"title": _u("course"), "description": "t", "courseCode": "LT"},
                          headers=H(oa1, ORG1), timeout=T)
        assert r.status_code in (200, 201), r.text
        c = _data(r)
        cleanup(lambda: requests.delete(f"{API}/api/courses/{c['id']}", headers=H(oa1, ORG1), timeout=T))
        return c
    return make


def _publish(oa1, cid, status="PUBLISHED"):
    return requests.patch(f"{API}/api/courses/{cid}/status", json={"status": status}, headers=H(oa1, ORG1), timeout=T)


def _enroll(oa1, cid, uid, role):
    r = requests.post(f"{API}/api/courses/{cid}/enrollments", json={"userId": uid, "role": role},
                      headers=H(oa1, ORG1), timeout=T)
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------- 1. M1
@pytest.mark.api
@pytest.mark.security
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestM1ForeignOrgHeader:
    def test_orgadmin_foreign_xorgid_still_sees_own_org_only(self, oa1, mk_course):
        """Invariant 7: X-Org-Id of another org is ignored for non-SysAdmin."""
        # Spec §1 invariant 7 / CONTRACT M1
        c = mk_course()
        r = requests.get(f"{API}/api/courses?pageSize=100", headers=H(oa1, ORG2), timeout=T)
        assert r.status_code == 200, r.text
        ids = {x["id"] for x in _items(r)}
        assert c["id"] in ids, "foreign X-Org-Id changed the org context away from TestOrg1"
        assert all(x.get("orgId", ORG1) == ORG1 for x in _items(r))

    def test_orgadmin_cannot_create_or_delete_course_in_other_org(self, oa1, sa, cleanup):
        """OrgAdmin1 sending X-Org-Id=Org2 creates in Org1 only and cannot delete an Org2 course."""
        # Spec §1 invariant 7 / CONTRACT M1
        oa2 = _login("OrgAdmin2", "OrgAdmin@123", ORG2)
        r2 = requests.post(f"{API}/api/courses", json={"title": _u("c2"), "description": "t", "courseCode": "LT"},
                           headers=H(oa2, ORG2), timeout=T)
        assert r2.status_code in (200, 201), r2.text
        c2 = _data(r2)["id"]
        cleanup(lambda: requests.delete(f"{API}/api/courses/{c2}", headers=H(oa2, ORG2), timeout=T))
        rd = requests.delete(f"{API}/api/courses/{c2}", headers=H(oa1, ORG2), timeout=T)
        assert rd.status_code in (403, 404), f"OrgAdmin1 deleted Org2 course: {rd.status_code}"
        assert requests.get(f"{API}/api/courses/{c2}", headers=H(sa), timeout=T).status_code == 200
        rc = requests.post(f"{API}/api/courses", json={"title": _u("leak"), "description": "t", "courseCode": "LT"},
                           headers=H(oa1, ORG2), timeout=T)
        if rc.status_code in (200, 201):
            d = _data(rc)
            cleanup(lambda: requests.delete(f"{API}/api/courses/{d['id']}", headers=H(oa1, ORG1), timeout=T))
            assert d.get("orgId") in (None, ORG1), "course created in Org2 by OrgAdmin1"
        else:
            assert rc.status_code in (400, 403)


# ---------------------------------------------------------------- 2. M5
@pytest.mark.api
@pytest.mark.security
@pytest.mark.wave2
@pytest.mark.orgadmin
class TestM5MemberAnalytics:
    def test_member_analytics_scope(self, oa1, sa):
        """Org-scoped analytics: other org 403, own org 200, SysAdmin 200."""
        # Spec §1 invariant 7 / CONTRACT M5
        url = lambda o: f"{API}/api/analytics/orgs/{o}/members"
        assert requests.get(url(ORG2), headers=H(oa1, ORG1), timeout=T).status_code == 403
        assert requests.get(url(ORG1), headers=H(oa1, ORG1), timeout=T).status_code == 200
        assert requests.get(url(ORG2), headers=H(sa), timeout=T).status_code == 200


# ---------------------------------------------------------------- 3. M6/Q3
@pytest.mark.api
@pytest.mark.security
@pytest.mark.wave2
class TestM6CourseStatus:
    def _in_catalog(self, token, cid, title):
        r = requests.get(f"{API}/api/courses/catalog", params={"query": title, "pageSize": 200}, headers=H(token), timeout=T)
        assert r.status_code == 200, r.text
        return cid in {x["id"] for x in _items(r)}

    def test_course_status_lifecycle_controls_catalog_and_requests(self, oa1, mk_course, new_user):
        """Spec §4.2 / Q3: new course DRAFT; only PUBLISHED is in catalog and requestable."""
        # CONTRACT M6/Q3
        c = mk_course()
        u = new_user()
        assert c.get("status") == "DRAFT"
        assert not self._in_catalog(u["token"], c["id"], c["title"])
        req = lambda: requests.post(f"{API}/api/courses/{c['id']}/enrollments/request", headers=H(u["token"]), timeout=T)
        assert req().status_code == 404
        assert _publish(oa1, c["id"]).status_code == 200
        assert self._in_catalog(u["token"], c["id"], c["title"])
        assert req().status_code == 200
        assert _publish(oa1, c["id"], "ARCHIVED").status_code == 200
        assert not self._in_catalog(u["token"], c["id"], c["title"])

    def test_normal_user_cannot_patch_course_status(self, mk_course, new_user):
        """Only OrgAdmin/SysAdmin may set course status."""
        # CONTRACT M6 / §7
        c = mk_course()
        u = new_user()
        r = requests.patch(f"{API}/api/courses/{c['id']}/status", json={"status": "PUBLISHED"}, headers=H(u["token"]), timeout=T)
        assert r.status_code == 403


# ---------------------------------------------------------------- 4. Q2/M13
@pytest.mark.api
@pytest.mark.security
@pytest.mark.wave2
class TestQ2NoGlobalTeacher:
    def test_sysadmin_cannot_create_global_teacher(self, sa, cleanup):
        """Q2: global roles are Student/OrgAdmin/SysAdmin only."""
        # CONTRACT Q2
        n = _u("tch").lower()
        r = requests.post(f"{API}/api/users", json={"username": n, "password": PW, "email": f"{n}@lumina.test",
                          "role": "Teacher"}, headers=H(sa), timeout=T)
        if r.status_code == 200:
            uid = _data(r)["id"]
            cleanup(lambda: requests.delete(f"{API}/api/users/{uid}", headers=H(sa), timeout=T))
        assert r.status_code == 400

    def test_student_cannot_create_course(self, new_user):
        """M13: course CRUD is OrgAdmin/SysAdmin only."""
        # CONTRACT M13
        u = new_user()
        r = requests.post(f"{API}/api/courses", json={"title": _u("c"), "description": "t", "courseCode": "LT"},
                          headers=H(u["token"]), timeout=T)
        assert r.status_code == 403

    def test_per_course_teacher_scoped_to_own_course(self, oa1, mk_course, new_user):
        """Per-course Teacher (JWT Student) can add modules to that course only."""
        # Spec §4.1 / CONTRACT M13
        a, b = mk_course(), mk_course()
        u = new_user()
        _enroll(oa1, a["id"], u["id"], "Teacher")
        ok = requests.post(f"{API}/api/courses/{a['id']}/modules", json={"title": "LT mod"}, headers=H(u["token"]), timeout=T)
        assert ok.status_code == 200, ok.text
        bad = requests.post(f"{API}/api/courses/{b['id']}/modules", json={"title": "LT mod"}, headers=H(u["token"]), timeout=T)
        assert bad.status_code in (403, 404)


# ---------------------------------------------------------------- 5. module-in-course
@pytest.mark.api
@pytest.mark.security
@pytest.mark.wave2
def test_teacher_of_a_cannot_touch_module_of_b(oa1, mk_course, new_user):
    """CONTRACT §7: module routes 404 when the module is not in that course."""
    # CONTRACT §7 module-in-course
    a, b = mk_course(), mk_course()
    u = new_user()
    _enroll(oa1, a["id"], u["id"], "Teacher")
    mb = requests.post(f"{API}/api/courses/{b['id']}/modules", json={"title": "LT original"}, headers=H(oa1, ORG1), timeout=T)
    assert mb.status_code == 200, mb.text
    mid = _data(mb)["id"]
    tok = H(u["token"])
    assert requests.put(f"{API}/api/courses/{a['id']}/modules/{mid}", json={"title": "hacked"}, headers=tok, timeout=T).status_code == 404
    assert requests.delete(f"{API}/api/courses/{a['id']}/modules/{mid}", headers=tok, timeout=T).status_code == 404
    mods = _items(requests.get(f"{API}/api/courses/{b['id']}/modules", headers=H(oa1, ORG1), timeout=T))
    mine = [m for m in mods if m["id"] == mid]
    assert mine and mine[0]["title"] == "LT original"


# ---------------------------------------------------------------- 6. Q5
@pytest.mark.api
@pytest.mark.wave2
@pytest.mark.parametrize("body", [{"title": ""}, {"title": "   "}, {"description": "no title"}], ids=["empty", "blank", "omitted"])
def test_blank_module_title_becomes_topic_n(oa1, mk_course, body):
    """Spec §3.2 / Q5: BE assigns 'Topic N' (N = existing count + 1)."""
    # CONTRACT Q5
    c = mk_course()
    before = len(_items(requests.get(f"{API}/api/courses/{c['id']}/modules", headers=H(oa1, ORG1), timeout=T)))
    r = requests.post(f"{API}/api/courses/{c['id']}/modules", json=body, headers=H(oa1, ORG1), timeout=T)
    assert r.status_code == 200, r.text
    assert _data(r)["title"] == f"Topic {before + 1}"


# ---------------------------------------------------------------- 7. M14
@pytest.mark.api
@pytest.mark.security
@pytest.mark.wave1
class TestM14OrgCreation:
    def test_normal_user_cannot_create_organization(self, new_user):
        """M14: only SysAdmin (or OrgAdmin registration) creates orgs."""
        # CONTRACT M14
        u = new_user()
        n = _u("org")
        r = requests.post(f"{API}/api/organizations", json={"name": n, "slug": n.lower().replace("_", "-"),
                          "description": "t"}, headers=H(u["token"]), timeout=T)
        assert r.status_code == 403

    def test_registered_orgadmin_can_update_own_org(self, sa, cleanup):
        """M14: founding OrgAdmin owns the org and may PUT it."""
        # CONTRACT M14 / Spec §1 OrgAdmin
        n = _u("oa").lower()
        slug = n.replace("_", "-")
        r = requests.post(f"{API}/api/auth/register/orgadmin", json={"username": n, "email": f"{n}@lumina.test",
                          "password": "OrgAdmin@789", "organizationName": f"LuminaTest Org {n[-8:]}",
                          "organizationSlug": slug}, timeout=T)
        assert r.status_code in (200, 201), r.text
        lr = requests.post(f"{API}/api/auth/login", json={"username": n, "password": "OrgAdmin@789"}, timeout=T)
        assert lr.status_code == 200, lr.text
        ld = lr.json()["data"]
        org_id = ld.get("orgId") or _data(r).get("orgId") if isinstance(_data(r), dict) else ld.get("orgId")
        tok = ld["accessToken"]
        if not org_id:
            mine = requests.get(f"{API}/api/organizations/mine", headers=H(tok), timeout=T)
            org_id = _data(mine)[0]["id"]
        cleanup(lambda: requests.delete(f"{API}/api/organizations/{org_id}", headers=H(sa), timeout=T))
        uid = ld.get("userId") or (ld.get("user") or {}).get("id")
        if uid:
            cleanup(lambda: requests.delete(f"{API}/api/users/{uid}", headers=H(sa), timeout=T))
        tok = _login(n, "OrgAdmin@789", org_id)
        new_name = f"LuminaTest Renamed {n[-8:]}"
        pr = requests.put(f"{API}/api/organizations/{org_id}", json={"name": new_name, "slug": slug},
                          headers=H(tok, org_id), timeout=T)
        assert pr.status_code == 200, f"{pr.status_code} {pr.text}"
        g = requests.get(f"{API}/api/organizations/{org_id}", headers=H(tok, org_id), timeout=T)
        assert new_name in g.text


# ---------------------------------------------------------------- 8. M8/Q1
@pytest.mark.api
@pytest.mark.wave2
def test_approval_makes_user_approved_org_member(oa1, mk_course, new_user, cleanup):
    """Spec §4.2 step 4 / Q1: approving an enrollment also provisions Approved org membership."""
    # CONTRACT M8/Q1
    c = mk_course()
    u = new_user()
    assert _publish(oa1, c["id"]).status_code == 200
    assert requests.post(f"{API}/api/courses/{c['id']}/enrollments/request", headers=H(u["token"]), timeout=T).status_code == 200
    mine0 = requests.get(f"{API}/api/organizations/mine", headers=H(u["token"]), timeout=T)
    assert ORG1 not in {o["id"] for o in _data(mine0)}
    cleanup(lambda: requests.delete(f"{API}/api/orgs/{ORG1}/members/{u['id']}", headers=H(oa1, ORG1), timeout=T))
    ra = requests.post(f"{API}/api/courses/{c['id']}/enrollments/{u['id']}/approve", json={}, headers=H(oa1, ORG1), timeout=T)
    assert ra.status_code == 200, ra.text
    lst = _items(requests.get(f"{API}/api/courses/{c['id']}/enrollments", headers=H(oa1, ORG1), timeout=T))
    assert [e["status"] for e in lst if e["userId"] == u["id"]] == ["Approved"]
    mine = requests.get(f"{API}/api/organizations/mine", headers=H(u["token"]), timeout=T)
    assert ORG1 in {o["id"] for o in _data(mine)}


# ---------------------------------------------------------------- 9. M11/M12/Q4
@pytest.mark.api
@pytest.mark.security
@pytest.mark.wave1
@pytest.mark.user
class TestAiQuizDraft:
    @pytest.fixture
    def quiz(self, new_user, cleanup):
        owner = new_user()
        title = _u("quiz")
        r = requests.post(f"{API}/api/quizzes", json={"title": title}, headers=H(owner["token"]), timeout=T)
        assert r.status_code == 200, r.text
        q = _data(r); q["id"] = q["quizId"]
        cleanup(lambda: requests.delete(f"{API}/api/quizzes/{q['id']}", headers=H(owner["token"]), timeout=T))
        return {"owner": owner, "title": title, **q}

    def test_import_ai_questions_blank_explanation_rejected(self, quiz):
        """Spec §2.1 / M11: AI question explanation is mandatory."""
        # CONTRACT M11
        for expl in ("", "   "):
            r = requests.post(f"{API}/api/quizzes/{quiz['id']}/generate", headers=H(quiz["owner"]["token"]), timeout=T,
                              json={"questions": [{"question": "Q?", "options": ["a", "b"], "correctIndex": 0, "explanation": expl}]})
            assert r.status_code == 400, f"{expl!r}: {r.status_code} {r.text}"

    def test_draft_quiz_owner_only_until_published(self, quiz, new_user):
        """Q4/M12: DRAFT quiz hidden from others (search, public, clone) until owner publishes."""
        # CONTRACT Q4/M12
        own = H(quiz["owner"]["token"])
        r = requests.post(f"{API}/api/quizzes/{quiz['id']}/generate", headers=own, timeout=T,
                          json={"questions": [{"question": "Q?", "options": ["a", "b"], "correctIndex": 0, "explanation": "because"}]})
        assert r.status_code == 200, r.text
        other = H(new_user()["token"])
        assert _data(requests.get(f"{API}/api/quizzes/{quiz['id']}", headers=own, timeout=T))["status"] == "DRAFT"
        cid, title = quiz["contentId"], quiz["title"]

        def visible():
            s = requests.get(f"{API}/api/search", params={"q": title, "type": "QUIZ"}, headers=other, timeout=T)
            p = requests.get(f"{API}/api/public-content", params={"query": title, "type": "QUIZ"}, headers=other, timeout=T)
            assert s.status_code == 200 and p.status_code == 200
            return cid in s.text, cid in p.text

        assert visible() == (False, False)
        assert requests.post(f"{API}/api/contents/{cid}/clone", headers=other, timeout=T).status_code in (403, 404)
        pr = requests.patch(f"{API}/api/quizzes/{quiz['id']}", json={"status": "PUBLISHED"}, headers=own, timeout=T)
        assert pr.status_code == 200, pr.text
        assert visible() == (True, True)


# ---------------------------------------------------------------- 10. gateway internal
@pytest.mark.api
@pytest.mark.security
@pytest.mark.parametrize("path", [f"/api/internal/orgs/{uuid.uuid4()}", "/api/internal/ai-keys/active"])
@pytest.mark.parametrize("who", ["anon", "sysadmin"])
def test_gateway_does_not_route_internal(path, who, sa):
    """CONTRACT §6: the gateway never routes /api/internal/**."""
    # CONTRACT M10
    r = requests.get(f"{API}{path}", headers=H(sa) if who == "sysadmin" else {}, timeout=T)
    assert r.status_code == 404, f"{path} -> {r.status_code}"


# ---------------------------------------------------------------- 11. M3/M4
@pytest.mark.api
@pytest.mark.security
def test_sso_complete_profile_garbage_ticket_rejected():
    """Spec §1 SSO / M3: invalid ssoToken is a client error, not 500."""
    # CONTRACT M3
    r = requests.post(f"{API}/api/auth/sso/complete-profile", json={"ssoToken": "garbage", "role": "User"}, timeout=T)
    assert r.status_code in (400, 401), r.status_code


@pytest.mark.api
@pytest.mark.security
def test_google_login_garbage_id_token_rejected():
    """Spec §1 SSO / M4: invalid Google idToken is a client error, not 500."""
    # CONTRACT M4
    r = requests.post(f"{API}/api/auth/google", json={"idToken": "garbage"}, timeout=T)
    assert r.status_code in (400, 401), r.status_code


# ---------------------------------------------------------------- 12. refresh
@pytest.mark.api
@pytest.mark.orgadmin
def test_refresh_without_header_keeps_org():
    """M1: Refresh re-resolves OrgAdmin org like Login (also covered in test_auth_roles.py)."""
    # CONTRACT M1
    lr = requests.post(f"{API}/api/auth/login", json={"username": "OrgAdmin1", "password": "OrgAdmin@123"}, timeout=T)
    assert lr.status_code == 200
    rt = lr.json()["data"]["refreshToken"]
    r = requests.post(f"{API}/api/auth/refresh", json={"refreshToken": rt}, timeout=T)
    assert r.status_code == 200, r.text
    assert r.json()["data"].get("orgId") == ORG1

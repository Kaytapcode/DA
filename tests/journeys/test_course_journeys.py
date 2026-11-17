"""Organization / Course journeys as real people do them in the browser (OrgAdmin + students + teachers).

Spec 3.2 (modules, default Topic 1/2/3, blank title -> Topic N), 4.2 (catalog, enrollment request/approve/reject,
direct add, org members), 4.3 (progress), 1 (OrgAdmin scope, last-admin / own-row rules).
"""
import re
import uuid

import pytest
from playwright.sync_api import expect

from .actions import login, register_orgadmin, register_user

pytestmark = [pytest.mark.journey, pytest.mark.e2e, pytest.mark.wave1, pytest.mark.wave2]

YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


def nm(kind: str) -> str:
    return f"LuminaTest_{kind}_{uuid.uuid4().hex[:8]}"


def orgadmin(page):
    c = register_orgadmin(page)
    login(page, c.username, c.password, "/admin/dashboard")
    return c


def student(page):
    c = register_user(page)
    login(page, c.username, c.password, "/user/home")
    return c


def course_row(page, title):
    return page.locator("[data-testid^='course-row-']").filter(has_text=title)


def course_id(page, title) -> str:
    return course_row(page, title).get_attribute("data-testid").removeprefix("course-row-")


def make_course(page, title, publish=False):
    page.goto("/admin/courses")
    page.get_by_test_id("course-create-toggle-btn").click()
    page.get_by_test_id("course-title-input").fill(title)
    page.get_by_test_id("course-create-submit-btn").click()
    expect(course_row(page, title)).to_be_visible()
    if publish:
        course_row(page, title).locator("[data-testid^='course-publish-btn-']").click()
        expect(course_row(page, title).locator("[data-testid^='course-status-badge-']")).to_have_text("PUBLISHED")


def open_tab(page, title, tab):
    """From the Course Management row open 'curriculum' or 'members'."""
    page.goto("/admin/courses")
    course_row(page, title).locator(f"[data-testid^='course-{tab}-btn-']").click()
    expect(page).to_have_url(re.compile(r"/admin/editor/(curriculum|member-roles)\?courseId="))


def add_quiz(page, module_idx, title):
    """On the curriculum editor: Add content -> Quiz through the normal quiz creation page."""
    mod = page.get_by_test_id("curriculum-module-card").nth(module_idx)
    mod.get_by_test_id("module-expand-btn").click()
    mod.get_by_test_id("content-add-btn").click()
    page.get_by_test_id("content-create-QUIZ").click()
    page.get_by_test_id("quiz-mode-manual").click()
    page.get_by_test_id("quiz-title-input").fill(title)
    page.get_by_test_id("quiz-question-0-text").fill("What is 2+2?")
    for i, txt in enumerate(["4", "3", "5", "6"]):
        page.get_by_test_id(f"quiz-question-0-option-{i}-text").fill(txt)
    page.get_by_test_id("quiz-save-btn").click()
    expect(page).to_have_url(re.compile(r"/admin/editor/curriculum\?courseId="))


def add_video(page, module_idx, title):
    mod = page.get_by_test_id("curriculum-module-card").nth(module_idx)
    mod.get_by_test_id("module-expand-btn").click()
    mod.get_by_test_id("content-add-btn").click()
    page.get_by_test_id("content-create-VIDEO").click()
    page.get_by_test_id("video-url-input").fill(YT)
    page.get_by_test_id("video-title-input").fill(title)
    page.get_by_test_id("video-save-btn").click()
    expect(page).to_have_url(re.compile(r"/admin/editor/curriculum\?courseId="))


def request_enrollment(page, title):
    page.goto("/user/courses/browse")
    card = page.locator("[data-testid^='catalog-course-card-']").filter(has_text=title)
    card.locator("[data-testid^='catalog-request-enroll-']").click()
    expect(card.locator("[data-testid^='catalog-status-']")).to_have_text("Pending approval")


def decide(page, title, username, action):
    """OrgAdmin: Members & Roles tab of the course -> approve / reject the pending request of username."""
    open_tab(page, title, "members")
    req = page.locator("[data-testid^='enrollment-request-']").filter(has_text=username)
    req.locator(f"[data-testid^='enrollment-{action}-']").click()
    expect(req).to_have_count(0)


def enrolled_row(page, username):
    return page.locator("[data-testid^='enrollment-row-']").filter(has_text=username)


def member_row(page, username):
    return page.locator("[data-testid^='member-row-']").filter(has_text=username)


@pytest.mark.orgadmin
def test_orgadmin_creates_edits_publishes_and_deletes_courses(page):
    """Spec 3.2/4.2: new course is DRAFT with Topic 1/2/3; edit title; publish; delete."""  # Spec 3.2, 4.2
    orgadmin(page)
    t = nm("course")
    make_course(page, t)
    expect(course_row(page, t).locator("[data-testid^='course-status-badge-']")).to_have_text("DRAFT")
    open_tab(page, t, "curriculum")
    for n in (1, 2, 3):
        expect(page.get_by_text(f"Topic {n}", exact=True)).to_be_visible()

    t2 = t + "_renamed"
    page.goto("/admin/courses")
    cid = course_id(page, t)
    page.get_by_test_id(f"course-edit-btn-{cid}").click()
    page.get_by_test_id(f"course-edit-input-{cid}").fill(t2)
    page.get_by_test_id(f"course-edit-save-{cid}").click()
    expect(course_row(page, t2)).to_be_visible()
    page.reload()
    expect(course_row(page, t2)).to_be_visible()

    page.get_by_test_id(f"course-publish-btn-{cid}").click()
    expect(page.get_by_test_id(f"course-status-badge-{cid}")).to_have_text("PUBLISHED")
    page.reload()
    expect(page.get_by_test_id(f"course-status-badge-{cid}")).to_have_text("PUBLISHED")

    gone = nm("throwaway")
    make_course(page, gone)
    page.once("dialog", lambda d: d.accept())
    course_row(page, gone).locator("[data-testid^='course-delete-btn-']").click()
    expect(course_row(page, gone)).to_have_count(0)
    page.reload()
    expect(course_row(page, t2)).to_be_visible()
    expect(course_row(page, gone)).to_have_count(0)


@pytest.mark.orgadmin
def test_orgadmin_builds_curriculum_with_modules_quiz_and_video(page):
    """Spec 3.2: blank module title -> Topic N; content created through the normal creation pages lands in the module."""  # Spec 3.2
    orgadmin(page)
    t = nm("course")
    make_course(page, t)
    open_tab(page, t, "curriculum")
    page.get_by_test_id("module-add-toggle-btn").click()
    page.get_by_test_id("module-add-btn").click()
    expect(page.get_by_text("Topic 4", exact=True)).to_be_visible()
    named = nm("module")
    page.get_by_test_id("module-add-toggle-btn").click()
    page.get_by_test_id("module-title-input").fill(named)
    page.get_by_test_id("module-add-btn").click()
    expect(page.get_by_text(named, exact=True)).to_be_visible()
    page.reload()
    expect(page.get_by_text("Topic 4", exact=True)).to_be_visible()
    expect(page.get_by_text(named, exact=True)).to_be_visible()

    quiz, video = nm("quiz"), nm("video")
    add_quiz(page, 0, quiz)
    page.reload()
    page.get_by_test_id("module-expand-btn").nth(0).click()
    expect(page.get_by_text(quiz, exact=True)).to_be_visible()

    add_video(page, 1, video)
    page.reload()
    page.get_by_test_id("module-expand-btn").nth(1).click()
    expect(page.get_by_text(video, exact=True)).to_be_visible()


@pytest.mark.user
def test_student_finds_published_course_requests_and_gets_approved(page, page2):
    """Spec 4.2: catalog shows only public courses; Pending grants no access; approval grants Student access."""  # Spec 4.2
    orgadmin(page)
    pub, draft, quiz = nm("pub"), nm("draft"), nm("quiz")
    make_course(page, draft)
    make_course(page, pub, publish=True)
    open_tab(page, pub, "curriculum")
    add_quiz(page, 0, quiz)

    u = student(page2)
    page2.goto("/user/courses/browse")
    pub_card = page2.locator("[data-testid^='catalog-course-card-']").filter(has_text=pub)
    expect(pub_card).to_be_visible()
    expect(page2.locator("[data-testid^='catalog-course-card-']").filter(has_text=draft)).to_have_count(0)
    cid = pub_card.get_attribute("data-testid").removeprefix("catalog-course-card-")
    request_enrollment(page2, pub)
    page2.reload()
    expect(page2.locator(f"[data-testid='catalog-state-{cid}']")).to_have_text("Pending approval.")
    page2.goto(f"/user/course/{cid}")
    expect(page2.get_by_test_id("course-access-error")).to_be_visible()

    open_tab(page, pub, "members")
    req = page.locator("[data-testid^='enrollment-request-']").filter(has_text=u.username)
    expect(req).to_be_visible()
    decide(page, pub, u.username, "approve")
    expect(enrolled_row(page, u.username)).to_be_visible()

    page2.goto("/user/courses")
    card = page2.get_by_test_id(f"my-course-card-{cid}")
    expect(card).to_contain_text(pub)
    expect(card).to_contain_text("Student")
    page2.get_by_test_id(f"my-course-open-{cid}").click()
    expect(page2.get_by_test_id("course-module-card").first).to_be_visible()
    expect(page2.get_by_test_id("course-content-item").filter(has_text=quiz)).to_be_visible()


@pytest.mark.user
def test_rejected_request_shows_rejected_and_grants_no_access(page, page2):
    """Spec 4.2: OrgAdmin may reject; the user stays without access."""  # Spec 4.2
    orgadmin(page)
    pub = nm("pub")
    make_course(page, pub, publish=True)
    u = student(page2)
    request_enrollment(page2, pub)
    cid = page2.locator("[data-testid^='catalog-course-card-']").filter(has_text=pub).get_attribute("data-testid").removeprefix("catalog-course-card-")
    decide(page, pub, u.username, "reject")

    page2.goto("/user/courses/browse")
    expect(page2.get_by_test_id(f"catalog-status-{cid}")).to_have_text("Rejected")
    page2.goto(f"/user/course/{cid}")
    expect(page2.get_by_test_id("course-access-error")).to_be_visible()
    page2.goto("/user/courses")
    expect(page2.get_by_test_id("my-courses-empty")).to_be_visible()


@pytest.mark.user
def test_per_course_teacher_can_add_module_but_is_only_student_elsewhere(page, page2):
    """Spec 1/4.2: Teacher/Student is per course; Teacher edits curriculum, Student of another course does not."""  # Spec 1, 4.2
    orgadmin(page)
    c1, c2 = nm("teach"), nm("learn")
    make_course(page, c1, publish=True)
    make_course(page, c2, publish=True)
    u = student(page2)
    for t in (c1, c2):
        request_enrollment(page2, t)
        decide(page, t, u.username, "approve")

    open_tab(page, c1, "members")
    enrolled_row(page, u.username).locator("select").select_option("Teacher")
    expect(enrolled_row(page, u.username).locator("select")).to_be_enabled()
    expect(enrolled_row(page, u.username).locator("select")).to_have_value("Teacher")
    page.reload()
    expect(enrolled_row(page, u.username).locator("select")).to_have_value("Teacher")

    cid1, cid2 = None, None
    page2.goto("/user/courses")
    cid1 = page2.locator("[data-testid^='my-course-card-']").filter(has_text=c1).get_attribute("data-testid").removeprefix("my-course-card-")
    cid2 = page2.locator("[data-testid^='my-course-card-']").filter(has_text=c2).get_attribute("data-testid").removeprefix("my-course-card-")
    page2.goto(f"/user/course/{cid1}")
    page2.get_by_test_id("teacher-add-module-toggle").click()
    mod = nm("module")
    page2.get_by_test_id("teacher-module-title-input").fill(mod)
    page2.get_by_test_id("teacher-module-add-btn").click()
    expect(page2.get_by_role("heading", name=mod)).to_be_visible()

    page2.goto(f"/user/course/{cid2}")
    expect(page2.get_by_test_id("course-module-card").first).to_be_visible()
    page2.wait_for_load_state("networkidle")
    expect(page2.get_by_test_id("teacher-add-module-toggle")).to_have_count(0)

    open_tab(page, c1, "curriculum")
    expect(page.get_by_text(mod, exact=True)).to_be_visible()


@pytest.mark.orgadmin
def test_orgadmin_directly_enrolls_system_user_who_then_joins_org_members(page, page2):
    """Spec 4.2 step 5: direct add skips approval, is Approved at once and auto-adds the user to the org."""  # Spec 4.2
    orgadmin(page)
    t = nm("course")
    make_course(page, t)
    u = register_user(page2)
    open_tab(page, t, "members")
    page.get_by_test_id("enrollment-search-input").fill(u.username)
    page.locator("[data-testid^='enrollment-result-']").filter(has_text=u.username).click()
    page.get_by_test_id("enrollment-submit-btn").click()
    expect(enrolled_row(page, u.username)).to_contain_text("Student")
    page.reload()
    expect(enrolled_row(page, u.username)).to_contain_text("Student")

    page.goto("/admin/members")
    expect(member_row(page, u.username)).to_contain_text("Member")


@pytest.mark.orgadmin
def test_orgadmin_manages_org_members_roles_and_removal(page, page2):
    """Spec 1: member list columns; own row has no remove/role control; role change persists; removal."""  # Spec 1
    me = orgadmin(page)
    u = register_user(page2)
    page.goto("/admin/members")
    for col in ("Username", "Email", "Role", "Joined", "Actions"):
        expect(page.get_by_role("columnheader", name=col, exact=True)).to_be_visible()
    page.get_by_test_id("member-add-toggle").click()
    page.get_by_test_id("member-add-search").fill(u.username)
    page.get_by_test_id("member-add-search-btn").click()
    page.locator("[data-testid^='member-add-result-']").filter(has_text=u.username).click()
    page.get_by_test_id("member-add-confirm").click()
    expect(member_row(page, u.username)).to_be_visible()

    own = member_row(page, me.username)
    expect(own).to_be_visible()
    expect(own.locator("select")).to_have_count(0)
    expect(own.locator("[data-testid^='member-remove-']")).to_have_count(0)

    row = member_row(page, u.username)
    row.locator("select").select_option("OrgAdmin")
    expect(row.locator("select")).to_be_enabled()
    expect(row.locator("select")).to_have_value("OrgAdmin")
    page.reload()
    expect(member_row(page, u.username).locator("select")).to_have_value("OrgAdmin")
    member_row(page, u.username).locator("select").select_option("Member")
    expect(member_row(page, u.username).locator("select")).to_be_enabled()
    expect(member_row(page, u.username).locator("select")).to_have_value("Member")
    page.reload()
    expect(member_row(page, u.username).locator("select")).to_have_value("Member")

    page.once("dialog", lambda d: d.accept())
    member_row(page, u.username).locator("[data-testid^='member-remove-']").click()
    expect(member_row(page, u.username)).to_have_count(0)
    page.reload()
    expect(member_row(page, me.username)).to_be_visible()
    expect(member_row(page, u.username)).to_have_count(0)


@pytest.mark.user
def test_student_activity_shows_in_course_progress_and_org_analytics(page, page2):
    """Spec 4.3: viewing content / submitting a quiz is recorded automatically and visible in progress + analytics."""  # Spec 4.3
    orgadmin(page)
    pub, quiz, video = nm("pub"), nm("quiz"), nm("video")
    make_course(page, pub, publish=True)
    open_tab(page, pub, "curriculum")
    add_quiz(page, 0, quiz)
    add_video(page, 1, video)
    u = student(page2)
    request_enrollment(page2, pub)
    decide(page, pub, u.username, "approve")

    page.goto("/admin/dashboard")
    stat = page.get_by_test_id("orgadmin-stat-completed-attempts").locator("p").first
    expect(stat).to_have_text(re.compile(r"^\d+$"))
    before = int(stat.inner_text())

    page2.goto("/user/courses")
    page2.locator("[data-testid^='my-course-open-']").click()
    pct = page2.get_by_text(re.compile(r"\d+% complete"))
    expect(pct).to_be_visible()
    pct_before = pct.inner_text()
    page2.get_by_test_id("course-content-item").filter(has_text=video).click()
    expect(page2.get_by_test_id("video-player")).to_be_visible()
    page2.go_back()
    page2.reload()
    expect(page2.get_by_text(re.compile(r"\d+% complete"))).not_to_have_text(pct_before)

    page2.get_by_test_id("course-content-item").filter(has_text=quiz).click()
    page2.locator("[data-testid^='quiz-play-option-']").first.click()
    page2.get_by_test_id("quiz-play-submit").click()
    expect(page2.get_by_test_id("quiz-play-score")).to_be_visible()

    page.goto("/admin/dashboard")
    stat = page.get_by_test_id("orgadmin-stat-completed-attempts").locator("p").first
    expect(stat).to_have_text(re.compile(r"^\d+$"))
    assert int(stat.inner_text()) > before


@pytest.mark.orgadmin
@pytest.mark.security
def test_orgadmin_cannot_open_another_orgs_course_editor_by_url(page, page2):
    """Spec 1 / invariant 7: OrgAdmin scope is bounded to their own organization."""  # Spec 1
    orgadmin(page)
    t, secret = nm("orgB"), nm("secret")
    make_course(page, t)
    cid = course_id(page, t)
    open_tab(page, t, "curriculum")
    page.get_by_test_id("module-add-toggle-btn").click()
    page.get_by_test_id("module-title-input").fill(secret)
    page.get_by_test_id("module-add-btn").click()
    expect(page.get_by_text(secret, exact=True)).to_be_visible()

    orgadmin(page2)
    page2.goto(f"/admin/editor/curriculum?courseId={cid}")
    expect(page2.get_by_test_id("module-add-toggle-btn")).to_be_visible()
    expect(page2.get_by_text(secret, exact=True)).to_have_count(0)
    expect(page2.get_by_test_id("module-expand-btn")).to_have_count(0)
    page2.goto(f"/admin/editor/member-roles?courseId={cid}")
    expect(page2.get_by_test_id("enrollment-requests-card")).to_be_visible()
    expect(page2.locator("[data-testid^='enrollment-row-']")).to_have_count(0)

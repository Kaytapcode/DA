"""SysAdmin journeys as a real SysAdmin does them in the browser (seed SysAdmin1 + throwaway LuminaTest_/lt_ data).

Spec 1 (SysAdmin): org CRUD, global user management, AI key config, global analytics, dedicated portal.
Spec 6.1 absolute deletion, 6.2 organization suspension.
"""
import re

import pytest
from playwright.sync_api import expect

from .actions import (
    PASSWORD, _hex, login, login_sysadmin, logout, register_orgadmin, register_user,
)

pytestmark = [pytest.mark.journey, pytest.mark.e2e, pytest.mark.wave1, pytest.mark.sysadmin]


def _accept_next_dialog(page):
    page.once("dialog", lambda d: d.accept())


def _open_org(page, name):
    """Open the Organization directory filtered to one org; returns its card locator."""
    page.goto("/sysadmin/orgs")
    page.get_by_test_id("org-search-input").fill(name)
    return page.get_by_test_id("org-item").filter(has_text=name)


def _create_org(page, name, slug):
    page.goto("/sysadmin/orgs")
    page.get_by_test_id("org-create-btn").click()
    page.get_by_test_id("org-form-name").fill(name)
    page.get_by_test_id("org-form-slug").fill(slug)
    page.get_by_test_id("org-form-submit").click()
    expect(page.get_by_test_id("org-form")).to_have_count(0)


def _delete_org(page, name):
    card = _open_org(page, name)
    _accept_next_dialog(page)
    card.locator('[data-testid^="org-delete-"]').click()
    expect(card).to_have_count(0)


def _org_count_on_dashboard(page) -> int:
    page.goto("/sysadmin/dashboard")
    stat = page.get_by_test_id("sysadmin-stat-total-organizations").locator("p").first
    expect(stat).to_have_text(re.compile(r"^\d[\d,]*$"))
    return int(stat.inner_text().replace(",", ""))


def test_sysadmin_dashboard_orgs_match_directory_and_count_grows_on_create(page):
    """Spec 1 SysAdmin global analytics: dashboard org rows == directory; creating an org raises the count."""  # Spec 1
    login_sysadmin(page)
    before = _org_count_on_dashboard(page)
    expect(page.get_by_test_id("dashboard-org-name").first).to_be_visible()
    dash_names = page.get_by_test_id("dashboard-org-name").all_inner_texts()
    assert before == len(dash_names), f"stat card {before} != org rows {len(dash_names)}"

    page.goto("/sysadmin/orgs")
    expect(page.get_by_test_id("org-item-name").first).to_be_visible()
    assert sorted(page.get_by_test_id("org-item-name").all_inner_texts()) == sorted(dash_names)

    h = _hex()
    name, slug = f"LuminaTest_{h}", f"luminatest-{h}"
    _create_org(page, name, slug)
    assert _org_count_on_dashboard(page) == before + 1
    expect(page.get_by_test_id("dashboard-org-name").filter(has_text=name)).to_be_visible()

    _delete_org(page, name)
    assert _org_count_on_dashboard(page) == before


def test_sysadmin_org_crud_persists_and_shows_backend_errors(page):
    """Spec 1 SysAdmin Organization CRUD: create/edit persist after reload, delete removes, errors from backend."""  # Spec 1
    login_sysadmin(page)
    h = _hex()
    name, slug = f"LuminaTest_{h}", f"luminatest-{h}"

    page.goto("/sysadmin/orgs")
    page.get_by_test_id("org-create-btn").click()
    page.get_by_test_id("org-form-submit").click()
    expect(page.get_by_test_id("org-form-error")).to_contain_text("Organization name is required")

    page.get_by_test_id("org-form-name").fill(name)
    page.get_by_test_id("org-form-slug").fill(slug)
    page.get_by_test_id("org-form-submit").click()
    expect(page.get_by_test_id("org-form")).to_have_count(0)
    page.reload()
    page.get_by_test_id("org-search-input").fill(name)
    expect(page.get_by_test_id("org-item-name").filter(has_text=name)).to_have_text(name)
    expect(page.get_by_test_id("org-item-slug").filter(has_text=slug)).to_have_text(f"/{slug}")

    page.get_by_test_id("org-create-btn").click()
    page.get_by_test_id("org-form-name").fill(f"LuminaTest_{h}_dup")
    page.get_by_test_id("org-form-slug").fill(slug)
    page.get_by_test_id("org-form-submit").click()
    expect(page.get_by_test_id("org-form-error")).to_have_text("Slug already exists")
    page.get_by_test_id("org-form-cancel").click()

    renamed = f"LuminaTest_{h}_renamed"
    card = _open_org(page, name)
    card.locator('[data-testid^="org-edit-"]').click()
    page.get_by_test_id("org-form-name").fill(renamed)
    page.get_by_test_id("org-form-submit").click()
    expect(page.get_by_test_id("org-form")).to_have_count(0)
    page.reload()
    page.get_by_test_id("org-search-input").fill(h)
    expect(page.get_by_test_id("org-item-name")).to_have_text(renamed)

    _delete_org(page, renamed)
    page.reload()
    page.get_by_test_id("org-search-input").fill(h)
    expect(page.get_by_test_id("org-item")).to_have_count(0)


@pytest.mark.orgadmin
def test_sysadmin_suspends_org_orgadmin_blocked_then_reactivated(page, page2):
    """Spec 6.2: Suspended org freezes teach access immediately; Reactivate restores it."""  # Spec 6.2
    c = register_orgadmin(page2)
    login(page2, c.username, c.password, "/admin/dashboard")
    page2.goto("/admin/courses")
    title = f"LuminaTest_course_{_hex()}"
    page2.get_by_test_id("course-create-toggle-btn").click()
    page2.get_by_test_id("course-title-input").fill(title)
    page2.get_by_test_id("course-create-submit-btn").click()
    row = page2.locator('[data-testid^="course-row-"]').filter(has_text=title)
    expect(row).to_be_visible()
    row.locator('[data-testid^="course-publish-btn-"]').click()
    expect(row.locator('[data-testid^="course-status-badge-"]')).to_have_text("PUBLISHED")

    login_sysadmin(page)
    card = _open_org(page, c.org_name)
    card.locator('[data-testid^="org-suspend-"]').click()
    expect(card.locator('[data-testid^="org-status-"]')).to_have_text("Suspended")
    page.reload()
    page.get_by_test_id("org-search-input").fill(c.org_name)
    expect(card.locator('[data-testid^="org-status-"]')).to_have_text("Suspended")

    # OrgAdmin (still on the loaded course page) tries to edit and to create a course.
    row.locator('[data-testid^="course-publish-btn-"]').click()
    expect(page2.get_by_test_id("course-status-error")).to_be_visible()
    page2.get_by_test_id("course-create-toggle-btn").click()
    page2.get_by_test_id("course-title-input").fill(f"LuminaTest_blocked_{_hex()}")
    page2.get_by_test_id("course-create-submit-btn").click()
    expect(page2.get_by_test_id("course-error")).to_be_visible()

    card.locator('[data-testid^="org-reactivate-"]').click()
    expect(card.locator('[data-testid^="org-status-"]')).to_have_text("Active")
    page2.reload()
    row = page2.locator('[data-testid^="course-row-"]').filter(has_text=title)
    row.locator('[data-testid^="course-publish-btn-"]').click()
    expect(row.locator('[data-testid^="course-status-badge-"]')).to_have_text("DRAFT")
    expect(page2.get_by_test_id("course-status-error")).to_have_count(0)

    _delete_org(page, c.org_name)


def test_sysadmin_manages_user_lifecycle(page, page2):
    """Spec 1 SysAdmin global user management: create, role change, delete; no global Teacher role."""  # Spec 1
    login_sysadmin(page)
    page.goto("/sysadmin/users")
    page.get_by_test_id("user-search-input").fill("SysAdmin1")
    page.get_by_test_id("user-search-btn").click()

    me = page.get_by_test_id("user-item").filter(has_text="SysAdmin1")
    expect(me.get_by_test_id("user-item-username")).to_have_text("SysAdmin1")
    expect(me.get_by_test_id("user-item-email")).to_contain_text("@")
    expect(me.get_by_test_id("user-item-role")).to_have_text("SysAdmin")
    expect(me.get_by_test_id("user-delete-btn")).to_have_count(0)

    h = _hex()
    username, email = f"lt_{h}", f"lt_{h}@example.com"
    page.get_by_test_id("user-create-btn").click()
    options = page.get_by_test_id("create-user-role").locator("option").all_inner_texts()
    assert options == ["Student", "OrgAdmin", "SysAdmin"], options

    page.get_by_test_id("create-user-submit").click()
    expect(page.get_by_test_id("create-user-error")).to_be_visible()
    page.get_by_test_id("create-user-username").fill(username)
    page.get_by_test_id("create-user-email").fill(email)
    page.get_by_test_id("create-user-password").fill("weak")
    page.get_by_test_id("create-user-submit").click()
    expect(page.get_by_test_id("create-user-error")).to_contain_text(re.compile("password", re.I))

    page.get_by_test_id("create-user-password").fill(PASSWORD)
    page.get_by_test_id("create-user-submit").click()
    expect(page.get_by_test_id("create-user-submit")).to_have_count(0)

    page.get_by_test_id("user-create-btn").click()
    page.get_by_test_id("create-user-username").fill(username)
    page.get_by_test_id("create-user-email").fill(f"other_{email}")
    page.get_by_test_id("create-user-password").fill(PASSWORD)
    page.get_by_test_id("create-user-submit").click()
    expect(page.get_by_test_id("create-user-error")).to_have_text("Username already exists.")

    page.reload()
    page.get_by_test_id("user-search-input").fill(username)
    page.get_by_test_id("user-search-btn").click()
    row = page.get_by_test_id("user-item").filter(has_text=username)
    expect(row.get_by_test_id("user-item-email")).to_have_text(email)
    expect(row.get_by_test_id("user-item-role")).to_have_text("Student")

    login(page2, username, PASSWORD, "/user/home")
    logout(page2)

    row.get_by_test_id("user-edit-link").click()
    expect(page.get_by_test_id("user-detail-username")).to_have_text(username)
    page.get_by_test_id("user-detail-role-select").select_option("OrgAdmin")
    page.get_by_test_id("user-detail-role-save").click()
    expect(page.get_by_test_id("user-detail-msg")).to_have_text("Role updated.")
    page.reload()
    expect(page.get_by_test_id("user-detail-role-select")).to_have_value("OrgAdmin")

    page.goto("/sysadmin/users")
    page.get_by_test_id("user-search-input").fill(username)
    page.get_by_test_id("user-search-btn").click()
    row = page.get_by_test_id("user-item").filter(has_text=username)
    expect(row.get_by_test_id("user-item-role")).to_have_text("OrgAdmin")

    _accept_next_dialog(page)
    row.get_by_test_id("user-delete-btn").click()
    expect(row).to_have_count(0)
    page.reload()
    page.get_by_test_id("user-search-input").fill(username)
    page.get_by_test_id("user-search-btn").click()
    expect(page.get_by_text("No users found")).to_be_visible()
    expect(page.get_by_test_id("user-item")).to_have_count(0)

    page2.goto("/login")
    page2.get_by_test_id("login-identifier").fill(username)
    page2.get_by_test_id("login-password").fill(PASSWORD)
    page2.get_by_test_id("login-submit").click()
    expect(page2.get_by_test_id("login-error")).to_have_text("Invalid login credentials.")
    expect(page2).to_have_url(re.compile(r"/login$"))


def test_sysadmin_ai_key_shows_only_last_four_and_can_be_deleted(page):
    """Spec 1 SysAdmin: configure AI API keys; the full key is never displayed again."""  # Spec 1
    login_sysadmin(page)
    page.goto("/sysadmin/ai-keys")
    h = _hex()
    label = f"LuminaTest_{h}"
    full_key = f"sk-fake-{h}-LuminaTest-9z8y"
    page.get_by_test_id("ai-key-save").click()
    expect(page.get_by_test_id("ai-key-save-error")).to_have_text("API key is required")

    page.get_by_test_id("ai-key-label").fill(label)
    page.get_by_test_id("ai-key-input").fill(full_key)
    # Inactive on purpose: an active fake key would replace the real provider key for everyone.
    page.get_by_test_id("ai-key-active-checkbox").uncheck()
    page.get_by_test_id("ai-key-save").click()

    row = page.locator('[data-testid^="ai-key-row-"]').filter(has_text=label)
    expect(row).to_be_visible()
    expect(row.get_by_test_id("ai-key-last-four")).to_have_text("••••9z8y")
    page.reload()
    expect(row).to_be_visible()
    expect(row.get_by_test_id("ai-key-last-four")).to_have_text("••••9z8y")
    expect(page.locator("body")).not_to_contain_text(full_key)

    _accept_next_dialog(page)
    row.locator('[data-testid^="ai-key-delete-"]').click()
    expect(row).to_have_count(0)
    page.reload()
    expect(page.get_by_test_id("ai-key-last-four").filter(has_text="9z8y")).to_have_count(0)


@pytest.mark.orgadmin
def test_sysadmin_deletes_orgadmin_course_from_global_course_view(page, page2):
    """Spec 6.1 Absolute Destructive Right: SysAdmin deletes any course from the global admin UI."""  # Spec 6.1
    c = register_orgadmin(page2)
    login(page2, c.username, c.password, "/admin/dashboard")
    page2.goto("/admin/courses")
    title = f"LuminaTest_course_{_hex()}"
    page2.get_by_test_id("course-create-toggle-btn").click()
    page2.get_by_test_id("course-title-input").fill(title)
    page2.get_by_test_id("course-create-submit-btn").click()
    expect(page2.locator('[data-testid^="course-row-"]').filter(has_text=title)).to_be_visible()

    login_sysadmin(page)
    page.goto("/sysadmin/courses")
    course = page.get_by_test_id("global-course-row").filter(has_text=title)
    expect(course).to_be_visible()
    _accept_next_dialog(page)
    course.get_by_test_id("global-course-delete").click()
    expect(course).to_have_count(0)
    page.reload()
    expect(page.get_by_test_id("global-course-row").filter(has_text=title)).to_have_count(0)

    page2.reload()
    expect(page2.locator('[data-testid^="course-row-"]').filter(has_text=title)).to_have_count(0)
    _delete_org(page, c.org_name)


def test_normal_user_rejected_on_sysadmin_portal_and_left_logged_out(page):
    """Spec 1: SysAdmin portal rejects non-SysAdmin and must not leave that user authenticated."""  # Spec 1
    c = register_user(page)
    page.goto("/admin/login")
    page.get_by_test_id("sysadmin-login-username").fill(c.username)
    page.get_by_test_id("sysadmin-login-password").fill(c.password)
    page.get_by_test_id("sysadmin-login-submit").click()
    expect(page.get_by_test_id("sysadmin-login-error")).to_have_text("Access restricted to System Administrators only.")
    expect(page).to_have_url(re.compile(r"/admin/login$"))
    for url in ("/user/home", "/sysadmin/dashboard"):
        page.goto(url)
        expect(page).to_have_url(re.compile(r"/(admin/)?login$"))


def test_every_sysadmin_sidebar_link_leads_to_a_real_page(page):
    """Spec 1 SysAdmin: no dead control - each sidebar entry renders a page (data or explicit empty state)."""  # Spec 1
    login_sysadmin(page)
    links = page.locator("aside a")
    expect(links.first).to_be_visible()
    total = links.count()
    assert total >= 5, f"expected the SysAdmin sidebar entries, found {total}"
    for i in range(total):
        page.goto("/sysadmin/dashboard")
        expect(links.first).to_be_visible()
        links.nth(i).click()
        expect(page).not_to_have_url(re.compile(r"/login$"))
        expect(page.get_by_role("heading").first).to_be_visible()
        expect(page.get_by_text(re.compile(r"not found|404", re.I))).to_have_count(0)
        expect(page.locator("main, body").first).not_to_contain_text("Something went wrong")

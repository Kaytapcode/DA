"""Auth journeys as a real person does them in the browser.

Spec 1: users register, log in by role, log out; SysAdmin uses a dedicated portal; SSO hidden (dev decision 2026-11-17).
"""
import re

import pytest
from playwright.sync_api import expect

from .actions import PASSWORD, fill_register, login, login_sysadmin, logout, register_orgadmin, register_user

pytestmark = [pytest.mark.journey, pytest.mark.e2e, pytest.mark.wave1]


@pytest.mark.user
def test_user_registers_logs_in_sees_name_logs_out_and_is_guarded(page):
    """Spec 1: register as User -> /login -> login -> /user/home -> logout -> protected URL redirects."""  # Spec 1
    c = register_user(page)
    login(page, c.username, c.password, "/user/home")
    expect(page.get_by_test_id("user-sidebar-username")).to_have_text(c.username)
    logout(page)
    page.goto("/user/home")
    expect(page).to_have_url(re.compile(r"/login$"))


@pytest.mark.orgadmin
def test_visitor_registers_as_orgadmin_and_lands_on_admin_dashboard(page):
    """Spec 1: OrgAdmin option reveals org fields; slug derives from org name."""  # Spec 1
    page.goto("/register")
    expect(page.get_by_test_id("register-org-fields")).to_have_count(0)
    page.get_by_test_id("register-role-orgadmin").click()
    expect(page.get_by_test_id("register-org-fields")).to_be_visible()
    page.get_by_test_id("register-org-name").fill("My Test Org 7")
    expect(page.get_by_test_id("register-org-slug")).to_have_value("my-test-org-7")
    c = register_orgadmin(page)
    login(page, c.username, c.password, "/admin/dashboard")


def test_wrong_password_shows_error_and_stays_on_login(page):
    """Spec 1: wrong credentials show 'Invalid login credentials.'"""  # Spec 1
    page.goto("/login")
    page.get_by_test_id("login-identifier").fill("User1")
    page.get_by_test_id("login-password").fill("Wrong@Pass1")
    page.get_by_test_id("login-submit").click()
    expect(page.get_by_test_id("login-error")).to_have_text("Invalid login credentials.")
    expect(page).to_have_url(re.compile(r"/login$"))


def test_empty_login_submit_shows_required_errors(page):
    """Spec 1: required fields are validated."""  # Spec 1
    page.goto("/login")
    page.get_by_test_id("login-submit").click()
    expect(page.get_by_text("Email or username is required")).to_be_visible()
    expect(page.get_by_text("Password is required")).to_be_visible()
    expect(page).to_have_url(re.compile(r"/login$"))


def test_empty_register_submit_shows_required_errors(page):
    """Spec 1: required registration fields are validated."""  # Spec 1
    page.goto("/register")
    page.get_by_test_id("register-submit").click()
    expect(page.get_by_test_id("register-error-username")).to_have_text("Username is required")
    expect(page.get_by_test_id("register-error-email")).to_have_text("Email is required")
    expect(page.get_by_test_id("register-error-password")).to_have_text("Password is required")
    expect(page).to_have_url(re.compile(r"/register$"))


def test_register_with_taken_username_shows_exact_error(page):
    """Spec 1: usernames are unique, error is 'Username already exists.'"""  # Spec 1
    c = register_user(page)
    fill_register(page, "User", c.username, "other_" + c.email, PASSWORD)
    page.get_by_test_id("register-submit").click()
    expect(page.get_by_test_id("register-error")).to_have_text("Username already exists.")
    expect(page).to_have_url(re.compile(r"/register$"))


@pytest.mark.sysadmin
def test_sysadmin_logs_in_through_portal(page):
    """Spec 1: SysAdmin logs in via the dedicated portal."""  # Spec 1
    login_sysadmin(page)


@pytest.mark.sysadmin
def test_normal_user_cannot_use_sysadmin_portal(page):
    """Spec 1: portal rejects non-SysAdmin."""  # Spec 1
    page.goto("/admin/login")
    page.get_by_test_id("sysadmin-login-username").fill("User1")
    page.get_by_test_id("sysadmin-login-password").fill("User@123")
    page.get_by_test_id("sysadmin-login-submit").click()
    expect(page.get_by_test_id("sysadmin-login-error")).to_have_text("Access restricted to System Administrators only.")
    expect(page).to_have_url(re.compile(r"/admin/login$"))


def test_login_page_has_no_sso_buttons(page):
    """Spec 1 / dev decision 2026-11-17: SSO hidden."""  # Spec 1
    page.goto("/login")
    expect(page.get_by_test_id("login-form")).to_be_visible()
    expect(page.get_by_test_id("login-sso-google")).to_have_count(0)
    expect(page.get_by_test_id("login-sso-microsoft")).to_have_count(0)


@pytest.mark.user
def test_user_is_bounced_from_admin_urls_to_own_home(page):
    """Spec 1: role guards send a User home."""  # Spec 1
    login(page, "User1", "User@123", "/user/home")
    for url in ("/sysadmin/dashboard", "/admin/dashboard"):
        page.goto(url)
        expect(page).to_have_url(re.compile(r"/user/home$"))


def test_anonymous_is_redirected_to_login_from_protected_urls(page):
    """Spec 1: anonymous cannot open protected pages."""  # Spec 1
    for url in ("/user/home", "/admin/dashboard", "/sysadmin/dashboard"):
        page.goto(url)
        expect(page).to_have_url(re.compile(r"/login$"))


def test_forgot_password_accepts_email_and_confirms(page):
    """Spec 1: forgot-password shows confirmation."""  # Spec 1
    page.goto("/login")
    page.get_by_role("link", name="Forgot").click()
    expect(page).to_have_url(re.compile(r"/forgot-password$"))
    page.get_by_test_id("forgot-password-email").fill("user1@example.com")
    page.get_by_test_id("forgot-password-submit").click()
    expect(page.get_by_role("heading", name="Check Your Email")).to_be_visible()
    expect(page.get_by_test_id("forgot-password-email-sent")).to_have_text("user1@example.com")

"""Shared journey helpers. Everything goes through the real UI."""
import re
import uuid
from dataclasses import dataclass

from playwright.sync_api import Page, expect

PASSWORD = "Test@12345a"


@dataclass
class Creds:
    username: str
    email: str
    password: str
    org_name: str = ""
    org_slug: str = ""


def _hex() -> str:
    return uuid.uuid4().hex[:8]


def fill_register(page: Page, role: str, username: str, email: str, password: str, org_name: str = "") -> None:
    """Open /register and fill the form (does NOT submit). role = 'User' | 'OrgAdmin'."""
    page.goto("/register")
    page.get_by_test_id("register-role-orgadmin" if role == "OrgAdmin" else "register-role-user").click()
    page.get_by_test_id("register-username").fill(username)
    page.get_by_test_id("register-email").fill(email)
    page.get_by_test_id("register-password").fill(password)
    page.get_by_test_id("register-confirm-password").fill(password)
    if role == "OrgAdmin":
        page.get_by_test_id("register-org-name").fill(org_name)


def register_user(page: Page) -> Creds:
    h = _hex()
    c = Creds(f"lt_{h}", f"lt_{h}@example.com", PASSWORD)
    fill_register(page, "User", c.username, c.email, c.password)
    page.get_by_test_id("register-submit").click()
    expect(page).to_have_url(re.compile(r"/login$"))
    return c


def register_orgadmin(page: Page) -> Creds:
    h = _hex()
    c = Creds(f"lt_{h}", f"lt_{h}@example.com", PASSWORD, f"LuminaTest_{h}", f"luminatest-{h}")
    fill_register(page, "OrgAdmin", c.username, c.email, c.password, c.org_name)
    page.get_by_test_id("register-submit").click()
    expect(page).to_have_url(re.compile(r"/login\?registered=orgadmin$"))
    return c


def _url_is(path: str):
    return re.compile(re.escape(path) + r"/?$")


def login(page: Page, username: str, password: str, expect_path: str) -> None:
    page.goto("/login")
    page.get_by_test_id("login-identifier").fill(username)
    page.get_by_test_id("login-password").fill(password)
    page.get_by_test_id("login-submit").click()
    expect(page).to_have_url(_url_is(expect_path))


def login_sysadmin(page: Page, username: str = "SysAdmin1", password: str = "SysAdmin@123") -> None:
    """Dedicated SysAdmin portal at /admin/login."""
    page.goto("/admin/login")
    page.get_by_test_id("sysadmin-login-username").fill(username)
    page.get_by_test_id("sysadmin-login-password").fill(password)
    page.get_by_test_id("sysadmin-login-submit").click()
    expect(page).to_have_url(_url_is("/sysadmin/dashboard"))


def logout(page: Page) -> None:
    page.get_by_test_id("nav-logout").click()
    expect(page).to_have_url(_url_is("/login"))

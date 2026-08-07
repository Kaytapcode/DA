"""
Global public-course catalog for users not yet in any Organization (spec §6.3 / Demo flow 3 entry).

A freshly-registered user (member of NO org) can still BROWSE the public catalog and REQUEST to join
a course through the real UI; approval (tested in flow 3) auto-provisions org membership.

NO hardcoded screen data. Screenshots on failure → tests/_screens/.
"""

import os
import uuid
import requests
import pytest
from playwright.sync_api import Page, expect

from ._helpers import FE_BASE, API_BASE, ui_login, register_user

ORG1_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TIMEOUT = 15
SCREENS = os.path.join(os.path.dirname(__file__), "..", "_screens")
os.makedirs(SCREENS, exist_ok=True)


def _shot(page, name):
    try:
        page.screenshot(path=os.path.join(SCREENS, f"{name}.png"), full_page=True)
    except Exception:
        pass


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.user
@pytest.mark.wave2
@pytest.mark.timeout(120)
class TestGlobalCatalog:
    def test_non_member_browses_catalog_and_requests(self, page: Page):
        # OrgAdmin1 creates a uniquely-named course (so we can find it in the global catalog).
        oa = requests.post(f"{API_BASE}/api/auth/login", json={"username": "OrgAdmin1", "password": "OrgAdmin@123"},
                           headers={"X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json()["data"]["accessToken"]
        title = f"LuminaTest_Catalog_{uuid.uuid4().hex[:8]}"
        cid = (requests.post(f"{API_BASE}/api/courses", json={"title": title, "courseCode": "CAT"},
                            headers={"Authorization": f"Bearer {oa}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT)
               .json().get("data") or {})["id"]

        # A brand-new user, member of NO organization.
        creds = register_user("catuser")
        ui_login(page, creds["username"], creds["password"])

        page.goto(f"{FE_BASE}/user/courses/browse")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        # No-org notice AND the global catalog are both shown.
        expect(page.locator("[data-testid='browse-no-org']")).to_be_visible(timeout=10000)
        expect(page.locator("[data-testid='catalog-grid']")).to_be_visible(timeout=10000)
        # Narrow the catalog to our course, then request to join.
        page.locator("[data-testid='catalog-search']").fill(title)
        page.wait_for_timeout(400)
        card = page.locator(f"[data-testid='catalog-course-card-{cid}']")
        card.wait_for(state="visible", timeout=10000)
        _shot(page, "catalog_found")
        page.locator(f"[data-testid='catalog-request-enroll-{cid}']").click()
        # Status flips to Pending in the UI.
        expect(page.locator(f"[data-testid='catalog-state-{cid}']")).to_be_visible(timeout=10000)
        _shot(page, "catalog_requested")

        # And the enrollment exists as Pending (verified via API as the OrgAdmin).
        fid = requests.get(f"{API_BASE}/api/auth/me", headers={"Authorization": f"Bearer " + _login_api(creds)}, timeout=TIMEOUT).json()["data"]["id"]
        rows = requests.get(f"{API_BASE}/api/courses/{cid}/enrollments",
                            headers={"Authorization": f"Bearer {oa}", "X-Org-Id": ORG1_ID}, timeout=TIMEOUT).json().get("data") or []
        mine = next((e for e in rows if e.get("userId") == fid), None)
        assert mine and mine.get("status") == "Pending", "non-member catalog request must create a Pending enrollment"


def _login_api(creds):
    return requests.post(f"{API_BASE}/api/auth/login", json={"username": creds["username"], "password": creds["password"]},
                         timeout=TIMEOUT).json()["data"]["accessToken"]

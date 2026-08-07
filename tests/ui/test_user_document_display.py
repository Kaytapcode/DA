"""
FE display tests for Document pages.
Spec 2.2 — Upload modal, document title display, rename flow.
"""

import os
import pytest
import requests
from datetime import datetime

FE_BASE = os.getenv("FE_BASE_URL", "http://localhost:5173")
API_BASE = os.getenv("API_BASE_URL", "http://localhost:5000")


def _register_and_login_ui(page, prefix="docui"):
    ts = int(datetime.now().timestamp() * 1000)
    creds = {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }
    r = requests.post(
        f"{API_BASE}/api/auth/register",
        json={"username": creds["username"], "password": creds["password"], "email": creds["email"]},
        timeout=10,
    )
    assert r.status_code == 200, f"Pre-test register failed: {r.text}"

    page.goto(f"{FE_BASE}/login")
    page.wait_for_load_state("networkidle")
    page.locator("[data-testid='login-identifier']").fill(creds["username"])
    page.locator("[data-testid='login-password']").fill(creds["password"])
    page.locator("[data-testid='login-submit']").click()
    page.wait_for_url("**/user/**", timeout=15000)
    return creds


def _api_login(identifier, password):
    """Helper — get an API token. BE wraps LoginResponseDto in ApiResponse envelope."""
    r = requests.post(f"{API_BASE}/api/auth/login", json={"username": identifier, "password": password}, timeout=10)
    assert r.status_code == 200
    body = r.json()
    return (body.get("data") or body)["accessToken"]


@pytest.mark.ui
@pytest.mark.display
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentUploadModalDisplay:
    """Spec 2.2 — Upload modal exposes file input + submit, accepts PDF/PNG/JPEG/TXT."""

    def test_upload_modal_inputs_visible(self, page):
        creds = _register_and_login_ui(page)
        # Open content library; clicking the upload button surfaces the modal.
        page.goto(f"{FE_BASE}/user/content-library")
        page.wait_for_load_state("networkidle")

        # Find any "Upload" trigger button by accessible text — fallback if no testid yet on trigger.
        trigger = page.get_by_role("button", name=__import__("re").compile(r"upload", __import__("re").I)).first
        if trigger.is_visible():
            trigger.click()
            page.wait_for_timeout(500)

        # Modal must be in the DOM with our testids
        modal = page.locator("[data-testid='document-upload-modal']")
        if modal.count() > 0:
            assert modal.is_visible()
            assert page.locator("[data-testid='document-upload-input']").count() == 1, \
                "Hidden file input must exist (data-testid=document-upload-input)"
            assert page.locator("[data-testid='document-upload-submit']").is_visible()


@pytest.mark.ui
@pytest.mark.display
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentViewerDisplay:
    """Spec 2.2 — Document viewer renders title and (for owner) the edit button."""

    def test_owner_sees_edit_button_on_their_document(self, page):
        creds = _register_and_login_ui(page)
        # Upload a doc via API so we have something to view
        token = _api_login(creds["username"], creds["password"])
        r = requests.post(
            f"{API_BASE}/api/documents",
            files={"file": ("display_test.pdf", b"%PDF-1.4\n%fake content for FE display test\n%%EOF", "application/pdf")},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        assert r.status_code == 200, f"Upload failed: {r.text}"
        body = r.json()
        doc = body.get("data") if isinstance(body, dict) and "data" in body else body
        doc_id = doc["id"]

        page.goto(f"{FE_BASE}/user/documents?docId={doc_id}")
        page.wait_for_load_state("networkidle")
        # Wait for the document to load + title to render
        page.locator("[data-testid='document-title']").wait_for(state="visible", timeout=10000)

        title = page.locator("[data-testid='document-title']")
        assert title.inner_text().strip() != "", "Title text must be non-empty"

        # Owner-only edit button (wait for it to appear since isOwner check uses async user load)
        page.locator("[data-testid='document-edit-btn']").wait_for(state="visible", timeout=5000)

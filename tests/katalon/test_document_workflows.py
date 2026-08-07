"""
Browser E2E — Document workflows (Spec 2.2 + Spec 1 ownership).

End-to-end via UI:
- Owner uploads via UI modal → file appears in viewer with correct title
- Owner sees rename button on their doc; renames via UI → reload → new name shown
- Non-owner does NOT see the rename button (Spec 1 ownership invariant)
"""

import os
import tempfile
import requests
import pytest
from _helpers import (
    FE_BASE,
    API_BASE,
    login_fresh_user,
    register_user,
    ui_login,
    unique_suffix,
)


def _api_token(username, password):
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": username, "password": password}, timeout=10)
    return r.json()["data"]["accessToken"]


def _api_upload_doc(token, name="e2e_doc.pdf"):
    """Upload via API so the UI viewer has something to display."""
    files = {"file": (name, b"%PDF-1.4\n%E2E test content\n%%EOF", "application/pdf")}
    r = requests.post(f"{API_BASE}/api/documents",
                      files=files,
                      headers={"Authorization": f"Bearer {token}"},
                      timeout=15)
    assert r.status_code == 200, f"API upload failed: {r.text}"
    return r.json()["data"]


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentViewerWorkflow:
    """Spec 2.2 — Document title renders in the viewer; owner sees Edit/Rename."""

    def test_owner_sees_document_title_and_edit_button(self, page):
        creds = login_fresh_user(page, "docview")
        token = _api_token(creds["username"], creds["password"])
        doc = _api_upload_doc(token, name=f"viewer_{unique_suffix('d')}.pdf")

        page.goto(f"{FE_BASE}/user/documents?docId={doc['id']}")
        page.wait_for_load_state("networkidle")

        # Title must render with the uploaded file's base name
        title_locator = page.locator("[data-testid='document-title']")
        title_locator.wait_for(state="visible", timeout=10000)
        title_text = title_locator.inner_text()
        assert "viewer" in title_text.lower(), (
            f"Document title should reflect the uploaded file name, got '{title_text}'"
        )

        # Owner sees the Edit/Rename button
        edit_btn = page.locator("[data-testid='document-edit-btn']")
        edit_btn.wait_for(state="visible", timeout=5000)


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentRenameWorkflow:
    """Spec 2.2 — UI-driven rename: click edit → type → save → reload → new name visible."""

    def test_owner_renames_document_through_ui_and_persists(self, page):
        creds = login_fresh_user(page, "docrename")
        token = _api_token(creds["username"], creds["password"])
        original_name = f"OriginalDoc_{unique_suffix('d')}"
        doc = _api_upload_doc(token, name=f"{original_name}.pdf")

        page.goto(f"{FE_BASE}/user/documents?docId={doc['id']}")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='document-title']").wait_for(state="visible", timeout=10000)

        # Click Edit, type new title, save
        new_name = f"RenamedDoc_{unique_suffix('d')}"
        page.locator("[data-testid='document-edit-btn']").click()
        page.locator("[data-testid='document-rename-input']").wait_for(state="visible", timeout=3000)
        # Clear and fill (Playwright .fill() replaces contents)
        page.locator("[data-testid='document-rename-input']").fill(new_name)
        page.locator("[data-testid='document-rename-save']").click()

        # Wait for the editing UI to dismiss and the new title to render
        page.locator("[data-testid='document-edit-btn']").wait_for(state="visible", timeout=10000)
        displayed = page.locator("[data-testid='document-title']").inner_text()
        assert new_name.lower() in displayed.lower(), (
            f"After rename, viewer should show '{new_name}', got '{displayed}'"
        )

        # Reload — change must persist
        page.reload()
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='document-title']").wait_for(state="visible", timeout=10000)
        displayed_after = page.locator("[data-testid='document-title']").inner_text()
        assert new_name.lower() in displayed_after.lower(), (
            f"After reload the new name must persist; got '{displayed_after}'"
        )


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentOwnershipWorkflow:
    """Spec 1 — Non-owner of a public document must NOT see the edit button."""

    def test_non_owner_does_not_see_edit_button(self, page):
        # Owner uploads the doc
        owner = register_user("docowner")
        owner_token = _api_token(owner["username"], owner["password"])
        doc = _api_upload_doc(owner_token, name=f"OwnerDoc_{unique_suffix('d')}.pdf")

        # Non-owner logs in fresh and visits the doc
        non_owner = register_user("docother")
        ui_login(page, non_owner["username"], non_owner["password"])
        page.goto(f"{FE_BASE}/user/documents?docId={doc['id']}")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='document-title']").wait_for(state="visible", timeout=10000)

        # Edit button must NOT be present for non-owners
        assert page.locator("[data-testid='document-edit-btn']").count() == 0, (
            "Spec 1: non-owner must not see document rename button"
        )

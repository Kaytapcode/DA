"""
Spec 2.2 — Document Management.
"Upload: Supports uploading PDF files, images, and text files.
 Storage: Secure file storage (Database).
 Viewer: Integrated PDF/Image viewer directly on the LMS interface."

Plus Spec 1 invariants:
- User-created resources are public (any auth'd user can read; only owner can edit/delete)
"""

import io
import pytest
from datetime import datetime


def _new_creds(prefix="doc"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


def _register_and_login(api_client, prefix="doc"):
    creds = _new_creds(prefix)
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    api_client.login_user(creds["username"], creds["password"])
    return creds


def _unwrap(resp):
    body = resp.json() if resp.text else {}
    if isinstance(body, dict) and "data" in body and body.get("data") is not None:
        return body["data"]
    return body


def _upload_pdf(api_client, name="sample.pdf", content=b"%PDF-1.4\n%fake pdf content for tests\n%%EOF"):
    """Spec 2.2 — POST /api/documents accepts PDF via multipart."""
    return api_client.post_file(
        "/api/documents",
        files={"file": (name, content, "application/pdf")},
    )


def _upload_txt(api_client, name="notes.txt", content=b"Hello, world. This is a test document."):
    return api_client.post_file(
        "/api/documents",
        files={"file": (name, content, "text/plain")},
    )


def _upload_png(api_client, name="image.png", content=None):
    # Minimal valid PNG header
    if content is None:
        content = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
            b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
            b"\x00\x00\x00\rIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
            b"\x00\x00\x00\x00IEND\xaeB`\x82"
        )
    return api_client.post_file(
        "/api/documents",
        files={"file": (name, content, "image/png")},
    )


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentUpload:
    """Spec 2.2 — Upload PDF/image/text via POST /api/documents."""

    def test_upload_pdf_returns_document(self, api_client):
        """Spec 2.2 — User uploads a PDF; response includes the new document metadata."""
        _register_and_login(api_client)
        resp = _upload_pdf(api_client)
        assert resp.status_code == 200, f"PDF upload failed: {resp.text}"
        doc = _unwrap(resp)
        assert doc.get("id"), "Upload response must include document id"
        assert doc.get("fileName"), "Upload response must include fileName"

    def test_upload_txt_succeeds(self, api_client):
        """Spec 2.2 — Plain text files are accepted."""
        _register_and_login(api_client)
        resp = _upload_txt(api_client)
        assert resp.status_code == 200, f"TXT upload failed: {resp.text}"

    def test_upload_png_succeeds(self, api_client):
        """Spec 2.2 — PNG images are accepted."""
        _register_and_login(api_client)
        resp = _upload_png(api_client)
        assert resp.status_code == 200, f"PNG upload failed: {resp.text}"

    def test_upload_unsupported_type_rejected(self, api_client):
        """Spec 2.2 — Non-allowed MIME (e.g. .exe) must be rejected."""
        _register_and_login(api_client)
        resp = api_client.post_file(
            "/api/documents",
            files={"file": ("malware.exe", b"MZ\x90\x00", "application/x-msdownload")},
        )
        assert resp.status_code == 400, f"Unsupported MIME must be rejected, got {resp.status_code}"

    def test_uploaded_document_is_public(self, api_client):
        """Spec 1 — User-created resources must be public."""
        _register_and_login(api_client)
        resp = _upload_pdf(api_client)
        doc = _unwrap(resp)
        assert doc.get("isPublic") is True, "Spec 1: User-uploaded docs MUST be public"

    def test_unauthenticated_upload_rejected(self, api_client):
        """Spec 2.2 — Upload requires authentication."""
        resp = api_client.post_file(
            "/api/documents",
            files={"file": ("x.pdf", b"%PDF-1.4\n", "application/pdf")},
        )
        assert resp.status_code == 401


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentReadAndList:
    """Spec 2.2 — Owner sees own list; any authed user can read public docs (Spec 1)."""

    def test_user_can_list_own_documents(self, api_client):
        _register_and_login(api_client)
        _upload_pdf(api_client, name="a.pdf")
        _upload_pdf(api_client, name="b.pdf")

        resp = api_client.get("/api/documents")
        assert resp.status_code == 200
        docs = _unwrap(resp)
        assert isinstance(docs, list) and len(docs) >= 2

    def test_non_owner_can_read_public_document(self, api_client):
        """Spec 1 — Any authenticated user can fetch a user-uploaded (public) document."""
        _register_and_login(api_client, prefix="owner")
        upload = _upload_pdf(api_client, name="public.pdf")
        doc = _unwrap(upload)
        api_client.clear_auth()

        _register_and_login(api_client, prefix="reader")
        resp = api_client.get(f"/api/documents/{doc['id']}")
        assert resp.status_code == 200, "Spec 1: any authed user must be able to read public docs"


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestDocumentRenameAndDelete:
    """Spec 2.2 — Owner can rename and delete; non-owner is blocked (Spec 1)."""

    def test_owner_can_rename_document(self, api_client):
        _register_and_login(api_client)
        upload = _upload_pdf(api_client, name="oldname.pdf")
        doc = _unwrap(upload)

        resp = api_client.patch(f"/api/documents/{doc['id']}", json={"fileName": "newname.pdf"})
        assert resp.status_code == 200

        # GET /api/documents/{id} streams the file, not metadata. Use the list endpoint
        # to verify the rename persisted.
        listing = _unwrap(api_client.get("/api/documents"))
        renamed = next((d for d in listing if d["id"] == doc["id"]), None)
        assert renamed is not None, "Document should still be in the listing"
        assert "newname" in renamed.get("fileName", "").lower()

    def test_non_owner_cannot_rename(self, api_client):
        _register_and_login(api_client, prefix="owner2")
        upload = _upload_pdf(api_client, name="locked.pdf")
        doc = _unwrap(upload)
        api_client.clear_auth()

        _register_and_login(api_client, prefix="other")
        resp = api_client.patch(f"/api/documents/{doc['id']}", json={"fileName": "hacked.pdf"})
        assert resp.status_code in (403, 404)

    def test_owner_can_delete_document(self, api_client):
        _register_and_login(api_client)
        upload = _upload_pdf(api_client, name="todelete.pdf")
        doc = _unwrap(upload)

        resp = api_client.delete(f"/api/documents/{doc['id']}")
        assert resp.status_code in (200, 204)
        # Document should no longer appear in the listing
        listing = _unwrap(api_client.get("/api/documents"))
        assert not any(d["id"] == doc["id"] for d in listing), "Deleted doc must vanish from list"

    def test_non_owner_cannot_delete(self, api_client):
        _register_and_login(api_client, prefix="owner3")
        upload = _upload_pdf(api_client, name="protected.pdf")
        doc = _unwrap(upload)
        api_client.clear_auth()

        _register_and_login(api_client, prefix="other3")
        resp = api_client.delete(f"/api/documents/{doc['id']}")
        assert resp.status_code in (403, 404)

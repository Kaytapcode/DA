"""
Spec 2.4 — Video Management (YouTube).
- Upload Link: User provides YouTube link (no direct uploads)
- Metadata: Auto-extract Title + Thumbnail from YouTube API
- Embedded Viewer: Embedded YouTube player on LMS
"""

import pytest
from datetime import datetime

# A stable, widely-known YouTube video so the oEmbed lookup almost always succeeds.
# "Me at the zoo" — first YT video, ID = jNQXAC9IVRw
STABLE_YOUTUBE_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
STABLE_YOUTUBE_ID = "jNQXAC9IVRw"


def _new_creds(prefix="vid"):
    ts = int(datetime.now().timestamp() * 1000)
    return {
        "username": f"{prefix}_{ts}",
        "email": f"{prefix}_{ts}@example.com",
        "password": "TestPassword123!",
    }


def _register_and_login(api_client, prefix="vid"):
    creds = _new_creds(prefix)
    api_client.register_user(creds["username"], creds["password"], creds["email"])
    api_client.login_user(creds["username"], creds["password"])
    return creds


def _unwrap(resp):
    body = resp.json() if resp.text else {}
    if isinstance(body, dict) and "data" in body and body.get("data") is not None:
        return body["data"]
    return body


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestPersonalVideoCreate:
    """Spec 2.4 — User creates a personal video from a YouTube URL."""

    def test_user_can_create_video_from_youtube_url(self, api_client):
        _register_and_login(api_client)
        resp = api_client.post("/api/videos/personal", json={
            "youTubeUrl": STABLE_YOUTUBE_URL,
        })
        assert resp.status_code == 200, f"Create video failed: {resp.text}"
        v = _unwrap(resp)
        assert v.get("youTubeVideoId") == STABLE_YOUTUBE_ID
        assert v.get("thumbnailUrl"), "Thumbnail URL must be returned"
        assert v.get("embeddableUrl"), "Embeddable URL must be returned for the player"

    def test_thumbnail_url_uses_youtube_cdn(self, api_client):
        """Spec 2.4 — Thumbnail extracted from YouTube CDN."""
        _register_and_login(api_client)
        resp = api_client.post("/api/videos/personal", json={"youTubeUrl": STABLE_YOUTUBE_URL})
        v = _unwrap(resp)
        assert "ytimg.com" in (v.get("thumbnailUrl") or "")
        assert STABLE_YOUTUBE_ID in (v.get("thumbnailUrl") or "")

    def test_embeddable_url_is_youtube_embed_format(self, api_client):
        """Spec 2.4 — Embedded player URL is the standard youtube.com/embed/{id} format."""
        _register_and_login(api_client)
        resp = api_client.post("/api/videos/personal", json={"youTubeUrl": STABLE_YOUTUBE_URL})
        v = _unwrap(resp)
        assert v.get("embeddableUrl") == f"https://www.youtube.com/embed/{STABLE_YOUTUBE_ID}"

    @pytest.mark.slow
    def test_title_auto_extracted_when_not_provided(self, api_client):
        """
        Spec 2.4 — When the user does NOT supply a title, the BE auto-extracts it
        from YouTube via oEmbed. Marked slow because it hits youtube.com over the network.
        """
        _register_and_login(api_client)
        resp = api_client.post("/api/videos/personal", json={"youTubeUrl": STABLE_YOUTUBE_URL})
        v = _unwrap(resp)
        title = v.get("title") or ""
        # The classic first-ever YouTube video has the title "Me at the zoo".
        # We tolerate any non-default title — anything other than the fallback "YouTube Video"
        # is acceptable, since the spec just requires automatic extraction.
        assert title and title.strip() != "YouTube Video", \
            f"Spec 2.4: BE must auto-fetch title from YouTube; got '{title}' (fallback)"

    def test_invalid_youtube_url_rejected(self, api_client):
        _register_and_login(api_client)
        for bad in ["https://vimeo.com/123", "not a url", "https://example.com/video"]:
            resp = api_client.post("/api/videos/personal", json={"youTubeUrl": bad})
            assert resp.status_code == 400, f"Bad URL '{bad}' must be rejected, got {resp.status_code}"

    def test_missing_url_rejected(self, api_client):
        _register_and_login(api_client)
        resp = api_client.post("/api/videos/personal", json={"youTubeUrl": ""})
        assert resp.status_code == 400

    def test_unauthenticated_blocked(self, api_client):
        resp = api_client.post("/api/videos/personal", json={"youTubeUrl": STABLE_YOUTUBE_URL})
        assert resp.status_code == 401


@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestVideoRenameAndOwnership:
    """Spec 2.4 — Owner can rename; non-owner cannot."""

    def test_owner_can_rename(self, api_client):
        _register_and_login(api_client)
        resp = api_client.post("/api/videos/personal", json={
            "youTubeUrl": STABLE_YOUTUBE_URL,
            "title": "Original",
        })
        v = _unwrap(resp)

        patch = api_client.patch(f"/api/videos/{v['id']}", json={"title": "Renamed"})
        assert patch.status_code == 200

        after = _unwrap(api_client.get(f"/api/videos/{v['id']}"))
        assert after.get("title") == "Renamed"

    def test_non_owner_cannot_rename(self, api_client):
        _register_and_login(api_client, prefix="vidowner")
        resp = api_client.post("/api/videos/personal", json={
            "youTubeUrl": STABLE_YOUTUBE_URL,
            "title": "Mine",
        })
        v = _unwrap(resp)
        api_client.clear_auth()

        _register_and_login(api_client, prefix="vidother")
        patch = api_client.patch(f"/api/videos/{v['id']}", json={"title": "Hacked"})
        assert patch.status_code in (403, 404)

    def test_non_owner_can_read_public_video(self, api_client):
        """Spec 1 — User-created videos are public."""
        _register_and_login(api_client, prefix="vidpub")
        resp = api_client.post("/api/videos/personal", json={
            "youTubeUrl": STABLE_YOUTUBE_URL,
            "title": "Public",
        })
        v = _unwrap(resp)
        api_client.clear_auth()

        _register_and_login(api_client, prefix="vidreader")
        get_resp = api_client.get(f"/api/videos/{v['id']}")
        assert get_resp.status_code == 200, "Spec 1: any authed user must read public video"

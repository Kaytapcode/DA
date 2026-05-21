"""
Browser E2E — Video workflows (Spec 2.4 + Spec 1 ownership).

End-to-end:
- User saves a YouTube link via UI; the embedded player + title appear
- Owner renames video via UI → reload → new title persists
- Non-owner does not see the edit button
"""

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

STABLE_YOUTUBE_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
STABLE_YOUTUBE_ID = "jNQXAC9IVRw"


def _api_token(username, password):
    r = requests.post(f"{API_BASE}/api/auth/login",
                      json={"username": username, "password": password}, timeout=10)
    return r.json()["data"]["accessToken"]


def _api_create_video(token, title=None):
    payload = {"youTubeUrl": STABLE_YOUTUBE_URL}
    if title:
        payload["title"] = title
    r = requests.post(f"{API_BASE}/api/videos/personal",
                      json=payload,
                      headers={"Authorization": f"Bearer {token}"},
                      timeout=15)
    assert r.status_code == 200, f"API video create failed: {r.text}"
    return r.json()["data"]


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestVideoCreateWorkflow:
    """Spec 2.4 — User saves a YouTube link via UI; player and title render."""

    def test_user_saves_youtube_video_via_ui(self, page):
        login_fresh_user(page, "vidcreate")
        page.goto(f"{FE_BASE}/user/videos/new")
        page.wait_for_load_state("networkidle")

        title = f"E2E Video {unique_suffix('v')}"
        page.locator("[data-testid='video-url-input']").wait_for(state="visible")
        page.locator("[data-testid='video-url-input']").fill(STABLE_YOUTUBE_URL)
        page.locator("[data-testid='video-title-input']").fill(title)
        page.locator("[data-testid='video-save-btn']").click()

        # Embedded preview iframe should render (FE shows the preview after save)
        page.wait_for_timeout(2500)
        # If the FE navigates to the watch page, the video-player iframe should appear there
        # If it stays on the create page, an iframe preview is expected
        iframes = page.locator("iframe")
        assert iframes.count() >= 1, "After saving, an embedded YouTube iframe must appear"


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestVideoWatchAndRenameWorkflow:
    """Spec 2.4 — Watch page shows title + player; owner can rename via UI."""

    def test_video_title_and_player_render_in_viewer(self, page):
        creds = login_fresh_user(page, "vidwatch")
        token = _api_token(creds["username"], creds["password"])
        original_title = f"WatchVid_{unique_suffix('v')}"
        video = _api_create_video(token, title=original_title)

        page.goto(f"{FE_BASE}/user/videos/watch/{video['id']}")
        page.wait_for_load_state("networkidle")

        title_locator = page.locator("[data-testid='video-title']")
        title_locator.wait_for(state="visible", timeout=10000)
        assert original_title.lower() in title_locator.inner_text().lower(), (
            f"Video title must display '{original_title}'"
        )

        # YouTube player iframe must be embedded
        player = page.locator("[data-testid='video-player']")
        player.wait_for(state="visible", timeout=10000)
        src = player.get_attribute("src") or ""
        assert STABLE_YOUTUBE_ID in src, (
            f"Embedded player src should reference the YouTube videoId, got '{src}'"
        )

    def test_owner_renames_video_through_ui_and_persists(self, page):
        creds = login_fresh_user(page, "vidrename")
        token = _api_token(creds["username"], creds["password"])
        video = _api_create_video(token, title=f"OldVidName_{unique_suffix('v')}")

        page.goto(f"{FE_BASE}/user/videos/watch/{video['id']}")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='video-title']").wait_for(state="visible", timeout=10000)

        new_title = f"NewVidName_{unique_suffix('v')}"
        page.locator("[data-testid='video-edit-btn']").click()
        page.locator("[data-testid='video-rename-input']").wait_for(state="visible", timeout=3000)
        page.locator("[data-testid='video-rename-input']").fill(new_title)
        page.locator("[data-testid='video-rename-save']").click()

        # Wait for editing UI to dismiss and new title to render
        page.locator("[data-testid='video-edit-btn']").wait_for(state="visible", timeout=10000)
        assert new_title.lower() in page.locator("[data-testid='video-title']").inner_text().lower()

        # Reload — change must persist
        page.reload()
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='video-title']").wait_for(state="visible", timeout=10000)
        assert new_title.lower() in page.locator("[data-testid='video-title']").inner_text().lower()


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
class TestVideoOwnershipWorkflow:
    """Spec 1 — Non-owner cannot rename someone else's video."""

    def test_non_owner_does_not_see_video_edit_button(self, page):
        owner = register_user("vidowner")
        owner_token = _api_token(owner["username"], owner["password"])
        video = _api_create_video(owner_token, title=f"OwnerVid_{unique_suffix('v')}")

        non_owner = register_user("vidother")
        ui_login(page, non_owner["username"], non_owner["password"])
        page.goto(f"{FE_BASE}/user/videos/watch/{video['id']}")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='video-title']").wait_for(state="visible", timeout=10000)

        assert page.locator("[data-testid='video-edit-btn']").count() == 0, (
            "Spec 1: non-owner must not see video rename button"
        )

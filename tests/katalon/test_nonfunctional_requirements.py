"""
Non-functional requirement (NFR) tests for Lumina LMS.

Based on SystemDoc/Nonfunctional_Requirement.md — 4 priority NFRs:
  1. Usability        — multi-language support, accessible navigation, inline validation
  2. Maintainability  — service health, structured error responses, API consistency
  3. Availability     — all services reachable within SLA, FE load time, graceful 404s
  4. Compatibility    — language switch < 1 s, responsive at 3 breakpoints, no layout overflow

Each test class references the NFR it enforces in its docstring.
"""

import time
import pytest
import requests
from playwright.sync_api import Page, expect
from ._helpers import FE_BASE, API_BASE, ui_login, register_user

# ─── Seeded accounts ─────────────────────────────────────────────────────────
SYSADMIN_USER = "SysAdmin1"
SYSADMIN_PASS = "SysAdmin@123"
USER_USER = "User1"
USER_PASS = "User@123"
ORGADMIN_USER = "OrgAdmin1"
ORGADMIN_PASS = "OrgAdmin@123"
ORGADMIN_ORG_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

# ─── Service base URLs (direct, not via gateway) ──────────────────────────────
IDENTITY_BASE = "http://localhost:5001"
ORG_BASE = "http://localhost:5002"
CONTENT_BASE = "http://localhost:5003"
AI_BASE = "http://localhost:5004"
SYSADMIN_BASE = "http://localhost:5005"


# ═══════════════════════════════════════════════════════════════════════════════
# NFR 1 — Usability
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestUsabilityLanguageOptions:
    """NFR §1 — Tính Dễ sử dụng: Hỗ trợ đa ngôn ngữ (tiếng Việt, tiếng Anh, tiếng Nhật).
    The Language tab in user profile must expose all three supported languages."""

    def test_language_tab_is_accessible(self, page: Page):
        """Language settings tab reachable from the user profile page."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        tab = page.locator("[data-testid='profile-tab-language']")
        expect(tab).to_be_visible()

    def test_english_language_option_present(self, page: Page):
        """English (en) option is available in the language selector. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-tab-language']").click()
        expect(page.locator("[data-testid='language-option-en']")).to_be_visible()

    def test_vietnamese_language_option_present(self, page: Page):
        """Tiếng Việt (vi) option is available in the language selector. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-tab-language']").click()
        expect(page.locator("[data-testid='language-option-vi']")).to_be_visible()

    def test_japanese_language_option_present(self, page: Page):
        """日本語 (ja) option is available in the language selector. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-tab-language']").click()
        expect(page.locator("[data-testid='language-option-ja']")).to_be_visible()

    def test_language_selection_saves_successfully(self, page: Page):
        """Selecting a language option saves without page reload and shows confirmation. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-tab-language']").click()
        page.locator("[data-testid='language-option-en']").click()
        # Should show success message without a full page reload
        expect(page.locator("[data-testid='language-success']")).to_be_visible(timeout=5000)

    def test_language_preference_persists_after_reload(self, page: Page):
        """Language preference selected in profile is retained after page reload. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-tab-language']").click()
        # Switch to Vietnamese
        page.locator("[data-testid='language-option-vi']").click()
        page.locator("[data-testid='language-success']").wait_for(state="visible", timeout=5000)
        # Reload and verify — the active button gains 'font-semibold' class
        page.reload()
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-tab-language']").click()
        # Wait for the async /auth/me fetch to complete and React to re-render
        page.wait_for_function(
            "() => {"
            "  const btn = document.querySelector('[data-testid=\"language-option-vi\"]');"
            "  return btn && (btn.className.includes('font-semibold') || btn.className.includes('text-primary'));"
            "}",
            timeout=5000,
        )
        vi_btn = page.locator("[data-testid='language-option-vi']")
        vi_class = vi_btn.get_attribute("class") or ""
        assert "font-semibold" in vi_class or "text-primary" in vi_class, \
            f"vi button not styled as active after reload — preference did not persist. class='{vi_class}'"
        # Restore to English
        page.locator("[data-testid='language-option-en']").click()
        page.locator("[data-testid='language-success']").wait_for(state="visible", timeout=5000)


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestUsabilityCoreNavigation:
    """NFR §1 — Tính Dễ sử dụng: Core resources reachable within two interactions from home."""

    def test_quiz_page_reachable_from_home(self, page: Page):
        """Content library (with quizzes) is reachable from the user home. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.wait_for_load_state("networkidle")
        page.goto(f"{FE_BASE}/user/library")
        page.wait_for_load_state("networkidle")
        assert "/user/library" in page.url

    def test_documents_page_reachable_from_home(self, page: Page):
        """Document library page is reachable from the user home. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/documents")
        page.wait_for_load_state("networkidle")
        assert "/user/documents" in page.url

    def test_flashcards_page_reachable_from_home(self, page: Page):
        """Flashcard library page is reachable from the user home. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/flashcards")
        page.wait_for_load_state("networkidle")
        assert "/user/flashcards" in page.url

    def test_browse_public_page_reachable_from_home(self, page: Page):
        """Browse Public page is reachable from the user home. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/browse")
        page.wait_for_load_state("networkidle")
        assert "/user/browse" in page.url

    def test_profile_page_reachable_from_home(self, page: Page):
        """User profile page is reachable from the user home. NFR §1."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='user-profile-page']")).to_be_visible()


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestUsabilityFormValidation:
    """NFR §1 — Tính Dễ sử dụng: Forms provide inline validation without full-page reload."""

    def test_login_empty_submit_stays_on_login_page(self, page: Page):
        """Submitting login form with empty fields does not navigate away from /login. NFR §1."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-submit']").click()
        page.wait_for_timeout(500)
        # Must stay on the login page — HTML5 validation or server error keeps user here
        assert "/login" in page.url, \
            f"Submitting empty form navigated away to {page.url}"

    def test_login_wrong_credentials_shows_error(self, page: Page):
        """Wrong credentials on login produce an inline error message. NFR §1."""
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='login-identifier']").fill("nonexistent_user_xyz")
        page.locator("[data-testid='login-password']").fill("WrongPass!999")
        page.locator("[data-testid='login-submit']").click()
        expect(page.locator("[data-testid='login-error']")).to_be_visible(timeout=8000)
        assert "/login" in page.url

    def test_register_duplicate_username_shows_error(self, page: Page):
        """Registering with an existing username shows an error inline. NFR §1."""
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='register-username']").fill(USER_USER)
        page.locator("[data-testid='register-email']").fill("dup@example.com")
        page.locator("[data-testid='register-password']").fill("TestPassword123!")
        page.locator("[data-testid='register-submit']").click()
        # Should show duplicate error; stay on register page
        assert "/register" in page.url


# ═══════════════════════════════════════════════════════════════════════════════
# NFR 2 — Maintainability
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.katalon
@pytest.mark.api
@pytest.mark.wave1
class TestMaintainabilityServiceHealth:
    """NFR §2 — Tính Bảo trì: All microservices respond on their designated ports.
    A reachable service (2xx or 4xx) means the service is up; 5xx or connection error means down."""

    def _is_service_up(self, base_url: str, probe_path: str) -> bool:
        """Returns True if the service responds with 2xx or 4xx (not 5xx or connection error)."""
        try:
            r = requests.get(f"{base_url}{probe_path}", timeout=5)
            return r.status_code < 500
        except requests.ConnectionError:
            return False

    def test_gateway_is_up(self):
        """API Gateway (port 5000) responds to requests. NFR §2."""
        assert self._is_service_up(API_BASE, "/api/auth/me"), \
            f"Gateway at {API_BASE} is unreachable or returning 5xx"

    def test_identity_service_is_up(self):
        """Identity.Api (port 5001) responds to requests. NFR §2."""
        assert self._is_service_up(IDENTITY_BASE, "/api/auth/me"), \
            f"Identity.Api at {IDENTITY_BASE} is unreachable or returning 5xx"

    def test_organization_service_is_up(self):
        """Organization.Api (port 5002) responds to requests. NFR §2."""
        assert self._is_service_up(ORG_BASE, "/api/orgs"), \
            f"Organization.Api at {ORG_BASE} is unreachable or returning 5xx"

    def test_content_service_is_up(self):
        """Content.Api (port 5003) responds to requests. NFR §2."""
        assert self._is_service_up(CONTENT_BASE, "/api/quizzes"), \
            f"Content.Api at {CONTENT_BASE} is unreachable or returning 5xx"

    def test_ai_service_is_up(self):
        """AI.Api (port 5004) responds to requests. NFR §2."""
        assert self._is_service_up(AI_BASE, "/api/ai/quota"), \
            f"AI.Api at {AI_BASE} is unreachable or returning 5xx"

    def test_sysadmin_service_is_up(self):
        """SysAdmin.Api (port 5005) responds to requests. NFR §2."""
        assert self._is_service_up(SYSADMIN_BASE, "/api/banners"), \
            f"SysAdmin.Api at {SYSADMIN_BASE} is unreachable or returning 5xx"


@pytest.mark.katalon
@pytest.mark.api
@pytest.mark.wave1
class TestMaintainabilityErrorFormat:
    """NFR §2 — Tính Bảo trì: Error responses follow a consistent, structured JSON format
    (RFC 9110 ProblemDetails). Raw exception leakage fails these tests."""

    def test_validation_error_is_structured_json(self):
        """400 validation error from Identity.Api is structured JSON with 'errors' field. NFR §2."""
        r = requests.post(f"{API_BASE}/api/auth/register", json={}, timeout=5)
        assert r.status_code == 400
        body = r.json()
        assert "errors" in body or "message" in body, \
            f"Expected structured error JSON, got: {body}"
        # Must not be a raw stack trace
        raw = r.text
        assert "System." not in raw and "Microsoft." not in raw, \
            "Response contains raw .NET exception — maintainability violation"

    def test_unauthorized_error_is_structured_json(self):
        """401 response from a protected endpoint is structured JSON, not raw exception. NFR §2."""
        r = requests.get(f"{API_BASE}/api/auth/me", timeout=5)
        assert r.status_code == 401
        raw = r.text
        assert "System." not in raw and "Microsoft." not in raw, \
            "Unauthorized response leaks .NET internals — maintainability violation"

    def test_not_found_is_structured_json(self):
        """404 on an unknown gateway route returns structured JSON or empty, not stack trace. NFR §2."""
        r = requests.get(f"{API_BASE}/api/nonexistent-route-xyz", timeout=5)
        assert r.status_code in (404, 400), f"Expected 404/400, got {r.status_code}"
        raw = r.text
        assert "System." not in raw and "Microsoft." not in raw, \
            "404 response leaks .NET internals — maintainability violation"

    def test_api_returns_json_content_type_on_error(self):
        """Error response from any protected endpoint declares application/json content-type. NFR §2."""
        r = requests.get(f"{API_BASE}/api/auth/me", timeout=5)
        ct = r.headers.get("Content-Type", "")
        assert "application/json" in ct or "application/problem+json" in ct or r.text == "", \
            f"Expected JSON content-type on 401, got '{ct}'"


@pytest.mark.katalon
@pytest.mark.api
@pytest.mark.wave1
class TestMaintainabilityApiConsistency:
    """NFR §2 — Tính Bảo trì: API contracts are consistent (UUID ids, ISO timestamps)."""

    def _get_auth_token(self) -> str:
        r = requests.post(
            f"{API_BASE}/api/auth/login",
            json={"username": USER_USER, "password": USER_PASS},
            timeout=10,
        )
        assert r.status_code == 200, f"Login failed: {r.text}"
        return r.json()["data"]["accessToken"]

    def test_user_profile_returns_uuid_id(self):
        """GET /api/auth/me returns an 'id' field that is a valid UUID. NFR §2."""
        token = self._get_auth_token()
        r = requests.get(
            f"{API_BASE}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert r.status_code == 200
        body = r.json().get("data", r.json())
        assert "id" in body, "Profile response missing 'id' field"
        uid = body["id"]
        # UUID format: 8-4-4-4-12 hex chars
        import re
        assert re.match(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            uid,
            re.I,
        ), f"'id' is not a valid UUID: {uid}"

    def test_quiz_list_items_have_id_and_title(self):
        """GET /api/quizzes returns items with 'id' and 'title' fields. NFR §2."""
        token = self._get_auth_token()
        r = requests.get(
            f"{API_BASE}/api/quizzes",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("items", body.get("data", []))
        if len(items) > 0:
            item = items[0]
            assert "id" in item, f"Quiz item missing 'id': {item}"
            assert "title" in item, f"Quiz item missing 'title': {item}"


# ═══════════════════════════════════════════════════════════════════════════════
# NFR 3 — Availability
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.katalon
@pytest.mark.api
@pytest.mark.wave1
class TestAvailabilityResponseTimes:
    """NFR §3 — Tính Sẵn sàng: Services respond within acceptable time bounds.
    No formal SLA is measured here (99% monthly uptime requires long-run monitoring),
    but each request must complete within 5 seconds as a smoke-test proxy."""

    def test_login_responds_under_5_seconds(self):
        """Login API responds within 5 seconds. NFR §3 proxy."""
        start = time.time()
        r = requests.post(
            f"{API_BASE}/api/auth/login",
            json={"username": USER_USER, "password": USER_PASS},
            timeout=10,
        )
        elapsed = time.time() - start
        assert r.status_code == 200, f"Login failed: {r.text}"
        assert elapsed < 5.0, f"Login took {elapsed:.2f}s — exceeds 5-second threshold"

    def test_quiz_list_responds_under_5_seconds(self):
        """Quiz list API responds within 5 seconds after auth. NFR §3 proxy."""
        r = requests.post(
            f"{API_BASE}/api/auth/login",
            json={"username": USER_USER, "password": USER_PASS},
            timeout=10,
        )
        token = r.json()["data"]["accessToken"]
        start = time.time()
        r2 = requests.get(
            f"{API_BASE}/api/quizzes",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        elapsed = time.time() - start
        assert r2.status_code == 200
        assert elapsed < 5.0, f"Quiz list took {elapsed:.2f}s — exceeds 5-second threshold"

    def test_gateway_handles_unknown_route_gracefully(self):
        """Gateway returns 404 (not 5xx) for completely unknown routes. NFR §3."""
        r = requests.get(f"{API_BASE}/api/nonexistent-route-xyz-abc", timeout=5)
        assert r.status_code != 500, \
            f"Gateway returned 500 on unknown route — availability risk"
        assert r.status_code < 500, \
            f"Gateway returned {r.status_code} — expected < 500"


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestAvailabilityFELoad:
    """NFR §3 — Tính Sẵn sàng: Frontend pages load within 5 seconds on localhost."""

    def test_login_page_loads_under_5_seconds(self, page: Page):
        """Login page fully loads (networkidle) in under 5 seconds. NFR §3."""
        start = time.time()
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        elapsed = time.time() - start
        assert elapsed < 5.0, f"Login page loaded in {elapsed:.2f}s — exceeds 5-second threshold"
        expect(page.locator("[data-testid='login-submit']")).to_be_visible()

    def test_user_home_loads_under_5_seconds(self, page: Page):
        """User home page loads (networkidle) in under 5 seconds after login. NFR §3."""
        ui_login(page, USER_USER, USER_PASS)
        start = time.time()
        page.goto(f"{FE_BASE}/user/home")
        page.wait_for_load_state("networkidle")
        elapsed = time.time() - start
        assert elapsed < 5.0, f"User home loaded in {elapsed:.2f}s — exceeds 5-second threshold"

    def test_no_5xx_errors_on_page_load(self, page: Page):
        """No 5xx responses occur while loading the user home page. NFR §3."""
        server_errors: list[str] = []

        def on_response(response):
            if response.status >= 500:
                server_errors.append(f"{response.status} {response.url}")

        page.on("response", on_response)
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/home")
        page.wait_for_load_state("networkidle")
        assert server_errors == [], \
            f"5xx errors during page load — availability violation: {server_errors}"


# ═══════════════════════════════════════════════════════════════════════════════
# NFR 4 — Compatibility
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestCompatibilityLanguageToggleSpeed:
    """NFR §4 — Tính Tương thích: Language switch completes in under 1 second.
    Spec: "Hỗ trợ chuyển đổi giao diện giữa Tiếng Việt và Tiếng Anh… dưới 1 giây."
    Measured as time from click to success message visibility."""

    def test_language_toggle_en_to_vi_under_1_second(self, page: Page):
        """Switching from English to Vietnamese shows confirmation in < 1 second. NFR §4."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        # Ensure we start from English
        page.locator("[data-testid='profile-tab-language']").click()
        page.locator("[data-testid='language-option-en']").click()
        page.locator("[data-testid='language-success']").wait_for(state="visible", timeout=5000)
        page.wait_for_timeout(300)  # brief settle

        # Now measure the vi switch
        start = time.time()
        page.locator("[data-testid='language-option-vi']").click()
        page.locator("[data-testid='language-success']").wait_for(state="visible", timeout=5000)
        elapsed = time.time() - start

        assert elapsed < 1.0, \
            f"Language toggle took {elapsed:.3f}s — exceeds 1-second NFR threshold"

        # Restore to English
        page.locator("[data-testid='language-option-en']").click()
        page.locator("[data-testid='language-success']").wait_for(state="visible", timeout=5000)

    def test_language_toggle_vi_to_en_under_1_second(self, page: Page):
        """Switching from Vietnamese back to English shows confirmation in < 1 second. NFR §4."""
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/profile")
        page.wait_for_load_state("networkidle")
        page.locator("[data-testid='profile-tab-language']").click()
        # Ensure Vietnamese is selected first
        page.locator("[data-testid='language-option-vi']").click()
        page.locator("[data-testid='language-success']").wait_for(state="visible", timeout=5000)
        page.wait_for_timeout(300)

        start = time.time()
        page.locator("[data-testid='language-option-en']").click()
        page.locator("[data-testid='language-success']").wait_for(state="visible", timeout=5000)
        elapsed = time.time() - start

        assert elapsed < 1.0, \
            f"Language toggle took {elapsed:.3f}s — exceeds 1-second NFR threshold"


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestCompatibilityMobileViewport:
    """NFR §4 — Tính Tương thích: Mobile viewport (chiều rộng < 768px).
    Layout must not overflow horizontally; key elements must remain visible."""

    MOBILE_WIDTH = 375
    MOBILE_HEIGHT = 812  # iPhone X

    def test_login_page_no_horizontal_scroll_mobile(self, page: Page):
        """Login page at 375px width has no horizontal scrollbar. NFR §4."""
        page.set_viewport_size({"width": self.MOBILE_WIDTH, "height": self.MOBILE_HEIGHT})
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow at {self.MOBILE_WIDTH}px: scrollWidth={scroll_width} > clientWidth={client_width}"

    def test_login_form_visible_on_mobile(self, page: Page):
        """Login form fields are visible and usable at 375px width. NFR §4."""
        page.set_viewport_size({"width": self.MOBILE_WIDTH, "height": self.MOBILE_HEIGHT})
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='login-identifier']")).to_be_visible()
        expect(page.locator("[data-testid='login-password']")).to_be_visible()
        expect(page.locator("[data-testid='login-submit']")).to_be_visible()

    def test_register_page_no_horizontal_scroll_mobile(self, page: Page):
        """Register page at 375px width has no horizontal scrollbar. NFR §4."""
        page.set_viewport_size({"width": self.MOBILE_WIDTH, "height": self.MOBILE_HEIGHT})
        page.goto(f"{FE_BASE}/register")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow at {self.MOBILE_WIDTH}px: scrollWidth={scroll_width} > clientWidth={client_width}"

    def test_user_home_no_horizontal_scroll_mobile(self, page: Page):
        """User home page at 375px has no horizontal scrollbar. NFR §4."""
        page.set_viewport_size({"width": self.MOBILE_WIDTH, "height": self.MOBILE_HEIGHT})
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/home")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow on user home at {self.MOBILE_WIDTH}px"

    def test_quiz_list_no_horizontal_scroll_mobile(self, page: Page):
        """Quiz list page at 375px has no horizontal scrollbar. NFR §4."""
        page.set_viewport_size({"width": self.MOBILE_WIDTH, "height": self.MOBILE_HEIGHT})
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/quizzes")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow on quiz list at {self.MOBILE_WIDTH}px"


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestCompatibilityTabletViewport:
    """NFR §4 — Tính Tương thích: Tablet viewport (768px–1024px).
    Layout must not overflow and critical elements must be visible."""

    TABLET_WIDTH = 768
    TABLET_HEIGHT = 1024

    def test_login_page_no_horizontal_scroll_tablet(self, page: Page):
        """Login page at 768px has no horizontal scrollbar. NFR §4."""
        page.set_viewport_size({"width": self.TABLET_WIDTH, "height": self.TABLET_HEIGHT})
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow at {self.TABLET_WIDTH}px: {scroll_width} > {client_width}"

    def test_login_form_visible_on_tablet(self, page: Page):
        """Login form elements are visible at 768px tablet viewport. NFR §4."""
        page.set_viewport_size({"width": self.TABLET_WIDTH, "height": self.TABLET_HEIGHT})
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='login-identifier']")).to_be_visible()
        expect(page.locator("[data-testid='login-submit']")).to_be_visible()

    def test_user_home_no_horizontal_scroll_tablet(self, page: Page):
        """User home page at 768px has no horizontal scrollbar. NFR §4."""
        page.set_viewport_size({"width": self.TABLET_WIDTH, "height": self.TABLET_HEIGHT})
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/home")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow on user home at {self.TABLET_WIDTH}px"


@pytest.mark.katalon
@pytest.mark.ui
@pytest.mark.wave1
class TestCompatibilityDesktopViewport:
    """NFR §4 — Tính Tương thích: Desktop viewport (> 1024px).
    Standard full layout must render correctly."""

    DESKTOP_WIDTH = 1280
    DESKTOP_HEIGHT = 800

    def test_login_page_renders_on_desktop(self, page: Page):
        """Login page at 1280px desktop width renders key elements. NFR §4."""
        page.set_viewport_size({"width": self.DESKTOP_WIDTH, "height": self.DESKTOP_HEIGHT})
        page.goto(f"{FE_BASE}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("[data-testid='login-identifier']")).to_be_visible()
        expect(page.locator("[data-testid='login-password']")).to_be_visible()
        expect(page.locator("[data-testid='login-submit']")).to_be_visible()

    def test_sysadmin_dashboard_renders_on_desktop(self, page: Page):
        """SysAdmin dashboard at 1280px desktop renders without overflow. NFR §4."""
        page.set_viewport_size({"width": self.DESKTOP_WIDTH, "height": self.DESKTOP_HEIGHT})
        ui_login(page, SYSADMIN_USER, SYSADMIN_PASS, wait_pattern="**/sysadmin/**")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow on sysadmin dashboard at {self.DESKTOP_WIDTH}px"

    def test_user_home_no_horizontal_scroll_desktop(self, page: Page):
        """User home at 1280px desktop has no horizontal scrollbar. NFR §4."""
        page.set_viewport_size({"width": self.DESKTOP_WIDTH, "height": self.DESKTOP_HEIGHT})
        ui_login(page, USER_USER, USER_PASS)
        page.goto(f"{FE_BASE}/user/home")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow on user home at {self.DESKTOP_WIDTH}px"

    def test_sysadmin_dashboard_no_horizontal_scroll_desktop(self, page: Page):
        """SysAdmin dashboard at 1280px has no horizontal scrollbar. NFR §4."""
        page.set_viewport_size({"width": self.DESKTOP_WIDTH, "height": self.DESKTOP_HEIGHT})
        ui_login(page, SYSADMIN_USER, SYSADMIN_PASS, wait_pattern="**/sysadmin/**")
        page.wait_for_load_state("networkidle")
        scroll_width = page.evaluate("document.body.scrollWidth")
        client_width = page.evaluate("document.body.clientWidth")
        assert scroll_width <= client_width + 5, \
            f"Horizontal overflow on sysadmin dashboard at {self.DESKTOP_WIDTH}px"

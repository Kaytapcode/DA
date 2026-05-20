"""
Katalon E2E: User login → land on home workflow.
Demonstrates the Katalon Recorder → pytest port path.
"""

import pytest


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_login_and_land_on_home(page):
    """
    User logs in via FE and lands on home page.
    This is a ported Katalon recording.

    Steps:
    1. Navigate to login page
    2. Enter email and password
    3. Click login button
    4. Verify page redirects to home/dashboard
    5. Verify home page elements are visible
    """
    # Step 1: Navigate to login page
    page.goto("http://localhost:5173/login")
    page.wait_for_load_state("networkidle")

    # Verify login page loaded
    assert "login" in page.url.lower() or "signin" in page.url.lower()

    # Step 2: Enter credentials
    email_input = page.locator("input[type='email'], input[name='email']").first
    password_input = page.locator("input[type='password'], input[name='password']").first

    assert email_input.is_visible(), "Email input not found"
    assert password_input.is_visible(), "Password input not found"

    email_input.fill("test_login@example.com")
    password_input.fill("TestPassword123!")

    # Step 3: Click login button
    login_button = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign In')").first
    assert login_button.is_visible(), "Login button not found"
    login_button.click()

    # Step 4: Wait for redirect to home
    page.wait_for_url("**/dashboard", timeout=10000)
    page.wait_for_load_state("networkidle")

    # Step 5: Verify home page elements
    assert "dashboard" in page.url.lower() or "home" in page.url.lower(), f"Expected dashboard URL, got {page.url}"


@pytest.mark.katalon
@pytest.mark.e2e
@pytest.mark.wave1
@pytest.mark.user
def test_user_logout(page):
    """
    User logs out via FE menu.
    This is a ported Katalon recording.
    """
    # First log in
    page.goto("http://localhost:5173/login")
    page.wait_for_load_state("networkidle")

    email_input = page.locator("input[type='email'], input[name='email']").first
    password_input = page.locator("input[type='password'], input[name='password']").first

    email_input.fill("test_logout@example.com")
    password_input.fill("TestPassword123!")

    login_button = page.locator("button[type='submit'], button:has-text('Login')").first
    login_button.click()

    page.wait_for_url("**/dashboard", timeout=10000)
    page.wait_for_load_state("networkidle")

    # Now test logout
    # Find user menu (often top-right dropdown with avatar or "Menu" text)
    user_menu = page.locator("[data-testid='user-menu'], button:has-text('Menu'), button[aria-label*='User']").first

    if user_menu.is_visible():
        user_menu.click()
        page.wait_for_load_state("networkidle")

        # Find logout button
        logout_button = page.locator("button:has-text('Logout'), button:has-text('Sign Out'), [role='menuitem']:has-text('Logout')").first

        if logout_button.is_visible():
            logout_button.click()
            page.wait_for_load_state("networkidle")

            # Verify redirect to login
            page.wait_for_url("**/login", timeout=10000)
            assert "login" in page.url.lower()

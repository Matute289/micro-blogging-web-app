"""
E2E tests for Pulse app.
Requires the Vite dev server to be running on http://localhost:5175
and the backend on http://localhost:8080.

Run:
    python tests/e2e/pulse.spec.py
"""

import sys
import uuid
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:5175"
USER_ID = "5181c068-6860-4327-bc2d-daccada7b66f"
USERNAME = "demo_user_chirp"  # must match what the backend returns for USER_ID


def inject_auth(page, user_id: str = USER_ID, username: str = USERNAME):
    """Inject a stored user into localStorage so we skip the login screen."""
    page.evaluate(f"""() => {{
        localStorage.setItem('pulse_user', JSON.stringify({{
            id: '{user_id}',
            username: '{username}',
            created_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString()
        }}));
    }}""")


def mobile_page(browser):
    return browser.new_page(viewport={"width": 390, "height": 844})


def test_login_create_account(browser):
    page = mobile_page(browser)
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Should redirect to /login when unauthenticated
    assert "/login" in page.url, f"Expected /login, got {page.url}"

    # Brand logo visible
    expect(page.locator(".login-logo")).to_have_text("Pulse")

    # Continue button disabled with empty input
    btn = page.locator("button[type=submit]")
    expect(btn).to_be_disabled()

    # Type a unique username (avoid 409 conflicts)
    unique_name = f"e2e_{uuid.uuid4().hex[:8]}"
    page.fill("#username", unique_name)
    expect(btn).to_be_enabled()

    # Submit — backend creates user and we land on /home
    page.click("button[type=submit]")
    page.wait_for_url("**/home", timeout=6000)
    assert "/home" in page.url

    # Header shows the username
    expect(page.locator(".home-header-user")).to_contain_text(unique_name)
    print("  PASS: test_login_create_account")


def test_login_taken_username_shows_id_screen(browser):
    page = mobile_page(browser)
    # Use a username we know exists (the one created in the previous test run)
    page.goto(BASE_URL + "/login")
    page.wait_for_load_state("networkidle")

    # demo_user_chirp was created in manual testing — use it
    page.fill("#username", "demo_user_chirp")
    page.click("button[type=submit]")

    # Should transition to "login with ID" mode
    page.wait_for_selector("#user-id", timeout=5000)
    expect(page.locator(".login-title")).to_contain_text("Username taken")
    print("  PASS: test_login_taken_username_shows_id_screen")


def test_home_page_shows_composer_and_nav(browser):
    page = mobile_page(browser)
    page.goto(BASE_URL)
    inject_auth(page)
    page.goto(BASE_URL + "/home")
    page.wait_for_load_state("networkidle")

    expect(page.locator(".composer-textarea")).to_be_visible()
    expect(page.locator(".bottom-nav")).to_be_visible()

    # Nav has three items
    assert page.locator(".bottom-nav-item").count() == 3
    print("  PASS: test_home_page_shows_composer_and_nav")


def test_post_tweet(browser):
    page = mobile_page(browser)
    page.goto(BASE_URL)
    inject_auth(page)
    page.goto(BASE_URL + "/home")
    page.wait_for_load_state("networkidle")

    tweet_text = f"E2E test pulse {uuid.uuid4().hex[:6]}"

    # Submit button starts disabled
    expect(page.locator(".composer-submit")).to_be_disabled()

    page.fill(".composer-textarea", tweet_text)
    expect(page.locator(".composer-submit")).to_be_enabled()

    page.click(".composer-submit")

    # Tweet appears in the feed immediately
    page.wait_for_selector(f"text={tweet_text}", timeout=4000)
    expect(page.locator(f"text={tweet_text}")).to_be_visible()

    # Textarea clears after posting
    expect(page.locator(".composer-textarea")).to_have_value("")
    print("  PASS: test_post_tweet")


def test_character_count_warning(browser):
    page = mobile_page(browser)
    page.goto(BASE_URL)
    inject_auth(page)
    page.goto(BASE_URL + "/home")
    page.wait_for_load_state("networkidle")

    page.fill(".composer-textarea", "a" * 225)
    # 280 - 225 = 55 remaining → warning class
    counter = page.locator(".composer-count")
    expect(counter).to_have_text("55")
    assert "warning" in counter.get_attribute("class") or "danger" in counter.get_attribute("class")
    print("  PASS: test_character_count_warning")


def test_profile_page_shows_user_info(browser):
    page = mobile_page(browser)
    page.goto(BASE_URL)
    inject_auth(page)
    page.goto(BASE_URL + "/profile/me")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    expect(page.locator(".profile-username")).to_have_text(USERNAME)
    expect(page.locator(".profile-handle")).to_contain_text(USERNAME.lower())
    # UUID shown in monospace
    expect(page.locator(".profile-id")).to_contain_text(USER_ID)
    print("  PASS: test_profile_page_shows_user_info")


def test_explore_page_renders(browser):
    page = mobile_page(browser)
    page.goto(BASE_URL)
    inject_auth(page)
    page.goto(BASE_URL + "/explore")
    page.wait_for_load_state("networkidle")

    expect(page.locator(".explore-header-title")).to_have_text("Explore")
    expect(page.locator(".explore-input")).to_be_visible()
    # Look up button starts disabled
    expect(page.locator(".explore-search-btn")).to_be_disabled()
    print("  PASS: test_explore_page_renders")


def test_explore_lookup_invalid_id(browser):
    page = mobile_page(browser)
    page.goto(BASE_URL)
    inject_auth(page)
    page.goto(BASE_URL + "/explore")
    page.wait_for_load_state("networkidle")

    page.fill(".explore-input", "00000000-0000-0000-0000-000000000000")
    page.click(".explore-search-btn")
    page.wait_for_selector(".explore-error", timeout=5000)
    expect(page.locator(".explore-error")).to_contain_text("No user found")
    print("  PASS: test_explore_lookup_invalid_id")


def test_unauthenticated_redirects_to_login(browser):
    page = mobile_page(browser)
    # No localStorage injection
    for path in ["/home", "/explore", "/profile/me"]:
        page.goto(BASE_URL + path)
        page.wait_for_load_state("networkidle")
        assert "/login" in page.url, f"Expected redirect to /login for {path}, got {page.url}"
    print("  PASS: test_unauthenticated_redirects_to_login")


if __name__ == "__main__":
    tests = [
        test_login_create_account,
        test_login_taken_username_shows_id_screen,
        test_home_page_shows_composer_and_nav,
        test_post_tweet,
        test_character_count_warning,
        test_profile_page_shows_user_info,
        test_explore_page_renders,
        test_explore_lookup_invalid_id,
        test_unauthenticated_redirects_to_login,
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        passed = failed = 0
        for test in tests:
            try:
                print(f"Running {test.__name__}...")
                test(browser)
                passed += 1
            except Exception as e:
                print(f"  FAIL: {test.__name__}: {e}")
                failed += 1
        browser.close()

    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
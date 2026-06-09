"""
E2E tests for Pulse app.
Requires the Vite dev server to be running on http://localhost:5175
and the backend on http://localhost:8080.

Run:
    python tests/e2e/pulse.spec.py
"""

import sys
import uuid
import time
import base64
import json
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:5175"
USER_ID = "98bd57cd-21bd-4a3c-a6c9-0ead5b6c8250"
USERNAME = "demo_user_chirp"  # must match what the backend returns for USER_ID


def make_fake_token(user_id: str, username: str) -> str:
    """Create a fake JWT-shaped token (not cryptographically valid, but accepted by AuthContext's expiry check)."""
    payload = {
        "uid": user_id,
        "username": username,
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    # Base64url-encode header.payload.sig (AuthContext only decodes the payload part)
    header = base64.urlsafe_b64encode(b'{"alg":"HS256"}').rstrip(b'=').decode()
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
    return f"{header}.{body}.fakesig"


def inject_auth(page, user_id: str = USER_ID, username: str = USERNAME):
    """Inject JWT auth into localStorage so we skip the OAuth login screen."""
    token = make_fake_token(user_id, username)
    exp = int(time.time()) + 3600
    user_json = json.dumps({
        "id": user_id,
        "username": username,
        "created_at": "2024-01-01T00:00:00.000Z",
        "last_seen_at": "2024-01-01T00:00:00.000Z",
    })
    stored = json.dumps({
        "token": token,
        "user": json.loads(user_json),
        "exp": exp,
    })
    page.evaluate(f"() => localStorage.setItem('pulse_auth', {json.dumps(stored)})")


def mobile_page(browser):
    return browser.new_page(viewport={"width": 390, "height": 844})


def test_login_page_shows_oauth_buttons(browser):
    page = mobile_page(browser)
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")

    # Should redirect to /login when unauthenticated
    assert "/login" in page.url, f"Expected /login, got {page.url}"

    # Brand logo visible
    expect(page.locator(".login-logo")).to_have_text("Pulse")

    # GitHub button visible
    expect(page.locator(".login-btn-github")).to_be_visible()

    # Login providers container visible
    expect(page.locator(".login-providers")).to_be_visible()
    print("  PASS: test_login_page_shows_oauth_buttons")


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
        test_login_page_shows_oauth_buttons,
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
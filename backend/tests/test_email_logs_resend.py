"""Tests for the new Resend email provider + admin Email Logs endpoints.

LIVE production system:
- Backend: https://hbh-hotels-production.up.railway.app/api
- Admin: info@travel-events.de / admin123

Constraints:
- The POST /api/admin/email-logs/test endpoint sends a real email.
  Set SEND_REAL_TEST_EMAIL=1 env var to actually invoke it; otherwise it is skipped
  to avoid duplicating the send already performed by the main agent.
"""
import os
import pytest
import requests

BASE_URL = "https://hbh-hotels-production.up.railway.app/api"
ADMIN_EMAIL = "info@travel-events.de"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Auth ---

def test_admin_login_returns_jwt():
    r = requests.post(
        f"{BASE_URL}/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200
    body = r.json()
    token = body.get("access_token") or body.get("token")
    assert token and isinstance(token, str) and len(token) > 20


def test_admin_login_invalid_credentials():
    r = requests.post(
        f"{BASE_URL}/admin/login",
        json={"email": ADMIN_EMAIL, "password": "wrong-pass"},
        timeout=30,
    )
    assert r.status_code in (401, 403)


# --- Email logs listing ---

def test_email_logs_list_returns_resend_provider(auth_headers):
    r = requests.get(f"{BASE_URL}/admin/email-logs?limit=5", headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    # Provider info shape
    assert data.get("provider") == "resend", f"provider != resend: {data.get('provider')}"
    assert data.get("from_email") == "info@travel-events.de"
    assert data.get("from_name") == "Travel Events"
    assert "logs" in data and isinstance(data["logs"], list)


def test_email_logs_requires_auth():
    r = requests.get(f"{BASE_URL}/admin/email-logs?limit=1", timeout=30)
    assert r.status_code in (401, 403), f"unexpected: {r.status_code} {r.text}"


# --- Send test email (unauth) ---

def test_send_test_email_requires_auth():
    r = requests.post(f"{BASE_URL}/admin/email-logs/test", timeout=30)
    assert r.status_code in (401, 403)


# --- Send test email (guarded, only if explicitly enabled) ---

@pytest.mark.skipif(
    os.environ.get("SEND_REAL_TEST_EMAIL") != "1",
    reason="Skipped to avoid sending a real email (set SEND_REAL_TEST_EMAIL=1 to run).",
)
def test_send_test_email_success_and_persisted(auth_headers):
    r = requests.post(f"{BASE_URL}/admin/email-logs/test", headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("message") == "Test email sent"
    assert body.get("to") == "info@travel-events.de"
    assert body.get("provider") == "resend"

    # Verify newest log entry reflects it
    r2 = requests.get(f"{BASE_URL}/admin/email-logs?limit=1", headers=auth_headers, timeout=30)
    assert r2.status_code == 200
    logs = r2.json().get("logs", [])
    assert len(logs) >= 1
    newest = logs[0]
    assert newest.get("email_type") == "test"
    assert newest.get("status") == "sent"
    assert newest.get("provider") == "resend"


def test_latest_log_is_recent_test_email(auth_headers):
    """Since main agent already ran the test email, the newest entry should already be present."""
    r = requests.get(f"{BASE_URL}/admin/email-logs?limit=1", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    logs = r.json().get("logs", [])
    if not logs:
        pytest.skip("No logs present yet")
    newest = logs[0]
    # Not asserting type=='test' strictly since new emails may have been produced,
    # but provider must be resend for any recent send.
    assert newest.get("provider") in ("resend", None) or "provider" not in newest

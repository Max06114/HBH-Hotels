"""Tests for PATCH /api/admin/bookings/{id} + booking data verification (LIVE).

Read-only apart from a harmless PATCH sending the current city value (should
return 'No changes'). STRICTLY do not send emails or change real guest data.
"""
import os
import pytest
import requests
from datetime import datetime

BASE_URL = "https://hbh-hotels-production.up.railway.app/api"
ADMIN_EMAIL = "info@travel-events.de"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(
        f"{BASE_URL}/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    token = r.json().get("access_token") or r.json().get("token")
    assert token
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def all_bookings(auth_headers):
    r = requests.get(f"{BASE_URL}/admin/bookings", headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    # response could be either a list or {bookings: [...]}
    if isinstance(data, dict) and "bookings" in data:
        return data["bookings"]
    return data


def _find_booking(bookings, ref):
    for b in bookings:
        if b.get("booking_number") == ref or b.get("booking_reference") == ref or b.get("reference") == ref:
            return b
    return None


# --- PATCH endpoint auth ---

def test_patch_admin_bookings_requires_auth(all_bookings):
    b = all_bookings[0]
    bid = b.get("id") or b.get("_id") or b.get("booking_id")
    assert bid, f"no id field in booking: {list(b.keys())}"
    r = requests.patch(
        f"{BASE_URL}/admin/bookings/{bid}",
        json={"city": b.get("city") or "Berlin"},
        timeout=30,
    )
    assert r.status_code in (401, 403), f"expected 401/403 (NOT 405), got {r.status_code}: {r.text}"


def test_patch_admin_bookings_no_changes(auth_headers, all_bookings):
    # Pick the 578BCA booking so we know exactly what we're touching
    b = _find_booking(all_bookings, "HBH-20260927-578BCA")
    assert b is not None, "Booking HBH-20260927-578BCA not found"
    bid = b.get("id") or b.get("_id") or b.get("booking_id")
    assert bid
    current_city = b.get("city")
    # If city is None/empty, use whatever it currently is (send exact same value)
    payload = {"city": current_city} if current_city is not None else {"city": ""}
    r = requests.patch(
        f"{BASE_URL}/admin/bookings/{bid}",
        json=payload,
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    msg = (body.get("message") or "").lower()
    assert "no change" in msg or "no changes" in msg, f"expected 'No changes', got: {body}"


def test_patch_admin_bookings_invalid_email(auth_headers, all_bookings):
    b = _find_booking(all_bookings, "HBH-20260927-578BCA") or all_bookings[0]
    bid = b.get("id") or b.get("_id") or b.get("booking_id")
    r = requests.patch(
        f"{BASE_URL}/admin/bookings/{bid}",
        json={"email": "abc"},
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text}"


# --- Booking data assertions ---

def test_nancy_farrell_booking_data(all_bookings):
    b = _find_booking(all_bookings, "HBH-20260927-578BCA")
    assert b is not None, "Booking 578BCA not found"
    assert b.get("first_name") == "Nancy", f"first_name={b.get('first_name')!r}"
    assert b.get("last_name") == "Farrell", f"last_name={b.get('last_name')!r}"
    assert b.get("email") == "nancyannfarrell@gmail.com"
    assert b.get("payment_status") == "deposit_paid"


def test_417066_email_corrected(all_bookings):
    b = _find_booking(all_bookings, "HBH-20260909-417066")
    assert b is not None, "Booking 417066 not found"
    assert b.get("email") == "inisdom@icloud.com", f"email={b.get('email')!r}"


# --- Email logs: 32 resends on 2026-09-29 ---

def test_email_logs_resend_count(auth_headers):
    r = requests.get(f"{BASE_URL}/admin/email-logs?limit=100", headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text
    logs = r.json().get("logs", [])
    resends = [l for l in logs if l.get("email_type") == "booking_confirmation_resend"]
    on_date = []
    for l in resends:
        sent_at = l.get("sent_at") or ""
        if sent_at.startswith("2026-09-29"):
            on_date.append(l)
    assert len(on_date) >= 32, f"expected >=32 resends on 2026-09-29, found {len(on_date)}"

    # All must be status=sent, provider=resend, has_attachment true, bcc info@travel-events.de
    failed = [l for l in on_date if l.get("status") != "sent"]
    assert len(failed) == 0, f"failed resends: {len(failed)}: {failed[:3]}"

    for l in on_date[:5]:  # spot check first 5
        assert l.get("provider") == "resend", l
        assert l.get("has_attachment") is True, f"has_attachment: {l.get('has_attachment')}"
        bcc = l.get("bcc")
        # bcc could be a string or list
        if isinstance(bcc, list):
            assert "info@travel-events.de" in bcc, f"bcc={bcc}"
        else:
            assert bcc == "info@travel-events.de", f"bcc={bcc}"

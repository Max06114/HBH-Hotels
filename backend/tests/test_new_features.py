"""Tests for new features: Resend webhook, custom email templates, arrival reminders,
open transfers dashboard endpoint, scheduler jobs."""
import base64
import hmac
import hashlib
import json
import os
import sys
import asyncio
from datetime import datetime, timezone, timedelta
from uuid import uuid4

import pytest
import requests

BASE_URL = "http://localhost:8001"
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "info@travel-events.de"
ADMIN_PASSWORD = "admin123"

# Enable importing server for direct function tests
sys.path.insert(0, "/app/backend")


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# =========== Resend Webhook ==============

WEBHOOK_SECRET_B64 = "dGVzdHNlY3JldDEyMzQ1Njc4OTA="  # base64 of "testsecret1234567890"


def _svix_headers(body: bytes):
    msg_id = f"msg_{uuid4().hex[:10]}"
    ts = str(int(datetime.now(timezone.utc).timestamp()))
    signed = f"{msg_id}.{ts}.{body.decode()}".encode()
    sig = base64.b64encode(hmac.new(base64.b64decode(WEBHOOK_SECRET_B64), signed, hashlib.sha256).digest()).decode()
    return {
        "svix-id": msg_id,
        "svix-timestamp": ts,
        "svix-signature": f"v1,{sig}",
        "Content-Type": "application/json",
    }


@pytest.fixture(scope="session")
def seed_email_log():
    """Insert an email_logs doc with provider=resend, status=sent, delivery_status=sent."""
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017"))
    db = client[os.environ.get("DB_NAME", "hbh_test")]
    msg_id = f"re-msg-{uuid4().hex[:8]}"
    doc = {
        "id": f"log-{uuid4().hex[:8]}",
        "provider": "resend",
        "status": "sent",
        "provider_message_id": msg_id,
        "delivery_status": "sent",
        "email_type": "booking_confirmation",
        "to_email": "test@example.com",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    asyncio.get_event_loop().run_until_complete(db.email_logs.insert_one(doc))
    yield msg_id
    asyncio.get_event_loop().run_until_complete(db.email_logs.delete_one({"provider_message_id": msg_id}))
    client.close()


def _post_webhook(event: dict, headers=None):
    body = json.dumps(event).encode()
    hdrs = headers if headers is not None else _svix_headers(body)
    return requests.post(f"{API}/webhooks/resend", data=body, headers=hdrs)


def test_webhook_missing_signature_returns_401():
    r = requests.post(f"{API}/webhooks/resend", data=b'{"type":"email.delivered"}', headers={"Content-Type": "application/json"})
    assert r.status_code == 401


def test_webhook_invalid_signature_returns_401():
    body = b'{"type":"email.delivered","data":{"email_id":"x"}}'
    hdrs = {"svix-id": "msg1", "svix-timestamp": "1", "svix-signature": "v1,invalidsig", "Content-Type": "application/json"}
    r = requests.post(f"{API}/webhooks/resend", data=body, headers=hdrs)
    assert r.status_code == 401


def test_webhook_invalid_json_returns_400():
    body = b"not-json"
    r = requests.post(f"{API}/webhooks/resend", data=body, headers=_svix_headers(body))
    assert r.status_code == 400


def test_webhook_unknown_email_id_ignored():
    ev = {"type": "email.delivered", "data": {"email_id": "does-not-exist-xyz"}}
    r = _post_webhook(ev)
    assert r.status_code == 200
    assert r.json().get("ignored") is True


def test_webhook_unsupported_type_ignored(seed_email_log):
    ev = {"type": "email.something", "data": {"email_id": seed_email_log}}
    r = _post_webhook(ev)
    assert r.status_code == 200
    assert r.json().get("ignored") is True


def test_webhook_delivered_updates(seed_email_log):
    ev = {"type": "email.delivered", "data": {"email_id": seed_email_log}}
    r = _post_webhook(ev)
    assert r.status_code == 200, r.text
    assert r.json().get("updated") is True
    assert r.json().get("status") == "delivered"


def test_webhook_older_status_ignored(seed_email_log):
    # After delivered above, sending email.sent should be older -> ignored
    ev = {"type": "email.sent", "data": {"email_id": seed_email_log}}
    r = _post_webhook(ev)
    assert r.status_code == 200
    assert r.json().get("ignored") is True
    assert "older" in (r.json().get("reason") or "")


def test_webhook_bounced_sets_reason(seed_email_log):
    ev = {
        "type": "email.bounced",
        "data": {
            "email_id": seed_email_log,
            "bounce": {"type": "Permanent", "subType": "General", "message": "mailbox does not exist"},
        },
    }
    r = _post_webhook(ev)
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "bounced"
    # verify via admin api
    token_r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    hdrs = {"Authorization": f"Bearer {token_r.json()['token']}"}
    logs = requests.get(f"{API}/admin/email-logs", headers=hdrs).json()["logs"]
    matching = [l for l in logs if l.get("provider_message_id") == seed_email_log]
    assert matching
    log = matching[0]
    assert log["delivery_status"] == "bounced"
    assert "mailbox does not exist" in (log.get("bounce_reason") or "")


# =========== Open transfers ==============

def test_open_transfers_requires_auth():
    r = requests.get(f"{API}/admin/transfers/open")
    assert r.status_code in (401, 403)


def test_open_transfers_shape(auth_headers):
    # Ensure at least one exists
    r = requests.get(f"{API}/admin/transfers/open", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "count" in data and "total_deposit" in data
    if data["count"] == 0:
        # create one
        payload = {
            "hotel_id": "h1",
            "salutation": "Frau",
            "first_name": "TEST_Test",
            "last_name": "Transfer",
            "email": "test_transfer@example.com",
            "street": "Teststr 1",
            "postal_code": "12345",
            "city": "Halle",
            "country": "DE",
            "room_type": "single",
            "check_in": "2027-02-25",
            "check_out": "2027-02-27",
            "payment_method": "bank_transfer",
            "language": "de",
        }
        cr = requests.post(f"{API}/bookings/bank-transfer", json=payload)
        assert cr.status_code in (200, 201), cr.text
        r = requests.get(f"{API}/admin/transfers/open", headers=auth_headers)
        data = r.json()
    assert data["count"] >= 1
    # Sorted asc by transfer_due_date
    dues = [i.get("transfer_due_date") for i in data["items"] if i.get("transfer_due_date")]
    assert dues == sorted(dues)
    for item in data["items"]:
        assert "days_left" in item


# =========== Custom email templates & arrival reminder =============

def test_custom_templates_and_render(auth_headers):
    """Set default template, verify build_confirmation_email uses it, hotel override precedence, and clear -> fallback."""
    import server

    async def run():
        # Ensure clean state
        await server.db.email_templates.delete_many({"hotel_id": {"$in": ["default", "h1"]}})

        # Prepare test booking & hotel
        booking = {
            "id": f"bk-{uuid4().hex[:6]}", "hotel_id": "h1", "booking_number": "BK-TEST-001",
            "salutation": "Herr", "first_name": "Max", "last_name": "Muster",
            "room_type": "single", "check_in": "2027-02-25", "check_out": "2027-02-27",
            "total_price": 250.5, "deposit_amount": 62.63, "remaining_amount": 187.87,
            "email": "max@example.com", "hotel_name": "Hotel Test",
        }
        hotel = await server.db.hotels.find_one({"id": "h1"}, {"_id": 0}) or {"name": "Hotel Test", "address": "Teststr 1"}

        # 1. Set default template
        default_tpl = "Hallo {salutation} {first_name} {last_name}, Zimmer: {room_type}, Preis: {total_price} EUR, {unknown_placeholder}"
        put = requests.put(
            f"{API}/admin/email-templates/default",
            json={"templates": {"booking_confirmation_de": default_tpl}},
            headers=auth_headers,
        )
        assert put.status_code == 200

        subj, body = await server.build_confirmation_email(booking, hotel, "de")
        assert "Max" in body and "Muster" in body
        assert "Einzelzimmer" in body  # room_type_de label
        assert "250,50" in body  # comma format
        assert "{unknown_placeholder}" in body  # unknown kept literally
        assert f"/invoice/{booking['id']}" in body  # invoice link appended

        # 2. English with no en template -> standard email
        subj_en, body_en = await server.build_confirmation_email(booking, hotel, "en")
        assert "Hallo Herr" not in body_en  # not the custom text

        # 3. Hotel-specific template overrides default
        hotel_tpl = "HOTEL SPECIFIC: {first_name}"
        put2 = requests.put(
            f"{API}/admin/email-templates/h1",
            json={"templates": {"booking_confirmation_de": hotel_tpl}},
            headers=auth_headers,
        )
        assert put2.status_code == 200
        subj2, body2 = await server.build_confirmation_email(booking, hotel, "de")
        assert "HOTEL SPECIFIC: Max" in body2

        # 4. Clear both -> fallback to standard email
        requests.put(f"{API}/admin/email-templates/h1", json={"templates": {"booking_confirmation_de": ""}}, headers=auth_headers)
        requests.put(f"{API}/admin/email-templates/default", json={"templates": {"booking_confirmation_de": ""}}, headers=auth_headers)
        subj3, body3 = await server.build_confirmation_email(booking, hotel, "de")
        assert "HOTEL SPECIFIC" not in body3
        assert "Hallo Herr Max Muster" not in body3 or "Buchungsbestätigung" in subj3

    asyncio.get_event_loop().run_until_complete(run())


def test_resend_confirmation_creates_email_log(auth_headers):
    import server

    async def run():
        # find any paid booking
        b = await server.db.bookings.find_one(
            {"payment_status": {"$in": ["deposit_paid", "fully_paid"]}}, {"_id": 0}
        )
        assert b, "No paid booking present for resend test"
        r = requests.post(f"{API}/admin/bookings/{b['id']}/resend-confirmation", headers=auth_headers)
        # locally fails (no smtp) -> 500 but log written
        latest = await server.db.email_logs.find_one(
            {"booking_id": b["id"], "email_type": "booking_confirmation_resend"},
            {"_id": 0}, sort=[("sent_at", -1)],
        )
        assert latest, f"No email_log for resend, response={r.status_code}"

    asyncio.get_event_loop().run_until_complete(run())


def test_arrival_reminder_job(auth_headers):
    import server

    async def run():
        target = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
        outside = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%d")
        b_id = f"TEST_arr_{uuid4().hex[:6]}"
        b_id2 = f"TEST_arr_{uuid4().hex[:6]}"
        booking = {
            "id": b_id, "hotel_id": "h1", "booking_number": f"BK-ARR-{b_id[-4:]}",
            "salutation": "Frau", "first_name": "Anna", "last_name": "Test",
            "email": "anna@example.com", "room_type": "single",
            "check_in": target, "check_out": (datetime.now(timezone.utc) + timedelta(days=9)).strftime("%Y-%m-%d"),
            "total_price": 200, "deposit_amount": 50, "remaining_amount": 150,
            "payment_status": "deposit_paid", "language": "de", "hotel_name": "Hotel Test",
        }
        outside_booking = dict(booking, id=b_id2, check_in=outside)
        try:
            await server.db.bookings.insert_one(dict(booking))
            await server.db.bookings.insert_one(dict(outside_booking))
            candidates = await server.db.bookings.find({
                "check_in": target,
                "payment_status": {"$in": ["deposit_paid", "fully_paid"]},
                "arrival_reminder_sent": {"$ne": True},
            }).to_list(1000)
            candidate_ids = [c["id"] for c in candidates]
            assert b_id in candidate_ids
            assert b_id2 not in candidate_ids
            await server.send_arrival_reminders()
            # email_logs entry with arrival_reminder for this booking
            log = await server.db.email_logs.find_one({"booking_id": b_id, "email_type": "arrival_reminder"}, {"_id": 0})
            assert log, "arrival_reminder log not created"
        finally:
            await server.db.bookings.delete_one({"id": b_id})
            await server.db.bookings.delete_one({"id": b_id2})
            await server.db.email_logs.delete_many({"booking_id": {"$in": [b_id, b_id2]}})

    asyncio.get_event_loop().run_until_complete(run())


def test_scheduler_status_contains_new_jobs(auth_headers):
    r = requests.get(f"{API}/admin/scheduler/status", headers=auth_headers)
    assert r.status_code == 200
    names = [j["name"] for j in r.json().get("jobs", [])]
    assert any("Anreise-Erinnerung" in n for n in names), f"missing arrival job: {names}"
    assert any("Überweisungen" in n for n in names), f"missing transfer job: {names}"

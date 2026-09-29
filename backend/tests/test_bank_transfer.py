"""Bank-transfer payment flow: guest reservation, admin conversion, deposit/remaining recording, scheduler."""
import os
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = "http://localhost:8001"
MONGO_URL = "mongodb://127.0.0.1:27017"
DB_NAME = "hbh_test"

HOTEL_ID = "h1"
ADMIN_EMAIL = "info@travel-events.de"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"] if "access_token" in r.json() else r.json().get("token")


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _guest_payload(email="TEST_transfer@example.com"):
    return {
        "hotel_id": HOTEL_ID,
        "salutation": "Herr",
        "first_name": "Max",
        "last_name": "Mustermann",
        "email": email,
        "street": "Teststr 1",
        "postal_code": "12345",
        "city": "Berlin",
        "country": "Deutschland",
        "room_type": "single",
        "check_in": "2027-02-25",
        "check_out": "2027-02-28",
        "notes": "",
        "payment_method": "bank_transfer",
        "language": "de",
    }


# --- Bank details endpoint -------------------------------------------------

def test_bank_details():
    r = requests.get(f"{BASE_URL}/api/payments/bank-details")
    assert r.status_code == 200
    d = r.json()
    assert d["bank"] == "N26 Bank"
    assert d["iban"] == "DE77100110012713041577"
    assert d["bic"] == "NTSBDEB1XXX"
    assert d["due_days"] == 7


# --- Create bank-transfer booking -----------------------------------------

def test_create_bank_transfer_booking(db):
    inv_before = db.hotels.find_one({"id": HOTEL_ID})["inventory"]["single"]
    r = requests.post(f"{BASE_URL}/api/bookings/bank-transfer", json=_guest_payload())
    assert r.status_code == 200, r.text
    body = r.json()
    booking = body["booking"]
    bid = booking["id"]
    assert booking["payment_status"] == "transfer_pending"
    assert booking["payment_method"] == "bank_transfer"
    assert booking["deposit_amount"] == 75.0  # 3 nights * 100 * 0.25
    # transfer_due_date ~ now + 7 days
    due = datetime.fromisoformat(booking["transfer_due_date"])
    now = datetime.now(timezone.utc)
    delta_days = (due - now).total_seconds() / 86400
    assert 6.9 < delta_days < 7.1
    # inventory decremented
    inv_after = db.hotels.find_one({"id": HOTEL_ID})["inventory"]["single"]
    assert inv_after == inv_before - 1
    # payment event
    ev = db.payment_events.find_one({"booking_id": bid, "event": "transfer_reserved"})
    assert ev is not None
    # email log for bank_transfer_instructions - SMTP fails after ~9s, wait
    log = None
    for _ in range(20):
        time.sleep(1.0)
        log = db.email_logs.find_one({"booking_id": bid, "email_type": "bank_transfer_instructions"})
        if log:
            break
    assert log is not None
    assert log.get("bcc") == "info@travel-events.de"
    # emails fail locally
    assert log.get("status") in ("failed", "sent", "queued")
    pytest.bt_booking_id = bid
    globals()["_BT_BOOKING_ID"] = bid


def test_create_bank_transfer_invalid_dates():
    p = _guest_payload("TEST_invdates@example.com")
    p["check_out"] = "2027-02-24"  # before check_in
    r = requests.post(f"{BASE_URL}/api/bookings/bank-transfer", json=p)
    assert r.status_code == 400


def test_create_bank_transfer_unknown_hotel():
    p = _guest_payload("TEST_nohotel@example.com")
    p["hotel_id"] = "does-not-exist"
    r = requests.post(f"{BASE_URL}/api/bookings/bank-transfer", json=p)
    assert r.status_code == 404


def test_create_bank_transfer_sold_out(db):
    saved = db.hotels.find_one({"id": HOTEL_ID})["inventory"]
    db.hotels.update_one({"id": HOTEL_ID}, {"$set": {"inventory.single": 0}})
    try:
        r = requests.post(f"{BASE_URL}/api/bookings/bank-transfer",
                          json=_guest_payload("TEST_soldout@example.com"))
        assert r.status_code == 400
        assert "ausgebucht" in r.text or "sold out" in r.text
    finally:
        db.hotels.update_one({"id": HOTEL_ID}, {"$set": {"inventory": saved}})


# --- Admin: transfer-received ---------------------------------------------

def test_transfer_received_unauth():
    r = requests.post(f"{BASE_URL}/api/admin/bookings/foo/transfer-received",
                      json={"payment_type": "deposit"})
    assert r.status_code in (401, 403)


def test_transfer_received_deposit_then_remaining(db, admin_headers):
    bid = globals().get("_BT_BOOKING_ID") or getattr(pytest, "bt_booking_id", None)
    assert bid, "prior test failed to create a transfer booking"
    r = requests.post(f"{BASE_URL}/api/admin/bookings/{bid}/transfer-received",
                      json={"payment_type": "deposit"}, headers=admin_headers)
    assert r.status_code == 200, r.text
    assert r.json()["booking"]["payment_status"] == "deposit_paid"
    tx = db.payment_transactions.find_one({"booking_id": bid, "payment_type": "deposit"})
    assert tx is not None
    assert tx["payment_method"] == "bank_transfer"
    assert tx["amount"] == 75
    assert tx["status"] == "completed"
    # repeating deposit -> 400
    r2 = requests.post(f"{BASE_URL}/api/admin/bookings/{bid}/transfer-received",
                       json={"payment_type": "deposit"}, headers=admin_headers)
    assert r2.status_code == 400
    # invalid payment_type
    rb = requests.post(f"{BASE_URL}/api/admin/bookings/{bid}/transfer-received",
                       json={"payment_type": "other"}, headers=admin_headers)
    assert rb.status_code == 400
    # remaining
    r3 = requests.post(f"{BASE_URL}/api/admin/bookings/{bid}/transfer-received",
                      json={"payment_type": "remaining", "amount": 225}, headers=admin_headers)
    assert r3.status_code == 200, r3.text
    assert r3.json()["booking"]["payment_status"] == "fully_paid"
    tx2 = db.payment_transactions.find_one({"booking_id": bid, "payment_type": "remaining"})
    assert tx2 is not None
    assert tx2["amount"] == 225


# --- Admin: convert-to-transfer -------------------------------------------

def test_convert_to_transfer(db, admin_headers):
    # find any booking to clone
    src = db.bookings.find_one({"hotel_id": HOTEL_ID}, {"_id": 0})
    assert src is not None
    import uuid
    new_id = str(uuid.uuid4())
    doc = {**src, "id": new_id,
           "booking_number": f"HBH-TEST-{uuid.uuid4().hex[:6].upper()}",
           "payment_status": "abandoned",
           "payment_method": "paypal",
           "room_type": "single",
           "hotel_id": HOTEL_ID,
           "deposit_amount": 75.0,
           "remaining_amount": 225.0,
           "email": "TEST_convert@example.com",
           "created_at": datetime.now(timezone.utc).isoformat()}
    doc.pop("transfer_reserved_at", None); doc.pop("transfer_due_date", None)
    db.bookings.insert_one(doc)

    inv_before = db.hotels.find_one({"id": HOTEL_ID})["inventory"]["single"]
    # count emails for that booking BEFORE
    email_count_before = db.email_logs.count_documents({"booking_id": new_id})

    r = requests.post(f"{BASE_URL}/api/admin/bookings/{new_id}/convert-to-transfer",
                      json={"send_email": False}, headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email_sent"] is False
    assert body["booking"]["payment_status"] == "transfer_pending"

    inv_after = db.hotels.find_one({"id": HOTEL_ID})["inventory"]["single"]
    assert inv_after == inv_before - 1

    time.sleep(0.5)
    email_count_after = db.email_logs.count_documents({"booking_id": new_id})
    assert email_count_after == email_count_before  # send_email:false

    # calling again -> 400 (already transfer_pending)
    r2 = requests.post(f"{BASE_URL}/api/admin/bookings/{new_id}/convert-to-transfer",
                       json={"send_email": False}, headers=admin_headers)
    assert r2.status_code == 400

    # deposit_paid cannot be converted
    dp = db.bookings.find_one({"payment_status": "deposit_paid"}, {"_id": 0})
    if dp:
        r3 = requests.post(f"{BASE_URL}/api/admin/bookings/{dp['id']}/convert-to-transfer",
                           json={"send_email": False}, headers=admin_headers)
        assert r3.status_code == 400

    pytest.converted_id = new_id


# --- Admin update status accepts new statuses -----------------------------

def test_admin_update_status_accepts_new_statuses(db, admin_headers):
    bid = pytest.converted_id
    for st in ("transfer_pending", "expired"):
        r = requests.put(f"{BASE_URL}/api/admin/bookings/{bid}/status",
                         params={"status": st}, headers=admin_headers)
        assert r.status_code == 200, f"{st}: {r.text}"


# --- Scheduler: process_bank_transfers ------------------------------------

def test_scheduler_reminder_and_expire(db, admin_headers):
    """Set reserved_at back in time and run scheduler; verify effects."""
    import uuid, subprocess
    # Set up 3 bookings via convert (need fresh bookings we control)
    def make_transfer_pending():
        src = db.bookings.find_one({"hotel_id": HOTEL_ID}, {"_id": 0})
        nid = str(uuid.uuid4())
        d = {**src, "id": nid,
             "booking_number": f"HBH-SCHED-{uuid.uuid4().hex[:6].upper()}",
             "payment_status": "abandoned",
             "payment_method": "paypal",
             "room_type": "single",
             "hotel_id": HOTEL_ID,
             "deposit_amount": 75.0, "remaining_amount": 225.0,
             "email": f"TEST_sched_{nid[:8]}@example.com",
             "created_at": datetime.now(timezone.utc).isoformat(),
             "language": "de"}
        d.pop("transfer_reserved_at", None); d.pop("transfer_due_date", None); d.pop("transfer_reminder_sent_at", None)
        db.bookings.insert_one(d)
        r = requests.post(f"{BASE_URL}/api/admin/bookings/{nid}/convert-to-transfer",
                          json={"send_email": False}, headers=admin_headers)
        assert r.status_code == 200
        return nid

    b_reminder = make_transfer_pending()
    b_expire = make_transfer_pending()
    b_untouched = make_transfer_pending()

    now = datetime.now(timezone.utc)
    db.bookings.update_one({"id": b_reminder},
                           {"$set": {"transfer_reserved_at": (now - timedelta(days=6)).isoformat(),
                                     "transfer_reminder_sent_at": None}})
    db.bookings.update_one({"id": b_expire},
                           {"$set": {"transfer_reserved_at": (now - timedelta(days=11)).isoformat()}})
    db.bookings.update_one({"id": b_untouched},
                           {"$set": {"transfer_reserved_at": (now - timedelta(days=2)).isoformat()}})

    inv_before = db.hotels.find_one({"id": HOTEL_ID})["inventory"]["single"]

    # Run scheduler in a subprocess with the venv python
    code = (
        "import asyncio, sys; sys.path.insert(0,'/app/backend');"
        "import server; print(asyncio.run(server.process_bank_transfers()))"
    )
    result = subprocess.run(
        ["/root/venv/bin/python", "-c", code],
        capture_output=True, text=True, cwd="/app/backend", timeout=180,
    )
    print("SCHEDULER STDOUT:", result.stdout)
    print("SCHEDULER STDERR:", result.stderr[-500:])
    assert result.returncode == 0, result.stderr

    # reminder booking: email log present
    log = db.email_logs.find_one({"booking_id": b_reminder, "email_type": "transfer_reminder"})
    assert log is not None, "transfer_reminder email log missing"

    # expired booking
    b = db.bookings.find_one({"id": b_expire})
    assert b["payment_status"] == "expired"
    ev = db.payment_events.find_one({"booking_id": b_expire, "event": "transfer_expired"})
    assert ev is not None
    log2 = db.email_logs.find_one({"booking_id": b_expire, "email_type": "transfer_expired"})
    assert log2 is not None

    # inventory: +1 from the expire (releases room)
    inv_after = db.hotels.find_one({"id": HOTEL_ID})["inventory"]["single"]
    assert inv_after == inv_before + 1

    # untouched booking still pending, no reminder sent
    b3 = db.bookings.find_one({"id": b_untouched})
    assert b3["payment_status"] == "transfer_pending"
    assert not b3.get("transfer_reminder_sent_at")


# --- Regression on core admin endpoints -----------------------------------

def test_regression_admin_endpoints(admin_headers):
    for path in ["/api/admin/bookings", "/api/admin/email-logs", "/api/admin/stats"]:
        r = requests.get(f"{BASE_URL}{path}", headers=admin_headers)
        assert r.status_code == 200, f"{path} -> {r.status_code}"


# --- Cleanup: restore inventory --------------------------------------------

def test_zzz_restore_inventory(db):
    db.hotels.update_one({"id": HOTEL_ID}, {"$set": {"inventory.single": 5, "inventory.double": 3}})
    inv = db.hotels.find_one({"id": HOTEL_ID})["inventory"]
    assert inv["single"] == 5 and inv["double"] == 3

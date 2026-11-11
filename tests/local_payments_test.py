import os, sys, re
os.environ.update(MONGO_URL="mongodb://127.0.0.1:27017", DB_NAME="hbh_local_test", RESEND_API_KEY="x")
sys.path.insert(0, "/app/backend")
from fastapi.testclient import TestClient
import server
from services import generate_partial_payment_email
from pymongo import MongoClient
m = MongoClient("mongodb://127.0.0.1:27017")["hbh_local_test"]
for col in ("admins", "bookings", "hotels", "email_logs", "payment_transactions", "payment_events"): m[col].delete_many({})
m.admins.insert_one({"id": "a1", "email": "admin@test.de"})
m.hotels.insert_one({"id": "h1", "name": "Hey! Halle", "address": "x"})
base = {"hotel_id": "h1", "hotel_name": "Hey! Halle", "salutation": "mr", "first_name": "Hartwig", "last_name": "Nolte", "email": "h@gmx.de",
        "check_in": "2027-02-25", "check_out": "2027-02-28", "nights": 3, "room_type": "single", "total_price": 375.0, "language": "de"}
m.bookings.insert_many([{**base, "id": "A", "booking_number": "HBH-A", "payment_status": "fully_paid", "deposit_amount": 93.75, "remaining_amount": 281.25},
                        {**base, "id": "B", "booking_number": "HBH-B", "payment_status": "deposit_paid", "deposit_amount": 93.75, "remaining_amount": 281.25},
                        {**base, "id": "C", "booking_number": "HBH-C", "payment_status": "transfer_pending", "deposit_amount": 93.75, "remaining_amount": 281.25}])
H = {"Authorization": "Bearer " + server.create_token({"sub": "admin@test.de"})}
P = lambda c, i, **j: c.post(f"/api/admin/bookings/{i}/payments", json=j, headers=H)
with TestClient(server.app) as c:
    r = P(c, "A", mode="set", amount=193.75).json(); b = r["booking"]
    print("A correct", b["payment_status"], b["deposit_amount"], b["remaining_amount"], r["email_sent"])
    assert b["payment_status"] == "deposit_paid" and b["remaining_amount"] == 181.25 and not r["email_sent"]
    r = P(c, "B", mode="add", amount=100).json(); b = r["booking"]
    print("B partial", b["payment_status"], b["deposit_amount"], b["remaining_amount"], r["email_sent"])
    assert b["payment_status"] == "deposit_paid" and b["remaining_amount"] == 181.25 and r["email_sent"]
    r = P(c, "B", mode="add", amount=181.25, payment_method="paypal").json(); b = r["booking"]
    print("B final", b["payment_status"], b["remaining_amount"], b["fully_paid_at"] is not None)
    assert b["payment_status"] == "fully_paid" and b["remaining_amount"] == 0
    print("overpay", P(c, "B", mode="add", amount=1).status_code, "| pending", P(c, "C", mode="add", amount=10).status_code,
          "| zero", P(c, "A", mode="set", amount=0).status_code, "| noauth", c.post("/api/admin/bookings/A/payments", json={"amount": 1}).status_code)
    print("tx", [(t["booking_id"], t["payment_type"], t["amount"]) for t in m.payment_transactions.find()])
    print("mails", [l["email_type"] for l in m.email_logs.find()])
bk = {**base, "booking_number": "HBH-B", "deposit_amount": 193.75, "remaining_amount": 181.25}
for lang in ("de", "en"):
    s, body = generate_partial_payment_email(bk, {"name": "Hey! Halle"}, 100, "bank_transfer", server.BANK_DETAILS, lang)
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body.split("</style>")[-1])); i = t.find("Gesamtbetrag") if lang == "de" else t.find("Total amount")
    print("---", s, "|", t[i - 200:i + 330])
m.client.drop_database("hbh_local_test")

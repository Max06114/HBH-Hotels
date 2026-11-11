import os, sys
os.environ.update(MONGO_URL="mongodb://127.0.0.1:27017", DB_NAME="hbh_local_test", RESEND_API_KEY="x")
sys.path.insert(0, "/app/backend")
from fastapi.testclient import TestClient
import server
from services import generate_cancellation_email
from pymongo import MongoClient
m = MongoClient("mongodb://127.0.0.1:27017")["hbh_local_test"]
for col in ("admins", "bookings", "hotels", "email_logs", "payment_events"): m[col].delete_many({})
m.admins.insert_one({"id": "a1", "email": "admin@test.de"})
m.hotels.insert_one({"id": "h1", "name": "Dorint", "address": "x", "single_rooms": 5, "double_rooms": 5})
base = {"booking_number": "HBH-1", "hotel_id": "h1", "hotel_name": "Dorint", "salutation": "ms", "first_name": "Helen", "last_name": "Brown", "email": "h@b.ie",
        "check_in": "2027-02-24", "check_out": "2027-02-28", "nights": 4, "room_type": "single", "total_price": 600.0, "deposit_amount": 150.0,
        "remaining_amount": 450.0, "language": "en", "payment_method": "paypal"}
m.bookings.insert_many([{**base, "id": "b1", "payment_status": "deposit_paid"},
                        {**base, "id": "b2", "booking_number": "HBH-2", "payment_status": "transfer_pending", "payment_method": "bank_transfer"},
                        {**base, "id": "b3", "booking_number": "HBH-3", "payment_status": "fully_paid", "payment_method": "bank_transfer", "language": "de"}])
H = {"Authorization": "Bearer " + server.create_token({"sub": "admin@test.de"})}
with TestClient(server.app) as c:
    r = c.post("/api/bookings/b1/cancel", headers=H).json(); print("b1", r)
    assert r["refund_amount"] == 150.0 and r["refund_status"] == "open" and r["refund_percentage"] == 100
    print("again", c.post("/api/bookings/b1/cancel", headers=H).status_code)
    r = c.post("/api/bookings/b2/cancel", headers=H).json(); print("b2", r); assert r["refund_amount"] == 0 and r["refund_status"] == "none"
    r = c.post("/api/bookings/b3/cancel", headers=H).json(); print("b3", r); assert r["refund_amount"] == 600.0
    print("refund-done b2 (none)", c.post("/api/admin/bookings/b2/refund-done", headers=H).status_code)
    d = c.post("/api/admin/bookings/b1/refund-done", headers=H).json(); print("refund-done b1", d["payment_status"], d["refund_status"])
    print("cancel log bcc", [(l["email_type"], l.get("bcc")) for l in m.email_logs.find({"email_type": "cancellation"})][:1])
b = {**base, "payment_method": "bank_transfer"}
for args in [(b, 150.0, 100, "en", 150.0), (b, 75.0, 50, "de", 150.0), (b, 0, 0, "en", 0), ({**base}, 150.0, 100, "en", 150.0)]:
    subj, body = generate_cancellation_email(args[0], {"name": "Dorint"}, *args[1:])
    import re; txt = re.sub(r"<[^>]+>", " ", body.split("</style>")[-1]); txt = re.sub(r"\s+", " ", txt)
    i = txt.find("Booking Number") if "Booking Number" in txt else txt.find("Buchungsnummer")
    print("---", subj, "|", txt[i - 80:i + 520])
m.client.drop_database("hbh_local_test")

import os, sys
os.environ.update(MONGO_URL="mongodb://127.0.0.1:27017", DB_NAME="hbh_local_test", RESEND_API_KEY="x")
sys.path.insert(0, "/app/backend")
from fastapi.testclient import TestClient
import server
from pymongo import MongoClient
m = MongoClient("mongodb://127.0.0.1:27017")["hbh_local_test"]
for col in ("admins", "bookings", "hotels", "email_logs"): m[col].delete_many({})
m.admins.insert_one({"id": "a1", "email": "admin@test.de"})
m.hotels.insert_one({"id": "h1", "name": "Dorint", "address": "x"})
base = {"booking_number": "HBH-1", "invoice_number": "R1", "hotel_id": "h1", "hotel_name": "Dorint", "salutation": "mrs", "first_name": "Ursula", "last_name": "O",
        "email": "ursula.oehlschlaeger@web.de", "check_in": "2027-02-24", "check_out": "2027-02-28", "nights": 4, "room_type": "single", "total_price": 400.0,
        "deposit_amount": 100.0, "remaining_amount": 300.0, "language": "de", "transfer_due_date": "2026-11-10T00:00:00+00:00"}
m.bookings.insert_many([{**base, "id": "b1", "payment_status": "transfer_pending"}, {**base, "id": "b2", "payment_status": "deposit_paid"}])
H = {"Authorization": "Bearer " + server.create_token({"sub": "admin@test.de"})}
with TestClient(server.app) as c:
    r = c.post("/api/admin/bookings/b1/resend-transfer-instructions", headers=H); print("pending", r.status_code, r.json())
    log = m.email_logs.find_one({"email_type": "bank_transfer_instructions_resend"}); print("log", log and log["to_email"], log and log["subject"])
    print("paid", c.post("/api/admin/bookings/b2/resend-transfer-instructions", headers=H).status_code)
    print("noauth", c.post("/api/admin/bookings/b1/resend-transfer-instructions").status_code)
    print("bad email order", c.post("/api/bookings/bank-transfer", json={**{k: base[k] for k in ("hotel_id", "salutation", "first_name", "last_name", "room_type", "check_in", "check_out")}, "email": "ursula.oehlschlaeger.@web.de", "street": "s", "postal_code": "1", "city": "c", "country": "Deutschland"}).status_code)
m.client.drop_database("hbh_local_test")

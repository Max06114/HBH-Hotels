import os, sys, re
os.environ.update(MONGO_URL="mongodb://127.0.0.1:27017", DB_NAME="hbh_local_test", RESEND_API_KEY="x")
sys.path.insert(0, "/app/backend")
from fastapi.testclient import TestClient
import server
from services import generate_stay_change_email
from pymongo import MongoClient
m = MongoClient("mongodb://127.0.0.1:27017")["hbh_local_test"]
for col in ("admins", "bookings", "hotels", "payment_events"): m[col].delete_many({})
m.admins.insert_one({"id": "a1", "email": "admin@test.de"})
m.hotels.insert_one({"id": "h1", "name": "2* B&B Hotel Halle (Saale)", "address": "x", "single_price": 153.0, "double_price": 181.0, "twin_price": 181.0,
                     "inventory_type": "fixed", "inventory": {"single": 10, "double": 1, "twin": 0}})
m.bookings.insert_one({"id": "T", "booking_number": "HBH-T", "invoice_number": "R1", "hotel_id": "h1", "hotel_name": "2* B&B Hotel Halle (Saale)", "salutation": "mr",
    "first_name": "Thomas", "last_name": "Meaney", "email": "t@g.com", "street": "s", "postal_code": "1", "city": "c", "country": "Ireland",
    "check_in": "2027-02-25", "check_out": "2027-02-28", "nights": 3, "room_type": "single", "price_per_night": 153.0, "total_price": 459.0,
    "deposit_amount": 114.75, "remaining_amount": 344.25, "payment_status": "deposit_paid", "language": "en", "created_at": "2026-09-23"})
H = {"Authorization": "Bearer " + server.create_token({"sub": "admin@test.de"})}
with TestClient(server.app) as c:
    p = c.get("/api/admin/bookings/T/stay-preview", params={"check_in": "2027-02-25", "check_out": "2027-02-28", "room_type": "double"}, headers=H).json()
    print("preview", p["room_type"], p["total_price"], p["remaining_amount"])
    print("bad type", c.get("/api/admin/bookings/T/stay-preview", params={"check_in": "2027-02-25", "check_out": "2027-02-28", "room_type": "double_comfort"}, headers=H).status_code)
    r = c.post("/api/admin/bookings/T/change-stay", json={"check_in": "2027-02-25", "check_out": "2027-02-28", "room_type": "double", "companion_name": "Mr Christopher Connor", "send_email": False}, headers=H)
    b = r.json()["booking"]; print("change", r.status_code, b["room_type"], b["companion_name"], b["total_price"], b["deposit_amount"], b["remaining_amount"])
    print("inventory", m.hotels.find_one()["inventory"])
    print("unchanged", c.post("/api/admin/bookings/T/change-stay", json={"check_in": "2027-02-25", "check_out": "2027-02-28", "send_email": False}, headers=H).status_code)
    print("twin no stock", c.post("/api/admin/bookings/T/change-stay", json={"check_in": "2027-02-25", "check_out": "2027-02-28", "room_type": "twin", "send_email": False}, headers=H).status_code, m.hotels.find_one()["inventory"])
    old = {"check_in": "2027-02-25", "check_out": "2027-02-28", "nights": 3, "total_price": 459.0, "room_type": "single"}
    subj, body = generate_stay_change_email(b, old, {"name": "B&B"}, "en", "http://x", 114.75)
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body.split("</style>")[-1])); i = t.find("Previously")
    print("mail:", t[i:i + 330])
    pdf = server.generate_invoice_pdf(b, {"name": "B&B", "address": "x"}, "en"); print("pdf bytes", len(pdf))
m.client.drop_database("hbh_local_test")

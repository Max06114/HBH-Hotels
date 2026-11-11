import os, sys
os.environ.update(MONGO_URL="mongodb://127.0.0.1:27017", DB_NAME="hbh_local_test", RESEND_API_KEY="x")
sys.path.insert(0, "/app/backend")
from fastapi.testclient import TestClient
import server
from pymongo import MongoClient
m = MongoClient("mongodb://127.0.0.1:27017")["hbh_local_test"]
for col in ("admins", "bookings"): m[col].delete_many({})
m.admins.insert_one({"id": "a1", "email": "admin@test.de"})
B = lambda n, hid, hn, rt, nights, price, st="deposit_paid": {"id": n, "booking_number": n, "hotel_id": hid, "hotel_name": hn, "room_type": rt, "nights": nights,
     "check_in": "2027-02-24", "check_out": "2027-02-28", "total_price": price * nights, "payment_status": st}
m.bookings.insert_many([
    B("D1", "h_dor", "4* Dorint Hotel Charlottenhof", "double", 3, 189),          # EK 150.80
    B("D2", "h_dor", "4* Dorint Hotel Charlottenhof", "single_comfort", 4, 169, "fully_paid"),  # EK 135.20
    B("H1", "h_hey", "2* Hey! Halle", "single", 3, 125),                         # EK 99
    B("N1", "h_niu", "4* Hotel the niu Ridge", "twin", 3, 160),                  # EK avg double
    B("X1", "h_hey", "2* Hey! Halle", "double", 3, 155, "cancelled"),            # ignored
    B("U1", "h_x", "Unbekanntes Hotel", "double", 3, 100)])
H = {"Authorization": "Bearer " + server.create_token({"sub": "admin@test.de"})}
with TestClient(server.app) as c:
    print("noauth", c.get("/api/admin/analytics/margins").status_code)
    d = c.get("/api/admin/analytics/margins", headers=H).json()
for r in d["hotels"]: print(r)
print("TOTAL", d["total"]); print("missing", d["missing_purchase_price"])
dor = next(r for r in d["hotels"] if r["hotel_id"] == "h_dor")
exp_m = (189 - 150.8) * 3 + (169 - 135.2) * 4
assert abs(dor["margin"] - exp_m) < 0.01 and abs(dor["margin_tax"] - exp_m * 19 / 119) < 0.01
niu = next(r for r in d["hotels"] if r["hotel_id"] == "h_niu")
assert abs(niu["purchase"] - 152.5636 * 3) < 0.01
assert d["missing_purchase_price"] == ["U1"] and d["total"]["bookings"] == 4
m.client.drop_database("hbh_local_test"); print("MARGIN OK")

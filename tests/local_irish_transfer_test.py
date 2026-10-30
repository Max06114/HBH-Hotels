import os, sys
os.environ.update(MONGO_URL="mongodb://127.0.0.1:27017", DB_NAME="hbh_local_test", RESEND_API_KEY="x")
sys.path.insert(0, "/app/backend")
from fastapi.testclient import TestClient
import server
from pymongo import MongoClient
for c, exp in [("Ireland", True), ("Irland", True), ("Éire", True), ("IE", True), ("Republic of Ireland", True), (" ireland ", True),
               ("Northern Ireland", False), ("Nordirland", False), ("Deutschland", False), ("UK", False), (None, False)]:
    assert server.is_irish(c) == exp, c
print("is_irish OK")
m = MongoClient("mongodb://127.0.0.1:27017")["hbh_local_test"]
for col in ("admins", "bookings", "transfer_contacts", "transfer_responses"): m[col].delete_many({})
m.admins.insert_one({"id": "a1", "email": "admin@test.de"})
B = lambda i, country, st="deposit_paid": {"id": i, "email": f"{i}@x.de", "first_name": i, "last_name": "X", "country": country, "payment_status": st}
m.bookings.insert_many([B("ie1", "Ireland"), B("de1", "Deutschland"), B("ni1", "Northern Ireland"), B("de2", "Deutschland"), B("ie2", "Irland", "cancelled")])
m.transfer_contacts.insert_many([
    {"id": "c_de1", "email": "de1@x.de", "booking_id": "de1", "token": "t1", "name": "de1"},
    {"id": "c_de2", "email": "de2@x.de", "booking_id": "de2", "token": "t2", "name": "de2", "responded_at": "2026-10-01"},
    {"id": "c_imp", "email": "imp@x.de", "booking_id": None, "token": "t3", "name": "imp"}])
H = {"Authorization": "Bearer " + server.create_token({"sub": "admin@test.de"})}
with TestClient(server.app) as c:
    r = c.post("/api/admin/transfer/sync-bookings", headers=H).json(); print(r)
    ids = sorted(x["email"] for x in m.transfer_contacts.find())
    print(ids)
    assert r == {"bookings": 1, "created": 1, "removed": 1} and ids == ["de2@x.de", "ie1@x.de", "imp@x.de"]
m.client.drop_database("hbh_local_test"); print("SYNC OK")

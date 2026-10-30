import os, sys, json, base64, hmac, hashlib, time, asyncio
SECRET = "whsec_" + base64.b64encode(b"testsecret1234567890").decode()
os.environ.update(MONGO_URL="mongodb://127.0.0.1:27017", DB_NAME="hbh_local_test", RESEND_API_KEY="x", RESEND_WEBHOOK_SECRET=SECRET, EMAIL_PROVIDER="resend")
sys.path.insert(0, "/app/backend")
from fastapi.testclient import TestClient
import server
from pymongo import MongoClient

m = MongoClient("mongodb://127.0.0.1:27017")["hbh_local_test"]
m.email_logs.delete_many({})
m.email_logs.insert_one({"id": "l1", "to_email": "irelande08@hotmail.com", "subject": "Booking Confirmation - HBH-1", "email_type": "booking_confirmation",
                         "booking_number": "HBH-1", "provider_message_id": "em_1", "delivery_status": "sent", "sent_at": "2026-10-27T10:00:00"})

def signed(evt):
    body = json.dumps(evt); mid, ts = "msg_1", str(int(time.time()))
    key = base64.b64decode(SECRET.split("_", 1)[1])
    sig = base64.b64encode(hmac.new(key, f"{mid}.{ts}.{body}".encode(), hashlib.sha256).digest()).decode()
    return body, {"svix-id": mid, "svix-timestamp": ts, "svix-signature": f"v1,{sig}", "Content-Type": "application/json"}

bounce = {"type": "email.bounced", "created_at": "2026-10-27T10:01:00Z", "data": {"email_id": "em_1", "bounce": {"type": "Permanent", "subType": "Suppressed", "message": "550 5.7.1 B-URL"}}}
with TestClient(server.app) as c:
    print("unsigned", c.post("/api/webhooks/resend", content=json.dumps(bounce)).status_code)
    body, h = signed(bounce); r = c.post("/api/webhooks/resend", content=body, headers=h); print("signed", r.status_code, r.json())
    alerts = list(m.email_logs.find({"email_type": "admin_alert"}, {"_id": 0, "subject": 1, "to_email": 1}))
    print("alerts after 1st", alerts)
    body, h = signed(bounce); c.post("/api/webhooks/resend", content=body, headers=h)
    print("alerts after duplicate", m.email_logs.count_documents({"email_type": "admin_alert"}))
    delayed = {"type": "email.delivery_delayed", "data": {"email_id": "em_1"}}
    body, h = signed(delayed); c.post("/api/webhooks/resend", content=body, headers=h)
    print("alerts after delayed", m.email_logs.count_documents({"email_type": "admin_alert"}))

b = {"id": "b1", "booking_number": "HBH-1", "first_name": "A", "last_name": "B", "email": "a@b.de", "hotel_id": "h1", "deposit_amount": 100.0,
     "remaining_amount": 300.0, "total_price": 400.0, "check_in": "2027-02-24", "check_out": "2027-02-28", "nights": 4, "guests": 1, "rooms": 1,
     "room_type": "single", "invoice_number": "R1", "language": "en", "salutation": "mrs"}
async def conf():
    s, body = await server.build_confirmation_email(b, {"id": "h1", "name": "Dorint", "address": "x"}, "en")
    print("invoice link in confirmation:", "/invoice/" in body, "| attached hint:", "attached" in body)
try:
    asyncio.run(conf())
except Exception as e:
    print("conf err", repr(e))
m.client.drop_database("hbh_local_test")

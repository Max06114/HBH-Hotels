import os, sys, asyncio
os.environ.update(MONGO_URL="mongodb://127.0.0.1:27017", DB_NAME="hbh_local_test", RESEND_API_KEY="x")
sys.path.insert(0, "/app/backend")
import server
for c, fb, exp in [("Deutschland", "en", "de"), ("Germany", "en", "de"), ("Österreich", "en", "de"), ("Schweiz", "en", "de"), ("CH", "en", "de"),
                   ("Ireland", "de", "en"), ("Norway", "de", "en"), ("Norge", "de", "en"), ("", "en", "en"), (None, "de", "de"), ("UK", "de", "en")]:
    assert server.booking_language(c, fb) == exp, (c, fb)
print("rules OK")
async def main():
    db = server.db
    await db.bookings.delete_many({}); await db.migrations.delete_many({})
    await db.bookings.insert_many([{"id": "1", "booking_number": "A", "country": "Ireland", "language": "de"},
                                   {"id": "2", "booking_number": "B", "country": "Deutschland", "language": "de"},
                                   {"id": "3", "booking_number": "C", "country": "", "language": "de"},
                                   {"id": "4", "booking_number": "D", "country": "Norway", "language": "en"}])
    await server.migrate_booking_languages(); await server.migrate_booking_languages()
    print({b["booking_number"]: b["language"] for b in await db.bookings.find({}, {"_id": 0}).to_list(10)})
    print(await db.migrations.find_one({}, {"_id": 0}))
    await server.client.drop_database("hbh_local_test")
asyncio.run(main())

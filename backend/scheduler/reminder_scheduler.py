"""
Scheduler for automated payment reminders and arrival reminders.
Runs weekly and sends reminders at appropriate times.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def send_automated_reminders():
    """
    Automated job that runs weekly to send payment reminders.
    Sends reminders to bookings where:
    - payment_status is 'deposit_paid'
    - check_in is approximately 7 weeks (49 days) away
    - reminder has not been sent yet
    """
    from config import db
    from services.email_service import send_payment_reminder_with_link
    
    logger.info("Running automated payment reminder job...")
    
    # Calculate date 7 weeks from now (target reminder window: 6-7 weeks before arrival)
    seven_weeks_from_now = (datetime.now(timezone.utc) + timedelta(weeks=7)).strftime("%Y-%m-%d")
    six_weeks_from_now = (datetime.now(timezone.utc) + timedelta(weeks=6)).strftime("%Y-%m-%d")
    
    # Find bookings that need reminders
    # - deposit_paid (not fully paid)
    # - check-in is between 6-7 weeks from now
    # - reminder not sent yet
    bookings = await db.bookings.find({
        "payment_status": "deposit_paid",
        "check_in": {"$gte": six_weeks_from_now, "$lte": seven_weeks_from_now},
        "reminder_sent": {"$ne": True}
    }, {"_id": 0}).to_list(100)
    
    sent_count = 0
    failed_count = 0
    
    for booking in bookings:
        try:
            success = await send_payment_reminder_with_link(booking)
            if success:
                await db.bookings.update_one(
                    {"id": booking["id"]},
                    {"$set": {
                        "reminder_sent": True, 
                        "reminder_sent_at": datetime.now(timezone.utc).isoformat(),
                        "reminder_type": "automated"
                    }}
                )
                sent_count += 1
                logger.info(f"Sent automated reminder to {booking['email']} for booking {booking['booking_number']}")
            else:
                failed_count += 1
                logger.error(f"Failed to send reminder to {booking['email']}")
        except Exception as e:
            failed_count += 1
            logger.error(f"Error sending reminder to {booking['email']}: {str(e)}")
    
    logger.info(f"Automated reminder job completed: {sent_count} sent, {failed_count} failed, {len(bookings)} total eligible")
    
    # Store job run log
    await db.scheduler_logs.insert_one({
        "job_name": "send_automated_reminders",
        "run_at": datetime.now(timezone.utc).isoformat(),
        "bookings_processed": len(bookings),
        "sent_count": sent_count,
        "failed_count": failed_count
    })
    
    return {"sent": sent_count, "failed": failed_count, "total": len(bookings)}


async def send_arrival_reminders():
    """
    Automated job that runs weekly to send arrival reminders.
    Sends reminders to bookings where:
    - payment_status is 'fully_paid'
    - check_in is approximately 1 week away
    - arrival_reminder has not been sent yet
    """
    from config import db
    from services import generate_arrival_reminder_email
    from services.email_service import send_email
    
    logger.info("Running automated arrival reminder job...")
    
    # Calculate date 1 week from now (7-8 days)
    one_week_from_now = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    eight_days_from_now = (datetime.now(timezone.utc) + timedelta(days=8)).strftime("%Y-%m-%d")
    
    # Find bookings that need arrival reminders
    bookings = await db.bookings.find({
        "payment_status": "fully_paid",
        "check_in": {"$gte": one_week_from_now, "$lte": eight_days_from_now},
        "arrival_reminder_sent": {"$ne": True}
    }, {"_id": 0}).to_list(100)
    
    sent_count = 0
    failed_count = 0
    
    for booking in bookings:
        try:
            # Get hotel info
            hotel = await db.hotels.find_one({"id": booking.get("hotel_id")}, {"_id": 0})
            if not hotel:
                logger.error(f"Hotel not found for booking {booking['booking_number']}")
                failed_count += 1
                continue
            
            lang = booking.get("language", "de")
            subject, body = generate_arrival_reminder_email(booking, hotel, lang)
            
            success = await send_email(booking["email"], subject, body)
            if success:
                await db.bookings.update_one(
                    {"id": booking["id"]},
                    {"$set": {
                        "arrival_reminder_sent": True, 
                        "arrival_reminder_sent_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                sent_count += 1
                logger.info(f"Sent arrival reminder to {booking['email']} for booking {booking['booking_number']}")
            else:
                failed_count += 1
                logger.error(f"Failed to send arrival reminder to {booking['email']}")
        except Exception as e:
            failed_count += 1
            logger.error(f"Error sending arrival reminder to {booking['email']}: {str(e)}")
    
    logger.info(f"Automated arrival reminder job completed: {sent_count} sent, {failed_count} failed, {len(bookings)} total eligible")
    
    # Store job run log
    await db.scheduler_logs.insert_one({
        "job_name": "send_arrival_reminders",
        "run_at": datetime.now(timezone.utc).isoformat(),
        "bookings_processed": len(bookings),
        "sent_count": sent_count,
        "failed_count": failed_count
    })
    
    return {"sent": sent_count, "failed": failed_count, "total": len(bookings)}


def init_scheduler():
    """Initialize and start the scheduler with the reminder jobs."""
    # Payment reminders: Run every Monday at 9:00 AM UTC
    scheduler.add_job(
        send_automated_reminders,
        CronTrigger(day_of_week='mon', hour=9, minute=0),
        id='weekly_payment_reminders',
        name='Weekly Payment Reminders',
        replace_existing=True
    )
    
    # Arrival reminders: Run every Monday at 10:00 AM UTC
    scheduler.add_job(
        send_arrival_reminders,
        CronTrigger(day_of_week='mon', hour=10, minute=0),
        id='weekly_arrival_reminders',
        name='Weekly Arrival Reminders',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started - Payment reminders (Mon 9:00) and Arrival reminders (Mon 10:00) scheduled")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shutdown complete")

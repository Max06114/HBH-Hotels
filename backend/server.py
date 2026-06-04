from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Query, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import stripe
import requests
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager

# Import models
from models import (
    Hotel, HotelCreate, Booking, BookingCreate, 
    PaymentTransaction, AdminUser, AdminLogin, AdminCreate,
    PayPalCaptureRequest, ImageUploadResponse, ImageRenameRequest,
    PayPalOrderRequest, RoomInventory, InventoryUpdate, HotelReorderRequest
)

# Import email templates
from services import (
    generate_booking_confirmation_email,
    generate_remaining_payment_confirmation_email,
    generate_payment_reminder_email,
    generate_cancellation_email
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = "HS256"

# SMTP Config
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.strato.de')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'info@travel-events.de')

# Object Storage Config
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "hbh-hotels"
storage_key = None

def init_storage():
    """Initialize storage and get reusable storage key."""
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to storage."""
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from storage."""
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ============== SCHEDULER ==============

scheduler = AsyncIOScheduler()

async def send_automated_reminders():
    """
    Automated job that runs weekly to send payment reminders.
    Sends reminders to bookings where:
    - payment_status is 'deposit_paid'
    - check_in is approximately 7 weeks (49 days) away
    - reminder has not been sent yet
    """
    logger.info("Running automated payment reminder job...")
    
    # Calculate date window: 6-7 weeks from now
    seven_weeks_from_now = (datetime.now(timezone.utc) + timedelta(weeks=7)).strftime("%Y-%m-%d")
    six_weeks_from_now = (datetime.now(timezone.utc) + timedelta(weeks=6)).strftime("%Y-%m-%d")
    
    # Find bookings that need reminders
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - start scheduler on startup, shutdown on exit."""
    # Startup
    scheduler.add_job(
        send_automated_reminders,
        CronTrigger(day_of_week='mon', hour=9, minute=0),
        id='weekly_payment_reminders',
        name='Weekly Payment Reminders',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started - Weekly payment reminders scheduled for Monday 9:00 AM UTC")
    
    yield
    
    # Shutdown
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shutdown complete")

# Create the main app with lifespan
app = FastAPI(title="Happy Birthday Händel - Hotel Booking", lifespan=lifespan)

# Create routers
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(data: dict, expires_delta: timedelta = timedelta(hours=24)) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        admin = await db.admins.find_one({"email": email}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_nights(check_in: str, check_out: str) -> int:
    ci = datetime.strptime(check_in, "%Y-%m-%d")
    co = datetime.strptime(check_out, "%Y-%m-%d")
    return (co - ci).days

def get_room_price(hotel: dict, room_type: str) -> float:
    if room_type == "single":
        return hotel["single_price"]
    elif room_type == "double":
        return hotel["double_price"]
    elif room_type == "twin":
        return hotel.get("twin_price") or hotel["double_price"]
    elif room_type == "single_comfort":
        return hotel.get("single_comfort_price") or hotel["single_price"]
    elif room_type == "double_comfort":
        return hotel.get("double_comfort_price") or hotel["double_price"]
    elif room_type == "twin_comfort":
        return hotel.get("twin_comfort_price") or hotel.get("twin_price") or hotel["double_price"]
    return hotel["single_price"]

# ============== INVENTORY HELPERS ==============

def get_inventory_key_for_room_type(hotel: dict, room_type: str) -> str:
    """
    Determine which inventory key to decrement based on room type and hotel inventory type.
    For pool-based hotels (Dorint), single/double/twin use standard_pool, comfort variants use comfort_pool.
    For fixed hotels (B&B, Ankerhof), use dedicated keys.
    """
    inventory_type = hotel.get("inventory_type", "fixed")
    
    if inventory_type == "pool":
        # Pool-based: comfort rooms use comfort_pool, standard use standard_pool
        if room_type in ["single_comfort", "double_comfort", "twin_comfort"]:
            return "comfort_pool"
        else:
            return "standard_pool"
    else:
        # Fixed inventory: map to dedicated room type
        mapping = {
            "single": "single",
            "double": "double",
            "twin": "twin",
            "single_comfort": "single",  # Fallback for fixed hotels without comfort
            "double_comfort": "double",
            "twin_comfort": "twin"
        }
        return mapping.get(room_type, "single")

def check_room_availability(hotel: dict, room_type: str) -> tuple:
    """
    Check if a room type is available in the hotel inventory.
    Returns (is_available: bool, available_count: int)
    """
    inventory = hotel.get("inventory")
    if not inventory:
        # No inventory tracking - unlimited availability
        return (True, -1)
    
    inv_key = get_inventory_key_for_room_type(hotel, room_type)
    available = inventory.get(inv_key, 0)
    
    return (available > 0, available)

async def decrement_inventory(hotel_id: str, room_type: str) -> bool:
    """Decrement inventory for a room type after successful booking."""
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel or not hotel.get("inventory"):
        return True  # No inventory tracking
    
    inv_key = get_inventory_key_for_room_type(hotel, room_type)
    current = hotel["inventory"].get(inv_key, 0)
    
    if current <= 0:
        return False  # No rooms available
    
    # Decrement the inventory
    await db.hotels.update_one(
        {"id": hotel_id},
        {"$inc": {f"inventory.{inv_key}": -1}}
    )
    logger.info(f"Decremented {inv_key} inventory for hotel {hotel_id}: {current} -> {current - 1}")
    return True

async def increment_inventory(hotel_id: str, room_type: str) -> bool:
    """Increment inventory for a room type after cancellation."""
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel or not hotel.get("inventory"):
        return True  # No inventory tracking
    
    inv_key = get_inventory_key_for_room_type(hotel, room_type)
    
    # Increment the inventory
    await db.hotels.update_one(
        {"id": hotel_id},
        {"$inc": {f"inventory.{inv_key}": 1}}
    )
    logger.info(f"Incremented {inv_key} inventory for hotel {hotel_id} (cancellation)")
    return True

async def generate_invoice_number() -> str:
    count = await db.bookings.count_documents({})
    return f"INV-HBH-2026-{str(count + 1).zfill(5)}"

def generate_invoice_pdf(booking: dict, hotel: dict, language: str = "de") -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    
    # Custom styles
    address_style = ParagraphStyle('Address', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#4A4A4A'), leading=12)
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, spaceAfter=5, textColor=colors.HexColor('#6B1D2A'), fontName='Helvetica-Bold')
    section_style = ParagraphStyle('Section', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', textColor=colors.HexColor('#1A1A1A'), spaceBefore=15, spaceAfter=8)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=9, leading=14)
    italic_style = ParagraphStyle('Italic', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#666666'), fontName='Helvetica-Oblique')
    thank_style = ParagraphStyle('Thank', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', textColor=colors.HexColor('#6B1D2A'), spaceBefore=20)
    
    elements = []
    
    # Translations
    texts = {
        "de": {
            "invoice": "RECHNUNG",
            "invoice_nr": "Rechnungsnummer",
            "booking_nr": "Buchungsnummer",
            "date": "Rechnungsdatum",
            "bill_to": "Rechnungsempfänger",
            "booking_details": "Buchungsdetails",
            "hotel": "Hotel",
            "room_type": "Zimmertyp",
            "check_in": "Anreise",
            "check_out": "Abreise",
            "nights": "Nächte",
            "price_night": "Preis pro Nacht",
            "subtotal": "Zwischensumme",
            "total": "Gesamtbetrag",
            "deposit": "Anzahlung (25%)",
            "remaining": "Restbetrag (75%)",
            "remaining_due": "fällig 6 Wochen vor Anreise",
            "incl_breakfast": "Frühstück und Bettensteuer inklusive",
            "single": "Einzelzimmer",
            "double": "Doppelzimmer",
            "twin": "Zweibettzimmer",
            "single_comfort": "Einzelzimmer Komfort",
            "double_comfort": "Doppelzimmer Komfort",
            "twin_comfort": "Zweibettzimmer Komfort",
            "thank_you": "Vielen Dank für Ihre Buchung!",
            "margin_tax": "Besteuerung nach Margensteuer",
            "bank_label": "Bankverbindung"
        },
        "en": {
            "invoice": "INVOICE",
            "invoice_nr": "Invoice Number",
            "booking_nr": "Booking Number",
            "date": "Invoice Date",
            "bill_to": "Bill To",
            "booking_details": "Booking Details",
            "hotel": "Hotel",
            "room_type": "Room Type",
            "check_in": "Check-in",
            "check_out": "Check-out",
            "nights": "Nights",
            "price_night": "Price per Night",
            "subtotal": "Subtotal",
            "total": "Total Amount",
            "deposit": "Deposit (25%)",
            "remaining": "Remaining (75%)",
            "remaining_due": "due 6 weeks before arrival",
            "incl_breakfast": "Breakfast and city tax included",
            "single": "Single Room",
            "double": "Double Room",
            "twin": "Twin Room",
            "single_comfort": "Single Room Comfort",
            "double_comfort": "Double Room Comfort",
            "twin_comfort": "Twin Room Comfort",
            "thank_you": "Thank you for your booking!",
            "margin_tax": "Taxation according to margin scheme",
            "bank_label": "Banking Details"
        }
    }
    t = texts.get(language, texts["de"])
    room_types = {
        "single": t["single"], "double": t["double"], "twin": t["twin"],
        "single_comfort": t["single_comfort"], "double_comfort": t["double_comfort"], "twin_comfort": t["twin_comfort"]
    }
    
    # === HEADER SECTION ===
    # Company info (left) and Invoice title (right) in a table
    header_data = [
        [
            Paragraph("<b>Travel Events</b><br/>M. A. von Arnim<br/>Schleiermacherstr. 1<br/>06114 Halle", address_style),
            Paragraph(t["invoice"], title_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[9*cm, 8*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 5))
    
    # Horizontal line
    line_data = [[""]]
    line_table = Table(line_data, colWidths=[17*cm])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#6B1D2A')),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 15))
    
    # === INVOICE INFO AND CUSTOMER ===
    invoice_date = datetime.now().strftime('%d.%m.%Y')
    
    left_info = f"""<b>{t['invoice_nr']}:</b> {booking.get('invoice_number', 'N/A')}<br/>
<b>{t['booking_nr']}:</b> {booking['booking_number']}<br/>
<b>{t['date']}:</b> {invoice_date}"""
    
    right_info = f"""<b>{t['bill_to']}:</b><br/>
{booking['salutation']} {booking['first_name']} {booking['last_name']}<br/>
{booking['street']}<br/>
{booking['postal_code']} {booking['city']}<br/>
{booking['country']}<br/>
{booking['email']}"""
    
    info_data = [
        [Paragraph(left_info, normal_style), Paragraph(right_info, normal_style)]
    ]
    info_table = Table(info_data, colWidths=[8.5*cm, 8.5*cm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # === BOOKING DETAILS ===
    elements.append(Paragraph(t['booking_details'], section_style))
    
    hotel_name = hotel.get('name_en', hotel['name']) if language == 'en' else hotel['name']
    room_type_display = booking.get('room_type_display', room_types.get(booking['room_type'], booking['room_type']))
    
    # Details table with alternating colors
    details_data = [
        [t['hotel'], hotel_name],
        [t['room_type'], room_type_display],
        [t['check_in'], booking['check_in']],
        [t['check_out'], booking['check_out']],
        [t['nights'], str(booking['nights'])],
        [t['price_night'], f"{booking['price_per_night']:.2f} €"],
    ]
    
    details_table = Table(details_data, colWidths=[5*cm, 12*cm])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F2EA')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F2EA')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F2EA')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 15))
    
    # === TOTALS BOX ===
    totals_data = [
        [t['subtotal'], f"{booking['total_price']:.2f} €"],
        [t['deposit'], f"{booking['deposit_amount']:.2f} €"],
        [f"{t['remaining']} - {t['remaining_due']}", f"{booking['remaining_amount']:.2f} €"],
        [t['total'], f"{booking['total_price']:.2f} €"],
    ]
    
    totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])
    totals_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('LINEABOVE', (0, 3), (-1, 3), 1, colors.HexColor('#6B1D2A')),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 3), (-1, 3), 11),
        ('TEXTCOLOR', (0, 3), (-1, 3), colors.HexColor('#6B1D2A')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#F5F2EA')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 12))
    
    # Notes
    elements.append(Paragraph(f"<i>{t['incl_breakfast']}</i>", italic_style))
    elements.append(Paragraph(f"<i>{t['margin_tax']}</i>", italic_style))
    
    # Thank you
    elements.append(Paragraph(t['thank_you'], thank_style))
    
    # === FOOTER ===
    elements.append(Spacer(1, 30))
    
    # Footer line
    footer_line = [[""]]
    footer_line_table = Table(footer_line, colWidths=[17*cm])
    footer_line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E0D5')),
    ]))
    elements.append(footer_line_table)
    elements.append(Spacer(1, 8))
    
    # Bank details
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#4A4A4A'), alignment=1)
    elements.append(Paragraph(f"<b>{t['bank_label']}:</b> N26 Bank · IBAN: DE77100110012713041577 · BIC: NTSBDEB1XXX", footer_style))
    elements.append(Paragraph("Steuernummer: 110/202/40794 · Ust.Id Nr. / VAT ID No.: DE 229 059 172", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

async def send_email(to_email: str, subject: str, body_html: str, attachment: bytes = None, attachment_name: str = None):
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body_html, 'html', 'utf-8'))
        
        if attachment and attachment_name:
            part = MIMEApplication(attachment, Name=attachment_name)
            part['Content-Disposition'] = f'attachment; filename="{attachment_name}"'
            msg.attach(part)
        
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=True
        )
        logger.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

# ============== PUBLIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Happy Birthday Händel - Hotel Booking API"}

@api_router.get("/hotels", response_model=List[Hotel])
async def get_hotels():
    hotels = await db.hotels.find({"active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return hotels

@api_router.get("/hotels/{hotel_id}")
async def get_hotel(hotel_id: str):
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel

@api_router.get("/hotels/{hotel_id}/availability")
async def get_hotel_availability(hotel_id: str):
    """Get room availability for a hotel."""
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    inventory = hotel.get("inventory", {})
    inventory_type = hotel.get("inventory_type", "fixed")
    
    # Calculate availability for each room type
    availability = {}
    
    if inventory_type == "pool":
        # Pool-based hotel (e.g., Dorint)
        standard_available = inventory.get("standard_pool", 0)
        comfort_available = inventory.get("comfort_pool", 0)
        
        availability = {
            "single": standard_available,
            "double": standard_available,
            "twin": standard_available,
            "single_comfort": comfort_available,
            "double_comfort": comfort_available,
            "twin_comfort": comfort_available,
            "inventory_type": "pool",
            "standard_pool": standard_available,
            "comfort_pool": comfort_available
        }
    else:
        # Fixed inventory (e.g., B&B, Ankerhof)
        availability = {
            "single": inventory.get("single", 0),
            "double": inventory.get("double", 0),
            "twin": inventory.get("twin", 0),
            "single_comfort": 0,
            "double_comfort": 0,
            "twin_comfort": 0,
            "inventory_type": "fixed"
        }
    
    return {
        "hotel_id": hotel_id,
        "hotel_name": hotel["name"],
        "availability": availability,
        "has_inventory": bool(inventory)
    }

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate):
    hotel = await db.hotels.find_one({"id": booking_data.hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Check room availability
    is_available, count = check_room_availability(hotel, booking_data.room_type)
    if not is_available:
        room_type_names = {
            "single": "Einzelzimmer", "double": "Doppelzimmer", "twin": "Zweibettzimmer",
            "single_comfort": "Einzelzimmer Komfort", "double_comfort": "Doppelzimmer Komfort", "twin_comfort": "Zweibettzimmer Komfort"
        }
        raise HTTPException(
            status_code=400, 
            detail=f"{room_type_names.get(booking_data.room_type, booking_data.room_type)} ist ausgebucht / Room type is sold out"
        )
    
    nights = calculate_nights(booking_data.check_in, booking_data.check_out)
    if nights <= 0:
        raise HTTPException(status_code=400, detail="Invalid dates")
    
    price_per_night = get_room_price(hotel, booking_data.room_type)
    total_price = price_per_night * nights
    deposit_amount = round(total_price * 0.25, 2)
    remaining_amount = round(total_price - deposit_amount, 2)
    invoice_number = await generate_invoice_number()
    
    booking = Booking(
        hotel_id=booking_data.hotel_id,
        hotel_name=hotel["name"],
        salutation=booking_data.salutation,
        first_name=booking_data.first_name,
        last_name=booking_data.last_name,
        email=booking_data.email,
        street=booking_data.street,
        postal_code=booking_data.postal_code,
        city=booking_data.city,
        country=booking_data.country,
        room_type=booking_data.room_type,
        check_in=booking_data.check_in,
        check_out=booking_data.check_out,
        nights=nights,
        price_per_night=price_per_night,
        total_price=total_price,
        deposit_amount=deposit_amount,
        remaining_amount=remaining_amount,
        invoice_number=invoice_number,
        notes=booking_data.notes,
        language=booking_data.language
    )
    
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.bookings.insert_one(doc)
    
    return {
        "booking": booking.model_dump(),
        "message": "Booking created successfully"
    }

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.get("/bookings/number/{booking_number}")
async def get_booking_by_number(booking_number: str):
    booking = await db.bookings.find_one({"booking_number": booking_number}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

# ============== STRIPE PAYMENT ==============

@api_router.post("/payments/stripe/create-session")
async def create_stripe_session(request: Request, booking_id: str, origin_url: str, payment_type: str = "deposit"):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    amount = booking["deposit_amount"] if payment_type == "deposit" else booking["remaining_amount"]
    
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe.api_key = api_key
    
    success_url = f"{origin_url}/booking/confirmation?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking_id}"
    cancel_url = f"{origin_url}/booking/{booking_id}"
    
    # Create Stripe Checkout Session using native SDK
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "eur",
                "product_data": {
                    "name": f"Hotel Buchung - {'Anzahlung' if payment_type == 'deposit' else 'Restzahlung'}",
                    "description": f"Buchungsnummer: {booking['booking_number']}"
                },
                "unit_amount": int(float(amount) * 100),  # Stripe expects cents
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking_id,
            "booking_number": booking["booking_number"],
            "payment_type": payment_type
        }
    )
    
    # Create payment transaction
    transaction = PaymentTransaction(
        booking_id=booking_id,
        session_id=session.id,
        payment_method="stripe",
        amount=float(amount),
        currency="EUR",
        status="initiated",
        metadata={"payment_type": payment_type}
    )
    tx_doc = transaction.model_dump()
    tx_doc['created_at'] = tx_doc['created_at'].isoformat()
    tx_doc['updated_at'] = tx_doc['updated_at'].isoformat()
    await db.payment_transactions.insert_one(tx_doc)
    
    # Update booking
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"stripe_session_id": session.id, "payment_method": "stripe"}}
    )
    
    return {"url": session.url, "session_id": session.id}

@api_router.get("/payments/stripe/status/{session_id}")
async def get_stripe_status(request: Request, session_id: str):
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe.api_key = api_key
    
    # Get session status using native Stripe SDK
    session = stripe.checkout.Session.retrieve(session_id)
    payment_status = session.payment_status  # 'paid', 'unpaid', 'no_payment_required'
    
    # Default values
    booking = None
    is_remaining_payment = False
    
    # Update transaction and booking
    if payment_status == "paid":
        # Check if this is a remaining balance payment
        booking = await db.bookings.find_one({"stripe_remaining_session_id": session_id}, {"_id": 0})
        is_remaining_payment = booking is not None
        
        if not booking:
            # Check for deposit payment
            booking = await db.bookings.find_one({"stripe_session_id": session_id}, {"_id": 0})
        
        if booking:
            if is_remaining_payment:
                # This is a remaining balance payment
                if booking.get("payment_status") != "fully_paid":
                    await db.bookings.update_one(
                        {"id": booking["id"]},
                        {"$set": {
                            "payment_status": "fully_paid", 
                            "remaining_paid_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # Create payment transaction record
                    await db.payment_transactions.insert_one({
                        "id": str(uuid.uuid4()),
                        "booking_id": booking["id"],
                        "session_id": session_id,
                        "payment_method": "stripe",
                        "payment_type": "remaining",
                        "amount": booking["remaining_amount"],
                        "status": "paid",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    
                    # Send confirmation email for remaining balance
                    hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
                    if hotel:
                        lang = booking.get("language", "de")
                        subject, body = generate_remaining_payment_confirmation_email(booking, hotel, "stripe", lang)
                        await send_email(booking['email'], subject, body)
            else:
                # Deposit payment - original logic
                tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
                if tx and tx["status"] != "paid":
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {"status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    
                    await db.bookings.update_one(
                        {"id": booking["id"]},
                        {"$set": {"payment_status": "deposit_paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    
                    # Send confirmation email with invoice
                    hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
                    if hotel:
                        updated_booking = await db.bookings.find_one({"id": booking["id"]}, {"_id": 0})
                        lang = booking.get("language", "de")
                        pdf = generate_invoice_pdf(updated_booking, hotel, lang)
                        subject, body = generate_booking_confirmation_email(updated_booking, hotel, lang)
                        await send_email(booking['email'], subject, body, pdf, f"Invoice_{booking['invoice_number']}.pdf")
    
    return {
        "status": session.status,
        "payment_status": payment_status,
        "amount_total": session.amount_total,
        "currency": session.currency,
        "metadata": {"payment_type": "remaining" if booking and is_remaining_payment else "deposit"} if payment_status == "paid" else None
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    # Stripe webhook placeholder (Stripe removed, PayPal only)
    _ = await request.body()  # Read body to complete request
    logger.info("Stripe webhook received (deprecated)")
    return {"status": "received"}

# ============== PAYPAL PAYMENTS ==============

@api_router.post("/payments/paypal/create-order")
async def create_paypal_order(order_data: PayPalOrderRequest):
    """Create a PayPal order for the booking deposit."""
    import httpx
    
    # Get hotel for pricing
    hotel = await db.hotels.find_one({"id": order_data.hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Calculate price
    check_in = datetime.strptime(order_data.check_in, '%Y-%m-%d')
    check_out = datetime.strptime(order_data.check_out, '%Y-%m-%d')
    nights = (check_out - check_in).days
    
    # Get price based on room type
    room_prices = {
        'single': hotel.get('single_price', 0),
        'double': hotel.get('double_price', 0),
        'twin': hotel.get('twin_price', hotel.get('double_price', 0)),
        'single_comfort': hotel.get('single_comfort_price', hotel.get('single_price', 0)),
        'double_comfort': hotel.get('double_comfort_price', hotel.get('double_price', 0)),
        'twin_comfort': hotel.get('twin_comfort_price', hotel.get('twin_price', hotel.get('double_price', 0)))
    }
    price_per_night = room_prices.get(order_data.room_type, hotel['single_price'])
    total_price = price_per_night * nights
    deposit_amount = round(total_price * 0.25, 2)
    
    # Create booking first
    booking_number = f"HBH-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    invoice_number = f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    booking = {
        "id": str(uuid.uuid4()),
        "booking_number": booking_number,
        "invoice_number": invoice_number,
        "hotel_id": order_data.hotel_id,
        "hotel_name": hotel['name'],
        "salutation": order_data.salutation,
        "first_name": order_data.first_name,
        "last_name": order_data.last_name,
        "email": order_data.email,
        "street": order_data.street,
        "postal_code": order_data.postal_code,
        "city": order_data.city,
        "country": order_data.country,
        "room_type": order_data.room_type,
        "check_in": order_data.check_in,
        "check_out": order_data.check_out,
        "nights": nights,
        "price_per_night": price_per_night,
        "total_price": total_price,
        "deposit_amount": deposit_amount,
        "remaining_amount": round(total_price - deposit_amount, 2),
        "notes": order_data.notes,
        "payment_status": "pending",
        "payment_method": "paypal",
        "language": "de",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking)
    
    # Get PayPal access token
    client_id = os.environ.get('PAYPAL_CLIENT_ID')
    client_secret = os.environ.get('PAYPAL_SECRET')
    
    async with httpx.AsyncClient() as client:
        # Get access token
        auth_response = await client.post(
            "https://api-m.paypal.com/v1/oauth2/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"}
        )
        access_token = auth_response.json()["access_token"]
        
        # Create PayPal order
        order_response = await client.post(
            "https://api-m.paypal.com/v2/checkout/orders",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": booking["id"],
                    "description": f"Anzahlung: {hotel['name']} - {booking_number}",
                    "amount": {
                        "currency_code": "EUR",
                        "value": str(deposit_amount)
                    }
                }]
            }
        )
        
        order = order_response.json()
        
        # Update booking with PayPal order ID
        await db.bookings.update_one(
            {"id": booking["id"]},
            {"$set": {"paypal_order_id": order["id"]}}
        )
        
        return {"order_id": order["id"], "booking_id": booking["id"]}

@api_router.post("/payments/paypal/capture-order")
async def capture_paypal_order(capture_data: PayPalCaptureRequest):
    """Capture a PayPal order after approval."""
    import httpx
    
    client_id = os.environ.get('PAYPAL_CLIENT_ID')
    client_secret = os.environ.get('PAYPAL_SECRET')
    
    async with httpx.AsyncClient() as client:
        # Get access token
        auth_response = await client.post(
            "https://api-m.paypal.com/v1/oauth2/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"}
        )
        access_token = auth_response.json()["access_token"]
        
        # Capture the order
        capture_response = await client.post(
            f"https://api-m.paypal.com/v2/checkout/orders/{capture_data.order_id}/capture",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        capture = capture_response.json()
        
        if capture.get("status") == "COMPLETED":
            # Check if this is a remaining balance payment
            booking = await db.bookings.find_one({"paypal_remaining_order_id": capture_data.order_id}, {"_id": 0})
            
            if booking:
                # This is a remaining balance payment
                await db.bookings.update_one(
                    {"id": booking["id"]},
                    {"$set": {
                        "payment_status": "fully_paid",
                        "paypal_remaining_capture_id": capture["purchase_units"][0]["payments"]["captures"][0]["id"],
                        "remaining_paid_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Create payment transaction record
                await db.payment_transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "booking_id": booking["id"],
                    "payment_method": "paypal",
                    "payment_type": "remaining",
                    "paypal_order_id": capture_data.order_id,
                    "paypal_capture_id": capture["purchase_units"][0]["payments"]["captures"][0]["id"],
                    "amount": booking["remaining_amount"],
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Send confirmation email for remaining balance
                hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
                if hotel:
                    lang = booking.get("language", "de")
                    subject, body = generate_remaining_payment_confirmation_email(booking, hotel, "paypal", lang)
                    await send_email(booking['email'], subject, body)
                
                return {"status": "COMPLETED", "booking_id": booking["id"], "payment_type": "remaining"}
            
            # Check for deposit payment
            booking = await db.bookings.find_one({"paypal_order_id": capture_data.order_id}, {"_id": 0})
            if booking:
                # Decrement inventory on successful deposit payment
                inventory_decremented = await decrement_inventory(booking["hotel_id"], booking["room_type"])
                if not inventory_decremented:
                    logger.warning(f"Failed to decrement inventory for booking {booking['id']}")
                
                await db.bookings.update_one(
                    {"id": booking["id"]},
                    {"$set": {
                        "payment_status": "deposit_paid",
                        "paypal_capture_id": capture["purchase_units"][0]["payments"]["captures"][0]["id"],
                        "inventory_decremented": inventory_decremented,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Create payment transaction record
                await db.payment_transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "booking_id": booking["id"],
                    "payment_method": "paypal",
                    "paypal_order_id": capture_data.order_id,
                    "paypal_capture_id": capture["purchase_units"][0]["payments"]["captures"][0]["id"],
                    "amount": booking["deposit_amount"],
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                # Send confirmation email with invoice
                hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
                if hotel:
                    updated_booking = await db.bookings.find_one({"id": booking["id"]}, {"_id": 0})
                    lang = booking.get("language", "de")
                    pdf = generate_invoice_pdf(updated_booking, hotel, lang)
                    subject, body = generate_booking_confirmation_email(updated_booking, hotel, lang)
                    await send_email(booking['email'], subject, body, pdf, f"Invoice_{booking['invoice_number']}.pdf")
                
                return {"status": "COMPLETED", "booking_id": booking["id"]}
        
        return {"status": capture.get("status", "FAILED"), "error": capture.get("message")}

# ============== INVOICE DOWNLOAD ==============

@api_router.get("/bookings/{booking_id}/invoice")
async def download_invoice(booking_id: str, lang: str = None):
    """Download invoice PDF. Optional lang parameter: 'de' or 'en'"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Use provided lang parameter or fall back to booking language
    language = lang if lang in ['de', 'en'] else booking.get("language", "de")
    pdf = generate_invoice_pdf(booking, hotel, language)
    
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Invoice_{booking['invoice_number']}.pdf"}
    )

# ============== CANCELLATION/REFUND ==============

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, admin: dict = Depends(get_current_admin)):
    """Cancel a booking with automatic Stripe refund based on cancellation policy."""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Calculate refund percentage based on cancellation policy
    check_in_date = datetime.strptime(booking['check_in'], '%Y-%m-%d').date()
    today = datetime.now(timezone.utc).date()
    days_until_arrival = (check_in_date - today).days
    
    # Cancellation policy:
    # - More than 7 days before: 100% refund
    # - 1-7 days before: 50% refund
    # - Less than 1 day: 0% refund
    if days_until_arrival > 7:
        refund_percentage = 100
    elif days_until_arrival >= 1:
        refund_percentage = 50
    else:
        refund_percentage = 0
    
    refund_amount = 0
    refund_status = "no_refund"
    
    # Process Stripe refund if payment was made
    if booking.get('payment_status') in ['deposit_paid', 'fully_paid']:
        # Find the payment transaction
        transaction = await db.payment_transactions.find_one(
            {"booking_id": booking_id, "status": "completed"},
            {"_id": 0}
        )
        
        if transaction and transaction.get('payment_intent_id') and refund_percentage > 0:
            try:
                import stripe
                stripe.api_key = os.environ.get('STRIPE_API_KEY')
                
                # Calculate refund amount
                paid_amount = transaction.get('amount', booking.get('deposit_amount', 0))
                refund_amount = round(paid_amount * (refund_percentage / 100), 2)
                
                # Create refund in Stripe
                refund = stripe.Refund.create(
                    payment_intent=transaction['payment_intent_id'],
                    amount=int(refund_amount * 100),  # Stripe uses cents
                    reason='requested_by_customer'
                )
                
                refund_status = "refunded" if refund.status == 'succeeded' else "refund_pending"
                
                # Log the refund
                await db.refunds.insert_one({
                    "id": str(uuid.uuid4()),
                    "booking_id": booking_id,
                    "transaction_id": transaction.get('id'),
                    "refund_id": refund.id,
                    "amount": refund_amount,
                    "percentage": refund_percentage,
                    "status": refund.status,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
            except Exception as e:
                logging.error(f"Stripe refund failed: {str(e)}")
                refund_status = "refund_failed"
    
    # Update booking status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "payment_status": "cancelled",
            "refund_amount": refund_amount,
            "refund_percentage": refund_percentage,
            "refund_status": refund_status,
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Restore inventory if booking was paid (inventory was decremented)
    if booking.get('inventory_decremented') or booking.get('payment_status') in ['deposit_paid', 'fully_paid']:
        await increment_inventory(booking["hotel_id"], booking["room_type"])
        logger.info(f"Restored inventory for cancelled booking {booking_id}")
    
    # Send cancellation email with refund info
    hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
    lang = booking.get("language", "de")
    subject, body = generate_cancellation_email(booking, hotel, refund_amount, refund_percentage, lang)
    await send_email(booking['email'], subject, body)
    
    return {
        "message": "Booking cancelled successfully", 
        "booking_id": booking_id,
        "refund_amount": refund_amount,
        "refund_percentage": refund_percentage,
        "refund_status": refund_status
    }

# ============== ADMIN AUTH ==============

@api_router.get("/admin/bookings/export")
async def export_bookings_csv(admin: dict = Depends(get_current_admin)):
    """Export bookings as CSV file for hotel room overview."""
    import csv
    from io import StringIO
    
    # Get all non-cancelled bookings
    bookings = await db.bookings.find(
        {"payment_status": {"$ne": "cancelled"}},
        {"_id": 0}
    ).sort("check_in", 1).to_list(1000)
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    
    # Header row
    writer.writerow([
        'Buchungsnummer',
        'Hotel',
        'Gast',
        'E-Mail',
        'Anreise',
        'Abreise',
        'Nächte',
        'Zimmertyp',
        'Preis/Nacht',
        'Gesamtpreis',
        'Zahlungsstatus',
        'Nachricht'
    ])
    
    # Data rows
    room_type_labels = {
        'single': 'Einzelzimmer Standard',
        'double': 'Doppelzimmer Standard',
        'twin': 'Zweibettzimmer Standard',
        'single_comfort': 'Einzelzimmer Comfort',
        'double_comfort': 'Doppelzimmer Comfort',
        'twin_comfort': 'Zweibettzimmer Comfort'
    }
    
    status_labels = {
        'pending': 'Ausstehend',
        'deposit_paid': 'Anzahlung bezahlt',
        'fully_paid': 'Vollständig bezahlt'
    }
    
    for booking in bookings:
        # Format prices with comma (German format) without currency
        price_per_night = f"{booking.get('price_per_night', 0):.2f}".replace('.', ',')
        total_price = f"{booking.get('total_price', 0):.2f}".replace('.', ',')
        
        writer.writerow([
            booking.get('booking_number', ''),
            booking.get('hotel_name', ''),
            f"{booking.get('salutation', '')} {booking.get('first_name', '')} {booking.get('last_name', '')}".strip(),
            booking.get('email', ''),
            booking.get('check_in', ''),
            booking.get('check_out', ''),
            booking.get('nights', ''),
            room_type_labels.get(booking.get('room_type', ''), booking.get('room_type', '')),
            price_per_night,
            total_price,
            status_labels.get(booking.get('payment_status', ''), booking.get('payment_status', '')),
            booking.get('notes', '')
        ])
    
    csv_content = output.getvalue()
    output.close()
    
    # Return as downloadable CSV file
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=buchungsuebersicht.csv"
        }
    )

@api_router.post("/admin/login")
async def admin_login(login_data: AdminLogin):
    admin = await db.admins.find_one({"email": login_data.email}, {"_id": 0})
    if not admin or not verify_password(login_data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token({"sub": admin["email"]})
    return {"token": token, "email": admin["email"]}

@api_router.post("/admin/setup")
async def setup_admin(admin_data: AdminCreate):
    existing = await db.admins.find_one({"email": admin_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    admin = AdminUser(
        email=admin_data.email,
        password_hash=hash_password(admin_data.password)
    )
    doc = admin.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.admins.insert_one(doc)
    
    return {"message": "Admin created successfully"}

@api_router.get("/admin/me")
async def get_admin_me(admin: dict = Depends(get_current_admin)):
    return {"email": admin["email"]}

# ============== ADMIN HOTEL MANAGEMENT ==============

@api_router.put("/admin/hotels/reorder")
async def admin_reorder_hotels(data: HotelReorderRequest, admin: dict = Depends(get_current_admin)):
    """Reorder hotels by updating their sort_order."""
    for item in data.hotels:
        await db.hotels.update_one(
            {"id": item.id},
            {"$set": {"sort_order": item.sort_order}}
        )
    
    return {"message": "Hotels reordered successfully"}

@api_router.get("/admin/hotels", response_model=List[Hotel])
async def admin_get_hotels(admin: dict = Depends(get_current_admin)):
    hotels = await db.hotels.find({}, {"_id": 0}).to_list(100)
    return hotels

@api_router.post("/admin/hotels")
async def admin_create_hotel(hotel_data: HotelCreate, admin: dict = Depends(get_current_admin)):
    hotel = Hotel(**hotel_data.model_dump())
    doc = hotel.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.hotels.insert_one(doc)
    return hotel

@api_router.put("/admin/hotels/{hotel_id}")
async def admin_update_hotel(hotel_id: str, hotel_data: HotelCreate, admin: dict = Depends(get_current_admin)):
    result = await db.hotels.update_one(
        {"id": hotel_id},
        {"$set": hotel_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {"message": "Hotel updated successfully"}

@api_router.delete("/admin/hotels/{hotel_id}")
async def admin_delete_hotel(hotel_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.hotels.delete_one({"id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {"message": "Hotel deleted successfully"}

# ============== ADMIN INVENTORY MANAGEMENT ==============

@api_router.get("/admin/inventory")
async def admin_get_all_inventory(admin: dict = Depends(get_current_admin)):
    """Get inventory overview for all hotels."""
    hotels = await db.hotels.find({}, {"_id": 0}).to_list(100)
    
    inventory_overview = []
    for hotel in hotels:
        inventory = hotel.get("inventory", {})
        inventory_type = hotel.get("inventory_type", "fixed")
        
        # Count booked rooms (non-cancelled bookings)
        booked_counts = {}
        bookings = await db.bookings.find({
            "hotel_id": hotel["id"],
            "payment_status": {"$in": ["deposit_paid", "fully_paid"]}
        }, {"room_type": 1, "_id": 0}).to_list(1000)
        
        for b in bookings:
            rt = b.get("room_type", "single")
            booked_counts[rt] = booked_counts.get(rt, 0) + 1
        
        inventory_overview.append({
            "hotel_id": hotel["id"],
            "hotel_name": hotel["name"],
            "inventory_type": inventory_type,
            "inventory": inventory,
            "booked": booked_counts,
            "active": hotel.get("active", True)
        })
    
    return {"hotels": inventory_overview}

@api_router.get("/admin/inventory/{hotel_id}")
async def admin_get_hotel_inventory(hotel_id: str, admin: dict = Depends(get_current_admin)):
    """Get detailed inventory for a specific hotel."""
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    inventory = hotel.get("inventory", {})
    inventory_type = hotel.get("inventory_type", "fixed")
    
    # Count booked rooms by type
    pipeline = [
        {"$match": {"hotel_id": hotel_id, "payment_status": {"$in": ["deposit_paid", "fully_paid"]}}},
        {"$group": {"_id": "$room_type", "count": {"$sum": 1}}}
    ]
    booked_result = await db.bookings.aggregate(pipeline).to_list(20)
    booked = {item["_id"]: item["count"] for item in booked_result}
    
    return {
        "hotel_id": hotel_id,
        "hotel_name": hotel["name"],
        "inventory_type": inventory_type,
        "inventory": inventory,
        "booked": booked
    }

@api_router.put("/admin/inventory/{hotel_id}")
async def admin_update_inventory(hotel_id: str, inventory_data: InventoryUpdate, admin: dict = Depends(get_current_admin)):
    """Update inventory for a hotel."""
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Update only provided fields
    update_fields = {}
    if inventory_data.single is not None:
        update_fields["inventory.single"] = inventory_data.single
    if inventory_data.double is not None:
        update_fields["inventory.double"] = inventory_data.double
    if inventory_data.twin is not None:
        update_fields["inventory.twin"] = inventory_data.twin
    if inventory_data.standard_pool is not None:
        update_fields["inventory.standard_pool"] = inventory_data.standard_pool
    if inventory_data.comfort_pool is not None:
        update_fields["inventory.comfort_pool"] = inventory_data.comfort_pool
    
    if update_fields:
        await db.hotels.update_one(
            {"id": hotel_id},
            {"$set": update_fields}
        )
        logger.info(f"Updated inventory for hotel {hotel_id}: {update_fields}")
    
    # Return updated hotel
    updated_hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    return {
        "message": "Inventory updated successfully",
        "hotel_id": hotel_id,
        "inventory": updated_hotel.get("inventory", {})
    }

@api_router.put("/admin/hotels/{hotel_id}/inventory-type")
async def admin_set_inventory_type(hotel_id: str, inventory_type: str, admin: dict = Depends(get_current_admin)):
    """Set the inventory type for a hotel (fixed or pool)."""
    if inventory_type not in ["fixed", "pool"]:
        raise HTTPException(status_code=400, detail="inventory_type must be 'fixed' or 'pool'")
    
    result = await db.hotels.update_one(
        {"id": hotel_id},
        {"$set": {"inventory_type": inventory_type}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    return {"message": f"Inventory type set to {inventory_type}", "hotel_id": hotel_id}

# ============== ADMIN BOOKING MANAGEMENT ==============

@api_router.get("/admin/bookings")
async def admin_get_bookings(
    admin: dict = Depends(get_current_admin),
    status: Optional[str] = None,
    hotel_id: Optional[str] = None
):
    query = {}
    if status:
        query["payment_status"] = status
    if hotel_id:
        query["hotel_id"] = hotel_id
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.get("/admin/bookings/{booking_id}")
async def admin_get_booking(booking_id: str, admin: dict = Depends(get_current_admin)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.put("/admin/bookings/{booking_id}/status")
async def admin_update_booking_status(booking_id: str, status: str, admin: dict = Depends(get_current_admin)):
    valid_statuses = ["pending", "deposit_paid", "fully_paid", "refunded", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"payment_status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Status updated successfully"}

# ============== ADMIN PAYMENTS ==============

@api_router.get("/admin/payments")
async def admin_get_payments(admin: dict = Depends(get_current_admin)):
    payments = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return payments

# ============== SETTINGS (Intro Text) ==============

@api_router.get("/settings/intro-text")
async def get_intro_text():
    """Get the intro text for the homepage."""
    settings = await db.settings.find_one({"key": "intro_text"}, {"_id": 0})
    if settings:
        return {"text_de": settings.get("text_de", ""), "text_en": settings.get("text_en", "")}
    # Default text
    return {
        "text_de": "Mit den folgenden Hotels haben wir die besten Preise ausgehandelt. Übernachtung ist möglich ab 89 € pro Person im geteilten Doppelzimmer im Hotel Ankerhof. Frühstück und Bettensteuer sind inklusive. Alle Unterkünfte sind gut fußläufig zur Händelhalle gelegen. Travel Events ist Vermittler. Eine 25% Anzahlung ist für die Reservierung nötig. Der Rest wird 6 Wochen vor Anreise fällig. Eine kostenfreie Stornierung ist bis zu einer Woche vorher möglich, danach 50% bis einen Tag vorher, wonach 100% Stornogebühren anfallen.",
        "text_en": "We have negotiated the best prices with the following hotels. Accommodation starts from €89 per person in a shared double room at Hotel Ankerhof. Breakfast and city tax are included. All accommodations are within easy walking distance of the Händel Hall. Travel Events is the intermediary. A 25% deposit is required for reservation. The balance is due 6 weeks before arrival. Free cancellation is possible up to one week before, then 50% until one day before, after which 100% cancellation fees apply."
    }

@api_router.put("/admin/settings/intro-text")
async def update_intro_text(data: dict, admin: dict = Depends(get_current_admin)):
    """Update the intro text for the homepage."""
    text_de = data.get("text_de", "")
    text_en = data.get("text_en", "")
    
    await db.settings.update_one(
        {"key": "intro_text"},
        {"$set": {"key": "intro_text", "text_de": text_de, "text_en": text_en, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Intro text updated successfully"}

# ============== ADMIN STATS ==============

@api_router.get("/admin/stats")
async def admin_get_stats(admin: dict = Depends(get_current_admin)):
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"payment_status": "pending"})
    paid_bookings = await db.bookings.count_documents({"payment_status": {"$in": ["deposit_paid", "fully_paid"]}})
    cancelled_bookings = await db.bookings.count_documents({"payment_status": "cancelled"})
    
    pipeline = [
        {"$match": {"payment_status": {"$in": ["deposit_paid", "fully_paid"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
    ]
    revenue_result = await db.bookings.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "paid_bookings": paid_bookings,
        "cancelled_bookings": cancelled_bookings,
        "total_revenue": total_revenue
    }

# ============== PAYMENT REMINDERS ==============

async def generate_remaining_payment_links(booking: dict, hotel: dict, base_url: str) -> dict:
    """Generate Stripe and PayPal payment links for remaining balance."""
    import httpx
    import stripe
    
    stripe_url = None
    paypal_url = None
    
    # Create Stripe checkout session
    try:
        stripe.api_key = os.environ.get('STRIPE_API_KEY')
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'unit_amount': int(booking["remaining_amount"] * 100),
                    'product_data': {
                        'name': f'Restzahlung: {hotel["name"]}',
                        'description': f'Buchung {booking["booking_number"]} - Restbetrag'
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{base_url}/booking/confirmation?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking["id"]}&payment_type=remaining',
            cancel_url=f'{base_url}/',
            customer_email=booking["email"],
            metadata={
                'booking_id': booking["id"],
                'payment_type': 'remaining'
            }
        )
        stripe_url = session.url
        
        # Store the session ID
        await db.bookings.update_one(
            {"id": booking["id"]},
            {"$set": {"stripe_remaining_session_id": session.id}}
        )
    except Exception as e:
        logging.error(f"Stripe session creation failed: {e}")
    
    # Create PayPal order
    try:
        client_id = os.environ.get('PAYPAL_CLIENT_ID')
        client_secret = os.environ.get('PAYPAL_SECRET')
        
        async with httpx.AsyncClient() as client:
            auth_response = await client.post(
                "https://api-m.paypal.com/v1/oauth2/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                auth=(client_id, client_secret),
                data={"grant_type": "client_credentials"}
            )
            access_token = auth_response.json()["access_token"]
            
            order_response = await client.post(
                "https://api-m.paypal.com/v2/checkout/orders",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {access_token}"
                },
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "reference_id": booking["id"],
                        "description": f"Restzahlung: {hotel['name']} - {booking['booking_number']}",
                        "amount": {
                            "currency_code": "EUR",
                            "value": str(booking["remaining_amount"])
                        }
                    }],
                    "application_context": {
                        "return_url": f"{base_url}/booking/confirmation?booking_id={booking['id']}&payment_type=remaining&method=paypal",
                        "cancel_url": f"{base_url}/"
                    }
                }
            )
            order = order_response.json()
            
            # Get approval URL
            paypal_url = next((link["href"] for link in order.get("links", []) if link["rel"] == "approve"), None)
            
            # Store the order ID
            await db.bookings.update_one(
                {"id": booking["id"]},
                {"$set": {"paypal_remaining_order_id": order.get("id")}}
            )
    except Exception as e:
        logging.error(f"PayPal order creation failed: {e}")
    
    return {"stripe_url": stripe_url, "paypal_url": paypal_url}

@api_router.post("/payments/remaining/{booking_id}")
async def create_remaining_payment_link(booking_id: str):
    """Create a payment link for the remaining balance."""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("payment_status") == "fully_paid":
        raise HTTPException(status_code=400, detail="Booking already fully paid")
    
    hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
    
    # Determine original payment method
    payment_method = booking.get("payment_method", "stripe")
    base_url = os.environ.get("FRONTEND_URL", "https://event-payments-3.preview.emergentagent.com")
    
    if payment_method == "paypal":
        # Create PayPal order for remaining amount
        import httpx
        client_id = os.environ.get('PAYPAL_CLIENT_ID')
        client_secret = os.environ.get('PAYPAL_SECRET')
        
        async with httpx.AsyncClient() as client:
            auth_response = await client.post(
                "https://api-m.paypal.com/v1/oauth2/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                auth=(client_id, client_secret),
                data={"grant_type": "client_credentials"}
            )
            access_token = auth_response.json()["access_token"]
            
            order_response = await client.post(
                "https://api-m.paypal.com/v2/checkout/orders",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {access_token}"
                },
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "reference_id": booking["id"],
                        "description": f"Restzahlung: {hotel['name']} - {booking['booking_number']}",
                        "amount": {
                            "currency_code": "EUR",
                            "value": str(booking["remaining_amount"])
                        }
                    }],
                    "application_context": {
                        "return_url": f"{base_url}/booking/confirmation?booking_id={booking_id}&payment_type=remaining&method=paypal",
                        "cancel_url": f"{base_url}/"
                    }
                }
            )
            order = order_response.json()
            
            # Get approval URL
            approval_url = next((link["href"] for link in order.get("links", []) if link["rel"] == "approve"), None)
            
            await db.bookings.update_one(
                {"id": booking_id},
                {"$set": {"paypal_remaining_order_id": order["id"]}}
            )
            
            return {"payment_url": approval_url, "method": "paypal"}
    else:
        # Create Stripe checkout session for remaining amount
        import stripe
        stripe.api_key = os.environ.get('STRIPE_API_KEY')
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'unit_amount': int(booking["remaining_amount"] * 100),
                    'product_data': {
                        'name': f'Restzahlung: {hotel["name"]}',
                        'description': f'Buchung {booking["booking_number"]} - Restbetrag'
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{base_url}/booking/confirmation?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking_id}&payment_type=remaining',
            cancel_url=f'{base_url}/',
            customer_email=booking["email"],
            metadata={
                'booking_id': booking_id,
                'payment_type': 'remaining'
            }
        )
        
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"stripe_remaining_session_id": session.id}}
        )
        
        return {"payment_url": session.url, "method": "stripe"}

async def send_payment_reminder_with_link(booking: dict, stripe_url: str = None, paypal_url: str = None):
    """Send payment reminder email with payment link for remaining balance."""
    hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
    if not hotel:
        return False
    
    # Generate payment links if not provided
    base_url = os.environ.get("FRONTEND_URL", "https://event-payments-3.preview.emergentagent.com")
    
    # Generate Stripe and PayPal payment links
    if not stripe_url or not paypal_url:
        payment_links = await generate_remaining_payment_links(booking, hotel, base_url)
        stripe_url = payment_links.get("stripe_url")
        paypal_url = payment_links.get("paypal_url")
    
    # Invoice download link (correct endpoint)
    invoice_link = f"{base_url}/api/bookings/{booking['id']}/invoice"
    
    lang = booking.get("language", "de")
    subject, body = generate_payment_reminder_email(booking, hotel, stripe_url, paypal_url, invoice_link, lang)
    
    try:
        await send_email(booking['email'], subject, body)
        return True
    except Exception as e:
        logging.error(f"Failed to send payment reminder: {str(e)}")
        return False

async def send_payment_reminder(booking: dict):
    """Send payment reminder email for remaining balance"""
    hotel = await db.hotels.find_one({"id": booking["hotel_id"]}, {"_id": 0})
    if not hotel:
        return False
    
    lang = booking.get("language", "de")
    if lang == "de":
        subject = f"Zahlungserinnerung - Buchung {booking['booking_number']}"
        body = f"""
        <html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6B1D2A;">Zahlungserinnerung</h2>
            <p>Sehr geehrte(r) {booking['salutation']} {booking['last_name']},</p>
            <p>Ihre Anreise für Happy Birthday Händel 2026 steht in <strong>6 Wochen</strong> bevor.</p>
            <p>Bitte überweisen Sie den Restbetrag für Ihre Buchung:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #F5F2EA;">
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Buchungsnummer:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;">{booking['booking_number']}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Hotel:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;">{booking['hotel_name']}</td>
                </tr>
                <tr style="background: #F5F2EA;">
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Anreise:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;">{booking['check_in']}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Abreise:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;">{booking['check_out']}</td>
                </tr>
                <tr style="background: #6B1D2A; color: white;">
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Restbetrag fällig:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>{booking['remaining_amount']:.2f} €</strong></td>
                </tr>
            </table>
            <p>Bitte kontaktieren Sie uns unter info@travel-events.de für die Zahlungsabwicklung.</p>
            <p>Mit freundlichen Grüßen,<br><strong>Travel Events</strong></p>
        </div>
        </body></html>
        """
    else:
        subject = f"Payment Reminder - Booking {booking['booking_number']}"
        body = f"""
        <html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6B1D2A;">Payment Reminder</h2>
            <p>Dear {booking['salutation']} {booking['last_name']},</p>
            <p>Your arrival for Happy Birthday Händel 2026 is in <strong>6 weeks</strong>.</p>
            <p>Please transfer the remaining balance for your booking:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #F5F2EA;">
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Booking Number:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;">{booking['booking_number']}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Hotel:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;">{booking['hotel_name']}</td>
                </tr>
                <tr style="background: #F5F2EA;">
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Check-in:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;">{booking['check_in']}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Check-out:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;">{booking['check_out']}</td>
                </tr>
                <tr style="background: #6B1D2A; color: white;">
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>Remaining Balance:</strong></td>
                    <td style="padding: 10px; border: 1px solid #E5E0D5;"><strong>{booking['remaining_amount']:.2f} €</strong></td>
                </tr>
            </table>
            <p>Please contact us at info@travel-events.de for payment processing.</p>
            <p>Best regards,<br><strong>Travel Events</strong></p>
        </div>
        </body></html>
        """
    
    return await send_email(booking['email'], subject, body)

@api_router.post("/admin/send-reminders")
async def admin_send_payment_reminders(admin: dict = Depends(get_current_admin)):
    """Send payment reminders for bookings with check-in in 6 weeks"""
    # Calculate date 6 weeks from now
    six_weeks_from_now = (datetime.now(timezone.utc) + timedelta(weeks=6)).strftime("%Y-%m-%d")
    six_weeks_plus_one = (datetime.now(timezone.utc) + timedelta(weeks=6, days=1)).strftime("%Y-%m-%d")
    
    # Find bookings that:
    # 1. Have deposit_paid status (not fully paid yet)
    # 2. Check-in is around 6 weeks from now
    # 3. Haven't received a reminder yet
    bookings = await db.bookings.find({
        "payment_status": "deposit_paid",
        "check_in": {"$gte": six_weeks_from_now, "$lt": six_weeks_plus_one},
        "reminder_sent": {"$ne": True}
    }, {"_id": 0}).to_list(100)
    
    sent_count = 0
    for booking in bookings:
        success = await send_payment_reminder_with_link(booking)
        if success:
            await db.bookings.update_one(
                {"id": booking["id"]},
                {"$set": {"reminder_sent": True, "reminder_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            sent_count += 1
    
    return {"message": f"Sent {sent_count} payment reminders", "total_eligible": len(bookings)}

@api_router.post("/admin/bookings/{booking_id}/send-reminder")
async def admin_send_single_reminder(booking_id: str, admin: dict = Depends(get_current_admin)):
    """Send payment reminder with payment links to a single booking."""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("payment_status") == "fully_paid":
        raise HTTPException(status_code=400, detail="Booking already fully paid")
    
    success = await send_payment_reminder_with_link(booking)
    
    if success:
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"reminder_sent": True, "reminder_sent_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Payment reminder sent successfully", "booking_id": booking_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to send payment reminder")

@api_router.get("/admin/pending-reminders")
async def admin_get_pending_reminders(admin: dict = Depends(get_current_admin)):
    """Get list of bookings that need payment reminders"""
    # Get all bookings with deposit_paid that haven't been reminded
    bookings = await db.bookings.find({
        "payment_status": "deposit_paid",
        "reminder_sent": {"$ne": True}
    }, {"_id": 0}).to_list(100)
    
    # Calculate which ones are within 6 weeks of check-in
    pending = []
    
    for booking in bookings:
        check_in_date = datetime.strptime(booking["check_in"], "%Y-%m-%d")
        days_until = (check_in_date - datetime.now(timezone.utc).replace(tzinfo=None)).days
        if days_until <= 42:  # 6 weeks = 42 days
            booking["days_until_checkin"] = days_until
            pending.append(booking)
    
    return {"pending_reminders": pending, "count": len(pending)}

# ============== SCHEDULER MANAGEMENT ==============

@api_router.get("/admin/scheduler/status")
async def get_scheduler_status(admin: dict = Depends(get_current_admin)):
    """Get the current status of the scheduler and recent job runs."""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    # Get recent scheduler logs
    recent_logs = await db.scheduler_logs.find({}, {"_id": 0}).sort("run_at", -1).limit(10).to_list(10)
    
    return {
        "scheduler_running": scheduler.running,
        "jobs": jobs,
        "recent_runs": recent_logs
    }

@api_router.post("/admin/scheduler/run-reminders")
async def run_reminders_manually(admin: dict = Depends(get_current_admin)):
    """Manually trigger the payment reminder job."""
    result = await send_automated_reminders()
    return {
        "message": "Reminder job executed manually",
        "result": result
    }

# ============== SEED DATA ==============


@api_router.post("/seed-admin")
async def seed_admin():
    """Create default admin user if not exists."""
    existing = await db.admins.find_one({"email": "info@travel-events.de"})
    if existing:
        return {"message": "Admin already exists"}
    
    admin_doc = {
        "id": str(uuid.uuid4()),
        "email": "info@travel-events.de",
        "password": hash_password("admin123"),
        "name": "Admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    return {"message": "Admin created successfully", "email": "info@travel-events.de"}


@api_router.post("/seed-hotels")
async def seed_hotels():
    existing = await db.hotels.count_documents({})
    if existing > 0:
        return {"message": "Hotels already seeded"}
    
    hotels = [
        {
            "id": str(uuid.uuid4()),
            "name": "4* Hotel the niu Ridge",
            "name_en": "4* Hotel the niu Ridge",
            "description": "Das 4* Hotel the niu Ridge ist 2020 eröffnet worden. Es ist 500 m zum Bahnhof und 25 Minuten zu Fuß von der Händelhalle entfernt. Es verfügt nur über Doppelbettzimmer für Einzel- oder Doppelbelegung.",
            "description_en": "The 4* Hotel the niu Ridge opened in 2020. It is 500 m to the train station and 25 minutes walk from the Händelhalle. It only has double rooms for single or double occupancy.",
            "stars": 4,
            "address": "Riebeckplatz 10, 06108 Halle (Saale)",
            "distance_to_venue": "25 Minuten zu Fuß zur Händelhalle",
            "distance_to_venue_en": "25 minutes walk to Händelhalle",
            "amenities": ["Frühstück inklusive", "Bettensteuer inklusive", "500m zum Bahnhof", "Private Sauna", "Co-Working"],
            "amenities_en": ["Breakfast included", "City tax included", "500m to train station", "Private sauna", "Co-working"],
            "images": ["https://digital.ihg.com/is/image/ihg/holiday-inn-the-niu-ridge-halle-8740287569-4x3"],
            "single_price": 109.00,
            "double_price": 131.00,
            "twin_price": None,
            "breakfast_included": True,
            "tax_included": True,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "4* Hotel Rotes Ross",
            "name_en": "4* Hotel Rotes Ross",
            "description": "Das 4* Rotes Ross liegt ca. 15 Minuten Fußweg von der Händelhalle entfernt und 7 Minuten zum Bahnhof. Das Hotel liegt ruhig in der Fußgängerzone und verfügt über eine finnische Sauna und ein Restaurant.",
            "description_en": "The 4* Rotes Ross is about 15 minutes walk from the Händelhalle and 7 minutes to the train station. The hotel is quietly located in the pedestrian zone and has a Finnish sauna and restaurant.",
            "stars": 4,
            "address": "Leipziger Straße 76, 06108 Halle (Saale)",
            "distance_to_venue": "15 Minuten zu Fuß zur Händelhalle",
            "distance_to_venue_en": "15 minutes walk to Händelhalle",
            "amenities": ["Frühstück inklusive", "Bettensteuer inklusive", "Finnische Sauna", "Restaurant", "In der Fußgängerzone"],
            "amenities_en": ["Breakfast included", "City tax included", "Finnish sauna", "Restaurant", "In pedestrian zone"],
            "images": ["https://www.dormero.de/fileadmin/_processed_/6/6/csm_DORMERO-Hotel-Halle-Aussenansicht_01_4f8cc4f6a1.jpg"],
            "single_price": 113.00,
            "double_price": 133.00,
            "twin_price": 133.00,
            "breakfast_included": True,
            "tax_included": True,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "4* Hotel Ankerhof",
            "name_en": "4* Hotel Ankerhof",
            "description": "Das 4* Ankerhof Hotel befindet sich in einem ehemaligen Speicher und bietet einen Ausblick auf einen Seitenarm der Saale. Es bietet Sauna und Wellness und ist 250 Meter von der Händelhalle entfernt.",
            "description_en": "The 4* Ankerhof Hotel is located in a former warehouse and offers views of a branch of the Saale river. It offers sauna and wellness and is 250 meters from the Händelhalle.",
            "stars": 4,
            "address": "Ankerstraße 2a, 06108 Halle (Saale)",
            "distance_to_venue": "250 Meter zur Händelhalle",
            "distance_to_venue_en": "250 meters to Händelhalle",
            "amenities": ["Frühstück inklusive", "Bettensteuer inklusive", "Sauna & Wellness", "Blick auf die Saale", "Historisches Gebäude"],
            "amenities_en": ["Breakfast included", "City tax included", "Sauna & Wellness", "River view", "Historic building"],
            "images": ["https://ankerhof.de/wp-content/uploads/2019/03/ankerhof-hotel-aussen.jpg"],
            "single_price": 128.00,
            "double_price": 175.00,
            "twin_price": 175.00,
            "breakfast_included": True,
            "tax_included": True,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "4* Dorint Hotel Charlottenhof",
            "name_en": "4* Dorint Hotel Charlottenhof",
            "description": "Das 4* Dorint Hotel Charlottenhof liegt ca. 20 Minuten Fußweg von der Händelhalle entfernt und ist seit Jahren eine beliebte Bleibe für Happy Birthday Händel Sänger, mit einem guten Restaurant und einer Sauna.",
            "description_en": "The 4* Dorint Hotel Charlottenhof is about 20 minutes walk from the Händelhalle and has been a popular place to stay for Happy Birthday Händel singers for years, with a good restaurant and sauna.",
            "stars": 4,
            "address": "Dorotheenstraße 12, 06108 Halle (Saale)",
            "distance_to_venue": "20 Minuten zu Fuß zur Händelhalle",
            "distance_to_venue_en": "20 minutes walk to Händelhalle",
            "amenities": ["Frühstück inklusive", "Bettensteuer inklusive", "Restaurant", "Sauna", "Beliebte HBH-Unterkunft"],
            "amenities_en": ["Breakfast included", "City tax included", "Restaurant", "Sauna", "Popular HBH accommodation"],
            "images": ["https://hotel-halle-saale.dorint.com/fileadmin/_processed_/d/3/csm_Dorint_Charlottenhof_Halle_Exterior_05c0ab6ce5.jpg"],
            "single_price": 155.00,
            "double_price": 196.00,
            "twin_price": 196.00,
            "breakfast_included": True,
            "tax_included": True,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.hotels.insert_many(hotels)
    return {"message": "Hotels seeded successfully", "count": len(hotels)}

# ============== IMAGE MANAGER ==============

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp"
}

@api_router.post("/admin/images/upload")
async def admin_upload_image(
    file: UploadFile = File(...),
    hotel_id: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Upload an image to storage."""
    # Validate file type
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp")
    
    # Read file data
    data = await file.read()
    
    # Max 5MB
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB allowed.")
    
    # Generate unique path
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/images/{file_id}.{ext}"
    
    try:
        result = put_object(path, data, MIME_TYPES[ext])
        
        # Store in database
        image_doc = {
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": MIME_TYPES[ext],
            "size": result.get("size", len(data)),
            "hotel_id": hotel_id,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.images.insert_one(image_doc)
        
        return {
            "id": file_id,
            "path": result["path"],
            "filename": file.filename,
            "size": result.get("size", len(data))
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.get("/images/{image_id}")
async def get_image(image_id: str, auth: str = Query(None)):
    """Get image by ID. Supports query param auth for img tags."""
    # Find image in database
    image = await db.images.find_one({"id": image_id, "is_deleted": False}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        data, content_type = get_object(image["storage_path"])
        return Response(content=data, media_type=image.get("content_type", content_type))
    except Exception as e:
        logger.error(f"Failed to get image: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve image")

@api_router.get("/admin/images")
async def admin_list_images(
    hotel_id: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """List all images, optionally filtered by hotel. Returns images in saved order if hotel_id is provided."""
    import re
    
    if hotel_id:
        # Get hotel to find the saved image order
        hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
        if hotel:
            # Extract image IDs from URLs in hotel.images
            image_ids = hotel.get("image_ids", [])
            
            # If image_ids is empty, extract from images URLs
            if not image_ids and hotel.get("images"):
                for img_url in hotel["images"]:
                    # Extract ID from /api/images/{id} format
                    match = re.search(r'/api/images/([a-f0-9-]+)', img_url)
                    if match:
                        image_ids.append(match.group(1))
            
            if image_ids:
                # Return images in the saved order - only images that exist in image_ids
                all_images = await db.images.find({"id": {"$in": image_ids}, "is_deleted": False}, {"_id": 0}).to_list(100)
                # Sort by the order in image_ids
                images_dict = {img["id"]: img for img in all_images}
                ordered_images = [images_dict[img_id] for img_id in image_ids if img_id in images_dict]
                return ordered_images
            else:
                # No internal images found - return empty list
                return []
    
    # All images (unfiltered)
    query = {"is_deleted": False}
    images = await db.images.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return images

@api_router.delete("/admin/images/{image_id}")
async def admin_delete_image(image_id: str, admin: dict = Depends(get_current_admin)):
    """Soft delete an image."""
    result = await db.images.update_one(
        {"id": image_id},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted"}

@api_router.put("/admin/images/{image_id}/rename")
async def admin_rename_image(image_id: str, data: ImageRenameRequest, admin: dict = Depends(get_current_admin)):
    """Rename an image with a custom name."""
    result = await db.images.update_one(
        {"id": image_id, "is_deleted": False},
        {"$set": {"custom_name": data.custom_name, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image renamed", "custom_name": data.custom_name}

@api_router.put("/admin/hotels/{hotel_id}/images")
async def admin_update_hotel_images(
    hotel_id: str,
    image_ids: List[str],
    admin: dict = Depends(get_current_admin)
):
    """Update hotel images by setting image IDs."""
    # Generate image URLs
    image_urls = [f"/api/images/{img_id}" for img_id in image_ids]
    
    result = await db.hotels.update_one(
        {"id": hotel_id},
        {"$set": {"images": image_urls, "image_ids": image_ids}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Update images to associate with hotel
    for img_id in image_ids:
        await db.images.update_one(
            {"id": img_id},
            {"$set": {"hotel_id": hotel_id}}
        )
    
    return {"message": "Hotel images updated", "images": image_urls}

@api_router.post("/admin/seed-inventory")
async def seed_inventory(admin: dict = Depends(get_current_admin)):
    """Seed initial inventory data for all hotels based on contracted room counts."""
    
    # Define inventory by hotel name pattern
    inventory_config = {
        "niu Ridge": {
            "inventory_type": "fixed",
            "inventory": {"single": 0, "double": 0, "twin": 0}  # Nur französische Betten
        },
        "B&B": {
            "inventory_type": "fixed",
            "inventory": {"single": 10, "double": 5, "twin": 5}  # 10 EZ, 5 DZ, 5 Twin
        },
        "Ankerhof": {
            "inventory_type": "fixed",
            "inventory": {"single": 10, "double": 3, "twin": 2}  # 10 EZ, 3 DZ, 2 Twin
        },
        "Dorint": {
            "inventory_type": "pool",
            "inventory": {"standard_pool": 20, "comfort_pool": 20, "single": 0, "double": 0, "twin": 0}
        },
        "Hey": {
            "inventory_type": "fixed",
            "inventory": {"single": 10, "double": 10, "twin": 0}  # 10 EZ, 10 DZ
        },
        "Rotes Ross": {
            "inventory_type": "fixed",
            "inventory": {"single": 0, "double": 0, "twin": 0}  # Nicht im Kontingent
        }
    }
    
    updated = []
    hotels = await db.hotels.find({}, {"_id": 0}).to_list(100)
    
    for hotel in hotels:
        hotel_name = hotel.get("name", "")
        config = None
        
        # Match hotel by name pattern
        for pattern, cfg in inventory_config.items():
            if pattern.lower() in hotel_name.lower():
                config = cfg
                break
        
        if config:
            await db.hotels.update_one(
                {"id": hotel["id"]},
                {"$set": {
                    "inventory": config["inventory"],
                    "inventory_type": config["inventory_type"]
                }}
            )
            updated.append({
                "hotel": hotel_name,
                "inventory_type": config["inventory_type"],
                "inventory": config["inventory"]
            })
            logger.info(f"Updated inventory for {hotel_name}: {config}")
    
    return {"message": "Inventory seeded successfully", "updated": updated}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

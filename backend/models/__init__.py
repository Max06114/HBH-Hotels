"""
Pydantic Models for HBH Hotel Booking API
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid


class Hotel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_en: str
    description: str
    description_en: str
    stars: int = 4
    address: str
    distance_to_venue: str
    distance_to_venue_en: str
    amenities: List[str] = []
    amenities_en: List[str] = []
    images: List[str] = []
    image_ids: List[str] = []
    single_price: float
    double_price: float
    twin_price: Optional[float] = None
    # Comfort room prices (optional - for hotels with multiple categories)
    single_comfort_price: Optional[float] = None
    double_comfort_price: Optional[float] = None
    twin_comfort_price: Optional[float] = None
    has_comfort_rooms: bool = False
    breakfast_included: bool = True
    tax_included: bool = True
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HotelCreate(BaseModel):
    name: str
    name_en: str
    description: str
    description_en: str
    stars: int = 4
    address: str
    distance_to_venue: str
    distance_to_venue_en: str
    amenities: List[str] = []
    amenities_en: List[str] = []
    images: List[str] = []
    single_price: float
    double_price: float
    twin_price: Optional[float] = None
    breakfast_included: bool = True
    tax_included: bool = True
    active: bool = True


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_number: str = Field(default_factory=lambda: f"HBH-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}")
    hotel_id: str
    hotel_name: str
    salutation: str
    first_name: str
    last_name: str
    email: EmailStr
    street: str
    postal_code: str
    city: str
    country: str
    room_type: str  # single, double, twin
    check_in: str
    check_out: str
    nights: int
    price_per_night: float
    total_price: float
    deposit_amount: float  # 25%
    remaining_amount: float  # 75%
    payment_status: str = "pending"  # pending, deposit_paid, fully_paid, refunded, cancelled
    payment_method: Optional[str] = None  # stripe, paypal
    stripe_session_id: Optional[str] = None
    paypal_order_id: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None
    language: str = "de"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BookingCreate(BaseModel):
    hotel_id: str
    salutation: str
    first_name: str
    last_name: str
    email: EmailStr
    street: str
    postal_code: str
    city: str
    country: str
    room_type: str
    check_in: str
    check_out: str
    notes: Optional[str] = None
    language: str = "de"


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    session_id: str
    payment_method: str
    amount: float
    currency: str = "EUR"
    status: str = "initiated"
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminCreate(BaseModel):
    email: EmailStr
    password: str


class PayPalCaptureRequest(BaseModel):
    order_id: str


class ImageUploadResponse(BaseModel):
    id: str
    hotel_id: str
    url: str
    original_filename: str


class ImageRenameRequest(BaseModel):
    custom_name: str


class PayPalOrderRequest(BaseModel):
    hotel_id: str
    salutation: str
    first_name: str
    last_name: str
    email: str
    street: str
    postal_code: str
    city: str
    country: str
    room_type: str
    check_in: str
    check_out: str
    notes: str = ""
    payment_method: str = "paypal"

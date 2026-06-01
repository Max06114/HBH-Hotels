# Happy Birthday Händel - Hotel Booking Platform

## Original Problem Statement
Hotel booking platform for the "Happy Birthday Händel" festival in Halle, Germany.

## Core Requirements
- Automatic invoicing (PDF generation and download) with email dispatch via Strato SMTP
- Payment integration with PayPal (25% deposit at booking, 75% remaining 6 weeks before arrival)
- Admin dashboard to manage hotel details, view bookings/payment statuses, and handle cancellations/refunds
- Interactive map showing specific venues and hotels
- Automated/Manual payment reminders with payment links
- **Room Inventory Management (Lagerhaltung)** - Track available rooms per hotel
- DE/EN language availability

## User Personas
- **Festival Attendees**: Book hotels for the Händel festival
- **Admin (Travel Events)**: Manage hotels, bookings, payments, inventory, and images

## What's Been Implemented

### Phase 1 - Core Platform (DONE)
- [x] FastAPI backend with MongoDB
- [x] React frontend with Shadcn UI
- [x] User booking flow
- [x] Hotel listing with multi-image gallery
- [x] PayPal payment integration (LIVE CREDENTIALS)
- [x] PDF invoice generation (ReportLab)
- [x] SMTP email sending (Strato)
- [x] DE/EN language support
- [x] German price formatting (comma as decimal separator)

### Phase 2 - Admin Dashboard (DONE)
- [x] Admin login/authentication
- [x] Booking management with cancellation
- [x] Hotel management (CRUD)
- [x] Payment overview
- [x] CSV export of bookings

### Phase 3 - Map & Images (DONE)
- [x] Interactive Leaflet map with custom icons
- [x] Correct GPS coordinates for venues/hotels
- [x] Static images via GitHub repository

### Phase 4 - Restzahlung (Remaining Balance) System (DONE)
- [x] Payment reminder emails with PayPal links
- [x] Invoice download link in reminder emails
- [x] Admin can send individual reminders via "Senden" button
- [x] PayPal Order for remaining balance
- [x] ConfirmationPage handles payment_type=remaining
- [x] Booking status updates to "fully_paid" after remaining payment
- [x] **Automated Scheduler**: Weekly cron job (Monday 9:00 UTC) for reminders
- [x] **Arrival Reminder**: 1 week before arrival email with hotel address
- [x] **Admin Scheduler Page**: Manual trigger, status display, job history

### Phase 5 - Email Templates & Code Quality (DONE)
- [x] **Professional Email Templates**: Unified bilingual (DE/EN) HTML email design
- [x] **Booking Confirmation Email**: Full booking details, deposit paid, remaining info
- [x] **Remaining Payment Confirmation**: Automatic email after 75% payment
- [x] **Payment Reminder Email**: PayPal links, invoice download
- [x] **Arrival Reminder Email**: Hotel address and check-in info
- [x] **Cancellation Email**: Refund details with policy explanation
- [x] **Email Service Module**: `/app/backend/services/__init__.py` with reusable templates

### Phase 6 - Lagerhaltung / Room Inventory Management (DONE - June 1, 2026)
- [x] **Inventory Data Model**: `RoomInventory` with fixed and pool-based types
- [x] **Two Inventory Types**:
  - **Fixed**: Dedicated room types (EZ, DZ, Twin) - for B&B, Ankerhof
  - **Pool**: Flexible room usage (Standard Pool, Comfort Pool) - for Dorint
- [x] **Availability Check**: Backend validates room availability before booking
- [x] **Inventory Decrement**: Reduces inventory on successful payment (deposit)
- [x] **Inventory Restore**: Increases inventory on booking cancellation
- [x] **Admin Inventory Dashboard**: New tab "Lagerhaltung" in AdminDashboard
  - View all hotels with available/booked/total room counts
  - Edit inventory values inline
  - "Inventar initialisieren" button to seed default values
- [x] **BookingPage Availability Display**:
  - Shows "(X verfügbar)" when ≤3 rooms available (orange)
  - Shows "(ausgebucht)" when 0 rooms available (red, disabled)
- [x] **Initial Inventory Data**:
  - B&B Hotel: 10 EZ, 5 DZ, 5 Twin (fixed)
  - Ankerhof: 10 EZ, 3 DZ, 2 Twin (fixed)
  - Dorint: 20 Standard Pool, 20 Comfort Pool (flexible)

## Current Architecture

```
/app/
├── backend/
│   ├── server.py              # Main API (FastAPI, MongoDB, PayPal, Email, PDF, Inventory)
│   ├── models/__init__.py     # Pydantic models incl. RoomInventory, InventoryUpdate
│   ├── services/__init__.py   # Email templates
│   ├── scheduler/             # APScheduler for reminders
│   └── .env                   
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HotelCard.js
│   │   │   ├── HotelMap.js
│   │   │   ├── Header.js
│   │   │   └── Footer.js
│   │   ├── pages/
│   │   │   ├── HomePage.js
│   │   │   ├── BookingPage.js        # Now shows availability
│   │   │   ├── AdminDashboard.js     # New: InventoryManagement component
│   │   │   ├── AdminLoginPage.js
│   │   │   └── ConfirmationPage.js
│   │   └── context/
│   │       ├── LanguageContext.js
│   │       └── AuthContext.js
```

## Key Database Schema
- `hotels`: {id, name, stars, price, description, coordinates, images, **inventory**, **inventory_type**}
- `bookings`: {id, hotel_id, user_email, dates, total_price, deposit_amount, remaining_amount, payment_status, **inventory_decremented**, reminder_sent, arrival_reminder_sent}
- `admins`: {id, email, password_hash}
- `payment_transactions`: {id, booking_id, amount, status, payment_type}

## Key API Endpoints
- `GET /api/hotels` - List active hotels
- `GET /api/hotels/{id}/availability` - Get room availability for a hotel
- `POST /api/bookings` - Create booking (validates availability)
- `GET /api/bookings/{booking_id}/invoice` - Download invoice PDF
- `POST /api/payments/paypal/create-order` - Create PayPal order for deposit
- `POST /api/payments/paypal/capture-order` - Capture payment (decrements inventory)
- `POST /api/bookings/{id}/cancel` - Cancel booking (restores inventory)
- `GET /api/admin/inventory` - Get all hotels inventory overview
- `PUT /api/admin/inventory/{hotel_id}` - Update hotel inventory
- `POST /api/admin/seed-inventory` - Initialize inventory with default values
- `GET /api/admin/bookings/export` - CSV export

## Deployment
- **Frontend**: Vercel (hbh-hotels.travel-events.de)
- **Backend**: Railway
- **Database**: MongoDB Atlas
- **Note**: Stripe was removed; PayPal handles all payments including credit cards

## 3rd Party Integrations
- **PayPal** (Payments) - LIVE CREDENTIALS active
- **Strato SMTP** - for emails

## Prioritized Backlog

### P0 - Completed
- [x] Room Inventory Management (Lagerhaltung)

### P1 - Medium Priority
- [ ] Further AdminDashboard.js component splitting (if needed)

### P2 - Low Priority
- [ ] Additional admin analytics/charts
- [ ] Further BookingPage.js refactoring

## Changelog
- **2026-06-01**: Implemented Room Inventory Management (Lagerhaltung)
  - Added inventory tracking for all hotels
  - B&B Hotel: 10 EZ, 5 DZ, 5 Twin (fixed)
  - Ankerhof: 10 EZ, 3 DZ, 2 Twin (fixed)
  - Dorint: 20 Standard Pool + 20 Comfort Pool (flexible usage)
  - BookingPage shows availability status (X verfügbar / ausgebucht)
  - Admin can view and edit inventory in new "Lagerhaltung" tab
  - Inventory auto-decrements on payment, restores on cancellation
- **2025-12-19**: Fixed HotelCard description text truncation
- **2025-12-18**: E2E payment flow tested successfully
- **2025-12-18**: PDF invoice redesigned to DIN A4 layout

## Credentials (Test)
- Admin: info@travel-events.de / admin123

# Happy Birthday Händel - Hotel Booking Platform

## Original Problem Statement
Hotel booking platform for the "Happy Birthday Händel" festival in Halle, Germany.

## Core Requirements
- Automatic invoicing (PDF generation and download) with email dispatch via Strato SMTP
- Payment integration with Stripe and PayPal (25% deposit at booking, 75% remaining 6 weeks before arrival)
- Admin dashboard to manage hotel details, view bookings/payment statuses, and handle cancellations/refunds
- Interactive map showing specific venues and hotels
- Automated/Manual payment reminders with payment links (Stripe + PayPal)
- Image Manager in the admin dashboard with drag-and-drop sorting
- DE/EN language availability

## User Personas
- **Festival Attendees**: Book hotels for the Händel festival
- **Admin (Travel Events)**: Manage hotels, bookings, payments, and images

## What's Been Implemented

### Phase 1 - Core Platform (DONE)
- [x] FastAPI backend with MongoDB
- [x] React frontend with Shadcn UI
- [x] User booking flow
- [x] Hotel listing with multi-image gallery
- [x] Stripe payment integration (LIVE KEY)
- [x] PayPal payment integration (LIVE CREDENTIALS)
- [x] PDF invoice generation (ReportLab)
- [x] SMTP email sending (Strato)
- [x] DE/EN language support
- [x] German price formatting (comma as decimal separator)

### Phase 2 - Admin Dashboard (DONE)
- [x] Admin login/authentication
- [x] Booking management with cancellation
- [x] Automated Stripe refunds based on cancellation policy
- [x] Hotel management (CRUD)
- [x] Payment overview
- [x] CSV export of bookings

### Phase 3 - Map & Images (DONE - April 2026)
- [x] Interactive Leaflet map with custom icons
- [x] Correct GPS coordinates for venues/hotels
- [x] Image Manager with Emergent Object Storage
- [x] Drag & Drop image sorting (@dnd-kit)
- [x] Image renaming functionality

### Phase 4 - Restzahlung (Remaining Balance) System (DONE - April 29, 2026)
- [x] Payment reminder emails with Stripe + PayPal links
- [x] Invoice download link in reminder emails
- [x] Admin can send individual reminders via "Senden" button
- [x] Stripe Checkout Session for remaining balance
- [x] PayPal Order for remaining balance
- [x] ConfirmationPage handles payment_type=remaining
- [x] Booking status updates to "fully_paid" after remaining payment
- [x] **Automated Scheduler**: Weekly cron job (Monday 9:00 UTC) for reminders
- [x] **Admin Scheduler Page**: Manual trigger, status display, job history

### Phase 5 - Email Templates & Code Quality (DONE - April 29, 2026)
- [x] **Professional Email Templates**: Unified bilingual (DE/EN) HTML email design
- [x] **Booking Confirmation Email**: Full booking details, deposit paid, remaining info
- [x] **Remaining Payment Confirmation**: Automatic email after 75% payment
- [x] **Payment Reminder Email**: Stripe/PayPal links, invoice download
- [x] **Cancellation Email**: Refund details with policy explanation
- [x] **Code Review Fixes**: sessionStorage, useCallback hooks, array keys
- [x] **Email Service Module**: `/app/backend/services/__init__.py` with reusable templates

### Phase 6 - Code Refactoring (DONE - April 29, 2026)
- [x] **Backend Models Module**: `/app/backend/models/__init__.py` (170 lines)
- [x] **Backend Services Module**: `/app/backend/services/__init__.py` (368 lines)
- [x] **server.py reduced**: From ~2200 to ~1854 lines
- [x] **HotelMap.js optimized**: From 189 to 155 lines (useMemo, constants extraction)
- [x] **Admin utils created**: `/app/frontend/src/components/admin/utils.js`

## Current Architecture

```
/app/
├── backend/
│   ├── server.py              # Main API (FastAPI, MongoDB, Stripe, Email, PDF)
│   ├── requirements.txt
│   └── .env                   
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HotelCard.js   # Hotel gallery with sorted images
│   │   │   ├── HotelMap.js    # Leaflet map
│   │   │   ├── Header.js
│   │   │   └── Footer.js
│   │   ├── pages/
│   │   │   ├── HomePage.js
│   │   │   ├── BookingPage.js
│   │   │   ├── AdminDashboard.js  # Image Manager, Reminders, CSV Export
│   │   │   ├── AdminLoginPage.js
│   │   │   └── ConfirmationPage.js  # Handles deposit + remaining payments
│   │   └── context/
│   │       ├── LanguageContext.js
│   │       └── AuthContext.js
```

## Key Database Schema
- `hotels`: {id, name, stars, price, description, coordinates, image_ids, room_prices}
- `bookings`: {id, hotel_id, user_email, dates, total_price, deposit_amount, remaining_amount, payment_status, stripe_remaining_session_id, paypal_remaining_order_id, reminder_sent}
- `images`: {id, hotel_id, object_storage_key, original_filename, custom_name}
- `admins`: {id, email, password_hash}
- `payment_transactions`: {id, booking_id, session_id, amount, status, payment_type}

## Key API Endpoints
- `GET /api/hotels` - List hotels with images in sorted order
- `POST /api/bookings` - Create booking
- `GET /api/bookings/{booking_id}/invoice` - Download invoice PDF
- `POST /api/payments/stripe/create-session` - Create Stripe checkout for deposit
- `POST /api/payments/paypal/create-order` - Create PayPal order for deposit
- `POST /api/admin/bookings/{id}/send-reminder` - Send payment reminder with payment links
- `GET /api/admin/pending-reminders` - List bookings needing reminders
- `GET /api/admin/bookings/export` - CSV export

## 3rd Party Integrations
- **Stripe** (Payments) - LIVE KEY active
- **PayPal** (Payments) - LIVE CREDENTIALS active
- **Emergent Object Storage** - for image uploads
- **Strato SMTP** - for emails

## Prioritized Backlog

### P1 - High Priority (COMPLETED)
- [x] Restzahlung payment links in reminder emails
- [x] Invoice download link in reminder emails
- [x] Stripe + PayPal handling for remaining balance
- [x] Automated weekly scheduler for payment reminders
- [x] Professional bilingual email templates
- [x] Backend/Frontend code refactoring

### P2 - Medium Priority
- [ ] End-to-End testing of full payment flow (deposit → reminder → remaining payment)
- [ ] Further AdminDashboard.js component splitting (if needed)

### P3 - Low Priority
- [ ] Additional admin analytics/charts
- [ ] Further BookingPage.js refactoring

## Credentials (Test)
- Admin: info@travel-events.de / admin123
- SMTP: smtp.strato.de / info@travel-events.de / 1685MvA:-)

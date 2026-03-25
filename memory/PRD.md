# Happy Birthday Händel - Hotel Booking System

## Original Problem Statement
Hotel booking website for "Happy Birthday Händel" choir festival similar to travel-events.de but with automatic invoicing and payment functionality.

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Payments**: Stripe (PayPal prepared but needs credentials)
- **Email**: SMTP via Strato (info@travel-events.de)
- **PDF**: ReportLab for invoice generation

## User Personas
1. **Choir Singers**: Book hotels for HBH 2026 festival (DE/EN)
2. **Admin (Travel Events)**: Manage hotels, bookings, payments, reminders

## Core Requirements
- [x] Hotel listings with images, descriptions, prices
- [x] Booking form with guest details, room type, dates
- [x] Stripe payment integration (25% deposit)
- [x] PDF invoice generation (download + email)
- [x] Admin dashboard with stats
- [x] Hotel management (CRUD)
- [x] Booking management with payment status
- [x] Cancellation functionality
- [x] Bilingual support (DE/EN)
- [x] Payment reminders (6 weeks before arrival)
- [x] High-quality hotel images

## What's Been Implemented (Jan 2026)
### Phase 1 (Initial)
- Full hotel booking flow with 4 partner hotels
- Stripe checkout for deposit payments
- PDF invoice auto-generation
- Email notifications via SMTP
- Admin panel with login, dashboard, hotels, bookings, payments
- Language switcher (German/English)

### Phase 2 (Update)
- Payment reminder system for bookings 6 weeks before check-in
- Admin page for managing/sending reminders
- Updated hotel images from quality sources
- Proper hotel addresses added

## API Endpoints
### Public
- GET /api/hotels - List active hotels
- POST /api/bookings - Create booking
- POST /api/payments/stripe/create-session - Initiate payment
- GET /api/bookings/{id}/invoice - Download invoice

### Admin
- POST /api/admin/login - Admin authentication
- GET/POST/PUT/DELETE /api/admin/hotels - Hotel CRUD
- GET /api/admin/bookings - List all bookings
- POST /api/bookings/{id}/cancel - Cancel booking
- GET /api/admin/pending-reminders - Get bookings needing reminders
- POST /api/admin/send-reminders - Send payment reminder emails

## Admin Credentials
- Email: info@travel-events.de
- Password: admin123

## Hotels
1. 4* Hotel the niu Ridge - 109€/131€ (Single/Double)
2. 4* Hotel Rotes Ross - 113€/133€
3. 4* Hotel Ankerhof - 128€/175€
4. 4* Dorint Hotel Charlottenhof - 155€/196€

## Prioritized Backlog
### P0 (Done)
- Core booking flow ✓
- Payment integration ✓
- Invoice generation ✓
- Payment reminders ✓

### P1 (Next)
- PayPal integration (needs PAYPAL_CLIENT_ID and PAYPAL_SECRET)
- Automated cron job for reminders (currently manual trigger)

### P2 (Future)
- Booking modification feature
- Multiple room booking
- Waiting list functionality
- Export bookings to Excel

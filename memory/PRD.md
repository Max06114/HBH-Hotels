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
2. **Admin (Travel Events)**: Manage hotels, bookings, payments

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

## What's Been Implemented (Jan 2026)
- Full hotel booking flow with 4 partner hotels
- Stripe checkout for deposit payments
- PDF invoice auto-generation
- Email notifications via SMTP
- Admin panel with login, dashboard, hotels, bookings, payments
- Language switcher (German/English)
- Responsive design with Playfair Display + Manrope fonts

## API Endpoints
- GET /api/hotels - List active hotels
- POST /api/bookings - Create booking
- POST /api/payments/stripe/create-session - Initiate payment
- GET /api/bookings/{id}/invoice - Download invoice
- POST /api/admin/login - Admin authentication
- GET/POST/PUT/DELETE /api/admin/hotels - Hotel CRUD
- GET /api/admin/bookings - List all bookings
- POST /api/bookings/{id}/cancel - Cancel booking

## Admin Credentials
- Email: info@travel-events.de
- Password: admin123

## Prioritized Backlog
### P0 (Done)
- Core booking flow ✓
- Payment integration ✓
- Invoice generation ✓

### P1 (Next)
- PayPal integration (needs PAYPAL_CLIENT_ID and PAYPAL_SECRET)
- Remaining payment reminder emails (6 weeks before)
- Email templates customization

### P2 (Future)
- Booking modification feature
- Multiple room booking
- Waiting list functionality
- Export bookings to Excel

# Happy Birthday Händel - Hotel Booking Platform

## Original Problem Statement
Hotel booking platform for the "Happy Birthday Händel" festival in Halle, Germany.

## Core Requirements
- Automatic invoicing (PDF generation and download) with email dispatch via Strato SMTP
- Payment integration with Stripe and PayPal
- Admin dashboard to manage hotel details, view bookings/payment statuses, and handle cancellations/refunds
- Interactive map showing specific venues and hotels
- Automated payment reminders sent 6 weeks before arrival
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
- [x] Stripe payment integration
- [x] PDF invoice generation (ReportLab)
- [x] SMTP email sending (Strato)
- [x] DE/EN language support

### Phase 2 - Admin Dashboard (DONE)
- [x] Admin login/authentication
- [x] Booking management with cancellation
- [x] Hotel management (CRUD)
- [x] Payment overview
- [x] Payment reminders system

### Phase 3 - Map & Images (DONE - April 2026)
- [x] Interactive Leaflet map with custom icons
- [x] Correct GPS coordinates for venues/hotels
- [x] Image Manager with Emergent Object Storage
- [x] Drag & Drop image sorting (@dnd-kit)
- [x] First sorted image = main exterior view

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
│   │   │   ├── AdminDashboard.js  # Image Manager with DnD sorting
│   │   │   ├── AdminLoginPage.js
│   │   │   └── ConfirmationPage.js
│   │   └── context/
│   │       ├── LanguageContext.js
│   │       └── AuthContext.js
```

## Key Database Schema
- `hotels`: {id, name, stars, price, description, coordinates, images (URLs), image_ids (ordered IDs)}
- `bookings`: {id, hotel_id, user_email, dates, total_price, status, payment_intent_id}
- `images`: {id, hotel_id, object_storage_key, original_filename}
- `admins`: {id, email, password_hash}
- `payment_transactions`: {id, booking_id, session_id, amount, status}

## Key API Endpoints
- `GET /api/hotels` - List hotels with images in sorted order
- `PUT /api/admin/hotels/{id}/images` - Update hotel images with new order
- `GET /api/admin/images?hotel_id=x` - Get images for hotel in saved order
- `POST /api/bookings` - Create booking
- `POST /api/payments/stripe/create-session` - Create Stripe checkout

## 3rd Party Integrations
- **Stripe** (Payments) - via emergentintegrations
- **PayPal** (Payments) - @paypal/react-paypal-js
- **Emergent Object Storage** - for image uploads
- **Strato SMTP** - for emails

## Prioritized Backlog

### P1 - High Priority
- [ ] PayPal integration End-to-End verification
- [ ] Cancellation/refund flow testing (Stripe/PayPal)

### P2 - Medium Priority
- [ ] Automated payment reminders (cron job)
- [ ] Email template improvements

### P3 - Low Priority
- [ ] Server.py refactoring (split into modules)
- [ ] Additional admin analytics

## Credentials (Test)
- Admin: info@travel-events.de / admin123
- SMTP: smtp.strato.de / info@travel-events.de / 1685MvA:-)

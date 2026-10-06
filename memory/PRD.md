# Happy Birthday Händel - Hotel Booking Platform

## Original Problem Statement
Hotel booking platform for the "Happy Birthday Händel" festival in Halle, Germany.

## Core Requirements
- Automatic invoicing (PDF generation and download) with email dispatch via Strato SMTP
- Payment integration with PayPal (25% deposit at booking, 75% remaining 6 weeks before arrival)
- Admin dashboard to manage hotel details, view bookings/payment statuses, and handle cancellations/refunds
- Interactive map showing specific venues and hotels (incl. Niu Ridge)
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

### Phase 7 - Code Refactoring (DONE - June 1, 2026)
- [x] **AdminDashboard.js Split**: From ~1,550 lines to ~70 lines
- [x] Created separate admin components in `/app/frontend/src/components/admin/`:
  - Sidebar.js, DashboardOverview.js, BookingsManagement.js
  - HotelsManagement.js, InventoryManagement.js, PaymentsManagement.js
  - RemindersManagement.js, SchedulerManagement.js, ImageManager.js
- [x] Index.js for clean exports
- [x] Niu Ridge Hotel coordinates corrected (next to Dorint)

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
- [x] AdminDashboard.js Refactoring (Components split)
- [x] Niu Ridge Hotel map coordinates
- [x] BookingPage.js Refactoring (from 537 to 347 lines)
- [x] Admin Analytics/Charts Dashboard

### P1 - Future Enhancements
- [ ] Advanced analytics with time-series charts
- [ ] Email template editor in Admin
- [ ] Multi-language admin dashboard

## Changelog
- **2026-06 (Fork)**: Abgebrochene Zahlungen + E-Mail-Protokoll
  - Neuer Status `abandoned` ("Abgebrochen"): Pending-Buchungen > 24h werden stündlich (und beim Start) automatisch markiert (`mark_abandoned_bookings`, APScheduler IntervalTrigger). Manuell: `POST /api/admin/bookings/mark-abandoned`
  - CSV-Export enthält nur noch bezahlte Buchungen (deposit_paid / fully_paid)
  - `send_email()` protokolliert jede E-Mail in `email_logs` (to, subject, email_type, booking_number, status sent/failed, error)
  - Neuer Admin-Tab "E-Mail-Protokoll" (`/admin/email-logs`, `GET /api/admin/email-logs`) mit Suche
  - Button "Bestätigung erneut senden" in Buchungsliste (`POST /api/admin/bookings/{id}/resend-confirmation`, nur für bezahlte Buchungen)
  - Doppelter `/admin/scheduler/status`-Endpoint zusammengeführt (liefert `running`, `scheduler_running`, `jobs`, `recent_runs`)
  - Hinweis: Die 4 Pending-Einträge von Mairéad Mullaney im Live-System werden nach Deployment automatisch auf "Abgebrochen" gesetzt (Job läuft beim Start)
- **2026-06 (Fork)**: Buchungssuche (Name/E-Mail/Buchungsnummer) + Statusfilter in der Admin-Buchungsliste (clientseitig, `BookingsManagement.js`)
- **2026-06 (Fork)**: E-Mail-Zuverlässigkeit & Selbstservice
  - BCC an ADMIN_EMAIL (info@travel-events.de) bei allen Bestätigungen (Buchung, erneut gesendet, Restzahlung) – `send_email(bcc_admin=True)`, im Protokoll als BCC sichtbar
  - Admin-Warnmail (`admin_alert`) bei fehlgeschlagener Zustellung an Gäste (`notify_admin_email_failure`, keine Rekursion)
  - Hotel-Filter in der Admin-Buchungsliste
  - Öffentliche Rechnungsseite `/invoice/:bookingId` (`InvoicePage.js`), Link in Bestätigungs- und Erinnerungs-E-Mail (`get_invoice_link()` nutzt FRONTEND_URL). Ersetzt den fehlerhaften `{FRONTEND_URL}/api/...`-Link in der Zahlungserinnerung
  - Bekannte Lücke (Alt): Im Admin gespeicherte E-Mail-Vorlagen (`email_templates`) werden beim Versand noch nicht verwendet
- **2026-06 (Fork)**: Zahlungs-Reporting & PayPal-Fixes (Anlass: Gast Nancy Farrell, 5 abgebrochene Versuche ohne erkennbaren Grund)
  - `payment_events`-Collection + `last_payment_event` auf der Buchung (`log_payment_event`): booking_created, order_created, order_failed, cancelled, paypal_error, capture_failed, capture_completed (mit PayPal-Code/-Meldung/debug_id)
  - Neuer öffentlicher Endpoint `POST /api/payments/paypal/event` (nur cancelled / paypal_error) – Frontend meldet Abbruch/Fehler im PayPal-Fenster
  - create-order / capture-order: PayPal-Fehler werden erkannt (kein KeyError/500 mehr), verständliche Fehlermeldung an den Gast; capture-order ist idempotent (bereits bezahlte Order → COMPLETED)
  - Bugfix: Weiterleitung nach Zahlung auf `/booking/confirmation?method=paypal&booking_id=` (vorher `/confirmation` = leere Seite)
  - Admin-Buchungsliste zeigt unter „Ausstehend“/„Abgebrochen“ den letzten Grund (`getPaymentEventLabel`, PayPal-Issue-Codes übersetzt)
  - Admin-Warnmail `payment_failure_alert` bei ≥2 fehlgeschlagenen Versuchen eines Gastes in 24h (einmalig pro 24h)
  - Kleiner Fix: Übersetzungsschlüssel `remainingBalance` → `remaining` in BookingSummary
- **2026-06 (Fork)**: E-Mail-Versand über Resend (Ursache gefunden: Railway blockiert SMTP-Ports auf Hobby-Plan → seit Umzug keine E-Mail zugestellt)
  - `send_email()` nutzt Resend HTTP-API (`https://api.resend.com/emails`, Attachments base64, bcc, reply_to) wenn `RESEND_API_KEY` gesetzt ist, sonst Fallback SMTP (Timeout 30s)
  - Neue Env-Variablen (Railway): `RESEND_API_KEY`, `EMAIL_FROM` (info@travel-events.de, Domain muss bei Resend verifiziert sein), `EMAIL_FROM_NAME` (Travel Events)
  - Bestätigungs-E-Mails im PayPal-Capture-Flow laufen als Background-Task (Gast wartet nicht auf Versand)
  - Admin E-Mail-Protokoll: Provider-Anzeige, Button „Test-E-Mail senden“ (`POST /api/admin/email-logs/test`), Button „Erneut senden“ bei fehlgeschlagenen Bestätigungen (nutzt resend-confirmation)
  - Betroffene Gäste ohne Bestätigung (aus Live-Protokoll): cooneylk@gmail.com, w.ryan@dsm.ie u. a. → nach Resend-Setup über Protokoll nachsenden
- **2026-06 (Fork)**: Resend LIVE verifiziert (testing_agent iteration_5: 100 %). Gastdaten editierbar: `PATCH /api/admin/bookings/{id}` (BookingGuestUpdate: salutation, first_name, last_name, email(EmailStr), street, postal_code, city, country, notes; schreibt `edit_history`), Stift-Button + `BookingEditDialog.js` in der Buchungsliste.
  - Live-URLs: Backend https://hbh-hotels-production.up.railway.app (Region EU West), Frontend https://hbh-hotels.vercel.app
  - ERLEDIGT 2026-09-29 live: inisdom@icloud.com korrigiert; HBH-20260927-578BCA → Nancy Farrell (durch Nutzer); Bestätigungen an alle 32 bezahlten Buchungen via Resend nachgesendet (32/32 sent, iteration_6 verifiziert). Railway-Auto-Deploy hatte nach Regionswechsel nicht ausgelöst → manuelles Redeploy nötig.
  - Gastname-Anzeige robust gemacht (Whitespace-Normalisierung in BookingsManagement/RemindersManagement); Konkatenation ohne Leerzeichen war live nicht reproduzierbar
- **2026-06 (Fork)**: Zahlung per Überweisung (Anlass: Gast Seamus Cahalan, Kreditkarte via PayPal abgelehnt). testing_agent iteration_7: 100 %.
  - Status `transfer_pending` („Überweisung offen“, Zimmer sofort reserviert/Inventar reduziert, `transfer_due_date` +7 Tage) und `expired` („Abgelaufen“, Inventar freigegeben)
  - Public: `GET /api/payments/bank-details`, `POST /api/bookings/bank-transfer` (PayPalOrderRequest-Body, jetzt mit `language`), Seite `/booking/transfer/:bookingId` (`BankTransferPage.js`, Bankdaten mit Kopier-Buttons, Rechnungsdownload)
  - Admin: `POST /admin/bookings/{id}/convert-to-transfer {send_email}` (pending/abandoned/expired → transfer_pending), `POST /admin/bookings/{id}/transfer-received {payment_type: deposit|remaining, amount}` (→ deposit_paid + Bestätigung/Rechnung bzw. fully_paid + Bestätigung; payment_transactions mit payment_method bank_transfer). UI: `TransferActionDialog.js`, Buttons Landmark/BadgeCheck in Buchungsliste, Statusfilter erweitert
  - Scheduler `process_bank_transfers` (alle 6h): Erinnerung nach 5 Tagen (einmalig, `transfer_reminder_sent_at`), Freigabe nach 10 Tagen (E-Mail `transfer_expired`, BCC Admin)
  - Zahlungserinnerung Restzahlung enthält jetzt zusätzlich Bankverbindung (`bank_details_html`); Bankdaten zentral in `BANK_DETAILS` (N26, auch PDF-Fußzeile); optional Env `BANK_ACCOUNT_HOLDER`
  - BookingPage: Umschalter PayPal/Kreditkarte ↔ Überweisung (`payment-method-switch`); PayPal create-order übernimmt `language` aus Request
  - Hinweis Nutzer: Seamus soll KEINE E-Mail bekommen → Umwandeln mit Haken „E-Mail senden“ aus (falls gewünscht)
- **2026-06 (Fork)**: Zustell-Status, E-Mail-Vorlagen aktiv, Dashboard-Kachel (testing_agent iteration_8: 100 %)
  - Resend-Webhook `POST /api/webhooks/resend` (Svix-Signatur via Env `RESEND_WEBHOOK_SECRET`, ohne Secret ungeprüft) → `email_logs.delivery_status` (sent/delayed/delivered/opened/bounced/complained/failed) + `bounce_reason`; `provider_message_id` wird beim Senden gespeichert. Admin E-Mail-Protokoll: Spalte „Zustellung“. NUTZER MUSS: Resend → Webhooks → Add Endpoint `https://hbh-hotels-production.up.railway.app/api/webhooks/resend` (Events email.*), Signing Secret als `RESEND_WEBHOOK_SECRET` in Railway
  - Admin-Vorlagen (`email_templates`, hotel-spezifisch > default) werden verwendet: `build_confirmation_email` (Bestätigung, 4 Callsites), `send_payment_reminder_with_link` (Zahlungserinnerung, PayPal-Button + Bankdaten + Rechnungslink werden angehängt), `build_arrival_reminder_email`. Rendering `render_custom_template` (Platzhalter, Absätze, unbekannte Platzhalter bleiben stehen)
  - NEU: Anreise-Erinnerung lief bisher NIE (scheduler/reminder_scheduler.py war toter Code) → Job `send_arrival_reminders` täglich 08:00 UTC, 7 Tage vor Check-in, einmalig (`arrival_reminder_sent`)
  - `GET /api/admin/transfers/open` + Dashboard-Kachel „Offene Überweisungen“ (Fälligkeit, überfällig rot)
- **2026-06 (Fork)**: Ausgebucht-Automatik + Zimmer-Spalte (selbst getestet per curl/Screenshot)
  - `sync_hotel_sold_out_state()` nach decrement/increment_inventory und Admin-Inventar-Update: alle Kategorien 0 → `active=false, auto_deactivated=true` + Admin-Mail `hotel_sold_out`; wieder frei → automatische Reaktivierung + Mail `hotel_reactivated` (nur wenn auto_deactivated). Manuelles Aktivieren (PUT /admin/hotels/{id}) setzt auto_deactivated zurück. Hotel-Model: `auto_deactivated`. HotelsManagement-Badge „Ausgebucht – automatisch deaktiviert“
  - Buchungsliste: Spalte „Zimmer“ (EZ/DZ/TWIN/… Komfort, `getRoomTypeShort`), Suche matcht Kürzel
  - LIVE-HINWEIS: „4* Hotel the niu Ridge“ ist aktiv, hat aber Kontingent 0 in allen Kategorien → aktuell nicht buchbar (Nutzer informiert)
- **2026-06 (Fork)**: Airport-Transfer Stufe 1 – Bedarfserhebung (selbst getestet per curl + Screenshots; kein testing_agent)
  - Collections `transfer_contacts` (token, source booking|import|public, booking_id, invited_at/reminded_at/responded_at) und `transfer_responses` (Flugdaten, persons, companions, interest outbound|return|both|none); Settings `db.settings{key:"transfer"}` (deadline, price 55, status survey|offer|closed, intro EN)
  - Public: `GET /api/transfer/settings`, `GET /api/transfer/form/{token}`, `POST /api/transfer/respond`; Seite `/transfer` und `/transfer/:token` (`TransferPage.js`, Englisch), Header-Link „Airport Transfer“
  - Admin `/admin/transfer` (`TransferManagement.js`): Zähler (Kontakte, Eingeladen, Antworten, Personen per Flug, Interesse Hin/Rück), Einstellungen, „Hotelbuchungen übernehmen“ (`POST /admin/transfer/sync-bookings`), Import Name/E-Mail (`/import`), „Umfrage senden“ + „Erinnerung“ (`/send-survey`, E-Mail-Typ transfer_survey), CSV (`/export`), Tabelle mit Filtern
  - Bestätigungs-E-Mail enthält Transfer-Block mit persönlichem Link, solange Status „survey“ (`transfer_confirmation_block`, Contact wird beim Versand angelegt)
- **2026-06 (Fork 2)**: **Umbuchung „Aufenthalt ändern"** (Admin → Buchungen, Kalender-Icon bei Anzahlung/Vollständig bezahlt): `GET /admin/bookings/{id}/stay-preview?check_in&check_out` (Live-Vorschau) und `POST /admin/bookings/{id}/change-stay` {check_in, check_out, send_email}. Logik `_stay_change_calc`: Nächte × Hotelpreis, bereits Gezahltes bleibt (`deposit_amount` = gezahlt), Rest = neu − gezahlt; voll bezahlt → zurück auf deposit_paid bei Differenz; Rest ≤ 0 → fully_paid + `refund_due`. Setzt `invoice_corrected_at` (PDF: „Korrigierte Fassung vom …", Labels „Bereits bezahlt/Restbetrag" wenn kein 25/75-Split), `edit_history` (type stay_change), Payment-Event `stay_changed`, Reminder-Flags zurückgesetzt. E-Mail `generate_stay_change_email` (Typ `stay_change`, DE/EN, alte→neue Daten, Zahlhinweis „6 Wochen vorher" / Guthaben) mit PDF, Häkchen im Dialog `StayChangeDialog.js` (Standard an). Nur Syntax-Check + Unit-Test der Berechnung/Template.
- **2026-06 (Fork 2)**: Admin-Buchungen: Status-Filter als Häkchen-Pills (Mehrfachauswahl, Zähler je Status); Standard: Anzahlung/Vollständig/Überweisung offen/Ausstehend AN, Abgelaufen/Abgebrochen/Storniert/Erstattet AUS. `PUT /admin/bookings/{id}/status` → beim Wechsel auf `fully_paid` wird `fully_paid_at` gesetzt, Payment-Event geloggt und die Restzahlungs-Bestätigung (`remaining_confirmation`) automatisch versendet (vorher nur über PayPal-Capture und „Restzahlung erhalten"-Button). Nur Syntax-Check.
- **2026-06 (Fork 2)**: Anrede „Mrs" ergänzt (Buchungsformular, Bearbeiten-Dialog). Neue Helper `SALUTATION_LABELS`/`greeting_name()` in `services/__init__.py`: Anrede wird jetzt sprachabhängig ausgegeben (Herr→Mr, Frau→Ms, Mrs→Frau/Mrs; „Divers" → voller Name ohne Titel statt wörtlich „Divers"). Angewendet in allen E-Mail-Templates, Template-Platzhalter `{salutation}`, Rechnungs-PDF. Legacy-Reminder-Text 2026→2027. Nur Syntax-Check + Unit-Test der Helper.
- **2026-06 (Fork 2)**: Buchungs-Bearbeiten-Dialog: Feld „Sprache der E-Mails" (de/en) → `PATCH /admin/bookings/{id}` akzeptiert `language`; steuert Sprache von Restzahlungs-/Erinnerungs-Mails. Nur Syntax-Check.
- **2026-06 (Fork 2)**: Transfer-Einträge löschbar – `DELETE /api/admin/transfer/contacts/{id}` (löscht Kontakt + `transfer_responses`), Papierkorb-Button pro Zeile in `TransferManagement.js` mit Bestätigungsdialog. Nur Syntax-Check.
- **2026-06 (Fork 2)**: Transfer-Formular vereinfacht – Frage „Are you travelling by plane?" + Feld „Airport" entfernt (redundant; `arrives_by_plane=true`/`airport=BER` werden weiter still mitgesendet). Preis-Default 55 → **58 €**, neues Setting `min_persons` (Default 6, Admin-Feld „Mindestpersonen pro Transfer"), Hinweis „minimum 6 persons" in Formular, Umfrage-E-Mail und Bestätigungs-Block. „This is not a booking yet." überall **fett**. Nur Syntax-Check (py_compile/babel) – Umgebung ohne .env/Services; Live-Test nach Deploy durch User. Hinweis: falls in der Live-DB bereits ein `settings{key:"transfer"}`-Dokument mit price 55 existiert, Preis im Admin-Tab auf 58 setzen.

  - OFFEN Stufe 2: Fahrten anlegen, Angebot/Bahn-Empfehlung senden, Buchung 55 €×Personen×Strecken (PayPal/Überweisung), Ticket-PDF, Buslisten, Diskrepanz Interesse vs. Buchung
- **2026-06-01**: AdminDashboard.js Refactoring completed
  - Split into 9 separate components in `/components/admin/`
  - Main file reduced from ~1,550 to ~70 lines
  - All admin functionality preserved
- **2026-06-01**: Niu Ridge Hotel coordinates corrected (neben Dorint)
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

# Projekt-Briefing: Buchungssystem Monteurswohnung Bad Bevensen

> Ausgangsbasis: Dieses Repo (HBH-Hotels) wird als Kopie in ein neues Emergent-Projekt importiert und umgebaut.
> Stack bleibt: React + FastAPI + MongoDB, Deployment Vercel (Frontend) + Railway (Backend) + MongoDB Atlas.
> Sprache der Kommunikation mit dem Nutzer: **Deutsch**.

## 1. Was übernommen wird (aus HBH-Hotels)
- Admin-Login (JWT), Admin-Dashboard-Struktur (`components/admin/*`, Sidebar, Routen)
- Buchungsflow + PayPal-Integration (`/payments/paypal/*`)
- Rechnungs-PDF (ReportLab), E-Mail-Versand (aiosmtplib / Strato SMTP) mit E-Mail-Protokoll (`email_logs`)
- Öffentliche Rechnungsseite `/invoice/:bookingId`
- Status-Logik inkl. `abandoned` (Pending > 24h), Stornierung, CSV-Export
- APScheduler für Hintergrundjobs
- DE/EN-Sprachkontext (kann auf DE reduziert werden)

## 2. Was entfernt / vereinfacht wird
- Mehrere Hotels → **ein Objekt** (Monteurswohnung, Bad Bevensen, 3 Zimmer). Hotel-Verwaltung, Hotel-Sortierung, Karte mit Festival-Venues, Intro-Text „Happy Birthday Händel“ entfallen bzw. werden zu einer Objekt-Seite.
- Anzahlung 25 % / Restzahlung 6 Wochen → **100 % bei Buchung** (PayPal) **oder Zahlung auf Rechnung/Überweisung** (Firmen). Zahlungserinnerungs-Scheduler wird zu „Rechnung offen“-Mahnung umgebaut.
- Datumsbeschränkung auf Festivalzeitraum entfällt → ganzjährig buchbar.

## 3. Objekt & Preislogik
- 1 Wohnung, 3 Zimmer (Zimmer 1–3, jeweils Bettenzahl konfigurierbar), Gemeinschaftsküche/Bad.
- **Buchbar: einzelne Zimmer ODER die ganze Wohnung.**
  - Zimmerbuchung: Preis pro Zimmer/Nacht (ggf. Aufschlag 2. Person).
  - Ganze Wohnung: Pauschalpreis/Nacht (blockiert alle 3 Zimmer).
  - Ist die ganze Wohnung gebucht → keine Einzelzimmer buchbar und umgekehrt (Einzelzimmer belegt → Wohnung nicht buchbar).
- Preise, Mindestaufenthalt, Endreinigung, ggf. Staffelpreise (ab 7 / ab 30 Nächte) im Admin editierbar.
- Verfügbarkeit = Buchungen (bezahlt/bestätigt/Rechnung offen) + externe iCal-Sperren + manuelle Sperren.

## 4. Anfragen per E-Mail → Angebot → Buchungslink
Quellen: Kontaktformular der Seite, kleinanzeigen.de, monteurzimmer.de, mein-monteurzimmer.de (kommen als E-Mail ins Postfach).

- **IMAP-Poller** (Scheduler, alle 5 Min.) liest ein dediziertes Postfach (z. B. `anfragen@…`, Strato IMAP). Zugangsdaten: `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD` in `.env`.
- Jede neue Mail → **KI-Extraktion** (Emergent LLM Key, via `integration_expert` einbinden): Anreise, Abreise, Personenzahl, gewünschte Zimmer/ganze Wohnung, Name, Firma, Telefon, Antwort-E-Mail (Portale nutzen oft Relay-Adressen – die Antwortadresse aus dem Mailtext/Reply-To ziehen), Quelle (Portal), Freitext. Ergebnis mit Confidence-Score.
- Anfrage landet als **Inquiry** im Admin („Anfragen“-Tab) mit Status `new` → `offered` → `booked` / `declined` / `expired`.
- **Angebot**: System prüft Verfügbarkeit und berechnet Preis, erzeugt Angebots-E-Mail mit **Buchungslink** `https://<domain>/buchen?offer=<token>` (Zeitraum, Zimmer, Preis vorbefüllt, Angebot z. B. 72 h gültig / Option ohne Reservierung).
  - Standard: **Freigabe im Admin** (ein Klick „Angebot senden“, Text/Preis editierbar). Optional Schalter „Angebote automatisch senden“ für Anfragen mit hoher Confidence und freier Verfügbarkeit.
  - Nicht auslesbare Mails (z. B. Rückfragen, Spam) → Admin mit Hinweis „manuell prüfen“.
- Buchungslink führt zur verbindlichen Buchung: Gastdaten + Firma/Rechnungsadresse, Zahlungsart PayPal (sofort) oder Rechnung (Admin bestätigt, Buchung blockiert Kalender sofort, Status `invoice_open` bis Zahlungseingang, Mahnung nach X Tagen).

## 5. Kalender-Sync Airbnb & Booking.com (iCal, beide Richtungen)
- **Import**: Admin hinterlegt beliebig viele iCal-URLs (Airbnb, Booking.com, ggf. weitere) je Zimmer oder für die ganze Wohnung. Scheduler holt alle 15–30 Min., speichert Events als `external_blocks` (Quelle, UID, Zeitraum) und blockiert damit Verfügbarkeit.
- **Export**: Öffentlicher, tokenisierter Feed `GET /api/ical/<token>.ics` (ein Feed pro Zimmer + einer für „ganze Wohnung“), der alle eigenen Buchungen + Sperren als VEVENT liefert. Diese URLs trägt der Nutzer bei Airbnb/Booking ein.
- Hinweis an Nutzer: Portale aktualisieren externe Kalender meist nur alle 1–3 Stunden → Restrisiko Doppelbuchung; im Admin Konflikt-Warnung anzeigen, wenn Import-Event mit eigener Buchung überlappt.
- Manuelle Sperren im Admin-Kalender (Monatsansicht, Zimmerzeilen).

## 6. Kurtaxe / Nachweise (Bad Bevensen)
- Berufliche Gäste (Monteure) sind kurtaxebefreit → **Nachweis-Upload** pro Buchung (Arbeitgeberbescheinigung/Entsendungsnachweis, PDF/JPG/PNG).
  - Upload im Buchungsflow (optional) und nachträglich über einen Link in der Bestätigungs-E-Mail (`/nachweis/<booking-token>`).
  - Speicherung: **Emergent Object Storage** (Playbook via `integration_expert`), nicht Base64 in Mongo. Chunked Upload.
  - Admin: Status „Nachweis fehlt / eingereicht / geprüft“, Erinnerungs-Mail an Gast wenn fehlend.
- Gäste ohne Nachweis: Kurtaxe pro Person/Nacht (Satz im Admin konfigurierbar) auf Rechnung ausweisen.
- **Monatsmeldung an Kurverwaltung**: Scheduler am 1. jeden Monats erzeugt PDF-Liste (Gast, Zeitraum, Personen, befreit ja/nein, Nachweis-Nr.) + Anhänge (Nachweise als ZIP oder Einzel-PDFs) und sendet per E-Mail an konfigurierbare Adresse der Kurverwaltung; Kopie an Admin; Eintrag im E-Mail-Protokoll. Vorab im Admin einsehbar/„jetzt senden“.
  - Offen: Format-Anforderungen der Kurverwaltung Bad Bevensen klären (Formular? Excel? Portal?) – bis dahin PDF + CSV.

## 7. Admin-Bereich (Tabs)
Dashboard · Kalender (Belegung, Sperren, Konflikte) · Anfragen (Inbox, Angebot senden) · Buchungen (Suche/Filter, Rechnung, Nachweis-Status, Zahlung auf Rechnung bestätigen) · Zahlungen · Objekt & Preise · iCal-Sync (Import-URLs, Export-Links, letzter Abruf) · Kurtaxe (Nachweise, Monatsmeldung) · E-Mail-Vorlagen (Angebot, Bestätigung, Rechnung offen, Nachweis fehlt) · E-Mail-Protokoll · Automatisierung.

## 8. Integrationen / Zugangsdaten, die der Nutzer bereitstellen muss
- PayPal Client ID + Secret (Live)
- Strato SMTP (Versand) **und** IMAP (Anfragen-Postfach) – Host, Port, User, Passwort
- iCal-Export-URLs von Airbnb und Booking.com (aus deren Extranet/Kalender-Einstellungen)
- E-Mail-Adresse der Kurverwaltung Bad Bevensen, Kurtaxe-Satz
- Emergent LLM Key (für KI-Auslesen der Anfragen – vorhanden, keine Aktion nötig)
- Emergent Object Storage (für Nachweise – Playbook via integration_expert)
- Neue MongoDB-Atlas-Datenbank, Vercel- und Railway-Projekt, ggf. Domain

## 9. Empfohlene Reihenfolge (Phasen)
1. Repo importieren, Multi-Hotel → Ein-Objekt-Modell mit 3 Zimmern + „ganze Wohnung“, Preise, Verfügbarkeit, Buchungsflow, PayPal 100 % + Zahlung auf Rechnung, Rechnung/Bestätigung. (Kern, testbar)
2. iCal-Export-Feed + iCal-Import mit Sperren + Admin-Kalender.
3. IMAP-Poller + KI-Extraktion + Anfragen-Inbox + Angebots-Mail mit Buchungslink (mit Freigabe).
4. Kurtaxe: Nachweis-Upload (Object Storage), Statusverfolgung, Monatsmeldung.
5. Feinschliff: Auto-Angebote, Mahnungen, Design/Branding für Bad Bevensen, SEO (hier gewünscht, anders als bei HBH!).

## 10. Erster Prompt für das neue Projekt (kopierbar)
„Baue aus diesem importierten Repo (HBH-Hotels) ein Buchungssystem für eine einzelne Monteurswohnung in Bad Bevensen mit 3 Zimmern um. Lies zuerst /app/memory/MONTEURWOHNUNG_BRIEF.md – dort stehen alle Anforderungen und die Phasenplanung. Starte mit Phase 1. Antworte auf Deutsch.“

# Deployment-Anleitung: Vercel + Railway + MongoDB Atlas

## Ubersicht

| Komponente | Anbieter | Kosten |
|------------|----------|--------|
| Frontend (React) | Vercel | Kostenlos |
| Backend (FastAPI) | Railway | ~5 EUR/Monat |
| Datenbank (MongoDB) | MongoDB Atlas | Kostenlos (512MB) |

**Gesamtzeit: ~30-45 Minuten**

---

## Schritt 1: MongoDB Atlas einrichten (Datenbank)

### 1.1 Account erstellen
1. Gehe zu: https://www.mongodb.com/atlas
2. Klicke auf **"Try Free"**
3. Registriere dich (Google-Login geht auch)

### 1.2 Cluster erstellen
1. Wahle **"M0 FREE"** (kostenlos, 512MB)
2. Provider: **AWS**
3. Region: **Frankfurt (eu-central-1)** - am nachsten zu Deutschland
4. Cluster Name: `haendel-hotel` (oder beliebig)
5. Klicke **"Create Cluster"**

### 1.3 Datenbank-Benutzer anlegen
1. Gehe zu **"Database Access"** (linkes Menu)
2. Klicke **"Add New Database User"**
3. Authentication: **Password**
4. Username: `haendel_admin`
5. Password: Ein sicheres Passwort (NOTIEREN!)
6. Klicke **"Add User"**

### 1.4 Netzwerk-Zugriff erlauben
1. Gehe zu **"Network Access"** (linkes Menu)
2. Klicke **"Add IP Address"**
3. Klicke **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Klicke **"Confirm"**

### 1.5 Connection String holen
1. Gehe zu **"Database"** (linkes Menu)
2. Klicke **"Connect"** bei deinem Cluster
3. Wahle **"Connect your application"**
4. Kopiere den Connection String:
   ```
   mongodb+srv://haendel_admin:<password>@haendel-hotel.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Ersetze `<password>` mit deinem echten Passwort
6. Fuge am Ende den Datenbanknamen hinzu: `haendel_db`

**Dein fertiger Connection String:**
```
mongodb+srv://haendel_admin:DEIN_PASSWORT@haendel-hotel.xxxxx.mongodb.net/haendel_db?retryWrites=true&w=majority
```

---

## Schritt 2: Railway einrichten (Backend)

### 2.1 Account erstellen
1. Gehe zu: https://railway.app
2. Klicke **"Login"** -> **"GitHub"**
3. Mit GitHub anmelden

### 2.2 Neues Projekt erstellen
1. Klicke **"New Project"**
2. Wahle **"Deploy from GitHub repo"**
3. Wahle dein Repository (z.B. `haendel-hotel-booking`)
4. **WICHTIG:** Wahle nur den `/backend` Ordner:
   - Klicke auf **"Add Root Directory"**
   - Gib ein: `backend`

### 2.3 Environment Variables setzen
1. Klicke auf dein Projekt
2. Gehe zu **"Variables"**
3. Fuge folgende Variablen hinzu:

| Variable | Wert |
|----------|------|
| `MONGO_URL` | `mongodb+srv://haendel_admin:PASSWORT@...` (dein Atlas String) |
| `DB_NAME` | `haendel_db` |
| `JWT_SECRET` | `dein-geheimer-schluessel-min-32-zeichen` |
| `SMTP_HOST` | `smtp.strato.de` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `info@travel-events.de` |
| `SMTP_PASSWORD` | `1685MvA:-)` |
| `SENDER_EMAIL` | `info@travel-events.de` |
| `STRIPE_SECRET_KEY` | `sk_live_...` (dein Stripe Key) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (dein Webhook Secret) |
| `PAYPAL_CLIENT_ID` | `deine PayPal Client ID` |
| `PAYPAL_CLIENT_SECRET` | `dein PayPal Secret` |
| `PAYPAL_MODE` | `live` |
| `EMERGENT_API_KEY` | `dein Emergent Key` (fur Object Storage) |
| `FRONTEND_URL` | `https://deine-domain.vercel.app` (spater anpassen!) |

### 2.4 Build-Einstellungen
Railway erkennt FastAPI automatisch. Falls nicht:
1. Gehe zu **"Settings"**
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### 2.5 Deploy starten
1. Klicke **"Deploy"**
2. Warte bis der Build fertig ist (2-3 Minuten)
3. Kopiere deine Railway-URL: `https://dein-projekt.up.railway.app`

### 2.6 Backend testen
Offne im Browser:
```
https://dein-projekt.up.railway.app/api/health
```
Sollte `{"status": "healthy"}` zeigen.

---

## Schritt 3: Vercel einrichten (Frontend)

### 3.1 Account erstellen
1. Gehe zu: https://vercel.com
2. Klicke **"Sign Up"** -> **"Continue with GitHub"**

### 3.2 Projekt importieren
1. Klicke **"Add New..."** -> **"Project"**
2. Wahle dein Repository
3. **WICHTIG:** Root Directory andern:
   - Klicke **"Edit"** bei Root Directory
   - Gib ein: `frontend`

### 3.3 Environment Variables setzen
Unter **"Environment Variables"** hinzufugen:

| Variable | Wert |
|----------|------|
| `REACT_APP_BACKEND_URL` | `https://dein-projekt.up.railway.app` (deine Railway URL!) |

### 3.4 Deploy starten
1. Klicke **"Deploy"**
2. Warte bis fertig (1-2 Minuten)
3. Deine App ist live unter: `https://dein-projekt.vercel.app`

---

## Schritt 4: Alles verbinden

### 4.1 Frontend-URL in Railway aktualisieren
1. Gehe zuruck zu Railway
2. Variables -> `FRONTEND_URL` andern auf deine Vercel-URL
3. Redeploy klicken

### 4.2 Stripe Webhook aktualisieren
1. Gehe zu: https://dashboard.stripe.com/webhooks
2. Erstelle neuen Webhook oder bearbeite existierenden
3. Endpoint URL: `https://dein-projekt.up.railway.app/api/payments/webhook`
4. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### 4.3 PayPal Return URLs (optional)
Falls notig, in PayPal Developer Dashboard die Return URLs anpassen.

---

## Schritt 5: Eigene Domain verbinden (Optional)

### 5.1 Domain bei Vercel
1. In Vercel: **Settings** -> **Domains**
2. Domain eingeben (z.B. `booking.travel-events.de`)
3. Vercel zeigt dir DNS-Einstellungen

### 5.2 DNS bei Strato anpassen
1. Gehe zu Strato Kundenlogin
2. Domains -> DNS-Verwaltung
3. Fuge hinzu:
   - Typ: **CNAME**
   - Name: `booking` (oder `@` fur Hauptdomain)
   - Ziel: `cname.vercel-dns.com`

### 5.3 SSL
Vercel erstellt automatisch ein SSL-Zertifikat - du musst nichts tun!

---

## Schritt 6: Daten migrieren

### 6.1 Hotels exportieren (von Emergent MongoDB)
Die Hotel-Daten musst du von der Emergent-Datenbank zu MongoDB Atlas kopieren.

**Option A: Manuell uber MongoDB Compass**
1. Lade MongoDB Compass herunter: https://www.mongodb.com/products/compass
2. Verbinde mit Emergent MongoDB (URL aus backend/.env)
3. Exportiere die Collections: `hotels`, `images`
4. Verbinde mit MongoDB Atlas
5. Importiere die Collections

**Option B: Ich kann dir die Daten als JSON exportieren**
Sag Bescheid, dann erstelle ich Export-Dateien.

---

## Checkliste vor Go-Live

- [ ] MongoDB Atlas Cluster erstellt
- [ ] Railway Backend deployed und lauft
- [ ] Vercel Frontend deployed und lauft
- [ ] REACT_APP_BACKEND_URL zeigt auf Railway
- [ ] FRONTEND_URL in Railway zeigt auf Vercel
- [ ] Stripe Webhook URL aktualisiert
- [ ] Hotels/Images in MongoDB Atlas importiert
- [ ] Domain verbunden (optional)
- [ ] Test-Buchung durchgefuhrt

---

## Troubleshooting

### Backend startet nicht
- Prufe Railway Logs (Deploy -> View Logs)
- Haufig: MONGO_URL falsch oder Passwort mit Sonderzeichen

### Frontend zeigt "Network Error"
- REACT_APP_BACKEND_URL prufen
- Muss mit `https://` beginnen
- Kein `/` am Ende

### Stripe Payments funktionieren nicht
- Webhook URL korrekt?
- Webhook Secret in Railway Variables?
- Stripe Events richtig ausgewahlt?

### MongoDB Verbindung fehlgeschlagen
- IP Whitelist in Atlas prufen (0.0.0.0/0)
- Passwort keine Sonderzeichen wie `@`, `#`, `%`?
- Connection String korrekt formatiert?

---

## Kosten-Ubersicht

| Service | Free Tier | Bezahlt |
|---------|-----------|---------|
| Vercel | 100GB Bandwidth/Monat | - |
| Railway | 500 Stunden/Monat, $5 Credit | ~$5/Monat |
| MongoDB Atlas | 512MB Storage | - |

**Fur eine kleine Hotel-Booking-Seite reicht das Free Tier wahrscheinlich aus!**

---

## Support

Bei Fragen:
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://www.mongodb.com/docs/atlas

Oder frag mich hier in Emergent!

# Test Credentials (HBH-Hotels)

## Admin (Live-System, Login unter /admin/login)
- E-Mail: info@travel-events.de
- Passwort: admin123 (Initialpasswort – der Nutzer ändert es über Admin → Sidebar → „Passwort ändern"; danach gilt das neue Passwort, das hier NICHT gespeichert wird)

## Endpoints
- POST /api/admin/login {email, password} → {token}
- POST /api/admin/change-password {current_password, new_password} (Bearer) – Regeln: min. 10 Zeichen, Buchstaben + Ziffern

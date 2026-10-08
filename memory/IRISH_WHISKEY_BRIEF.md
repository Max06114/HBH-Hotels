# BRIEF: Irland Whiskey-Reise – Buchungsseite (Fork von HBH-Hotels)

> Für den Agenten im **geforkten Projekt**: Dieses Repo ist eine Kopie der HBH-Hotels-Buchungsmaschine.
> Ziel: daraus die Buchungsseite für EIN Reisepaket machen. Sprache NUR Deutsch. Antworte dem Nutzer auf Deutsch.
> Original-Projekt (HBH-Hotels) NICHT verändern – das läuft separat auf Vercel/Railway weiter.

## Produkt
**IRLAND WHISKEY, NATUR & KULTUR ENTDECKUNGSREISE** – 8 Tage / 7 Nächte, max. 20 Personen,
mit Mareike Spitzer (Irish-Whiskeys.de) und Reiseleitung Max von Arnim (Travel Events).
Volltext (Tagesprogramm, Inklusivleistungen) steht in `Homepage Text.docx` des Nutzers – Inhalt unten übernommen.

### Preise
- 2.600 € pro Person im Doppelzimmer (DZ) – Twin-Zimmer gleicher Preis p. P. (zu bestätigen)
- Einzelzimmer: 2.600 € + 700 € EZ-Zuschlag = 3.300 €
- Kontingent: 20 Teilnehmer gesamt (Inventar in Personen, nicht in Zimmern)

### Zahlungsbedingungen (vom Nutzer zu bestätigen – Default wie HBH)
- Anzahlung 25 % bei Buchung (PayPal oder Überweisung), Rest 6 Wochen vor Reisebeginn
- Automatische Zahlungserinnerung mit Zahlungslink, Rechnung als PDF, Stornoregeln analog HBH oder Reise-spezifisch (klären!)

### Was bleibt gleich (laut Nutzer)
- E-Mail-Versand über Resend (Absender/Adresse info@travel-events.de), BCC an Admin
- Bankverbindung (BANK_DETAILS) und PayPal-Konto von Travel Events
- Admin-Dashboard (Buchungen, Zahlungen, E-Mail-Protokoll, Umbuchung, Gastdaten bearbeiten)

## Umbau-Aufgaben (Reihenfolge)
1. **Datenmodell vereinfachen**: statt mehrerer Hotels EIN Reisepaket (`trip`) mit festen Terminen (Reisebeginn/-ende),
   Zimmerarten `single | double | twin`, Preis p. P., EZ-Zuschlag, Kapazität 20 Personen.
   Buchung = Teilnehmer (1 Person EZ, 2 Personen DZ/Twin → Namen beider Mitreisenden erfassen).
2. **Buchungsstrecke**: keine Datumswahl (feste Reise), Auswahl Zimmerart + Anzahl Personen, Gastdaten, Zahlungsart (PayPal 25 % / Überweisung).
3. **Sprache**: nur Deutsch – EN-Pfade/LanguageSwitcher entfernen, `language` fest "de".
4. **Entfernen**: Airport-Transfer-Modul (Stufe 1 Survey), Hotel-Inventar-Logik pro Hotel, EN-Templates.
5. **Landingpage** (siehe unten): Hero mit Logo-Banner, Einleitung, Tagesprogramm mit je einem Bild pro Tag,
   Abschnitt „Die Destillerien" mit Foto + Kurzbeschreibung, Inklusivleistungen, Preis & Buchen-Button.
6. **Design**: Farbwelt von irish-whiskeys.de – Akzent **Grün #74CF6C** (rgb 116,207,108), Text **#1D1D1D**,
   weißer/heller Hintergrund, dazu whiskey-warme Töne (Bernstein/Dunkelbraun) als Sekundärfarbe. Logo-Datei des Nutzers:
   `Logo_IrishWhiskeys_Banner_1200px.png` (1064×400) → Nutzer bitten, die Datei hochzuladen.
7. **Rechnung/E-Mails**: Texte auf „Reise" statt „Hotelbuchung" umstellen (Reisebeginn statt Anreise, Teilnehmer statt Zimmer),
   Anrede-Logik (`greeting_name`) beibehalten.

## Entscheidungen des Nutzers (bestätigt, nicht erneut fragen)
- **Reisetermin: 18. Mai 2027 (Tag 1) – 25. Mai 2027 (Tag 8)**, 7 Nächte
- **Zahlung: 25 % Anzahlung bei Buchung, Rest 6 Wochen vor Reisebeginn** (= fällig 6. April 2027), PayPal oder Überweisung – Logik aus HBH übernehmen
- **Storno: kostenfrei bis 6 Wochen vor Reisebeginn, danach Staffel 20 / 50 / 80 / 100 %** – Staffelgrenzen vorschlagen
  (z. B. 20 % ab 6 Wochen, 50 % ab 4 Wochen, 80 % ab 2 Wochen, 100 % ab 1 Woche vorher / No-Show) und vom Nutzer bestätigen lassen; Stornologik im Admin entsprechend anpassen
- **Zimmer: DZ und Twin je 2.600 € p. P., EZ 3.300 € (inkl. 700 € Zuschlag)**; Buchung immer mit Namen aller Mitreisenden
- **Zusätzliche Option: „Allein reisend – halbes Doppelzimmer mit Zimmerpartner-Zuteilung" zu 2.600 €** (Admin sieht diese Buchungen gesondert, um Partner zuzuteilen)
- **Bilder: vom Agenten generieren/auswählen** (Hero Irland/Whiskey, 1 Bild pro Reisetag, Destillerien-Porträts; keine echten Markenlogos der Destillerien erfinden)
- **Deployment: wieder Vercel (Frontend) + Railway (Backend)** – Frontend muss REACT_APP_BACKEND_URL nutzen, Backend `/api`-Prefix, Procfile wie im Original
- Sprache nur Deutsch

## Offene Fragen an den Nutzer (vor dem Bau klären)
- Hotels pro Nacht (Dublin 2, Galway 2, Killarney 2, Dungarvan 1) – Namen für die Seite oder nur „4*-Hotel"?
- Flug nach Dublin ist NICHT inklusive – auf der Seite klar ausweisen (Treffpunkt Dublin, Tag 1 nachmittags)?
- Genaue Prozent-Staffelgrenzen der Stornoregel (siehe oben)

## Inhalt für die Landingpage (aus dem Dokument)
Einleitung: „Herzlich Willkommen bei Irish Whiskeys. Unsere Mission ist es, Ihnen die grüne Insel und deren Spirituosen näher zu bringen…" + Einladungstext (Mareike Spitzer, 8 Tage, Dublin → Connemara → Süden).

Tagesprogramm:
- Tag 1 – Ankunft in Dublin: Begrüßung am Nachmittag, Irish Whiskey Museum, gemeinsames Abendessen.
- Tag 2 – Dublin & Pearse Lyons Distillery: Stadtrundgang (Trinity College, Temple Bar), Pearse Lyons Distillery (800 Jahre alte Kirche), abends geführtes Whiskey-Tasting in Temple Bar.
- Tag 3 – Von Dublin nach Galway: Ahascragh Distillery (modern, nachhaltig), Lunch im Café, weiter nach Galway, Abendbummel.
- Tag 4 – Connemara & Micil Distillery: Killary Harbour (Fjord), Kylemore Abbey, Micil Distillery in Salthill, Poitín-Tasting.
- Tag 5 – Von Galway nach Killarney: Adare, Muckross House & Gardens, Ross Castle, private Führung bei The Liberator mit Maurice O'Connell.
- Tag 6 – Derrynane Bay & Ring of Kerry: Cahergal Ringfort, Waterville, Derrynane Beach, Kenmare (Steinkreis), Ladies View.
- Tag 7 – Cobh & Blackwater Distillery: St. Colman's Cathedral, Titanic Experience, Blackwater Distillery (Führung + Tasting), Check-in Dungarvan.
- Tag 8 – Rückreise: Frühstück, Transfer Flughafen Dublin.

Destillerien (Abschnitt mit Foto): Pearse Lyons Distillery (Dublin), Ahascragh Distillery, Micil Distillery (Galway/Salthill), The Liberator (Killarney, Maurice O'Connell), Blackwater Distillery (Blackwater River). Zusätzlich Irish Whiskey Museum Dublin.

Inklusive: 7 Übernachtungen 4*-Hotels, täglich Frühstück, alle Transfers im Reisebus, alle Destillerie-Besuche inkl. Führungen & Tastings, Eintritte (Irish Whiskey Museum, Kylemore Abbey, Muckross House, Titanic Experience Cobh u. a.), Reiseleitung Max von Arnim, Begleitung Mareike Spitzer, kleine Gruppe max. 20.

Kontakt: info@travel-events.de · www.travel-events.de · Abschluss „Sláinte!"

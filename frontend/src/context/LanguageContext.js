import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  de: {
    // Header
    home: "Startseite",
    hotels: "Hotels",
    booking: "Buchung",
    admin: "Admin",
    language: "Sprache",
    
    // Hero
    heroTitle: "Happy Birthday Händel Hotels 2027",
    heroSubtitle: "Hotelübernachtungen für das Chorfestival in Halle",
    heroDescription: "Jedes Jahr feiern über 450 Sänger aus nah und fern Händels Geburtstag in seiner Heimatstadt Halle mit einer Aufführung des Oratoriums Messiah. Für Gäste von Auswärts bieten wir hierzu Übernachtungsangebote an.",
    viewHotels: "Hotels ansehen",
    
    // Hotels
    hotelsTitle: "Unsere Partner-Hotels",
    hotelsSubtitle: "Mit den folgenden Hotels haben wir die besten Preise ausgehandelt",
    perNight: "pro Nacht",
    singleRoom: "Einzelzimmer",
    doubleRoom: "Doppelzimmer",
    twinRoom: "Zweibettzimmer",
    bookNow: "Jetzt buchen",
    breakfastIncluded: "Frühstück inklusive",
    taxIncluded: "Bettensteuer inklusive",
    
    // Booking Form
    bookingTitle: "Zimmer buchen",
    salutation: "Anrede",
    mr: "Herr",
    mrs: "Frau",
    diverse: "Divers",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail",
    street: "Straße",
    postalCode: "PLZ",
    city: "Ort",
    country: "Land",
    roomType: "Zimmertyp",
    checkIn: "Anreise",
    checkOut: "Abreise",
    notes: "Nachricht",
    notesPlaceholder: "Besondere Wünsche oder Anmerkungen",
    
    // Payment
    paymentTitle: "Zahlung",
    deposit: "Anzahlung (25%)",
    remaining: "Restbetrag (75%)",
    total: "Gesamtbetrag",
    nights: "Nächte",
    payWithStripe: "Mit Kreditkarte bezahlen",
    payWithPayPal: "Mit PayPal bezahlen",
    paymentInfo: "Eine 25% Anzahlung ist für die Reservierung nötig. Der Rest wird 6 Wochen vor Anreise fällig.",
    cancellationPolicy: "Eine kostenfreie Stornierung ist bis zu einer Woche vorher möglich, danach 50% bis einen Tag vorher, wonach 100% Stornogebühren anfallen.",
    
    // Confirmation
    confirmationTitle: "Buchungsbestätigung",
    bookingNumber: "Buchungsnummer",
    paymentSuccess: "Zahlung erfolgreich!",
    downloadInvoice: "Rechnung herunterladen",
    invoiceSent: "Die Rechnung wurde auch an Ihre E-Mail-Adresse gesendet.",
    
    // Admin
    adminLogin: "Admin Login",
    adminDashboard: "Dashboard",
    adminBookings: "Buchungen",
    adminHotels: "Hotels",
    adminPayments: "Zahlungen",
    password: "Passwort",
    login: "Anmelden",
    logout: "Abmelden",
    
    // Status
    pending: "Ausstehend",
    depositPaid: "Anzahlung bezahlt",
    fullyPaid: "Vollständig bezahlt",
    refunded: "Erstattet",
    cancelled: "Storniert",
    
    // General
    loading: "Laden...",
    error: "Fehler",
    success: "Erfolg",
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Löschen",
    edit: "Bearbeiten",
    back: "Zurück",
    submit: "Absenden",
    required: "Pflichtfeld",
  },
  en: {
    // Header
    home: "Home",
    hotels: "Hotels",
    booking: "Booking",
    admin: "Admin",
    language: "Language",
    
    // Hero
    heroTitle: "Happy Birthday Händel Hotels 2027",
    heroSubtitle: "Hotel Accommodations for the Choir Festival in Halle",
    heroDescription: "Every year, over 450 singers from near and far celebrate Händel's birthday in his hometown of Halle with a performance of the oratorio Messiah. For guests from out of town, we offer accommodation options.",
    viewHotels: "View Hotels",
    
    // Hotels
    hotelsTitle: "Our Partner Hotels",
    hotelsSubtitle: "We have negotiated the best prices with the following hotels",
    perNight: "per night",
    singleRoom: "Single Room",
    doubleRoom: "Double Room",
    twinRoom: "Twin Room",
    bookNow: "Book Now",
    breakfastIncluded: "Breakfast included",
    taxIncluded: "City tax included",
    
    // Booking Form
    bookingTitle: "Book a Room",
    salutation: "Title",
    mr: "Mr.",
    mrs: "Ms.",
    diverse: "Mx.",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    street: "Street",
    postalCode: "Postal Code",
    city: "City",
    country: "Country",
    roomType: "Room Type",
    checkIn: "Check-in",
    checkOut: "Check-out",
    notes: "Message",
    notesPlaceholder: "Special requests or notes",
    
    // Payment
    paymentTitle: "Payment",
    deposit: "Deposit (25%)",
    remaining: "Remaining (75%)",
    total: "Total",
    nights: "nights",
    payWithStripe: "Pay with Credit Card",
    payWithPayPal: "With PayPal bezahlen",
    paymentInfo: "A 25% deposit is required for reservation. The remainder is due 6 weeks before arrival.",
    cancellationPolicy: "Free cancellation is possible up to one week before, then 50% up to one day before, after which 100% cancellation fees apply.",
    
    // Confirmation
    confirmationTitle: "Booking Confirmation",
    bookingNumber: "Booking Number",
    paymentSuccess: "Payment Successful!",
    downloadInvoice: "Download Invoice",
    invoiceSent: "The invoice has also been sent to your email address.",
    
    // Admin
    adminLogin: "Admin Login",
    adminDashboard: "Dashboard",
    adminBookings: "Bookings",
    adminHotels: "Hotels",
    adminPayments: "Payments",
    password: "Password",
    login: "Login",
    logout: "Logout",
    
    // Status
    pending: "Pending",
    depositPaid: "Deposit Paid",
    fullyPaid: "Fully Paid",
    refunded: "Refunded",
    cancelled: "Cancelled",
    
    // General
    loading: "Loading...",
    error: "Error",
    success: "Success",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    submit: "Submit",
    required: "Required",
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('hbh_language');
    return saved || 'de';
  });

  useEffect(() => {
    localStorage.setItem('hbh_language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations.de[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'de' ? 'en' : 'de');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;

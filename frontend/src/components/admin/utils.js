/**
 * Shared utilities and helpers for Admin Dashboard
 */

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Format price in German style (comma as decimal separator)
 * @param {number} price - The price to format
 * @returns {string} Formatted price string
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined) return '0,00';
  return price.toFixed(2).replace('.', ',');
};

/**
 * Format date in German locale
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('de-DE');
};

/**
 * Format datetime in German locale
 * @param {string} dateString - ISO datetime string
 * @returns {string} Formatted datetime
 */
export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('de-DE');
};

/**
 * Get payment status badge color
 * @param {string} status - Payment status
 * @returns {string} Tailwind CSS classes
 */
export const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'fully_paid':
      return 'bg-green-100 text-green-800';
    case 'deposit_paid':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'refunded':
      return 'bg-purple-100 text-purple-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'abandoned':
      return 'bg-gray-100 text-gray-600';
    case 'transfer_pending':
      return 'bg-orange-100 text-orange-800';
    case 'expired':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get payment status label
 * @param {string} status - Payment status
 * @param {string} language - Current language (de/en)
 * @returns {string} Translated status label
 */
export const getPaymentStatusLabel = (status, language = 'de') => {
  const labels = {
    de: {
      fully_paid: 'Vollständig bezahlt',
      deposit_paid: 'Anzahlung bezahlt',
      pending: 'Ausstehend',
      refunded: 'Erstattet',
      cancelled: 'Storniert',
      abandoned: 'Abgebrochen',
      transfer_pending: 'Überweisung offen',
      expired: 'Abgelaufen'
    },
    en: {
      fully_paid: 'Fully Paid',
      deposit_paid: 'Deposit Paid',
      pending: 'Pending',
      refunded: 'Refunded',
      cancelled: 'Cancelled',
      abandoned: 'Abandoned',
      transfer_pending: 'Transfer pending',
      expired: 'Expired'
    }
  };
  return labels[language]?.[status] || status;
};

/**
 * Room type labels
 */
export const getRoomTypeLabel = (roomType, language = 'de') => {
  const labels = {
    de: {
      single: 'Einzelzimmer',
      double: 'Doppelzimmer',
      twin: 'Zweibettzimmer',
      single_comfort: 'Einzelzimmer Komfort',
      double_comfort: 'Doppelzimmer Komfort',
      twin_comfort: 'Zweibettzimmer Komfort'
    },
    en: {
      single: 'Single Room',
      double: 'Double Room',
      twin: 'Twin Room',
      single_comfort: 'Single Comfort',
      double_comfort: 'Double Comfort',
      twin_comfort: 'Twin Comfort'
    }
  };
  return labels[language]?.[roomType] || roomType;
};

const PAYPAL_ISSUE_LABELS = {
  INSTRUMENT_DECLINED: { de: 'Zahlungsmittel von PayPal abgelehnt', en: 'Payment method declined by PayPal' },
  PAYER_ACTION_REQUIRED: { de: 'Gast musste bei PayPal zusätzlich bestätigen', en: 'Payer action required at PayPal' },
  ORDER_NOT_APPROVED: { de: 'Zahlung bei PayPal nicht freigegeben', en: 'Order not approved at PayPal' },
  PAYEE_ACCOUNT_RESTRICTED: { de: 'Empfängerkonto (unser PayPal) eingeschränkt', en: 'Payee account restricted' },
  TRANSACTION_REFUSED: { de: 'Transaktion von PayPal verweigert', en: 'Transaction refused by PayPal' },
  COMPLIANCE_VIOLATION: { de: 'PayPal-Compliance-Prüfung (Land/Konto)', en: 'PayPal compliance check (country/account)' },
  ORDER_ALREADY_CAPTURED: { de: 'Bereits bezahlt', en: 'Already captured' },
  UNPROCESSABLE_ENTITY: { de: 'PayPal konnte die Zahlung nicht verarbeiten', en: 'PayPal could not process the payment' },
};

const PAYMENT_EVENT_LABELS = {
  de: {
    booking_created: 'Buchung angelegt, PayPal noch nicht geöffnet',
    order_created: 'PayPal-Fenster geöffnet, keine Zahlung',
    order_failed: 'PayPal-Order fehlgeschlagen',
    cancelled: 'Vom Gast im PayPal-Fenster abgebrochen',
    paypal_error: 'Fehler im PayPal-Fenster',
    capture_failed: 'Zahlung von PayPal abgelehnt',
    capture_completed: 'Zahlung erfolgreich',
    transfer_reserved: 'Reserviert – Überweisung ausstehend',
    transfer_expired: 'Überweisung nicht eingegangen – freigegeben'
  },
  en: {
    booking_created: 'Booking created, PayPal not opened',
    order_created: 'PayPal window opened, no payment',
    order_failed: 'PayPal order failed',
    cancelled: 'Cancelled by guest in PayPal window',
    paypal_error: 'Error in PayPal window',
    capture_failed: 'Payment declined by PayPal',
    capture_completed: 'Payment successful',
    transfer_reserved: 'Reserved – bank transfer pending',
    transfer_expired: 'Transfer not received – released'
  }
};

/**
 * Human-readable summary of the last payment event of a booking
 */
export const getPaymentEventLabel = (lastEvent, language = 'de') => {
  if (!lastEvent) return null;
  const base = PAYMENT_EVENT_LABELS[language]?.[lastEvent.event] || lastEvent.event;
  const code = lastEvent.paypal_error?.code;
  if (!code) return base;
  const issue = PAYPAL_ISSUE_LABELS[code]?.[language] || code;
  return `${base}: ${issue}`;
};

const ROOM_SHORT = {
  single: 'EZ', double: 'DZ', twin: 'TWIN',
  single_comfort: 'EZ Komfort', double_comfort: 'DZ Komfort', twin_comfort: 'TWIN Komfort'
};

export const getRoomTypeShort = (roomType) => ROOM_SHORT[roomType] || roomType || '-';

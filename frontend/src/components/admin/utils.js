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
      cancelled: 'Storniert'
    },
    en: {
      fully_paid: 'Fully Paid',
      deposit_paid: 'Deposit Paid',
      pending: 'Pending',
      refunded: 'Refunded',
      cancelled: 'Cancelled'
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

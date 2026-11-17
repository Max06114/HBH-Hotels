// Short, human-readable description of how a guest used the PayPal popup (for admin diagnostics)
const device = (ua) => {
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android-Handy' : 'Android-Tablet';
  if (/Windows/.test(ua)) return 'Windows-PC';
  if (/Macintosh/.test(ua)) return 'Mac';
  return 'Gerät unbekannt';
};

const browser = (ua) => {
  if (/GMX/i.test(ua)) return 'GMX-App';
  if (/WEB\.?DE/i.test(ua)) return 'WEB.DE-App';
  if (/FBAN|FBAV|Instagram/.test(ua)) return 'Facebook/Instagram-App';
  if (/Outlook/i.test(ua)) return 'Outlook-App';
  if (/GSA\//.test(ua)) return 'Google-App';
  if (/; wv\)/.test(ua) || (/iPhone|iPad/.test(ua) && !/Safari/.test(ua))) return 'App-interner Browser';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome|CriOS/.test(ua)) return 'Chrome';
  if (/Safari/.test(ua)) return 'Safari';
  return 'Browser unbekannt';
};

export const paypalContext = (fundingSource, openedAt, ua = navigator.userAgent || '') => {
  const funding = { card: 'Karte', paypal: 'PayPal-Konto', paylater: 'Später bezahlen', sepa: 'Lastschrift' }[fundingSource] || fundingSource || 'PayPal';
  const secs = openedAt ? `${Math.round((Date.now() - openedAt) / 1000)} s offen` : null;
  return [funding, device(ua), browser(ua), secs].filter(Boolean).join(' · ');
};

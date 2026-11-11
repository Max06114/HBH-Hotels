// Mirrors the backend cancellation policy: >7 days 100 %, 1–7 days 50 %, otherwise 0 %
export const cancellationPreview = (booking) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(`${booking.check_in}T00:00:00`) - today) / 86400000);
  const pct = days > 7 ? 100 : days >= 1 ? 50 : 0;
  const paid = booking.payment_status === 'fully_paid' ? (booking.total_price || 0)
    : booking.payment_status === 'deposit_paid' ? (booking.deposit_amount || 0) : 0;
  return { days, pct, paid, refund: Math.round(paid * pct) / 100 };
};

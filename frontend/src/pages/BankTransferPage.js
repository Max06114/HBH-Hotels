import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Landmark, Loader2, XCircle, Copy, Check, FileText } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '');
const fmtEur = (v, de) => (de ? `${Number(v).toFixed(2).replace('.', ',')} €` : `€${Number(v).toFixed(2)}`);

const CopyRow = ({ label, value, strong, testId }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* clipboard unavailable */ }
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E5E0D5] last:border-0 gap-3">
      <span className="text-sm text-[#4A4A4A] shrink-0">{label}</span>
      <span className={`text-right ${strong ? 'font-semibold' : ''} font-mono text-sm break-all`} data-testid={testId}>{value}</span>
      <button type="button" onClick={copy} className="text-[#6B1D2A] shrink-0" title="Kopieren" data-testid={`${testId}-copy`}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

const BankTransferPage = () => {
  const { bookingId } = useParams();
  const { language } = useLanguage();
  const de = language === 'de';
  const [booking, setBooking] = useState(null);
  const [bank, setBank] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    Promise.all([axios.get(`${API}/bookings/${bookingId}`), axios.get(`${API}/payments/bank-details`)])
      .then(([b, k]) => { setBooking(b.data); setBank(k.data); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [bookingId]);

  const downloadInvoice = async () => {
    try {
      const res = await axios.get(`${API}/bookings/${bookingId}/invoice`, { params: { lang: language }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `Invoice_${booking?.invoice_number || 'HBH'}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(de ? 'Rechnung konnte nicht geladen werden' : 'Invoice could not be loaded');
    }
  };

  const paid = booking && ['deposit_paid', 'fully_paid'].includes(booking.payment_status);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <Card className="border-[#E5E0D5]" data-testid="bank-transfer-page">
          <CardContent className="p-8 md:p-10">
            {status === 'loading' && <Loader2 className="w-10 h-10 animate-spin text-[#6B1D2A] mx-auto" />}
            {status === 'error' && (
              <div className="text-center">
                <XCircle className="w-14 h-14 text-red-600 mx-auto mb-4" />
                <p className="text-[#4A4A4A]" data-testid="bank-transfer-error">
                  {de ? 'Reservierung nicht gefunden.' : 'Reservation not found.'}
                </p>
              </div>
            )}
            {status === 'ready' && (
              <>
                <div className="w-16 h-16 bg-[#F5F2EA] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Landmark className="w-8 h-8 text-[#6B1D2A]" />
                </div>
                <h1 className="font-serif text-3xl text-[#1A1A1A] text-center mb-2">
                  {paid
                    ? (de ? 'Zahlung eingegangen – vielen Dank!' : 'Payment received – thank you!')
                    : (de ? 'Ihr Zimmer ist reserviert' : 'Your room is reserved')}
                </h1>
                <p className="text-center text-[#4A4A4A] mb-8">
                  {paid
                    ? (de ? 'Ihre Buchung ist bestätigt. Die Bestätigung mit Rechnung wurde per E-Mail versendet.' : 'Your booking is confirmed. Confirmation and invoice have been emailed.')
                    : (de
                      ? `Bitte überweisen Sie die Anzahlung bis zum ${fmtDate(booking.transfer_due_date)}. Nach Zahlungseingang erhalten Sie Ihre Buchungsbestätigung mit Rechnung per E-Mail.`
                      : `Please transfer the deposit by ${fmtDate(booking.transfer_due_date)}. Once received you will get your booking confirmation with invoice by email.`)}
                </p>

                <div className="bg-[#F5F2EA] rounded-lg p-5 mb-6 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-[#4A4A4A]">{de ? 'Buchungsnummer' : 'Booking number'}</span><p className="font-mono font-semibold text-[#6B1D2A]" data-testid="transfer-booking-number">{booking.booking_number}</p></div>
                    <div><span className="text-[#4A4A4A]">Hotel</span><p className="font-medium">{booking.hotel_name}</p></div>
                    <div><span className="text-[#4A4A4A]">{de ? 'Anreise' : 'Check-in'}</span><p className="font-medium">{booking.check_in}</p></div>
                    <div><span className="text-[#4A4A4A]">{de ? 'Abreise' : 'Check-out'}</span><p className="font-medium">{booking.check_out}</p></div>
                    <div><span className="text-[#4A4A4A]">{de ? 'Gesamtpreis' : 'Total'}</span><p className="font-medium">{fmtEur(booking.total_price, de)}</p></div>
                    <div><span className="text-[#4A4A4A]">{de ? 'Restbetrag (6 Wochen vor Anreise)' : 'Balance (6 weeks before arrival)'}</span><p className="font-medium">{fmtEur(booking.remaining_amount, de)}</p></div>
                  </div>
                </div>

                {!paid && (
                  <div className="border border-[#6B1D2A]/30 rounded-lg p-5 mb-6" data-testid="bank-details-box">
                    <h2 className="font-semibold text-[#1A1A1A] mb-3">{de ? 'Bankverbindung' : 'Bank details'}</h2>
                    {bank.holder && <CopyRow label={de ? 'Kontoinhaber' : 'Account holder'} value={bank.holder} testId="bank-holder" />}
                    <CopyRow label="Bank" value={bank.bank} testId="bank-name" />
                    <CopyRow label="IBAN" value={bank.iban} strong testId="bank-iban" />
                    <CopyRow label="BIC" value={bank.bic} testId="bank-bic" />
                    <CopyRow label={de ? 'Betrag (Anzahlung 25 %)' : 'Amount (deposit 25%)'} value={fmtEur(booking.deposit_amount, de)} strong testId="bank-amount" />
                    <CopyRow label={de ? 'Verwendungszweck' : 'Reference'} value={booking.booking_number} strong testId="bank-reference" />
                    <p className="text-xs text-[#4A4A4A] mt-3">
                      {de
                        ? 'Bitte unbedingt die Buchungsnummer als Verwendungszweck angeben. Diese Angaben haben wir Ihnen auch per E-Mail geschickt.'
                        : 'Please always state the booking number as payment reference. We have also emailed these details to you.'}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={downloadInvoice} className="border-[#6B1D2A] text-[#6B1D2A] rounded-full" data-testid="transfer-download-invoice">
                    <FileText className="w-4 h-4 mr-2" />{de ? 'Rechnung herunterladen' : 'Download invoice'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default BankTransferPage;

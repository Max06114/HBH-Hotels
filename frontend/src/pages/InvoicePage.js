import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { FileText, Download, Loader2, XCircle, Home } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const InvoicePage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const de = language === 'de';
  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState('loading');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/bookings/${bookingId}`)
      .then((res) => { setBooking(res.data); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [bookingId]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${API}/bookings/${bookingId}/invoice`, {
        params: { lang: language },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${booking?.invoice_number || 'HBH'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setStatus('error');
    } finally {
      setDownloading(false);
    }
  }, [bookingId, booking, language]);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-16 md:py-24">
        <Card className="border-[#E5E0D5]" data-testid="invoice-page">
          <CardContent className="p-8 md:p-12 text-center">
            {status === 'loading' && (
              <Loader2 className="w-10 h-10 animate-spin text-[#6B1D2A] mx-auto" />
            )}
            {status === 'error' && (
              <>
                <XCircle className="w-14 h-14 text-red-600 mx-auto mb-4" />
                <h1 className="font-serif text-2xl text-[#1A1A1A] mb-2">
                  {de ? 'Rechnung nicht gefunden' : 'Invoice not found'}
                </h1>
                <p className="text-[#4A4A4A] mb-6" data-testid="invoice-error">
                  {de
                    ? 'Der Link ist ungültig oder die Buchung existiert nicht mehr. Bitte kontaktieren Sie uns unter info@travel-events.de.'
                    : 'The link is invalid or the booking no longer exists. Please contact us at info@travel-events.de.'}
                </p>
              </>
            )}
            {status === 'ready' && (
              <>
                <div className="w-16 h-16 bg-[#F5F2EA] rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-[#6B1D2A]" />
                </div>
                <h1 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] mb-2">
                  {de ? 'Ihre Rechnung' : 'Your Invoice'}
                </h1>
                <p className="text-[#4A4A4A] mb-1" data-testid="invoice-booking-number">
                  {de ? 'Buchungsnummer' : 'Booking number'}: <span className="font-mono">{booking.booking_number}</span>
                </p>
                <p className="text-sm text-[#4A4A4A] mb-8">
                  {booking.hotel_name} · {booking.check_in} – {booking.check_out}
                </p>
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white rounded-full px-8 py-6 text-base"
                  data-testid="invoice-download-btn"
                >
                  {downloading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                  {de ? 'Rechnung als PDF herunterladen' : 'Download invoice as PDF'}
                </Button>
              </>
            )}
            <div className="mt-8">
              <Button variant="ghost" onClick={() => navigate('/')} className="text-[#4A4A4A]" data-testid="invoice-home-btn">
                <Home className="w-4 h-4 mr-2" />
                {de ? 'Zur Startseite' : 'Back to home'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default InvoicePage;

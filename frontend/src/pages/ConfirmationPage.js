import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CheckCircle, Download, Loader2, XCircle, Home, Mail } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// German price format helper (comma as decimal separator)
const formatPrice = (price) => {
  if (price === null || price === undefined) return '0,00';
  return price.toFixed(2).replace('.', ',');
};

const ConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');
  const paymentType = searchParams.get('payment_type'); // 'deposit' or 'remaining'
  const paymentMethod = searchParams.get('method'); // 'stripe' or 'paypal'

  const [status, setStatus] = useState('loading');
  const [booking, setBooking] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [isRemainingPayment, setIsRemainingPayment] = useState(paymentType === 'remaining');

  const capturePayPalOrder = useCallback(async () => {
    try {
      // Get the booking to find the PayPal order ID
      const bookingResponse = await axios.get(`${API}/bookings/${bookingId}`);
      const bookingData = bookingResponse.data;
      
      // Determine which order ID to use based on payment type
      const orderId = paymentType === 'remaining' 
        ? bookingData.paypal_remaining_order_id 
        : bookingData.paypal_order_id;
      
      if (!orderId) {
        setStatus('error');
        return;
      }
      
      // Capture the PayPal order
      const captureResponse = await axios.post(`${API}/payments/paypal/capture-order`, {
        order_id: orderId
      });
      
      if (captureResponse.data.status === 'COMPLETED') {
        setStatus('success');
        setIsRemainingPayment(captureResponse.data.payment_type === 'remaining');
        // Fetch updated booking details
        const updatedBooking = await axios.get(`${API}/bookings/${bookingId}`);
        setBooking(updatedBooking.data);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error capturing PayPal order:', error);
      setStatus('error');
    }
  }, [bookingId, paymentType]);

  const pollPaymentStatus = useCallback(async () => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (pollCount >= maxAttempts) {
      setStatus('timeout');
      return;
    }

    try {
      const statusResponse = await axios.get(`${API}/payments/stripe/status/${sessionId}`);
      
      if (statusResponse.data.payment_status === 'paid') {
        setStatus('success');
        // Check if this was a remaining payment by looking at metadata
        if (statusResponse.data.metadata?.payment_type === 'remaining') {
          setIsRemainingPayment(true);
        }
        // Fetch booking details
        if (bookingId) {
          const bookingResponse = await axios.get(`${API}/bookings/${bookingId}`);
          setBooking(bookingResponse.data);
        }
      } else if (statusResponse.data.status === 'expired') {
        setStatus('expired');
      } else {
        setPollCount(prev => prev + 1);
        setTimeout(pollPaymentStatus, pollInterval);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('error');
    }
  }, [sessionId, bookingId, pollCount]);

  useEffect(() => {
    if (paymentMethod === 'paypal' && bookingId) {
      // PayPal return - need to capture the order
      capturePayPalOrder();
    } else if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus('error');
    }
  }, [paymentMethod, bookingId, sessionId, capturePayPalOrder, pollPaymentStatus]);

  const handleDownloadInvoice = async () => {
    if (!bookingId) return;
    
    try {
      const response = await axios.get(`${API}/bookings/${bookingId}/invoice`, {
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
      console.error('Error downloading invoice:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-[#E5E0D5]">
            <CardContent className="p-8 text-center">
              {status === 'loading' && (
                <div className="py-12" data-testid="loading-state">
                  <Loader2 className="w-16 h-16 animate-spin text-[#6B1D2A] mx-auto mb-6" />
                  <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">
                    {language === 'de' ? 'Zahlung wird überprüft...' : 'Verifying payment...'}
                  </h2>
                  <p className="text-[#4A4A4A]">
                    {language === 'de' ? 'Bitte warten Sie einen Moment.' : 'Please wait a moment.'}
                  </p>
                </div>
              )}

              {status === 'success' && (
                <div className="py-8 animate-fade-in" data-testid="success-state">
                  <div className="w-20 h-20 bg-[#2E7D32]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-[#2E7D32]" />
                  </div>
                  
                  <h2 className="font-serif text-3xl text-[#1A1A1A] mb-2">
                    {isRemainingPayment 
                      ? (language === 'de' ? 'Restzahlung erfolgreich!' : 'Remaining Balance Paid!')
                      : t('paymentSuccess')}
                  </h2>
                  
                  <p className="text-[#4A4A4A] mb-8">
                    {isRemainingPayment
                      ? (language === 'de' 
                          ? 'Ihre Buchung ist nun vollständig bezahlt.' 
                          : 'Your booking is now fully paid.')
                      : t('confirmationTitle')}
                  </p>

                  {booking && (
                    <div className="bg-[#F5F2EA] rounded-lg p-6 mb-8 text-left">
                      <h3 className="font-semibold text-[#1A1A1A] mb-4">{t('bookingNumber')}</h3>
                      <p className="text-2xl font-mono text-[#6B1D2A] mb-4">{booking.booking_number}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-[#4A4A4A]">{language === 'de' ? 'Hotel' : 'Hotel'}</span>
                          <p className="font-medium">{booking.hotel_name}</p>
                        </div>
                        <div>
                          <span className="text-[#4A4A4A]">{t('checkIn')}</span>
                          <p className="font-medium">{booking.check_in}</p>
                        </div>
                        <div>
                          <span className="text-[#4A4A4A]">{t('checkOut')}</span>
                          <p className="font-medium">{booking.check_out}</p>
                        </div>
                        <div>
                          <span className="text-[#4A4A4A]">
                            {isRemainingPayment 
                              ? (language === 'de' ? 'Gesamtbetrag' : 'Total Amount')
                              : t('deposit')}
                          </span>
                          <p className="font-medium text-[#2E7D32]">
                            {isRemainingPayment 
                              ? `${formatPrice(booking.total_price)} € ${language === 'de' ? 'bezahlt' : 'paid'}`
                              : `${formatPrice(booking.deposit_amount)} € ${language === 'de' ? 'bezahlt' : 'paid'}`}
                          </p>
                        </div>
                      </div>
                      
                      {isRemainingPayment && (
                        <div className="mt-4 pt-4 border-t border-[#E5E0D5]">
                          <p className="text-sm text-[#2E7D32] font-medium">
                            {language === 'de' 
                              ? '✓ Buchung vollständig bezahlt' 
                              : '✓ Booking fully paid'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-sm text-[#4A4A4A] mb-6">
                    <Mail className="w-4 h-4" />
                    {t('invoiceSent')}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={handleDownloadInvoice}
                      className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white"
                      data-testid="download-invoice-btn"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('downloadInvoice')}
                    </Button>
                    <Button
                      onClick={() => navigate('/')}
                      variant="outline"
                      data-testid="back-home-btn"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      {t('home')}
                    </Button>
                  </div>
                </div>
              )}

              {(status === 'error' || status === 'expired' || status === 'timeout') && (
                <div className="py-12" data-testid="error-state">
                  <div className="w-20 h-20 bg-[#D93025]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-12 h-12 text-[#D93025]" />
                  </div>
                  
                  <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">
                    {language === 'de' ? 'Zahlung fehlgeschlagen' : 'Payment Failed'}
                  </h2>
                  
                  <p className="text-[#4A4A4A] mb-8">
                    {language === 'de' 
                      ? 'Die Zahlung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.'
                      : 'The payment could not be completed. Please try again.'}
                  </p>

                  <Button
                    onClick={() => navigate('/')}
                    className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    {t('home')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConfirmationPage;

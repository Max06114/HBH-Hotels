import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CalendarIcon, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

// Import booking components
import { RoomTypeSelector, GuestInfoForm, BookingSummary } from '../components/booking';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'AdEM1S0q9rhuwWjF2PpmTcDeykYwaQRpApCFmhJOEHxTNuLXGO0oGqPiR35AfdKHq69VqL6nqc8v6Uq_';

const BookingPage = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const locale = language === 'de' ? de : enUS;

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState(null);
  
  // Default dates: 25.02.2027 - 28.02.2027
  const [checkIn, setCheckIn] = useState(new Date(2027, 1, 25));
  const [checkOut, setCheckOut] = useState(new Date(2027, 1, 28));

  const [formData, setFormData] = useState({
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    postalCode: '',
    city: '',
    country: 'Deutschland',
    roomType: 'single',
    notes: ''
  });

  const fetchHotel = useCallback(async () => {
    try {
      const [hotelRes, availRes] = await Promise.all([
        axios.get(`${API}/hotels/${hotelId}`),
        axios.get(`${API}/hotels/${hotelId}/availability`)
      ]);
      setHotel(hotelRes.data);
      setAvailability(availRes.data.availability);
    } catch (error) {
      toast.error(t('error'));
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [hotelId, navigate, t]);

  useEffect(() => {
    fetchHotel();
  }, [fetchHotel]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Calculate pricing
  const calculatePrice = useCallback(() => {
    if (!hotel || !checkIn || !checkOut) return null;
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return null;

    const priceMap = {
      single: hotel.single_price,
      double: hotel.double_price,
      twin: hotel.twin_price || hotel.double_price,
      single_comfort: hotel.single_comfort_price || hotel.single_price,
      double_comfort: hotel.double_comfort_price || hotel.double_price,
      twin_comfort: hotel.twin_comfort_price || hotel.twin_price || hotel.double_price
    };

    const pricePerNight = priceMap[formData.roomType] || hotel.single_price;
    const total = pricePerNight * nights;
    const deposit = Math.round(total * 0.25 * 100) / 100;
    const remaining = Math.round((total - deposit) * 100) / 100;

    return { nights, pricePerNight, total, deposit, remaining };
  }, [hotel, checkIn, checkOut, formData.roomType]);

  const priceInfo = calculatePrice();

  const validateForm = () => {
    if (!checkIn || !checkOut) {
      toast.error(language === 'de' ? 'Bitte wählen Sie An- und Abreisedatum' : 'Please select check-in and check-out dates');
      return false;
    }
    if (!formData.salutation || !formData.firstName || !formData.lastName || !formData.email || 
        !formData.street || !formData.postalCode || !formData.city || !formData.country) {
      toast.error(language === 'de' ? 'Bitte füllen Sie alle Pflichtfelder aus' : 'Please fill in all required fields');
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      toast.info(language === 'de' ? 'Bitte klicken Sie auf den PayPal-Button um zu bezahlen' : 'Please click the PayPal button to pay');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" />
      </div>
    );
  }

  if (!hotel) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[#4A4A4A] hover:text-[#6B1D2A] mb-8 transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="lg:col-span-2">
              <Card className="border-[#E5E0D5]">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl text-[#1A1A1A]">{t('bookingTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Room Type Selector */}
                    <RoomTypeSelector 
                      hotel={hotel}
                      availability={availability}
                      value={formData.roomType}
                      onChange={(v) => handleSelectChange('roomType', v)}
                    />

                    {/* Guest Information */}
                    <GuestInfoForm 
                      formData={formData}
                      onChange={handleInputChange}
                      onSelectChange={handleSelectChange}
                    />

                    {/* Dates - Festival dates: 25-28 February 2027 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{t('checkIn')} *</Label>
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn("flex-1 justify-start text-left font-normal", !checkIn && "text-muted-foreground")}
                                data-testid="check-in-btn"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {checkIn ? format(checkIn, 'dd.MM.yyyy', { locale }) : <span>{t('checkIn')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50" align="start" side="top">
                              <Calendar
                                mode="single"
                                selected={checkIn}
                                onSelect={setCheckIn}
                                defaultMonth={new Date(2027, 1, 1)}
                                disabled={(date) => {
                                  // Allow 24.02.2027 to 01.03.2027
                                  return date < new Date(2027, 1, 24) || date > new Date(2027, 2, 1);
                                }}
                                locale={locale}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <p className="text-xs text-[#4A4A4A] mt-1">
                          {language === 'de' ? 'Festival: 25.-28. Feb 2027' : 'Festival: Feb 25-28, 2027'}
                        </p>
                      </div>
                      <div>
                        <Label>{t('checkOut')} *</Label>
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn("flex-1 justify-start text-left font-normal", !checkOut && "text-muted-foreground")}
                                data-testid="check-out-btn"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {checkOut ? format(checkOut, 'dd.MM.yyyy', { locale }) : <span>{t('checkOut')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50" align="start" side="top">
                              <Calendar
                                mode="single"
                                selected={checkOut}
                                onSelect={setCheckOut}
                                defaultMonth={new Date(2027, 1, 1)}
                                disabled={(date) => {
                                  // Allow 24.02.2027 to 01.03.2027, and after check-in
                                  const minDate = checkIn ? new Date(checkIn.getTime() + 86400000) : new Date(2027, 1, 25);
                                  return date < minDate || date > new Date(2027, 2, 1);
                                }}
                                locale={locale}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor="notes">{t('notes')}</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder={t('notesPlaceholder')}
                        rows={3}
                        data-testid="notes-input"
                      />
                    </div>

                    {/* Spacer to prevent calendar overlap */}
                    <div className="pt-4 border-t border-[#E5E0D5]">
                      {/* PayPal Button */}
                      {priceInfo && (
                        <div className="mt-2">
                          <p className="text-center text-sm text-[#4A4A4A] mb-4">
                            {language === 'de' 
                              ? 'Bezahlen Sie sicher mit PayPal oder Kreditkarte:' 
                              : 'Pay securely with PayPal or credit card:'}
                          </p>
                          <PayPalScriptProvider options={{ 
                            clientId: PAYPAL_CLIENT_ID,
                            currency: "EUR",
                            locale: language === 'de' ? 'de_DE' : 'en_US'
                          }}>
                            <PayPalButtons
                              style={{ 
                                layout: "vertical",
                                color: "blue",
                                shape: "pill",
                              label: "pay",
                              height: 50
                            }}
                            disabled={submitting}
                            createOrder={async () => {
                              if (!validateForm()) throw new Error('Validation failed');
                              
                              try {
                                setSubmitting(true);
                                const bookingData = {
                                  hotel_id: hotelId,
                                  salutation: formData.salutation,
                                  first_name: formData.firstName,
                                  last_name: formData.lastName,
                                  email: formData.email,
                                  street: formData.street,
                                  postal_code: formData.postalCode,
                                  city: formData.city,
                                  country: formData.country,
                                  room_type: formData.roomType,
                                  check_in: format(checkIn, 'yyyy-MM-dd'),
                                  check_out: format(checkOut, 'yyyy-MM-dd'),
                                  notes: formData.notes,
                                  payment_method: 'paypal',
                                  language
                                };
                                
                                const response = await axios.post(`${API}/payments/paypal/create-order`, bookingData);
                                return response.data.order_id;
                              } catch (error) {
                                setSubmitting(false);
                                const errorMsg = error.response?.data?.detail || (language === 'de' ? 'Fehler bei PayPal-Bestellung' : 'PayPal order error');
                                toast.error(errorMsg);
                                throw error;
                              }
                            }}
                            onApprove={async (data) => {
                              try {
                                const response = await axios.post(`${API}/payments/paypal/capture-order`, {
                                  order_id: data.orderID
                                });
                                
                                if (response.data.status === 'COMPLETED') {
                                  toast.success(language === 'de' ? 'Zahlung erfolgreich!' : 'Payment successful!');
                                  navigate(`/confirmation?payment_method=paypal&booking_id=${response.data.booking_id}`);
                                }
                              } catch (error) {
                                toast.error(language === 'de' ? 'Zahlung fehlgeschlagen' : 'Payment failed');
                              } finally {
                                setSubmitting(false);
                              }
                            }}
                            onError={(err) => {
                              console.error('PayPal Error:', err);
                              setSubmitting(false);
                            }}
                            onCancel={() => {
                              toast.info(language === 'de' ? 'Zahlung abgebrochen' : 'Payment cancelled');
                              setSubmitting(false);
                            }}
                          />
                        </PayPalScriptProvider>
                      </div>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Booking Summary Sidebar */}
            <div className="lg:col-span-1">
              <BookingSummary hotel={hotel} priceInfo={priceInfo} />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BookingPage;

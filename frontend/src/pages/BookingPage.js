import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CalendarIcon, CreditCard, ArrowLeft, MapPin, Star, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// German price format helper (comma as decimal separator)
const formatPrice = (price) => {
  return price.toFixed(2).replace('.', ',');
};

const BookingPage = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const locale = language === 'de' ? de : enUS;

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Default dates: 25.02.2027 - 28.02.2027
  const [checkIn, setCheckIn] = useState(new Date(2027, 1, 25)); // February is month 1 (0-indexed)
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

  useEffect(() => {
    fetchHotel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const fetchHotel = async () => {
    try {
      const response = await axios.get(`${API}/hotels/${hotelId}`);
      setHotel(response.data);
    } catch (error) {
      toast.error(t('error'));
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculatePrice = () => {
    if (!hotel || !checkIn || !checkOut) return null;
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return null;

    let pricePerNight = hotel.single_price;
    if (formData.roomType === 'double') pricePerNight = hotel.double_price;
    if (formData.roomType === 'twin') pricePerNight = hotel.twin_price || hotel.double_price;

    const total = pricePerNight * nights;
    const deposit = Math.round(total * 0.25 * 100) / 100;
    const remaining = Math.round((total - deposit) * 100) / 100;

    return { nights, pricePerNight, total, deposit, remaining };
  };

  const priceInfo = calculatePrice();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!checkIn || !checkOut) {
      toast.error(language === 'de' ? 'Bitte wählen Sie An- und Abreisedatum' : 'Please select check-in and check-out dates');
      return;
    }

    if (!formData.salutation || !formData.firstName || !formData.lastName || !formData.email || 
        !formData.street || !formData.postalCode || !formData.city || !formData.country) {
      toast.error(language === 'de' ? 'Bitte füllen Sie alle Pflichtfelder aus' : 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      // Create booking
      const bookingResponse = await axios.post(`${API}/bookings`, {
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
        language: language
      });

      const booking = bookingResponse.data.booking;

      // Create Stripe session
      const stripeResponse = await axios.post(`${API}/payments/stripe/create-session`, null, {
        params: {
          booking_id: booking.id,
          origin_url: window.location.origin,
          payment_type: 'deposit'
        }
      });

      // Redirect to Stripe
      window.location.href = stripeResponse.data.url;
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(language === 'de' ? 'Fehler bei der Buchung' : 'Booking error');
      setSubmitting(false);
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

  const hotelName = language === 'en' ? hotel.name_en : hotel.name;
  const hotelDescription = language === 'en' ? hotel.description_en : hotel.description;

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
                    {/* Personal Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="salutation">{t('salutation')} *</Label>
                        <Select value={formData.salutation} onValueChange={(v) => handleSelectChange('salutation', v)}>
                          <SelectTrigger data-testid="salutation-select">
                            <SelectValue placeholder={t('salutation')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Herr">{t('mr')}</SelectItem>
                            <SelectItem value="Frau">{t('mrs')}</SelectItem>
                            <SelectItem value="Divers">{t('diverse')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="roomType">{t('roomType')} *</Label>
                        <Select value={formData.roomType} onValueChange={(v) => handleSelectChange('roomType', v)}>
                          <SelectTrigger data-testid="room-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">{t('singleRoom')} - {formatPrice(hotel.single_price)} €</SelectItem>
                            <SelectItem value="double">{t('doubleRoom')} - {formatPrice(hotel.double_price)} €</SelectItem>
                            {hotel.twin_price && (
                              <SelectItem value="twin">{t('twinRoom')} - {formatPrice(hotel.twin_price)} €</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">{t('firstName')} *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          data-testid="first-name-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">{t('lastName')} *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                          data-testid="last-name-input"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">{t('email')} *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        data-testid="email-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="street">{t('street')} *</Label>
                      <Input
                        id="street"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        required
                        data-testid="street-input"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="postalCode">{t('postalCode')} *</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          required
                          data-testid="postal-code-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">{t('city')} *</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          required
                          data-testid="city-input"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="country">{t('country')} *</Label>
                        <Input
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          required
                          data-testid="country-input"
                        />
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{t('checkIn')} *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}
                              data-testid="check-in-btn"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {checkIn ? format(checkIn, 'PPP', { locale }) : <span>{t('checkIn')}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={checkIn}
                              onSelect={setCheckIn}
                              disabled={(date) => date < new Date()}
                              locale={locale}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>{t('checkOut')} *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}
                              data-testid="check-out-btn"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {checkOut ? format(checkOut, 'PPP', { locale }) : <span>{t('checkOut')}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={checkOut}
                              onSelect={setCheckOut}
                              disabled={(date) => date <= (checkIn || new Date())}
                              locale={locale}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

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

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={submitting || !priceInfo}
                      className="w-full bg-[#6B1D2A] hover:bg-[#8A2536] text-white py-6 rounded-full text-lg"
                      data-testid="submit-booking-btn"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-5 h-5 mr-2" />
                      )}
                      {t('payWithStripe')} {priceInfo && `(${formatPrice(priceInfo.deposit)} € ${t('deposit')})`}
                    </Button>

                    <p className="text-xs text-[#4A4A4A] text-center">
                      {t('paymentInfo')}
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Hotel Summary */}
            <div className="lg:col-span-1">
              <Card className="border-[#E5E0D5] sticky top-24">
                <div className="relative h-48 overflow-hidden rounded-t-lg">
                  <img
                    src={hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'}
                    alt={hotelName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-1 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-sm">
                    {[...Array(hotel.stars)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="font-serif text-xl font-semibold mb-2">{hotelName}</h3>
                  <div className="flex items-center gap-2 text-[#4A4A4A] text-sm mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{language === 'en' ? hotel.distance_to_venue_en : hotel.distance_to_venue}</span>
                  </div>

                  {priceInfo && (
                    <div className="border-t border-[#E5E0D5] pt-4 mt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#4A4A4A]">{priceInfo.nights} {t('nights')} × {formatPrice(priceInfo.pricePerNight)} €</span>
                        <span>{formatPrice(priceInfo.total)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#4A4A4A]">{t('deposit')}</span>
                        <span className="font-semibold text-[#6B1D2A]">{formatPrice(priceInfo.deposit)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#4A4A4A]">{t('remaining')}</span>
                        <span>{formatPrice(priceInfo.remaining)} €</span>
                      </div>
                      <div className="border-t border-[#E5E0D5] pt-3 flex justify-between font-semibold">
                        <span>{t('total')}</span>
                        <span className="text-[#6B1D2A]">{formatPrice(priceInfo.total)} €</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-[#4A4A4A] mt-4">
                    {t('cancellationPolicy')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingPage;

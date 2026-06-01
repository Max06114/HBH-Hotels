import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, TrendingUp, TrendingDown, Euro, CalendarCheck, Hotel, Users } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  if (price === null || price === undefined) return '0,00';
  return price.toFixed(2).replace('.', ',');
};

const AnalyticsDashboard = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [bookingsRes, hotelsRes] = await Promise.all([
        axios.get(`${API}/admin/bookings`, { headers: getAuthHeaders() }),
        axios.get(`${API}/admin/hotels`, { headers: getAuthHeaders() })
      ]);
      setBookings(bookingsRes.data);
      setHotels(hotelsRes.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    // Filter by status
    const activeBookings = bookings.filter(b => b.payment_status !== 'cancelled');
    const paidBookings = bookings.filter(b => ['deposit_paid', 'fully_paid'].includes(b.payment_status));
    const fullyPaidBookings = bookings.filter(b => b.payment_status === 'fully_paid');
    const cancelledBookings = bookings.filter(b => b.payment_status === 'cancelled');

    // Revenue calculations
    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const depositRevenue = paidBookings.reduce((sum, b) => sum + (b.deposit_amount || 0), 0);
    const pendingRevenue = paidBookings.reduce((sum, b) => {
      if (b.payment_status === 'deposit_paid') {
        return sum + (b.remaining_amount || 0);
      }
      return sum;
    }, 0);

    // Monthly breakdown
    const getMonthBookings = (month, year) => {
      return bookings.filter(b => {
        const created = new Date(b.created_at);
        return created.getMonth() === month && created.getFullYear() === year;
      });
    };

    const thisMonthBookings = getMonthBookings(thisMonth, thisYear);
    const lastMonthBookings = getMonthBookings(lastMonth, lastMonthYear);
    
    const thisMonthRevenue = thisMonthBookings
      .filter(b => ['deposit_paid', 'fully_paid'].includes(b.payment_status))
      .reduce((sum, b) => sum + (b.total_price || 0), 0);
    
    const lastMonthRevenue = lastMonthBookings
      .filter(b => ['deposit_paid', 'fully_paid'].includes(b.payment_status))
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    const revenueGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : thisMonthRevenue > 0 ? 100 : 0;

    // Bookings by hotel
    const bookingsByHotel = hotels.map(hotel => {
      const hotelBookings = activeBookings.filter(b => b.hotel_id === hotel.id);
      const revenue = hotelBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      return {
        id: hotel.id,
        name: hotel.name,
        bookings: hotelBookings.length,
        revenue,
        occupancyRate: hotelBookings.length // Simplified - could calculate against inventory
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Room type distribution
    const roomTypeCount = {};
    activeBookings.forEach(b => {
      const type = b.room_type || 'single';
      roomTypeCount[type] = (roomTypeCount[type] || 0) + 1;
    });

    // Upcoming check-ins (next 7 days)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingCheckIns = activeBookings.filter(b => {
      const checkIn = new Date(b.check_in);
      return checkIn >= now && checkIn <= nextWeek;
    }).length;

    // Average booking value
    const avgBookingValue = paidBookings.length > 0 
      ? totalRevenue / paidBookings.length 
      : 0;

    // Conversion rate (paid vs total)
    const conversionRate = bookings.length > 0 
      ? (paidBookings.length / bookings.length * 100).toFixed(1) 
      : 0;

    return {
      totalBookings: bookings.length,
      activeBookings: activeBookings.length,
      paidBookings: paidBookings.length,
      fullyPaidBookings: fullyPaidBookings.length,
      cancelledBookings: cancelledBookings.length,
      totalRevenue,
      depositRevenue,
      pendingRevenue,
      thisMonthBookings: thisMonthBookings.length,
      lastMonthBookings: lastMonthBookings.length,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowth,
      bookingsByHotel,
      roomTypeCount,
      upcomingCheckIns,
      avgBookingValue,
      conversionRate
    };
  }, [bookings, hotels]);

  const getRoomTypeName = (type) => {
    const names = {
      de: { single: 'Einzelzimmer', double: 'Doppelzimmer', twin: 'Zweibett', 
            single_comfort: 'EZ Komfort', double_comfort: 'DZ Komfort', twin_comfort: 'Twin Komfort' },
      en: { single: 'Single', double: 'Double', twin: 'Twin',
            single_comfort: 'Single Comfort', double_comfort: 'Double Comfort', twin_comfort: 'Twin Comfort' }
    };
    return names[language]?.[type] || type;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-analytics" className="space-y-6">
      <h1 className="font-serif text-3xl text-[#1A1A1A]">
        {language === 'de' ? 'Analytics & Statistiken' : 'Analytics & Statistics'}
      </h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E0D5]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#4A4A4A]">{language === 'de' ? 'Gesamtumsatz' : 'Total Revenue'}</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">{formatPrice(analytics.totalRevenue)} €</p>
                <div className="flex items-center mt-1">
                  {parseFloat(analytics.revenueGrowth) >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-xs ${parseFloat(analytics.revenueGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.revenueGrowth}% {language === 'de' ? 'vs. Vormonat' : 'vs. last month'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-[#6B1D2A] rounded-lg flex items-center justify-center">
                <Euro className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E0D5]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#4A4A4A]">{language === 'de' ? 'Bezahlte Buchungen' : 'Paid Bookings'}</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">{analytics.paidBookings}</p>
                <p className="text-xs text-[#4A4A4A] mt-1">
                  {analytics.fullyPaidBookings} {language === 'de' ? 'vollständig bezahlt' : 'fully paid'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CalendarCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E0D5]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#4A4A4A]">{language === 'de' ? 'Ausstehende Zahlungen' : 'Pending Payments'}</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">{formatPrice(analytics.pendingRevenue)} €</p>
                <p className="text-xs text-[#4A4A4A] mt-1">
                  {language === 'de' ? 'Noch zu zahlen (75%)' : 'Remaining balance (75%)'}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E0D5]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#4A4A4A]">{language === 'de' ? 'Check-ins (7 Tage)' : 'Check-ins (7 days)'}</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">{analytics.upcomingCheckIns}</p>
                <p className="text-xs text-[#4A4A4A] mt-1">
                  {language === 'de' ? 'Ankommende Gäste' : 'Arriving guests'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hotel Performance */}
        <Card className="border-[#E5E0D5] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Hotel className="w-5 h-5 text-[#6B1D2A]" />
              {language === 'de' ? 'Umsatz nach Hotel' : 'Revenue by Hotel'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.bookingsByHotel.map((hotel, index) => (
                <div key={hotel.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[#F5F2EA] rounded-full flex items-center justify-center text-sm font-bold text-[#6B1D2A]">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-[#1A1A1A]">{hotel.name}</span>
                      <span className="font-semibold text-[#6B1D2A]">{formatPrice(hotel.revenue)} €</span>
                    </div>
                    <div className="w-full bg-[#E5E0D5] rounded-full h-2">
                      <div 
                        className="bg-[#6B1D2A] h-2 rounded-full transition-all"
                        style={{ 
                          width: `${analytics.totalRevenue > 0 ? (hotel.revenue / analytics.totalRevenue * 100) : 0}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-[#4A4A4A] mt-1">
                      {hotel.bookings} {language === 'de' ? 'Buchungen' : 'bookings'}
                    </p>
                  </div>
                </div>
              ))}
              {analytics.bookingsByHotel.length === 0 && (
                <p className="text-center text-[#4A4A4A] py-4">
                  {language === 'de' ? 'Noch keine Buchungen' : 'No bookings yet'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Room Type Distribution */}
        <Card className="border-[#E5E0D5]">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'de' ? 'Zimmertypen' : 'Room Types'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.roomTypeCount).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-[#4A4A4A]">{getRoomTypeName(type)}</span>
                  <Badge className="bg-[#F5F2EA] text-[#6B1D2A]">{count}</Badge>
                </div>
              ))}
              {Object.keys(analytics.roomTypeCount).length === 0 && (
                <p className="text-center text-[#4A4A4A] py-4">
                  {language === 'de' ? 'Keine Daten' : 'No data'}
                </p>
              )}
            </div>

            <div className="border-t border-[#E5E0D5] mt-4 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#4A4A4A]">{language === 'de' ? 'Ø Buchungswert' : 'Avg. Booking Value'}</span>
                <span className="font-semibold">{formatPrice(analytics.avgBookingValue)} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#4A4A4A]">{language === 'de' ? 'Konversionsrate' : 'Conversion Rate'}</span>
                <span className="font-semibold">{analytics.conversionRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#4A4A4A]">{language === 'de' ? 'Stornierungen' : 'Cancellations'}</span>
                <Badge className="bg-red-100 text-red-800">{analytics.cancelledBookings}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <Card className="border-[#E5E0D5]">
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'de' ? 'Monatlicher Vergleich' : 'Monthly Comparison'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 bg-[#F5F2EA] rounded-lg">
              <p className="text-sm text-[#4A4A4A] mb-2">{language === 'de' ? 'Dieser Monat' : 'This Month'}</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{formatPrice(analytics.thisMonthRevenue)} €</p>
              <p className="text-sm text-[#4A4A4A]">{analytics.thisMonthBookings} {language === 'de' ? 'Buchungen' : 'bookings'}</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-[#4A4A4A] mb-2">{language === 'de' ? 'Letzter Monat' : 'Last Month'}</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{formatPrice(analytics.lastMonthRevenue)} €</p>
              <p className="text-sm text-[#4A4A4A]">{analytics.lastMonthBookings} {language === 'de' ? 'Buchungen' : 'bookings'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;

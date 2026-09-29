import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../ui/card';
import { CalendarCheck, Users, TrendingUp, Euro, Loader2, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// German price format helper
const formatPrice = (price) => {
  if (price === null || price === undefined) return '0,00';
  return price.toFixed(2).replace('.', ',');
};

const DashboardOverview = () => {
  const { t, language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState(null);
  const [transfers, setTransfers] = useState({ items: [], count: 0, total_deposit: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [response, tr] = await Promise.all([
          axios.get(`${API}/admin/stats`, { headers: getAuthHeaders() }),
          axios.get(`${API}/admin/transfers/open`, { headers: getAuthHeaders() })
        ]);
        setStats(response.data);
        setTransfers(tr.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [getAuthHeaders]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  const statCards = [
    { label: language === 'de' ? 'Gesamtbuchungen' : 'Total Bookings', value: stats?.total_bookings || 0, icon: CalendarCheck, color: 'bg-blue-500' },
    { label: language === 'de' ? 'Ausstehend' : 'Pending', value: stats?.pending_bookings || 0, icon: Users, color: 'bg-yellow-500' },
    { label: language === 'de' ? 'Bezahlt' : 'Paid', value: stats?.paid_bookings || 0, icon: TrendingUp, color: 'bg-green-500' },
    { label: language === 'de' ? 'Umsatz' : 'Revenue', value: `${formatPrice(stats?.total_revenue || 0)} €`, icon: Euro, color: 'bg-[#6B1D2A]' },
  ];

  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-serif text-3xl text-[#1A1A1A] mb-8">{t('adminDashboard')}</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-[#E5E0D5]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#4A4A4A]">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#E5E0D5] mt-8" data-testid="open-transfers-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center"><Landmark className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="font-semibold text-[#1A1A1A]">{language === 'de' ? 'Offene Überweisungen' : 'Open bank transfers'}</h2>
                <p className="text-sm text-[#4A4A4A]" data-testid="open-transfers-summary">
                  {transfers.count} {language === 'de' ? 'Reservierungen' : 'reservations'} · {formatPrice(transfers.total_deposit)} € {language === 'de' ? 'erwartet' : 'expected'}
                </p>
              </div>
            </div>
            <Link to="/admin/bookings" className="text-sm text-[#6B1D2A] underline" data-testid="open-transfers-link">{language === 'de' ? 'Zu den Buchungen' : 'Go to bookings'}</Link>
          </div>
          {transfers.items.length === 0 ? (
            <p className="text-sm text-[#4A4A4A]" data-testid="open-transfers-empty">{language === 'de' ? 'Keine offenen Überweisungen.' : 'No open bank transfers.'}</p>
          ) : (
            <div className="divide-y divide-[#E5E0D5]">
              {transfers.items.map((b) => (
                <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2" data-testid={`open-transfer-${b.id}`}>
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{b.first_name} {b.last_name} <span className="font-mono text-xs text-[#4A4A4A] ml-2">{b.booking_number}</span></p>
                    <p className="text-sm text-[#4A4A4A]">{b.hotel_name} · {b.check_in} – {b.check_out}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(b.deposit_amount)} €</span>
                    <Badge className={b.days_left < 0 ? 'bg-red-100 text-red-800' : b.days_left <= 2 ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'}>
                      {b.days_left < 0
                        ? (language === 'de' ? `${-b.days_left} Tage überfällig` : `${-b.days_left} days overdue`)
                        : (language === 'de' ? `fällig in ${b.days_left} Tagen` : `due in ${b.days_left} days`)}
                      {' · '}{new Date(b.transfer_due_date).toLocaleDateString('de-DE')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;

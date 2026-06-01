import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../ui/card';
import { CalendarCheck, Users, TrendingUp, Euro, Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/admin/stats`, { headers: getAuthHeaders() });
        setStats(response.data);
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
    </div>
  );
};

export default DashboardOverview;

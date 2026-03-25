import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Routes, Route, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { 
  LayoutDashboard, Hotel, CalendarCheck, CreditCard, LogOut, Menu, X, 
  Plus, Edit, Trash2, Download, Eye, Ban, Loader2, Music, Users, Euro, TrendingUp
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Sidebar Component
const Sidebar = ({ isOpen, setIsOpen }) => {
  const { t, language } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('adminDashboard') },
    { path: '/admin/bookings', icon: CalendarCheck, label: t('adminBookings') },
    { path: '/admin/hotels', icon: Hotel, label: t('adminHotels') },
    { path: '/admin/payments', icon: CreditCard, label: t('adminPayments') },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#1A1A1A] z-50 transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#6B1D2A] rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-serif text-lg text-white">Admin</span>
                <p className="text-xs text-white/50">Travel Events</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${location.pathname === item.path 
                        ? 'bg-[#6B1D2A] text-white' 
                        : 'text-white/70 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-white/70 hover:text-white transition-colors"
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// Dashboard Overview
const DashboardOverview = () => {
  const { t, language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  const statCards = [
    { label: language === 'de' ? 'Gesamtbuchungen' : 'Total Bookings', value: stats?.total_bookings || 0, icon: CalendarCheck, color: 'bg-blue-500' },
    { label: language === 'de' ? 'Ausstehend' : 'Pending', value: stats?.pending_bookings || 0, icon: Users, color: 'bg-yellow-500' },
    { label: language === 'de' ? 'Bezahlt' : 'Paid', value: stats?.paid_bookings || 0, icon: TrendingUp, color: 'bg-green-500' },
    { label: language === 'de' ? 'Umsatz' : 'Revenue', value: `${(stats?.total_revenue || 0).toFixed(2)} €`, icon: Euro, color: 'bg-[#6B1D2A]' },
  ];

  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-serif text-3xl text-[#1A1A1A] mb-8">{t('adminDashboard')}</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-[#E5E0D5]">
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

// Bookings Management
const BookingsManagement = () => {
  const { t, language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/admin/bookings`, { headers: getAuthHeaders() });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    try {
      await axios.post(`${API}/bookings/${selectedBooking.id}/cancel`, {}, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Buchung storniert' : 'Booking cancelled');
      fetchBookings();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Stornieren' : 'Error cancelling');
    } finally {
      setCancelDialogOpen(false);
      setSelectedBooking(null);
    }
  };

  const handleDownloadInvoice = async (bookingId, invoiceNumber) => {
    try {
      const response = await axios.get(`${API}/bookings/${bookingId}/invoice`, {
        responseType: 'blob',
        headers: getAuthHeaders()
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error downloading invoice');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: t('pending'), className: 'bg-yellow-100 text-yellow-800' },
      deposit_paid: { label: t('depositPaid'), className: 'bg-blue-100 text-blue-800' },
      fully_paid: { label: t('fullyPaid'), className: 'bg-green-100 text-green-800' },
      refunded: { label: t('refunded'), className: 'bg-purple-100 text-purple-800' },
      cancelled: { label: t('cancelled'), className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-bookings">
      <h1 className="font-serif text-3xl text-[#1A1A1A] mb-8">{t('adminBookings')}</h1>
      
      <Card className="border-[#E5E0D5]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bookingNumber')}</TableHead>
                  <TableHead>{language === 'de' ? 'Gast' : 'Guest'}</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>{t('checkIn')}</TableHead>
                  <TableHead>{t('checkOut')}</TableHead>
                  <TableHead>{t('total')}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{language === 'de' ? 'Aktionen' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} className="hover:bg-[#F5F2EA]">
                    <TableCell className="font-mono text-sm">{booking.booking_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.first_name} {booking.last_name}</p>
                        <p className="text-sm text-[#4A4A4A]">{booking.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{booking.hotel_name}</TableCell>
                    <TableCell>{booking.check_in}</TableCell>
                    <TableCell>{booking.check_out}</TableCell>
                    <TableCell className="font-semibold">{booking.total_price?.toFixed(2)} €</TableCell>
                    <TableCell>{getStatusBadge(booking.payment_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(booking.id, booking.invoice_number)}
                          data-testid={`download-invoice-${booking.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {booking.payment_status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedBooking(booking); setCancelDialogOpen(true); }}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`cancel-booking-${booking.id}`}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {bookings.length === 0 && (
            <div className="text-center py-12 text-[#4A4A4A]">
              {language === 'de' ? 'Keine Buchungen vorhanden.' : 'No bookings found.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'de' ? 'Buchung stornieren?' : 'Cancel booking?'}</DialogTitle>
          </DialogHeader>
          <p className="text-[#4A4A4A]">
            {language === 'de' 
              ? `Möchten Sie die Buchung ${selectedBooking?.booking_number} wirklich stornieren?`
              : `Are you sure you want to cancel booking ${selectedBooking?.booking_number}?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCancelBooking} className="bg-red-600 hover:bg-red-700">
              {language === 'de' ? 'Stornieren' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Hotels Management
const HotelsManagement = () => {
  const { t, language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [formData, setFormData] = useState({
    name: '', name_en: '', description: '', description_en: '',
    stars: 4, address: '', distance_to_venue: '', distance_to_venue_en: '',
    amenities: [], amenities_en: [], images: [],
    single_price: 0, double_price: 0, twin_price: 0,
    breakfast_included: true, tax_included: true, active: true
  });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const response = await axios.get(`${API}/admin/hotels`, { headers: getAuthHeaders() });
      setHotels(response.data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name, name_en: hotel.name_en,
      description: hotel.description, description_en: hotel.description_en,
      stars: hotel.stars, address: hotel.address,
      distance_to_venue: hotel.distance_to_venue, distance_to_venue_en: hotel.distance_to_venue_en,
      amenities: hotel.amenities, amenities_en: hotel.amenities_en,
      images: hotel.images, single_price: hotel.single_price,
      double_price: hotel.double_price, twin_price: hotel.twin_price || 0,
      breakfast_included: hotel.breakfast_included, tax_included: hotel.tax_included,
      active: hotel.active
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingHotel(null);
    setFormData({
      name: '', name_en: '', description: '', description_en: '',
      stars: 4, address: '', distance_to_venue: '', distance_to_venue_en: '',
      amenities: [], amenities_en: [], images: [],
      single_price: 0, double_price: 0, twin_price: 0,
      breakfast_included: true, tax_included: true, active: true
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        amenities: typeof formData.amenities === 'string' ? formData.amenities.split(',').map(s => s.trim()) : formData.amenities,
        amenities_en: typeof formData.amenities_en === 'string' ? formData.amenities_en.split(',').map(s => s.trim()) : formData.amenities_en,
        images: typeof formData.images === 'string' ? formData.images.split(',').map(s => s.trim()) : formData.images,
      };
      
      if (editingHotel) {
        await axios.put(`${API}/admin/hotels/${editingHotel.id}`, payload, { headers: getAuthHeaders() });
        toast.success(language === 'de' ? 'Hotel aktualisiert' : 'Hotel updated');
      } else {
        await axios.post(`${API}/admin/hotels`, payload, { headers: getAuthHeaders() });
        toast.success(language === 'de' ? 'Hotel erstellt' : 'Hotel created');
      }
      fetchHotels();
      setDialogOpen(false);
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Speichern' : 'Error saving');
    }
  };

  const handleDelete = async (hotelId) => {
    if (!window.confirm(language === 'de' ? 'Hotel wirklich löschen?' : 'Really delete hotel?')) return;
    try {
      await axios.delete(`${API}/admin/hotels/${hotelId}`, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Hotel gelöscht' : 'Hotel deleted');
      fetchHotels();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Löschen' : 'Error deleting');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-hotels">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">{t('adminHotels')}</h1>
        <Button onClick={handleCreate} className="bg-[#6B1D2A] hover:bg-[#8A2536]" data-testid="add-hotel-btn">
          <Plus className="w-4 h-4 mr-2" />
          {language === 'de' ? 'Hotel hinzufügen' : 'Add Hotel'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hotels.map((hotel) => (
          <Card key={hotel.id} className="border-[#E5E0D5]">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <img
                  src={hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200'}
                  alt={hotel.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{hotel.name}</h3>
                  <p className="text-sm text-[#4A4A4A]">{hotel.address}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-[#6B1D2A] font-semibold">EZ: {hotel.single_price}€</span>
                    <span className="mx-2">|</span>
                    <span className="text-[#6B1D2A] font-semibold">DZ: {hotel.double_price}€</span>
                  </div>
                  <Badge className={hotel.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {hotel.active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleEdit(hotel)} data-testid={`edit-hotel-${hotel.id}`}>
                  <Edit className="w-4 h-4 mr-1" /> {t('edit')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(hotel.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-1" /> {t('delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hotel Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHotel ? (language === 'de' ? 'Hotel bearbeiten' : 'Edit Hotel') : (language === 'de' ? 'Neues Hotel' : 'New Hotel')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name (DE)</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <Label>Name (EN)</Label>
              <Input value={formData.name_en} onChange={(e) => setFormData({...formData, name_en: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Beschreibung (DE)</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Description (EN)</Label>
              <Textarea value={formData.description_en} onChange={(e) => setFormData({...formData, description_en: e.target.value})} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div>
              <Label>Sterne</Label>
              <Input type="number" min="1" max="5" value={formData.stars} onChange={(e) => setFormData({...formData, stars: parseInt(e.target.value)})} />
            </div>
            <div>
              <Label>Entfernung (DE)</Label>
              <Input value={formData.distance_to_venue} onChange={(e) => setFormData({...formData, distance_to_venue: e.target.value})} />
            </div>
            <div>
              <Label>Distance (EN)</Label>
              <Input value={formData.distance_to_venue_en} onChange={(e) => setFormData({...formData, distance_to_venue_en: e.target.value})} />
            </div>
            <div>
              <Label>Einzelzimmer (€)</Label>
              <Input type="number" step="0.01" value={formData.single_price} onChange={(e) => setFormData({...formData, single_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <Label>Doppelzimmer (€)</Label>
              <Input type="number" step="0.01" value={formData.double_price} onChange={(e) => setFormData({...formData, double_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <Label>Zweibettzimmer (€)</Label>
              <Input type="number" step="0.01" value={formData.twin_price} onChange={(e) => setFormData({...formData, twin_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <Label>Bilder (URLs, kommagetrennt)</Label>
              <Input value={Array.isArray(formData.images) ? formData.images.join(', ') : formData.images} onChange={(e) => setFormData({...formData, images: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} className="bg-[#6B1D2A] hover:bg-[#8A2536]">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Payments Management
const PaymentsManagement = () => {
  const { t, language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API}/admin/payments`, { headers: getAuthHeaders() });
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      initiated: { label: 'Initiiert', className: 'bg-gray-100 text-gray-800' },
      paid: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
      failed: { label: 'Fehlgeschlagen', className: 'bg-red-100 text-red-800' },
    };
    const c = config[status] || config.initiated;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-payments">
      <h1 className="font-serif text-3xl text-[#1A1A1A] mb-8">{t('adminPayments')}</h1>
      
      <Card className="border-[#E5E0D5]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>{language === 'de' ? 'Methode' : 'Method'}</TableHead>
                  <TableHead>{language === 'de' ? 'Betrag' : 'Amount'}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{language === 'de' ? 'Datum' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-[#F5F2EA]">
                    <TableCell className="font-mono text-xs">{payment.session_id?.slice(0, 20)}...</TableCell>
                    <TableCell className="capitalize">{payment.payment_method}</TableCell>
                    <TableCell className="font-semibold">{payment.amount?.toFixed(2)} {payment.currency}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{new Date(payment.created_at).toLocaleDateString('de-DE')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {payments.length === 0 && (
            <div className="text-center py-12 text-[#4A4A4A]">
              {language === 'de' ? 'Keine Zahlungen vorhanden.' : 'No payments found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main Admin Dashboard
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E0D5] flex items-center px-4 z-30">
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
        <span className="ml-4 font-serif text-lg">Admin</span>
      </div>

      {/* Main content */}
      <main className="md:ml-64 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="bookings" element={<BookingsManagement />} />
          <Route path="hotels" element={<HotelsManagement />} />
          <Route path="payments" element={<PaymentsManagement />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;

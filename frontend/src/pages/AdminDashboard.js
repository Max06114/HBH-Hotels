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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  LayoutDashboard, Hotel, CalendarCheck, CreditCard, LogOut, Menu, X, 
  Plus, Edit, Trash2, Download, Eye, Ban, Loader2, Music, Users, Euro, TrendingUp,
  Bell, Mail, Clock, Image, Upload, Check, GripVertical, Pencil, Play
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// German price format helper (comma as decimal separator)
const formatPrice = (price) => {
  if (price === null || price === undefined) return '0,00';
  return price.toFixed(2).replace('.', ',');
};

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
    { path: '/admin/images', icon: Image, label: language === 'de' ? 'Bildmanager' : 'Image Manager' },
    { path: '/admin/payments', icon: CreditCard, label: t('adminPayments') },
    { path: '/admin/reminders', icon: Bell, label: language === 'de' ? 'Erinnerungen' : 'Reminders' },
    { path: '/admin/scheduler', icon: Clock, label: language === 'de' ? 'Automatisierung' : 'Automation' },
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
    { label: language === 'de' ? 'Umsatz' : 'Revenue', value: `${formatPrice(stats?.total_revenue || 0)} €`, icon: Euro, color: 'bg-[#6B1D2A]' },
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
  const [exporting, setExporting] = useState(false);

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

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await axios.get(`${API}/admin/bookings/export`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'buchungsuebersicht.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(language === 'de' ? 'CSV exportiert' : 'CSV exported');
    } catch (error) {
      toast.error(language === 'de' ? 'Export fehlgeschlagen' : 'Export failed');
    } finally {
      setExporting(false);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">{t('adminBookings')}</h1>
        <Button 
          onClick={handleExportCSV}
          disabled={exporting}
          className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {language === 'de' ? 'CSV Export' : 'Export CSV'}
        </Button>
      </div>
      
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
                    <TableCell className="font-semibold">{formatPrice(booking.total_price)} €</TableCell>
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
                    <TableCell className="font-semibold">{formatPrice(payment.amount)} {payment.currency}</TableCell>
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

// Reminders Management
const RemindersManagement = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [pendingReminders, setPendingReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingSingle, setSendingSingle] = useState(null);

  useEffect(() => {
    fetchPendingReminders();
  }, []);

  const fetchPendingReminders = async () => {
    try {
      const response = await axios.get(`${API}/admin/pending-reminders`, { headers: getAuthHeaders() });
      setPendingReminders(response.data.pending_reminders || []);
    } catch (error) {
      console.error('Error fetching pending reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async () => {
    setSending(true);
    try {
      const response = await axios.post(`${API}/admin/send-reminders`, {}, { headers: getAuthHeaders() });
      toast.success(language === 'de' 
        ? `${response.data.sent_count} Erinnerungen gesendet` 
        : `${response.data.sent_count} reminders sent`);
      fetchPendingReminders();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Senden' : 'Error sending reminders');
    } finally {
      setSending(false);
    }
  };

  const handleSendSingleReminder = async (bookingId) => {
    setSendingSingle(bookingId);
    try {
      await axios.post(`${API}/admin/bookings/${bookingId}/send-reminder`, {}, { headers: getAuthHeaders() });
      toast.success(language === 'de' 
        ? 'Zahlungserinnerung mit Zahlungslinks gesendet!' 
        : 'Payment reminder with payment links sent!');
      fetchPendingReminders();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || (language === 'de' ? 'Fehler beim Senden' : 'Error sending reminder');
      toast.error(errorMsg);
    } finally {
      setSendingSingle(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-reminders">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">
          {language === 'de' ? 'Zahlungserinnerungen' : 'Payment Reminders'}
        </h1>
        <Button 
          onClick={handleSendReminders} 
          disabled={sending || pendingReminders.length === 0}
          className="bg-[#6B1D2A] hover:bg-[#8A2536]"
          data-testid="send-reminders-btn"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
          {language === 'de' ? 'Alle Erinnerungen senden' : 'Send All Reminders'}
        </Button>
      </div>

      <Card className="border-[#E5E0D5] mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-[#4A4A4A]">
                {language === 'de' ? 'Ausstehende Erinnerungen' : 'Pending Reminders'}
              </p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{pendingReminders.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E5E0D5]">
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'de' ? 'Buchungen mit ausstehender Restzahlung' : 'Bookings with pending balance'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'de' ? 'Buchungsnummer' : 'Booking Number'}</TableHead>
                  <TableHead>{language === 'de' ? 'Gast' : 'Guest'}</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>{language === 'de' ? 'Anreise' : 'Check-in'}</TableHead>
                  <TableHead>{language === 'de' ? 'Tage bis Anreise' : 'Days until'}</TableHead>
                  <TableHead>{language === 'de' ? 'Restbetrag' : 'Remaining'}</TableHead>
                  <TableHead>{language === 'de' ? 'Aktionen' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReminders.map((booking) => (
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
                    <TableCell>
                      <Badge className={booking.days_until_checkin <= 42 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}>
                        {booking.days_until_checkin} {language === 'de' ? 'Tage' : 'days'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-[#6B1D2A]">{formatPrice(booking.remaining_amount)} €</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleSendSingleReminder(booking.id)}
                        disabled={sendingSingle === booking.id}
                        className="bg-[#6B1D2A] hover:bg-[#8A2536] text-xs"
                        data-testid={`send-reminder-${booking.id}`}
                      >
                        {sendingSingle === booking.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Mail className="w-3 h-3 mr-1" />
                            {language === 'de' ? 'Senden' : 'Send'}
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pendingReminders.length === 0 && (
            <div className="text-center py-12 text-[#4A4A4A]">
              {language === 'de' ? 'Keine ausstehenden Erinnerungen.' : 'No pending reminders.'}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-[#F5F2EA] rounded-lg">
        <p className="text-sm text-[#4A4A4A]">
          <strong>{language === 'de' ? 'Info:' : 'Info:'}</strong>{' '}
          {language === 'de' 
            ? 'Zahlungserinnerungen enthalten automatisch generierte Zahlungslinks für Stripe (Kreditkarte) und PayPal sowie einen Link zum Download der Rechnung. Klicken Sie auf "Senden", um eine individuelle Erinnerung zu versenden.'
            : 'Payment reminders automatically include generated payment links for Stripe (credit card) and PayPal, plus an invoice download link. Click "Send" to send individual reminders.'}
        </p>
      </div>
    </div>
  );
};

// Scheduler Management
const SchedulerManagement = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchSchedulerStatus();
  }, []);

  const fetchSchedulerStatus = async () => {
    try {
      const response = await axios.get(`${API}/admin/scheduler/status`, { headers: getAuthHeaders() });
      setSchedulerStatus(response.data);
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunReminders = async () => {
    setRunning(true);
    try {
      const response = await axios.post(`${API}/admin/scheduler/run-reminders`, {}, { headers: getAuthHeaders() });
      toast.success(language === 'de' 
        ? `Job ausgeführt: ${response.data.result.sent} gesendet, ${response.data.result.failed} fehlgeschlagen` 
        : `Job executed: ${response.data.result.sent} sent, ${response.data.result.failed} failed`);
      fetchSchedulerStatus();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Ausführen' : 'Error running job');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-scheduler">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">
          {language === 'de' ? 'Automatisierung' : 'Automation'}
        </h1>
      </div>

      {/* Scheduler Status */}
      <Card className="border-[#E5E0D5] mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {language === 'de' ? 'Scheduler Status' : 'Scheduler Status'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${schedulerStatus?.scheduler_running ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              {schedulerStatus?.scheduler_running 
                ? (language === 'de' ? 'Scheduler läuft' : 'Scheduler running')
                : (language === 'de' ? 'Scheduler gestoppt' : 'Scheduler stopped')}
            </span>
          </div>
          
          {schedulerStatus?.jobs?.length > 0 && (
            <div className="bg-[#F5F2EA] rounded-lg p-4 mb-4">
              <h4 className="font-medium mb-2">{language === 'de' ? 'Geplante Jobs:' : 'Scheduled Jobs:'}</h4>
              {schedulerStatus.jobs.map((job) => (
                <div key={job.id} className="text-sm mb-2">
                  <p className="font-medium">{job.name}</p>
                  <p className="text-[#4A4A4A]">
                    {language === 'de' ? 'Nächste Ausführung:' : 'Next run:'}{' '}
                    {job.next_run ? new Date(job.next_run).toLocaleString('de-DE', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </p>
                  <p className="text-xs text-[#6B1D2A]">{job.trigger}</p>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleRunReminders}
            disabled={running}
            className="bg-[#6B1D2A] hover:bg-[#8A2536]"
            data-testid="run-reminders-btn"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {language === 'de' ? 'Erinnerungen jetzt senden' : 'Run Reminders Now'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Job Runs */}
      <Card className="border-[#E5E0D5]">
        <CardHeader>
          <CardTitle>
            {language === 'de' ? 'Letzte Ausführungen' : 'Recent Runs'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'de' ? 'Zeitpunkt' : 'Timestamp'}</TableHead>
                  <TableHead>{language === 'de' ? 'Verarbeitet' : 'Processed'}</TableHead>
                  <TableHead>{language === 'de' ? 'Gesendet' : 'Sent'}</TableHead>
                  <TableHead>{language === 'de' ? 'Fehlgeschlagen' : 'Failed'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulerStatus?.recent_runs?.length > 0 ? (
                  schedulerStatus.recent_runs.map((run, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(run.run_at).toLocaleString('de-DE')}</TableCell>
                      <TableCell>{run.bookings_processed}</TableCell>
                      <TableCell className="text-green-600">{run.sent_count}</TableCell>
                      <TableCell className="text-red-600">{run.failed_count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-[#4A4A4A]">
                      {language === 'de' ? 'Noch keine Ausführungen' : 'No runs yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-[#F5F2EA] rounded-lg">
        <p className="text-sm text-[#4A4A4A]">
          <strong>{language === 'de' ? 'Info:' : 'Info:'}</strong>{' '}
          {language === 'de' 
            ? 'Der Scheduler läuft automatisch jeden Montag um 9:00 Uhr (UTC) und sendet Zahlungserinnerungen an alle Buchungen, deren Anreise in 6-7 Wochen ist und die noch nicht erinnert wurden.'
            : 'The scheduler runs automatically every Monday at 9:00 AM (UTC) and sends payment reminders to all bookings with check-in in 6-7 weeks that haven\'t been reminded yet.'}
        </p>
      </div>
    </div>
  );
};

// Sortable Image Item for selection
const SortableImageItem = ({ image, index, isSelected, onToggle, onDelete, getImageUrl, hotels }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const labels = ['Außenansicht', 'Zimmer', 'Restaurant'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg overflow-hidden border-2 transition-colors ${
        isSelected ? 'border-[#6B1D2A]' : 'border-[#E5E0D5] hover:border-[#D4AF37]'
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 w-6 h-6 bg-white/90 rounded cursor-grab active:cursor-grabbing flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-[#4A4A4A]" />
      </div>

      {/* Position badge */}
      <div className="absolute top-2 left-10 bg-[#D4AF37] text-white text-xs px-2 py-0.5 rounded-full font-medium">
        {index + 1}. {labels[index] || `Bild ${index + 1}`}
      </div>

      <img
        src={getImageUrl(image.id)}
        alt={image.original_filename}
        className="w-full h-32 object-cover cursor-pointer"
        onClick={() => onToggle(image.id)}
      />
      
      {/* Selection indicator */}
      {isSelected && (
        <div 
          className="absolute bottom-2 left-2 w-6 h-6 bg-[#6B1D2A] rounded-full flex items-center justify-center cursor-pointer"
          onClick={() => onToggle(image.id)}
        >
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
        className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="truncate">{image.original_filename}</p>
        {image.hotel_id && (
          <p className="text-[#D4AF37] truncate">
            {hotels.find(h => h.id === image.hotel_id)?.name || 'Hotel'}
          </p>
        )}
      </div>
    </div>
  );
};

// Sortable Hotel Image for sorting within a hotel filter
const SortableHotelImage = ({ image, index, onDelete, onRename, getImageUrl, hotels, language }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const displayName = image.custom_name || image.original_filename;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg overflow-hidden border-2 border-[#E5E0D5] hover:border-[#D4AF37] transition-colors"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 w-8 h-8 bg-white/90 rounded cursor-grab active:cursor-grabbing flex items-center justify-center z-10"
      >
        <GripVertical className="w-5 h-5 text-[#4A4A4A]" />
      </div>

      {/* Position badge */}
      <div className="absolute top-2 left-12 bg-[#D4AF37] text-white text-xs px-2 py-1 rounded-full font-medium max-w-[60%] truncate">
        {index + 1}. {displayName}
      </div>

      <img
        src={getImageUrl(image.id)}
        alt={displayName}
        className="w-full h-32 object-cover"
      />
      
      {/* Rename button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRename(image); }}
        className="absolute top-2 right-10 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        title={language === 'de' ? 'Umbenennen' : 'Rename'}
      >
        <Pencil className="w-3 h-3" />
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
        className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="truncate">{displayName}</p>
        {image.hotel_id && (
          <p className="text-[#D4AF37] truncate">
            {hotels.find(h => h.id === image.hotel_id)?.name || 'Hotel'}
          </p>
        )}
      </div>
    </div>
  );
};

// Image Manager Component
const ImageManager = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [images, setImages] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [assignToHotel, setAssignToHotel] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingImage, setRenamingImage] = useState(null);
  const [newImageName, setNewImageName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchImages();
    fetchHotels();
  }, [selectedHotel]);

  const fetchImages = async () => {
    try {
      const params = selectedHotel !== 'all' ? `?hotel_id=${selectedHotel}` : '';
      const response = await axios.get(`${API}/admin/images${params}`, { headers: getAuthHeaders() });
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotels = async () => {
    try {
      const response = await axios.get(`${API}/admin/hotels`, { headers: getAuthHeaders() });
      setHotels(response.data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    }
  };

  const handleOpenRenameDialog = (image) => {
    setRenamingImage(image);
    setNewImageName(image.custom_name || '');
    setRenameDialogOpen(true);
  };

  const handleRenameImage = async () => {
    if (!renamingImage || !newImageName.trim()) return;
    
    try {
      await axios.put(
        `${API}/admin/images/${renamingImage.id}/rename`,
        { custom_name: newImageName.trim() },
        { headers: getAuthHeaders() }
      );
      toast.success(language === 'de' ? 'Bild umbenannt' : 'Image renamed');
      setRenameDialogOpen(false);
      setRenamingImage(null);
      setNewImageName('');
      fetchImages();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Umbenennen' : 'Error renaming');
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        await axios.post(`${API}/admin/images/upload`, formData, {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
        });
        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`${file.name}: ${language === 'de' ? 'Upload fehlgeschlagen' : 'Upload failed'}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} ${language === 'de' ? 'Bilder hochgeladen' : 'images uploaded'}`);
      fetchImages();
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm(language === 'de' ? 'Bild wirklich löschen?' : 'Delete this image?')) return;
    
    try {
      await axios.delete(`${API}/admin/images/${imageId}`, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Bild gelöscht' : 'Image deleted');
      setSelectedImages(prev => prev.filter(id => id !== imageId));
      fetchImages();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Löschen' : 'Error deleting');
    }
  };

  const toggleImageSelection = (imageId) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = selectedImages.indexOf(active.id);
      const newIndex = selectedImages.indexOf(over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(selectedImages, oldIndex, newIndex);
        setSelectedImages(newOrder);
      }
    }
  };

  // Handle drag end for images already assigned to a hotel (in filter view)
  const handleHotelImagesDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || selectedHotel === 'all') return;
    
    const oldIndex = images.findIndex(img => img.id === active.id);
    const newIndex = images.findIndex(img => img.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(images, oldIndex, newIndex);
      setImages(newOrder);
      
      // Save new order to backend
      const imageIds = newOrder.map(img => img.id);
      try {
        await axios.put(
          `${API}/admin/hotels/${selectedHotel}/images`,
          imageIds,
          { headers: getAuthHeaders() }
        );
        toast.success(language === 'de' ? 'Reihenfolge gespeichert!' : 'Order saved!');
      } catch (error) {
        toast.error(language === 'de' ? 'Fehler beim Speichern' : 'Error saving order');
        fetchImages(); // Revert on error
      }
    }
  };

  const handleAssignToHotel = async () => {
    if (!assignToHotel || selectedImages.length === 0) return;

    try {
      // Send images in the sorted order
      await axios.put(
        `${API}/admin/hotels/${assignToHotel}/images`,
        selectedImages,
        { headers: getAuthHeaders() }
      );
      toast.success(language === 'de' ? 'Bilder zugewiesen (in gewählter Reihenfolge)' : 'Images assigned (in selected order)');
      setAssignDialogOpen(false);
      setSelectedImages([]);
      fetchImages();
      fetchHotels();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Zuweisen' : 'Error assigning');
    }
  };

  const getImageUrl = (imageId) => {
    return `${process.env.REACT_APP_BACKEND_URL}/api/images/${imageId}`;
  };

  // Get selected images in order for preview
  const selectedImagesData = selectedImages.map(id => images.find(img => img.id === id)).filter(Boolean);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-images">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">
          {language === 'de' ? 'Bildmanager' : 'Image Manager'}
        </h1>
        <div className="flex gap-2">
          {selectedImages.length > 0 && (
            <Button 
              onClick={() => setAssignDialogOpen(true)}
              variant="outline"
              data-testid="assign-images-btn"
            >
              <Hotel className="w-4 h-4 mr-2" />
              {language === 'de' ? `${selectedImages.length} Bilder zuweisen` : `Assign ${selectedImages.length} images`}
            </Button>
          )}
          <label>
            <Button asChild className="bg-[#6B1D2A] hover:bg-[#8A2536] cursor-pointer">
              <span>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {language === 'de' ? 'Bilder hochladen' : 'Upload Images'}
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
              data-testid="image-upload-input"
            />
          </label>
        </div>
      </div>

      {/* Selected Images Preview with Drag & Drop */}
      {selectedImages.length > 0 && (
        <Card className="border-[#6B1D2A] bg-[#6B1D2A]/5 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <GripVertical className="w-5 h-5 text-[#6B1D2A]" />
              <Label className="text-[#6B1D2A] font-semibold">
                {language === 'de' ? 'Ausgewählte Bilder (ziehen zum Sortieren):' : 'Selected Images (drag to sort):'}
              </Label>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={selectedImages} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {selectedImagesData.map((image, index) => (
                    <SortableImageItem
                      key={image.id}
                      image={image}
                      index={index}
                      isSelected={true}
                      onToggle={toggleImageSelection}
                      onDelete={handleDelete}
                      getImageUrl={getImageUrl}
                      hotels={hotels}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <p className="text-xs text-[#4A4A4A] mt-3">
              {language === 'de' 
                ? '1. Außenansicht • 2. Zimmer • 3. Restaurant/Lobby' 
                : '1. Exterior • 2. Room • 3. Restaurant/Lobby'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <Card className="border-[#E5E0D5] mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Label>{language === 'de' ? 'Filter nach Hotel:' : 'Filter by Hotel:'}</Label>
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'de' ? 'Alle Bilder' : 'All Images'}</SelectItem>
                  {hotels.map(hotel => (
                    <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedHotel !== 'all' && (
              <div className="flex items-center gap-2 text-sm text-[#6B1D2A] bg-[#6B1D2A]/10 px-3 py-2 rounded-lg">
                <GripVertical className="w-4 h-4" />
                <span>{language === 'de' ? 'Bilder per Drag & Drop sortieren' : 'Drag & drop to sort images'}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Images Grid - with drag & drop when hotel is selected */}
      {selectedHotel !== 'all' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleHotelImagesDragEnd}>
          <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((image, index) => (
                <SortableHotelImage
                  key={image.id}
                  image={image}
                  index={index}
                  onDelete={handleDelete}
                  onRename={handleOpenRenameDialog}
                  getImageUrl={getImageUrl}
                  hotels={hotels}
                  language={language}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image) => (
            <div 
              key={image.id} 
              className={`relative group rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                selectedImages.includes(image.id) ? 'border-[#6B1D2A] ring-2 ring-[#6B1D2A]/30' : 'border-[#E5E0D5] hover:border-[#D4AF37]'
              }`}
              onClick={() => toggleImageSelection(image.id)}
            >
              <img
                src={getImageUrl(image.id)}
                alt={image.custom_name || image.original_filename}
                className="w-full h-32 object-cover"
              />
              
              {/* Selection indicator with number */}
              {selectedImages.includes(image.id) && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-[#6B1D2A] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {selectedImages.indexOf(image.id) + 1}
                </div>
              )}
              
              {/* Rename button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenRenameDialog(image); }}
                className="absolute top-2 right-10 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title={language === 'de' ? 'Umbenennen' : 'Rename'}
              >
                <Pencil className="w-3 h-3" />
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(image.id); }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="truncate">{image.custom_name || image.original_filename}</p>
                {image.hotel_id && (
                  <p className="text-[#D4AF37] truncate">
                    {hotels.find(h => h.id === image.hotel_id)?.name || 'Hotel'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-12 text-[#4A4A4A]">
          <Image className="w-16 h-16 mx-auto mb-4 text-[#E5E0D5]" />
          <p>{language === 'de' ? 'Keine Bilder vorhanden.' : 'No images found.'}</p>
          <p className="text-sm mt-2">
            {language === 'de' ? 'Laden Sie Bilder hoch, um sie Hotels zuzuweisen.' : 'Upload images to assign them to hotels.'}
          </p>
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'de' ? 'Bilder einem Hotel zuweisen' : 'Assign Images to Hotel'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>{language === 'de' ? 'Hotel auswählen:' : 'Select Hotel:'}</Label>
            <Select value={assignToHotel} onValueChange={setAssignToHotel}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={language === 'de' ? 'Hotel wählen...' : 'Choose hotel...'} />
              </SelectTrigger>
              <SelectContent>
                {hotels.map(hotel => (
                  <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Preview order */}
            <div className="mt-4 p-3 bg-[#F5F2EA] rounded-lg">
              <p className="text-sm font-medium mb-2">{language === 'de' ? 'Reihenfolge:' : 'Order:'}</p>
              <div className="flex gap-2 overflow-x-auto">
                {selectedImagesData.map((img, idx) => (
                  <div key={img.id} className="flex-shrink-0 text-center">
                    <img src={getImageUrl(img.id)} alt="" className="w-16 h-12 object-cover rounded" />
                    <p className="text-xs text-[#4A4A4A] mt-1">{idx + 1}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-sm text-[#4A4A4A] mt-4">
              {language === 'de' 
                ? 'Die Bilder werden in dieser Reihenfolge angezeigt (1. Außenansicht, 2. Zimmer, 3. Restaurant).'
                : 'Images will be displayed in this order (1. Exterior, 2. Room, 3. Restaurant).'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {language === 'de' ? 'Abbrechen' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleAssignToHotel} 
              disabled={!assignToHotel}
              className="bg-[#6B1D2A] hover:bg-[#8A2536]"
            >
              {language === 'de' ? 'Zuweisen' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'de' ? 'Bild umbenennen' : 'Rename Image'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {renamingImage && (
              <div className="mb-4">
                <img 
                  src={getImageUrl(renamingImage.id)} 
                  alt="" 
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
            <Label>{language === 'de' ? 'Neuer Name:' : 'New name:'}</Label>
            <Input 
              value={newImageName}
              onChange={(e) => setNewImageName(e.target.value)}
              placeholder={language === 'de' ? 'z.B. Außenansicht, Lobby, Zimmer...' : 'e.g. Exterior, Lobby, Room...'}
              className="mt-2"
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameImage(); }}
            />
            <p className="text-xs text-[#4A4A4A] mt-2">
              {language === 'de' 
                ? `Originaler Dateiname: ${renamingImage?.original_filename || ''}`
                : `Original filename: ${renamingImage?.original_filename || ''}`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              {language === 'de' ? 'Abbrechen' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleRenameImage}
              disabled={!newImageName.trim()}
              className="bg-[#6B1D2A] hover:bg-[#8A2536]"
            >
              {language === 'de' ? 'Speichern' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          <Route path="images" element={<ImageManager />} />
          <Route path="payments" element={<PaymentsManagement />} />
          <Route path="reminders" element={<RemindersManagement />} />
          <Route path="scheduler" element={<SchedulerManagement />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;

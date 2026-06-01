import React, { useState, useEffect, useCallback } from 'react';
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
  Bell, Mail, Clock, Image as ImageIcon, Upload, Check, GripVertical, Pencil, Play, Package, RefreshCw, ExternalLink
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
    { path: '/admin/inventory', icon: Package, label: language === 'de' ? 'Lagerhaltung' : 'Inventory' },
    { path: '/admin/images', icon: ImageIcon, label: language === 'de' ? 'Bildmanager' : 'Image Manager' },
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

// Bookings Management
const BookingsManagement = () => {
  const { t, language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/bookings`, { headers: getAuthHeaders() });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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

  const handleToggleActive = async (hotel) => {
    try {
      await axios.put(`${API}/admin/hotels/${hotel.id}`, { ...hotel, active: !hotel.active }, { headers: getAuthHeaders() });
      toast.success(hotel.active 
        ? (language === 'de' ? 'Hotel deaktiviert' : 'Hotel deactivated')
        : (language === 'de' ? 'Hotel aktiviert' : 'Hotel activated')
      );
      fetchHotels();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Aktualisieren' : 'Error updating');
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleToggleActive(hotel)}
                  className={hotel.active ? 'text-orange-600' : 'text-green-600'}
                  data-testid={`toggle-hotel-${hotel.id}`}
                >
                  {hotel.active ? (language === 'de' ? 'Deaktivieren' : 'Deactivate') : (language === 'de' ? 'Aktivieren' : 'Activate')}
                </Button>
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
                  schedulerStatus.recent_runs.map((run) => (
                    <TableRow key={run.run_at}>
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

// Inventory Management Component
const InventoryManagement = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [editValues, setEditValues] = useState({});

  const fetchInventory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/inventory`, { headers: getAuthHeaders() });
      setInventoryData(response.data.hotels || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error(language === 'de' ? 'Fehler beim Laden des Inventars' : 'Error loading inventory');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, language]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSeedInventory = async () => {
    if (!window.confirm(language === 'de' 
      ? 'Inventardaten initialisieren? (Überschreibt bestehende Werte)'
      : 'Initialize inventory data? (Overwrites existing values)')) {
      return;
    }
    
    setSeeding(true);
    try {
      const response = await axios.post(`${API}/admin/seed-inventory`, {}, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Inventar initialisiert!' : 'Inventory initialized!');
      fetchInventory();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Initialisieren' : 'Error initializing');
    } finally {
      setSeeding(false);
    }
  };

  const handleEditStart = (hotel) => {
    setEditingHotel(hotel.hotel_id);
    setEditValues({
      single: hotel.inventory?.single || 0,
      double: hotel.inventory?.double || 0,
      twin: hotel.inventory?.twin || 0,
      standard_pool: hotel.inventory?.standard_pool || 0,
      comfort_pool: hotel.inventory?.comfort_pool || 0
    });
  };

  const handleSaveInventory = async (hotelId) => {
    try {
      await axios.put(`${API}/admin/inventory/${hotelId}`, editValues, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Inventar aktualisiert!' : 'Inventory updated!');
      setEditingHotel(null);
      fetchInventory();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Speichern' : 'Error saving');
    }
  };

  const getRoomTypeLabel = (type, lang) => {
    const labels = {
      de: { single: 'EZ', double: 'DZ', twin: 'Twin', standard_pool: 'Standard Pool', comfort_pool: 'Komfort Pool' },
      en: { single: 'Single', double: 'Double', twin: 'Twin', standard_pool: 'Standard Pool', comfort_pool: 'Comfort Pool' }
    };
    return labels[lang]?.[type] || type;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-inventory">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">
          {language === 'de' ? 'Lagerhaltung / Zimmer-Inventar' : 'Room Inventory'}
        </h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchInventory}
            data-testid="refresh-inventory-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'de' ? 'Aktualisieren' : 'Refresh'}
          </Button>
          <Button 
            onClick={handleSeedInventory}
            disabled={seeding}
            className="bg-[#6B1D2A] hover:bg-[#8A2536]"
            data-testid="seed-inventory-btn"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
            {language === 'de' ? 'Inventar initialisieren' : 'Initialize Inventory'}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 mb-6">
        <CardContent className="pt-6">
          <p className="text-blue-800 text-sm">
            <strong>{language === 'de' ? 'Info:' : 'Info:'}</strong>{' '}
            {language === 'de' 
              ? 'Das Inventar wird bei erfolgreicher Zahlung (Anzahlung) reduziert und bei Stornierung wieder erhöht. Pool-basierte Hotels (z.B. Dorint) können Zimmer flexibel als EZ, DZ oder Twin nutzen.'
              : 'Inventory is decremented on successful payment (deposit) and restored on cancellation. Pool-based hotels (e.g., Dorint) can use rooms flexibly as single, double, or twin.'}
          </p>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <div className="space-y-6">
        {inventoryData.map((hotel) => (
          <Card key={hotel.hotel_id} className="border-[#E5E0D5]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{hotel.hotel_name}</CardTitle>
                <Badge className={hotel.inventory_type === 'pool' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                  {hotel.inventory_type === 'pool' 
                    ? (language === 'de' ? 'Pool-basiert (flexibel)' : 'Pool-based (flexible)')
                    : (language === 'de' ? 'Feste Zimmertypen' : 'Fixed room types')}
                </Badge>
                {!hotel.active && (
                  <Badge className="ml-2 bg-gray-100 text-gray-800">
                    {language === 'de' ? 'Inaktiv' : 'Inactive'}
                  </Badge>
                )}
              </div>
              {editingHotel === hotel.hotel_id ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingHotel(null)}>
                    {language === 'de' ? 'Abbrechen' : 'Cancel'}
                  </Button>
                  <Button size="sm" className="bg-[#6B1D2A] hover:bg-[#8A2536]" onClick={() => handleSaveInventory(hotel.hotel_id)}>
                    {language === 'de' ? 'Speichern' : 'Save'}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleEditStart(hotel)} data-testid={`edit-inventory-${hotel.hotel_id}`}>
                  <Edit className="w-4 h-4 mr-1" />
                  {language === 'de' ? 'Bearbeiten' : 'Edit'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'de' ? 'Zimmertyp' : 'Room Type'}</TableHead>
                      <TableHead className="text-center">{language === 'de' ? 'Verfügbar' : 'Available'}</TableHead>
                      <TableHead className="text-center">{language === 'de' ? 'Gebucht' : 'Booked'}</TableHead>
                      <TableHead className="text-center">{language === 'de' ? 'Gesamt' : 'Total'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotel.inventory_type === 'pool' ? (
                      // Pool-based display (Dorint)
                      <>
                        <TableRow className="bg-[#F5F2EA]/50">
                          <TableCell className="font-medium">
                            {language === 'de' ? 'Standard-Zimmer' : 'Standard Rooms'}
                            <span className="text-xs text-[#4A4A4A] block">(EZ/DZ/Twin)</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {editingHotel === hotel.hotel_id ? (
                              <Input 
                                type="number" 
                                min="0"
                                className="w-20 text-center mx-auto"
                                value={editValues.standard_pool}
                                onChange={(e) => setEditValues({...editValues, standard_pool: parseInt(e.target.value) || 0})}
                              />
                            ) : (
                              <span className={`font-bold ${(hotel.inventory?.standard_pool || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {hotel.inventory?.standard_pool || 0}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-[#4A4A4A]">
                            {(hotel.booked?.single || 0) + (hotel.booked?.double || 0) + (hotel.booked?.twin || 0)}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(hotel.inventory?.standard_pool || 0) + (hotel.booked?.single || 0) + (hotel.booked?.double || 0) + (hotel.booked?.twin || 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {language === 'de' ? 'Komfort-Zimmer' : 'Comfort Rooms'}
                            <span className="text-xs text-[#4A4A4A] block">(EZ/DZ/Twin Komfort)</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {editingHotel === hotel.hotel_id ? (
                              <Input 
                                type="number" 
                                min="0"
                                className="w-20 text-center mx-auto"
                                value={editValues.comfort_pool}
                                onChange={(e) => setEditValues({...editValues, comfort_pool: parseInt(e.target.value) || 0})}
                              />
                            ) : (
                              <span className={`font-bold ${(hotel.inventory?.comfort_pool || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {hotel.inventory?.comfort_pool || 0}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-[#4A4A4A]">
                            {(hotel.booked?.single_comfort || 0) + (hotel.booked?.double_comfort || 0) + (hotel.booked?.twin_comfort || 0)}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(hotel.inventory?.comfort_pool || 0) + (hotel.booked?.single_comfort || 0) + (hotel.booked?.double_comfort || 0) + (hotel.booked?.twin_comfort || 0)}
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      // Fixed room types display (B&B, Ankerhof)
                      ['single', 'double', 'twin'].map((roomType) => (
                        <TableRow key={roomType} className={roomType === 'double' ? 'bg-[#F5F2EA]/50' : ''}>
                          <TableCell className="font-medium">{getRoomTypeLabel(roomType, language)}</TableCell>
                          <TableCell className="text-center">
                            {editingHotel === hotel.hotel_id ? (
                              <Input 
                                type="number" 
                                min="0"
                                className="w-20 text-center mx-auto"
                                value={editValues[roomType]}
                                onChange={(e) => setEditValues({...editValues, [roomType]: parseInt(e.target.value) || 0})}
                              />
                            ) : (
                              <span className={`font-bold ${(hotel.inventory?.[roomType] || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {hotel.inventory?.[roomType] || 0}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-[#4A4A4A]">
                            {hotel.booked?.[roomType] || 0}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(hotel.inventory?.[roomType] || 0) + (hotel.booked?.[roomType] || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Image Manager Component
const ImageManager = () => {
  const { language } = useLanguage();
  
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-[#1A1A1A] mb-6">
        {language === 'de' ? 'Bildmanager' : 'Image Manager'}
      </h1>
      
      {/* Current Solution */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <ImageIcon className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">
                {language === 'de' ? 'Aktuelle Lösung: Statische Bilder' : 'Current Solution: Static Images'}
              </h3>
              <p className="text-amber-700 mt-1">
                {language === 'de' 
                  ? 'Bilder werden als statische Dateien im GitHub Repository verwaltet (/frontend/public/images/hotels/). Nach dem Hinzufügen neuer Bilder muss ein Deployment ausgelöst werden.'
                  : 'Images are managed as static files in the GitHub repository (/frontend/public/images/hotels/). After adding new images, a deployment must be triggered.'}
              </p>
              <a 
                href="https://github.com/Max06114/HBH-Hotels/tree/main/frontend/public/images/hotels" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-amber-800 hover:text-amber-900 font-medium"
              >
                GitHub Repository öffnen
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Solution */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">
                {language === 'de' ? 'Zukünftige Lösung: Cloud Storage' : 'Future Solution: Cloud Storage'}
              </h3>
              <p className="text-blue-700 mt-1">
                {language === 'de' 
                  ? 'Um Bilder direkt über dieses Dashboard hochladen zu können, wird ein Cloud-Storage-Dienst benötigt. Empfohlene Optionen:'
                  : 'To upload images directly through this dashboard, a cloud storage service is needed. Recommended options:'}
              </p>
              <ul className="text-blue-700 mt-2 space-y-1 text-sm">
                <li>• <strong>Cloudinary</strong> - {language === 'de' ? 'Kostenlos bis 25GB, einfache Integration' : 'Free up to 25GB, easy integration'}</li>
                <li>• <strong>AWS S3</strong> - {language === 'de' ? 'Ca. 1€/Monat, sehr zuverlässig' : 'About €1/month, very reliable'}</li>
                <li>• <strong>Vercel Blob</strong> - {language === 'de' ? 'Native Vercel-Integration' : 'Native Vercel integration'}</li>
              </ul>
            </div>
          </div>
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
          <Route path="inventory" element={<InventoryManagement />} />
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

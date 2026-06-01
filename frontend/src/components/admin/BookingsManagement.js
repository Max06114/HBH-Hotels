import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Download, Ban, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  if (price === null || price === undefined) return '0,00';
  return price.toFixed(2).replace('.', ',');
};

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

export default BookingsManagement;

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Clock, Mail, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  if (price === null || price === undefined) return '0,00';
  return price.toFixed(2).replace('.', ',');
};

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
            ? 'Zahlungserinnerungen enthalten automatisch generierte Zahlungslinks für PayPal sowie einen Link zum Download der Rechnung.'
            : 'Payment reminders automatically include generated payment links for PayPal, plus an invoice download link.'}
        </p>
      </div>
    </div>
  );
};

export default RemindersManagement;

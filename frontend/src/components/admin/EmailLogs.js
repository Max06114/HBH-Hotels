import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Loader2, MailCheck, MailX, Paperclip, Send, RotateCw } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { API, formatDateTime } from './utils';

const TYPE_LABELS = {
  de: {
    booking_confirmation: 'Buchungsbestätigung',
    booking_confirmation_resend: 'Bestätigung (erneut gesendet)',
    remaining_confirmation: 'Restzahlung bestätigt',
    payment_reminder: 'Zahlungserinnerung',
    arrival_reminder: 'Anreise-Erinnerung',
    cancellation: 'Stornierung',
    bank_transfer_instructions: 'Reservierung / Überweisungsdaten',
    transfer_reminder: 'Erinnerung Überweisung',
    transfer_expired: 'Reservierung freigegeben',
    test: 'Test-E-Mail',
    admin_alert: 'Admin-Warnung (Zustellfehler)',
    hotel_sold_out: 'Hotel ausgebucht (deaktiviert)',
    hotel_reactivated: 'Hotel wieder buchbar',
    payment_failure_alert: 'Admin-Warnung (Zahlungsprobleme)',
    other: 'Sonstige'
  },
  en: {
    booking_confirmation: 'Booking Confirmation',
    booking_confirmation_resend: 'Confirmation (resent)',
    remaining_confirmation: 'Remaining Payment Confirmed',
    payment_reminder: 'Payment Reminder',
    arrival_reminder: 'Arrival Reminder',
    cancellation: 'Cancellation',
    bank_transfer_instructions: 'Reservation / bank details',
    transfer_reminder: 'Transfer reminder',
    transfer_expired: 'Reservation released',
    test: 'Test email',
    admin_alert: 'Admin Alert (delivery failure)',
    hotel_sold_out: 'Hotel sold out (deactivated)',
    hotel_reactivated: 'Hotel available again',
    payment_failure_alert: 'Admin Alert (payment failures)',
    other: 'Other'
  }
};

const DELIVERY = {
  sent: { de: 'Übergeben', en: 'Sent', cls: 'bg-gray-100 text-gray-700' },
  delayed: { de: 'Verzögert', en: 'Delayed', cls: 'bg-amber-100 text-amber-800' },
  delivered: { de: 'Zugestellt', en: 'Delivered', cls: 'bg-green-100 text-green-800' },
  opened: { de: 'Geöffnet', en: 'Opened', cls: 'bg-green-200 text-green-900' },
  bounced: { de: 'Bounce – nicht zustellbar', en: 'Bounced', cls: 'bg-red-100 text-red-800' },
  complained: { de: 'Als Spam markiert', en: 'Marked as spam', cls: 'bg-red-100 text-red-800' },
  failed: { de: 'Fehlgeschlagen', en: 'Failed', cls: 'bg-red-100 text-red-800' },
};

const DeliveryBadge = ({ status, reason, de }) => {
  const d = DELIVERY[status] || DELIVERY.sent;
  return (
    <div>
      <Badge className={d.cls} title={reason || ''}>{de ? d.de : d.en}</Badge>
      {reason && <p className="text-xs text-red-600 mt-1 max-w-[180px] truncate" title={reason}>{reason}</p>}
    </div>
  );
};

const EmailLogs = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState({ logs: [], total: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [testing, setTesting] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const de = language === 'de';

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const res = await axios.post(`${API}/admin/email-logs/test`, {}, { headers: getAuthHeaders() });
      toast.success(de ? `Test-E-Mail an ${res.data.to} gesendet (${res.data.provider})` : `Test email sent to ${res.data.to} (${res.data.provider})`);
    } catch (error) {
      toast.error((de ? 'Versand fehlgeschlagen: ' : 'Sending failed: ') + (error.response?.data?.detail || error.message), { duration: 10000 });
    } finally {
      setTesting(false);
      fetchLogs();
    }
  };

  const handleResend = async (log) => {
    setResendingId(log.id);
    try {
      await axios.post(`${API}/admin/bookings/${log.booking_id}/resend-confirmation`, {}, { headers: getAuthHeaders() });
      toast.success(de ? `Bestätigung an ${log.to_email} erneut gesendet` : `Confirmation resent to ${log.to_email}`);
    } catch (error) {
      toast.error((de ? 'Erneut senden fehlgeschlagen: ' : 'Resend failed: ') + (error.response?.data?.detail || error.message), { duration: 10000 });
    } finally {
      setResendingId(null);
      fetchLogs();
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/email-logs`, { headers: getAuthHeaders() });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const q = search.toLowerCase();
  const logs = data.logs.filter(l =>
    !q || l.to_email?.toLowerCase().includes(q) || l.booking_number?.toLowerCase().includes(q) || l.subject?.toLowerCase().includes(q)
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-email-logs">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#1A1A1A]">{de ? 'E-Mail-Protokoll' : 'Email Log'}</h1>
          {data.provider && (
            <p className="text-sm text-[#4A4A4A] mt-1" data-testid="email-provider-info">
              {de ? 'Versand über' : 'Sending via'} <strong>{data.provider === 'resend' ? 'Resend (HTTP-API)' : 'SMTP'}</strong> · {data.from_name} &lt;{data.from_email}&gt;
              {data.provider === 'smtp' && (
                <span className="text-amber-700"> · {de ? 'Hinweis: Railway blockiert SMTP – RESEND_API_KEY setzen' : 'Note: Railway blocks SMTP – set RESEND_API_KEY'}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleTestEmail} disabled={testing} variant="outline" className="border-[#6B1D2A] text-[#6B1D2A]" data-testid="send-test-email-btn">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {de ? 'Test-E-Mail senden' : 'Send test email'}
          </Button>
        </div>
        <Input
          placeholder={de ? 'Suche: E-Mail, Buchungsnummer, Betreff…' : 'Search: email, booking number, subject…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-96 border-[#E5E0D5]"
          data-testid="email-logs-search"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="border-[#E5E0D5]">
          <CardContent className="p-4 flex items-center gap-3">
            <MailCheck className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-sm text-[#4A4A4A]">{de ? 'Gesendet' : 'Sent'}</p>
              <p className="text-2xl font-bold" data-testid="email-logs-sent-count">{data.total - data.failed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E5E0D5]">
          <CardContent className="p-4 flex items-center gap-3">
            <MailX className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-sm text-[#4A4A4A]">{de ? 'Fehlgeschlagen' : 'Failed'}</p>
              <p className="text-2xl font-bold" data-testid="email-logs-failed-count">{data.failed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#E5E0D5]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{de ? 'Zeitpunkt' : 'Time'}</TableHead>
                  <TableHead>{de ? 'Empfänger' : 'Recipient'}</TableHead>
                  <TableHead>{de ? 'Buchung' : 'Booking'}</TableHead>
                  <TableHead>{de ? 'Typ' : 'Type'}</TableHead>
                  <TableHead>{de ? 'Betreff' : 'Subject'}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{de ? 'Zustellung' : 'Delivery'}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-[#F5F2EA]" data-testid={`email-log-row-${log.id}`}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(log.sent_at)}</TableCell>
                    <TableCell className="text-sm">
                      {log.to_email}
                      {log.bcc && <p className="text-xs text-[#4A4A4A]">BCC: {log.bcc}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.booking_number || '-'}</TableCell>
                    <TableCell className="text-sm">{TYPE_LABELS[language]?.[log.email_type] || log.email_type}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={log.subject}>
                      {log.has_attachment && <Paperclip className="w-3 h-3 inline mr-1 text-[#4A4A4A]" />}
                      {log.subject}
                    </TableCell>
                    <TableCell>
                      {log.status === 'sent' ? (
                        <Badge className="bg-green-100 text-green-800">{de ? 'Gesendet' : 'Sent'}</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800" title={log.error}>{de ? 'Fehler' : 'Failed'}</Badge>
                      )}
                      {log.error && <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={log.error}>{log.error}</p>}
                    </TableCell>
                    <TableCell data-testid={`delivery-status-${log.id}`}>
                      {log.status === 'sent' && log.provider === 'resend' && (
                        <DeliveryBadge status={log.delivery_status} reason={log.bounce_reason} de={de} />
                      )}
                    </TableCell>
                    <TableCell>
                      {log.status === 'failed' && log.booking_id && ['booking_confirmation', 'booking_confirmation_resend'].includes(log.email_type) && (
                        <Button
                          variant="ghost" size="sm" className="text-[#6B1D2A]"
                          onClick={() => handleResend(log)} disabled={resendingId === log.id}
                          title={de ? 'Bestätigung erneut senden' : 'Resend confirmation'}
                          data-testid={`email-log-resend-${log.id}`}
                        >
                          {resendingId === log.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {logs.length === 0 && (
            <div className="text-center py-12 text-[#4A4A4A]" data-testid="email-logs-empty">
              {de ? 'Noch keine E-Mails protokolliert.' : 'No emails logged yet.'}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-[#F5F2EA] rounded-lg">
        <p className="text-sm text-[#4A4A4A]">
          <strong>Info:</strong>{' '}
          {de
            ? 'Hier werden alle vom System verschickten E-Mails protokolliert. „Zustellung“ zeigt die Rückmeldung von Resend (Zugestellt / Bounce / Spam) – dafür muss in Resend ein Webhook auf /api/webhooks/resend eingerichtet sein. Bei „Bounce“ ist die Adresse meist falsch: Gastdaten korrigieren und Bestätigung erneut senden.'
            : 'All emails sent by the system are logged here. “Delivery” shows Resend feedback (delivered / bounced / spam) – requires a Resend webhook to /api/webhooks/resend. On “bounced” the address is usually wrong: fix guest details and resend.'}
        </p>
      </div>
    </div>
  );
};

export default EmailLogs;

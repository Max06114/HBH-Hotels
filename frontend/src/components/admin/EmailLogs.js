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
    test: 'Test-E-Mail',
    admin_alert: 'Admin-Warnung (Zustellfehler)',
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
    test: 'Test email',
    admin_alert: 'Admin Alert (delivery failure)',
    payment_failure_alert: 'Admin Alert (payment failures)',
    other: 'Other'
  }
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
            ? 'Hier werden alle vom System verschickten E-Mails protokolliert (Bestätigungen, Erinnerungen, Stornierungen). Wenn ein Gast keine E-Mail erhalten hat, prüfen Sie hier, ob sie versendet wurde, und senden Sie die Bestätigung ggf. über die Buchungsliste erneut.'
            : 'All emails sent by the system are logged here. If a guest did not receive an email, check here whether it was sent and resend the confirmation from the bookings list if needed.'}
        </p>
      </div>
    </div>
  );
};

export default EmailLogs;

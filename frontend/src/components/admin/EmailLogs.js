import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Loader2, MailCheck, MailX, Paperclip } from 'lucide-react';
import { API, formatDateTime } from './utils';

const TYPE_LABELS = {
  de: {
    booking_confirmation: 'Buchungsbestätigung',
    booking_confirmation_resend: 'Bestätigung (erneut gesendet)',
    remaining_confirmation: 'Restzahlung bestätigt',
    payment_reminder: 'Zahlungserinnerung',
    arrival_reminder: 'Anreise-Erinnerung',
    cancellation: 'Stornierung',
    admin_alert: 'Admin-Warnung (Zustellfehler)',
    other: 'Sonstige'
  },
  en: {
    booking_confirmation: 'Booking Confirmation',
    booking_confirmation_resend: 'Confirmation (resent)',
    remaining_confirmation: 'Remaining Payment Confirmed',
    payment_reminder: 'Payment Reminder',
    arrival_reminder: 'Arrival Reminder',
    cancellation: 'Cancellation',
    admin_alert: 'Admin Alert (delivery failure)',
    other: 'Other'
  }
};

const EmailLogs = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState({ logs: [], total: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const de = language === 'de';

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
        <h1 className="font-serif text-3xl text-[#1A1A1A]">{de ? 'E-Mail-Protokoll' : 'Email Log'}</h1>
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

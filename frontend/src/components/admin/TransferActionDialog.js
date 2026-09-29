import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Loader2 } from 'lucide-react';
import { API, formatPrice } from './utils';

const TEXT = {
  de: {
    convert: {
      title: 'In Überweisungs-Reservierung umwandeln',
      desc: 'Das Zimmer wird sofort reserviert (7 Tage). Der Gast überweist die Anzahlung; nach Eingang klicken Sie auf „Anzahlung erhalten“.',
      sendMail: 'Überweisungs-E-Mail mit Bankverbindung an den Gast senden',
      confirm: 'Umwandeln'
    },
    deposit: {
      title: 'Anzahlung per Überweisung erhalten',
      desc: 'Status wird auf „Anzahlung bezahlt“ gesetzt. Bestätigung und Rechnung gehen automatisch an den Gast (BCC an Sie).',
      amount: 'Erhaltener Betrag (€)',
      confirm: 'Zahlung verbuchen'
    },
    remaining: {
      title: 'Restzahlung per Überweisung erhalten',
      desc: 'Status wird auf „Vollständig bezahlt“ gesetzt. Der Gast erhält eine Zahlungsbestätigung.',
      amount: 'Erhaltener Betrag (€)',
      confirm: 'Zahlung verbuchen'
    },
    cancel: 'Abbrechen'
  },
  en: {
    convert: {
      title: 'Convert to bank transfer reservation',
      desc: 'The room is reserved immediately (7 days). The guest transfers the deposit; once received, click "Deposit received".',
      sendMail: 'Send bank transfer email with account details to the guest',
      confirm: 'Convert'
    },
    deposit: {
      title: 'Deposit received by bank transfer',
      desc: 'Status becomes "Deposit paid". Confirmation and invoice are sent to the guest automatically (BCC to you).',
      amount: 'Amount received (€)',
      confirm: 'Record payment'
    },
    remaining: {
      title: 'Remaining balance received by bank transfer',
      desc: 'Status becomes "Fully paid". The guest receives a payment confirmation.',
      amount: 'Amount received (€)',
      confirm: 'Record payment'
    },
    cancel: 'Cancel'
  }
};

const TransferActionDialog = ({ action, language, getAuthHeaders, onClose, onDone }) => {
  const [sendMail, setSendMail] = useState(true);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const t = TEXT[language] || TEXT.de;
  const booking = action?.booking;
  const type = action?.type;

  useEffect(() => {
    if (!booking) return;
    setSendMail(true);
    setAmount(type === 'remaining' ? String(booking.remaining_amount) : String(booking.deposit_amount));
  }, [booking, type]);

  const run = async () => {
    setBusy(true);
    try {
      let res;
      if (type === 'convert') {
        res = await axios.post(`${API}/admin/bookings/${booking.id}/convert-to-transfer`, { send_email: sendMail }, { headers: getAuthHeaders() });
        toast.success(language === 'de' ? (sendMail ? 'Reservierung angelegt, E-Mail gesendet' : 'Reservierung angelegt (ohne E-Mail)') : 'Reservation created');
      } else {
        res = await axios.post(`${API}/admin/bookings/${booking.id}/transfer-received`,
          { payment_type: type, amount: amount ? parseFloat(amount) : null }, { headers: getAuthHeaders() });
        toast.success(language === 'de' ? 'Zahlung verbucht, Bestätigung gesendet' : 'Payment recorded, confirmation sent');
      }
      onDone(res.data.booking);
    } catch (error) {
      const d = error.response?.data?.detail;
      toast.error((language === 'de' ? 'Fehler: ' : 'Error: ') + (typeof d === 'string' ? d : error.message));
    } finally {
      setBusy(false);
    }
  };

  if (!booking) return null;
  const tt = t[type];

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-testid="transfer-action-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif">{tt.title}</DialogTitle>
          <DialogDescription>{tt.desc}</DialogDescription>
        </DialogHeader>
        <div className="bg-[#F5F2EA] rounded-lg p-3 text-sm">
          <p className="font-mono text-[#6B1D2A]">{booking.booking_number}</p>
          <p className="font-medium">{booking.first_name} {booking.last_name} · {booking.email}</p>
          <p className="text-[#4A4A4A]">{booking.hotel_name} · {booking.check_in} – {booking.check_out}</p>
          <p className="text-[#4A4A4A]">
            {language === 'de' ? 'Anzahlung' : 'Deposit'}: {formatPrice(booking.deposit_amount)} · {language === 'de' ? 'Rest' : 'Balance'}: {formatPrice(booking.remaining_amount)}
          </p>
        </div>
        {type === 'convert' ? (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={sendMail} onCheckedChange={(v) => setSendMail(!!v)} data-testid="convert-send-email" />
            {tt.sendMail}
          </label>
        ) : (
          <div>
            <Label htmlFor="received-amount">{tt.amount}</Label>
            <Input id="received-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="received-amount" />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="transfer-cancel-btn">{t.cancel}</Button>
          <Button onClick={run} disabled={busy} className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white" data-testid="transfer-confirm-btn">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{tt.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferActionDialog;

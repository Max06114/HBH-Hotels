import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Loader2 } from 'lucide-react';
import { API, formatPrice } from './utils';

const METHODS = [['bank_transfer', 'Überweisung'], ['paypal', 'PayPal'], ['cash', 'Bar']];

const PaymentsDialog = ({ booking, getAuthHeaders, onClose, onDone }) => {
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [sendMail, setSendMail] = useState(true);
  const [busy, setBusy] = useState(false);
  const paid = booking ? (booking.payment_status === 'fully_paid' ? booking.total_price : booking.deposit_amount) : 0;

  useEffect(() => {
    if (!booking) return;
    setMode('add'); setMethod('bank_transfer'); setSendMail(true);
    setAmount(booking.payment_status === 'fully_paid' ? '' : String(booking.remaining_amount));
  }, [booking]);

  const value = parseFloat(String(amount).replace(',', '.'));
  const newPaid = mode === 'add' ? paid + (value || 0) : (value || 0);
  const newOpen = Math.max((booking?.total_price || 0) - newPaid, 0);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/admin/bookings/${booking.id}/payments`,
        { mode, amount: value, payment_method: method, send_email: mode === 'add' && sendMail }, { headers: getAuthHeaders() });
      toast.success(`${mode === 'add' ? 'Zahlung erfasst' : 'Betrag korrigiert'} – offen ${formatPrice(data.booking.remaining_amount)} €${data.email_sent ? ', E-Mail gesendet' : ''}`);
      onDone(data.booking);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="payments-dialog">
        <DialogHeader><DialogTitle>Zahlungen – {booking?.booking_number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2 text-sm bg-[#F5F2EA] rounded-md p-3">
          <div>Gesamt<br /><strong>{formatPrice(booking?.total_price)} €</strong></div>
          <div>Erhalten<br /><strong data-testid="payments-paid">{formatPrice(paid)} €</strong></div>
          <div>Offen<br /><strong data-testid="payments-open">{formatPrice(booking?.payment_status === 'fully_paid' ? 0 : booking?.remaining_amount)} €</strong></div>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === 'add' ? 'default' : 'outline'} size="sm" onClick={() => setMode('add')} data-testid="payments-mode-add">Zahlung hinzufügen</Button>
          <Button variant={mode === 'set' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('set'); setAmount(String(paid)); }} data-testid="payments-mode-set">Erhaltenen Betrag korrigieren</Button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>{mode === 'add' ? 'Neu erhaltener Betrag (€)' : 'Insgesamt tatsächlich erhalten (€)'}</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" data-testid="payments-amount" />
          </div>
          {mode === 'add' && (
            <>
              <div className="flex gap-2">
                {METHODS.map(([k, l]) => (
                  <Button key={k} size="sm" variant={method === k ? 'default' : 'outline'} onClick={() => setMethod(k)} data-testid={`payments-method-${k}`}>{l}</Button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={sendMail} onCheckedChange={(v) => setSendMail(!!v)} data-testid="payments-send-mail" />
                {newOpen > 0.005 ? 'Quittung mit Restbetrag an den Gast senden (Kopie an dich)' : 'Zahlungsbestätigung an den Gast senden (Kopie an dich)'}
              </label>
            </>
          )}
          {mode === 'set' && <p className="text-xs text-[#4A4A4A]">Korrektur ohne E-Mail an den Gast.</p>}
          <p className="text-sm" data-testid="payments-preview">
            Danach: erhalten <strong>{formatPrice(newPaid)} €</strong>, offen <strong>{formatPrice(newOpen)} €</strong> → {newOpen > 0.005 ? 'Anzahlung bezahlt' : 'Vollständig bezahlt'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save} disabled={busy || !(value > 0)} className="bg-[#6B1D2A] hover:bg-[#561622]" data-testid="payments-save">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentsDialog;

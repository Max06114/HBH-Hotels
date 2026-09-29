import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';
import { API } from './utils';

const FIELDS = ['first_name', 'last_name', 'email', 'street', 'postal_code', 'city', 'country', 'notes'];

const LABELS = {
  de: { salutation: 'Anrede', first_name: 'Vorname', last_name: 'Nachname', email: 'E-Mail', street: 'Straße', postal_code: 'PLZ', city: 'Ort', country: 'Land', notes: 'Notizen' },
  en: { salutation: 'Salutation', first_name: 'First name', last_name: 'Last name', email: 'Email', street: 'Street', postal_code: 'Postal code', city: 'City', country: 'Country', notes: 'Notes' }
};

const BookingEditDialog = ({ booking, language, getAuthHeaders, onClose, onSaved }) => {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const de = language === 'de';
  const L = LABELS[language] || LABELS.de;

  useEffect(() => {
    if (booking) {
      const initial = { salutation: booking.salutation || '' };
      FIELDS.forEach((f) => { initial[f] = booking[f] || ''; });
      setForm(initial);
    }
  }, [booking]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/admin/bookings/${booking.id}`, form, { headers: getAuthHeaders() });
      toast.success(de ? 'Buchung aktualisiert' : 'Booking updated');
      onSaved(res.data.booking);
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error((de ? 'Speichern fehlgeschlagen: ' : 'Save failed: ') + (typeof detail === 'string' ? detail : JSON.stringify(detail || error.message)));
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Dialog open={!!booking} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" data-testid="booking-edit-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {de ? 'Gastdaten bearbeiten' : 'Edit guest details'} · <span className="font-mono text-sm">{booking?.booking_number}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label>{L.salutation}</Label>
            <Select value={form.salutation || ''} onValueChange={(v) => setForm((f) => ({ ...f, salutation: v }))}>
              <SelectTrigger data-testid="edit-salutation"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Herr">{de ? 'Herr' : 'Mr'}</SelectItem>
                <SelectItem value="Frau">{de ? 'Frau' : 'Ms'}</SelectItem>
                <SelectItem value="Divers">{de ? 'Divers' : 'Other'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {FIELDS.map((f) => (
            <div key={f} className={['email', 'street', 'notes'].includes(f) ? 'col-span-2' : ''}>
              <Label htmlFor={`edit-${f}`}>{L[f]}</Label>
              <Input id={`edit-${f}`} value={form[f] || ''} onChange={set(f)} type={f === 'email' ? 'email' : 'text'} data-testid={`edit-${f}`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-[#4A4A4A]">
          {de
            ? 'Hinweis: Rechnung und Bestätigung werden beim erneuten Senden mit den neuen Daten erzeugt. Buchungs- und Rechnungsnummer bleiben gleich.'
            : 'Note: invoice and confirmation are regenerated with the new details when resent. Booking and invoice numbers stay the same.'}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="edit-cancel-btn">{de ? 'Abbrechen' : 'Cancel'}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white" data-testid="edit-save-btn">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {de ? 'Speichern' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingEditDialog;

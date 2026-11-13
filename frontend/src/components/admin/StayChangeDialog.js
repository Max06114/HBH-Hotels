import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Loader2, CalendarDays } from 'lucide-react';
import { API } from './utils';

const eur = (v) => `${(v ?? 0).toFixed(2).replace('.', ',')} €`;
const ROOMS = [['single', 'EZ – Einzelzimmer'], ['double', 'DZ – Doppelzimmer'], ['twin', 'Twin – Zweibettzimmer'],
  ['single_comfort', 'EZ Comfort'], ['double_comfort', 'DZ Comfort'], ['twin_comfort', 'Twin Comfort']];

const StayChangeDialog = ({ booking, language, getAuthHeaders, onClose, onSaved }) => {
  const de = language === 'de';
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('');
  const [companion, setCompanion] = useState('');
  const [hotel, setHotel] = useState(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setCheckIn(booking.check_in); setCheckOut(booking.check_out); setRoomType(booking.room_type); setCompanion(booking.companion_name || '');
    setSendEmail(true); setPreview(null); setPreviewError('');
    axios.get(`${API}/hotels`).then((r) => setHotel(r.data.find((h) => h.id === booking.hotel_id) || null)).catch(() => setHotel(null));
  }, [booking]);

  const roomOptions = ROOMS.filter(([k]) => k === booking?.room_type || hotel?.[`${k}_price`]);
  const companionChanged = booking && companion.trim() !== (booking.companion_name || '');
  const unchanged = booking && checkIn === booking.check_in && checkOut === booking.check_out && roomType === booking.room_type;

  useEffect(() => {
    if (!booking || !checkIn || !checkOut || (unchanged && !companionChanged)) { setPreview(null); setPreviewError(''); return; }
    let active = true;
    axios.get(`${API}/admin/bookings/${booking.id}/stay-preview`, { params: { check_in: checkIn, check_out: checkOut, room_type: roomType }, headers: getAuthHeaders() })
      .then((res) => { if (active) { setPreview(res.data); setPreviewError(''); } })
      .catch((e) => { if (active) { setPreview(null); setPreviewError(e.response?.data?.detail || e.message); } });
    return () => { active = false; };
  }, [booking, checkIn, checkOut, roomType, unchanged, companionChanged, getAuthHeaders]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.post(`${API}/admin/bookings/${booking.id}/change-stay`, { check_in: checkIn, check_out: checkOut, room_type: roomType, companion_name: companion.trim(), send_email: sendEmail }, { headers: getAuthHeaders() });
      toast.success(de ? `Buchung geändert${res.data.email_sent ? ' – E-Mail an Gast gesendet' : ''}` : `Stay changed${res.data.email_sent ? ' – email sent to guest' : ''}`);
      onSaved(res.data.booking);
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error((de ? 'Änderung fehlgeschlagen: ' : 'Change failed: ') + (typeof detail === 'string' ? detail : JSON.stringify(detail || error.message)));
    } finally {
      setSaving(false);
    }
  };

  if (!booking) return null;
  return (
    <Dialog open={!!booking} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" data-testid="stay-change-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#6B1D2A]" />
            {de ? 'Aufenthalt / Zimmer ändern' : 'Change stay / room'} · <span className="font-mono text-sm">{booking.booking_number}</span>
          </DialogTitle>
          <DialogDescription>
            {booking.first_name} {booking.last_name} · {booking.hotel_name} · {de ? 'bisher' : 'currently'} {booking.check_in} – {booking.check_out} ({booking.nights} {de ? 'Nächte' : 'nights'}, {eur(booking.total_price)})
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label htmlFor="stay-check-in">{de ? 'Neue Anreise' : 'New check-in'}</Label>
            <Input id="stay-check-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} data-testid="stay-check-in" />
          </div>
          <div>
            <Label htmlFor="stay-check-out">{de ? 'Neue Abreise' : 'New check-out'}</Label>
            <Input id="stay-check-out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} data-testid="stay-check-out" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="stay-room-type">{de ? 'Zimmertyp' : 'Room type'}</Label>
            <select id="stay-room-type" value={roomType} onChange={(e) => setRoomType(e.target.value)} data-testid="stay-room-type"
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {roomOptions.map(([k, l]) => <option key={k} value={k}>{l}{hotel?.[`${k}_price`] ? ` (${eur(hotel[`${k}_price`])} / Nacht)` : ''}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="stay-companion">{de ? 'Mitreisende(r) (optional)' : 'Fellow traveller (optional)'}</Label>
            <Input id="stay-companion" value={companion} onChange={(e) => setCompanion(e.target.value)} placeholder="z. B. Mr Christopher Connor" data-testid="stay-companion" />
          </div>
        </div>
        {previewError && <p className="text-sm text-red-700" data-testid="stay-preview-error">{previewError}</p>}
        {preview && (
          <div className="rounded-lg bg-[#F5F2EA] p-4 text-sm space-y-1" data-testid="stay-preview">
            <div className="flex justify-between"><span>{de ? 'Nächte' : 'Nights'}</span><span>{booking.nights} → <strong>{preview.nights}</strong> ({eur(preview.price_per_night)} / {de ? 'Nacht' : 'night'})</span></div>
            <div className="flex justify-between"><span>{de ? 'Gesamtpreis' : 'Total price'}</span><span>{eur(booking.total_price)} → <strong>{eur(preview.total_price)}</strong></span></div>
            <div className="flex justify-between"><span>{de ? 'Bereits bezahlt' : 'Already paid'}</span><span>{eur(preview.paid)}</span></div>
            <div className="flex justify-between border-t border-[#E5E0D5] pt-1 mt-1"><span>{de ? 'Neuer Restbetrag' : 'New remaining'}</span><strong className="text-[#6B1D2A]">{eur(preview.remaining_amount)}</strong></div>
            {preview.refund_due > 0 && <div className="flex justify-between text-green-800"><span>{de ? 'Zu erstatten' : 'Refund due'}</span><strong>{eur(preview.refund_due)}</strong></div>}
            {preview.payment_status !== booking.payment_status && (
              <p className="text-xs text-[#4A4A4A] pt-1">{de ? `Status wechselt zu „${preview.payment_status === 'fully_paid' ? 'Vollständig bezahlt' : 'Anzahlung bezahlt'}“.` : `Status changes to "${preview.payment_status}".`}</p>
            )}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} data-testid="stay-send-email" />
          {de ? 'E-Mail „Buchungsänderung“ mit aktualisierter Rechnung an den Gast senden (BCC an Sie)' : 'Send "Booking change" email with updated invoice to the guest (BCC to you)'}
        </label>
        <p className="text-xs text-[#4A4A4A]">
          {de
            ? 'Bitte vorher mit dem Hotel klären, ob die neuen Nächte bzw. der Zimmertyp verfügbar sind. Das Kontingent wird automatisch umgebucht. Die Rechnung wird mit gleicher Nummer und Korrekturvermerk neu erzeugt; Erinnerungen richten sich nach dem neuen Anreisedatum.'
            : 'Please confirm availability of the new nights with the hotel first. The invoice is regenerated with the same number and a correction note; reminders follow the new arrival date.'}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="stay-cancel-btn">{de ? 'Abbrechen' : 'Cancel'}</Button>
          <Button onClick={handleSave} disabled={saving || !preview} className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white" data-testid="stay-save-btn">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {de ? 'Umbuchen' : 'Change booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StayChangeDialog;

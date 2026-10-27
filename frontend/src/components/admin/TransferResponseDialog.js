import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, Plane } from 'lucide-react';
import { API } from './utils';

const INTEREST = [['both', 'Hin- und Rückfahrt'], ['outbound', 'Nur Hinfahrt (BER → Halle)'], ['return', 'Nur Rückfahrt (Halle → BER)'], ['none', 'Kein Interesse']];
const EMPTY = { name: '', arrival_date: '', arrival_time: '', arrival_flight: '', departure_date: '', departure_time: '', departure_flight: '', persons: 1, companions: '', interest: 'both', notes: '' };

const Field = ({ id, label, ...props }) => (
  <div><Label htmlFor={id}>{label}</Label><Input id={id} data-testid={`tr-edit-${id}`} {...props} /></div>
);

const TransferResponseDialog = ({ contact, headers, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!contact) return;
    const r = contact.response || {};
    setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k] ?? EMPTY[k]])), name: contact.name || '', companions: (r.companions || []).join(', ') });
  }, [contact]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, persons: parseInt(form.persons, 10) || 1, companions: form.companions.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) };
      const res = await axios.put(`${API}/admin/transfer/contacts/${contact.id}/response`, payload, headers);
      toast.success('Transferwunsch gespeichert');
      onSaved(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!contact) return null;
  return (
    <Dialog open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl" data-testid="transfer-response-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2"><Plane className="w-5 h-5 text-[#6B1D2A]" />Transferwunsch {contact.response ? 'bearbeiten' : 'erfassen'}</DialogTitle>
          <DialogDescription>{contact.email}{contact.hotel_name ? ` · ${contact.hotel_name}` : ''} – z. B. aus einer E-Mail des Gastes übernehmen.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><Field id="name" label="Name" value={form.name} onChange={set('name')} /></div>
          <div className="col-span-2">
            <Label>Interesse</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {INTEREST.map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, interest: v }))} data-testid={`tr-edit-interest-${v}`}
                  className={`rounded-full border px-3 py-1.5 text-sm ${form.interest === v ? 'bg-[#6B1D2A] text-white border-[#6B1D2A]' : 'bg-white border-[#E5E0D5]'}`}>{l}</button>
              ))}
            </div>
          </div>
          <Field id="arrival_date" label="Ankunft BER (Datum)" type="date" value={form.arrival_date || ''} onChange={set('arrival_date')} />
          <Field id="arrival_time" label="Ankunft Uhrzeit" type="time" value={form.arrival_time || ''} onChange={set('arrival_time')} />
          <div className="col-span-2"><Field id="arrival_flight" label="Flugnummer Ankunft" value={form.arrival_flight || ''} onChange={set('arrival_flight')} placeholder="z. B. EI 1336" /></div>
          <Field id="departure_date" label="Abflug BER (Datum)" type="date" value={form.departure_date || ''} onChange={set('departure_date')} />
          <Field id="departure_time" label="Abflug Uhrzeit" type="time" value={form.departure_time || ''} onChange={set('departure_time')} />
          <div className="col-span-2"><Field id="departure_flight" label="Flugnummer Abflug" value={form.departure_flight || ''} onChange={set('departure_flight')} placeholder="z. B. EI 337" /></div>
          <Field id="persons" label="Personen gesamt" type="number" min={1} max={20} value={form.persons} onChange={set('persons')} />
          <Field id="companions" label="Mitreisende (Namen, kommagetrennt)" value={form.companions} onChange={set('companions')} />
          <div className="col-span-2"><Label htmlFor="tr-notes">Notiz</Label><Textarea id="tr-notes" rows={2} value={form.notes || ''} onChange={set('notes')} data-testid="tr-edit-notes" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="tr-edit-cancel">Abbrechen</Button>
          <Button onClick={save} disabled={saving} className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white" data-testid="tr-edit-save">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferResponseDialog;

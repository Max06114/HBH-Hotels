import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Loader2, Bus, Send, Download, RefreshCw, Upload, Bell } from 'lucide-react';
import { API } from './utils';

const INTEREST = { both: 'Hin + Rück', outbound: 'Nur Hin', return: 'Nur Rück', none: 'Kein Interesse' };

const TransferManagement = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const de = language === 'de';
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState({});
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/transfer/overview`, { headers: getAuthHeaders() });
      setData(res.data);
      setSettings(res.data.settings);
    } catch (e) {
      toast.error('Transfer-Daten konnten nicht geladen werden');
    }
  }, [getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      const res = await fn();
      toast.success(typeof okMsg === 'function' ? okMsg(res.data) : okMsg);
      await load();
    } catch (e) {
      toast.error('Fehler: ' + (e.response?.data?.detail || e.message));
    } finally {
      setBusy('');
    }
  };
  const H = { headers: getAuthHeaders() };
  const saveSettings = () => run('settings', () => axios.put(`${API}/admin/transfer/settings`, settings, H), 'Einstellungen gespeichert');
  const syncBookings = () => run('sync', () => axios.post(`${API}/admin/transfer/sync-bookings`, {}, H), (d) => `${d.created} neue Kontakte aus ${d.bookings} Buchungen`);
  const doImport = () => run('import', () => axios.post(`${API}/admin/transfer/import`, { text: importText }, H), (d) => { setImportText(''); return `${d.created} importiert, ${d.skipped} übersprungen (Duplikat/ungültig)`; });
  const sendSurvey = () => window.confirm(`Umfrage-E-Mail an alle noch nicht eingeladenen Kontakte senden?`) && run('send', () => axios.post(`${API}/admin/transfer/send-survey`, { only_unanswered: false, only_not_invited: true }, H), (d) => `${d.sent} gesendet, ${d.failed} fehlgeschlagen`);
  const sendReminder = () => window.confirm('Erinnerung an alle Eingeladenen ohne Antwort senden?') && run('remind', () => axios.post(`${API}/admin/transfer/send-survey`, { only_unanswered: true, only_not_invited: false }, H), (d) => `${d.sent} Erinnerungen gesendet`);
  const exportCsv = async () => {
    const res = await axios.get(`${API}/admin/transfer/export`, { ...H, responseType: 'blob' });
    const url = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = url; a.download = 'transfer_survey.csv'; a.click(); URL.revokeObjectURL(url);
  };

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  const { stats } = data;
  const rows = data.rows.filter((r) => filter === 'all' || (filter === 'responded' ? r.response : filter === 'open' ? !r.response : filter === 'plane' ? r.response?.arrives_by_plane : true));

  return (
    <div data-testid="admin-transfer">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A] flex items-center gap-3"><Bus className="w-7 h-7 text-[#6B1D2A]" /> Airport Transfer – {de ? 'Bedarfserhebung' : 'Survey'}</h1>
        <Button variant="outline" onClick={exportCsv} className="border-[#6B1D2A] text-[#6B1D2A]" data-testid="transfer-export-btn"><Download className="w-4 h-4 mr-2" />CSV Export</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        {[['Kontakte', stats.contacts, 'contacts'], ['Eingeladen', stats.invited, 'invited'], ['Antworten', stats.responded, 'responded'], ['Personen per Flug', stats.by_plane_persons, 'plane'],
          ['Interesse Hinfahrt', stats.interest_outbound, 'outbound'], ['Interesse Rückfahrt', stats.interest_return, 'return']].map(([l, v, k]) => (
          <Card key={k} className="border-[#E5E0D5]"><CardContent className="p-4"><p className="text-xs text-[#4A4A4A]">{l}</p><p className="text-2xl font-bold" data-testid={`transfer-stat-${k}`}>{v}</p></CardContent></Card>
        ))}
      </div>
      <p className="text-sm text-[#4A4A4A] -mt-5 mb-8">Interesse in Personen (inkl. Mitreisende). Kein Interesse / nicht per Flug: {stats.no_interest}. Bus-Entscheidung treffen Sie – das System zeigt nur Zahlen.</p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="border-[#E5E0D5]"><CardContent className="p-6 space-y-3">
          <h2 className="font-semibold">Einstellungen</h2>
          <div><Label>Stichtag (Rückmeldung bis)</Label><Input type="date" value={settings.deadline || ''} onChange={(e) => setSettings({ ...settings, deadline: e.target.value })} data-testid="transfer-deadline-input" /></div>
          <div><Label>Preis pro Person und Strecke (€)</Label><Input type="number" value={settings.price ?? ''} onChange={(e) => setSettings({ ...settings, price: parseFloat(e.target.value) })} data-testid="transfer-price-input" /></div>
          <div><Label>Status</Label>
            <select className="w-full border border-[#E5E0D5] rounded-md h-10 px-3 bg-white" value={settings.status} onChange={(e) => setSettings({ ...settings, status: e.target.value })} data-testid="transfer-status-select">
              <option value="survey">Umfrage läuft (Link in Bestätigungs-E-Mails aktiv)</option><option value="offer">Angebot verschickt</option><option value="closed">Geschlossen</option>
            </select></div>
          <div><Label>Einleitungstext (Englisch, Formular + E-Mail)</Label><Textarea rows={4} value={settings.intro || ''} onChange={(e) => setSettings({ ...settings, intro: e.target.value })} data-testid="transfer-intro-input" /></div>
          <Button onClick={saveSettings} disabled={busy === 'settings'} className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white" data-testid="transfer-save-settings">Speichern</Button>
        </CardContent></Card>

        <Card className="border-[#E5E0D5]"><CardContent className="p-6 space-y-4">
          <h2 className="font-semibold">Kontakte & Versand</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={syncBookings} disabled={!!busy} data-testid="transfer-sync-btn"><RefreshCw className="w-4 h-4 mr-2" />Hotelbuchungen übernehmen</Button>
            <Button onClick={sendSurvey} disabled={!!busy} className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white" data-testid="transfer-send-btn"><Send className="w-4 h-4 mr-2" />Umfrage senden (neue Kontakte)</Button>
            <Button variant="outline" onClick={sendReminder} disabled={!!busy} data-testid="transfer-remind-btn"><Bell className="w-4 h-4 mr-2" />Erinnerung an Nicht-Antworter</Button>
          </div>
          <div>
            <Label>Import weiterer Gäste (je Zeile: Name, E-Mail)</Label>
            <Textarea rows={5} placeholder={'Mary Byrne, mary@example.com\nJohn Smith; john@example.com'} value={importText} onChange={(e) => setImportText(e.target.value)} data-testid="transfer-import-text" />
            <Button variant="outline" onClick={doImport} disabled={!importText.trim() || !!busy} className="mt-2" data-testid="transfer-import-btn"><Upload className="w-4 h-4 mr-2" />Importieren</Button>
          </div>
          <p className="text-xs text-[#4A4A4A]">Öffentliches Formular: <code>/transfer</code> (Menüpunkt „Airport Transfer“). Persönliche Links stehen automatisch in jeder Buchungsbestätigung, solange Status „Umfrage läuft“.</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 mb-3">
        {[['all', 'Alle'], ['responded', 'Beantwortet'], ['open', 'Offen'], ['plane', 'Per Flug']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-sm ${filter === k ? 'bg-[#6B1D2A] text-white border-[#6B1D2A]' : 'bg-white border-[#E5E0D5]'}`} data-testid={`transfer-filter-${k}`}>{l}</button>
        ))}
        <span className="self-center text-sm text-[#4A4A4A] ml-2" data-testid="transfer-row-count">{rows.length}</span>
      </div>
      <Card className="border-[#E5E0D5]"><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Gast</TableHead><TableHead>Quelle / Hotel</TableHead><TableHead>Status</TableHead><TableHead>Ankunft</TableHead><TableHead>Abflug</TableHead><TableHead>Pers.</TableHead><TableHead>Interesse</TableHead><TableHead>Notiz</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((c) => { const r = c.response; return (
              <TableRow key={c.id} data-testid={`transfer-row-${c.id}`}>
                <TableCell><p className="font-medium">{c.name}</p><p className="text-xs text-[#4A4A4A]">{c.email}</p></TableCell>
                <TableCell className="text-sm">{c.source === 'booking' ? c.hotel_name : c.source === 'import' ? 'Import' : 'Homepage'}{c.check_in && <p className="text-xs text-[#4A4A4A]">{c.check_in} – {c.check_out}</p>}</TableCell>
                <TableCell>{r ? <Badge className="bg-green-100 text-green-800">Beantwortet</Badge> : c.invited_at ? <Badge className="bg-amber-100 text-amber-800">Eingeladen{c.reminded_at ? ' · erinnert' : ''}</Badge> : <Badge className="bg-gray-100 text-gray-700">Nicht eingeladen</Badge>}</TableCell>
                <TableCell className="text-sm">{r?.arrives_by_plane ? <>{r.arrival_date} {r.arrival_time}<p className="text-xs text-[#4A4A4A]">{r.arrival_flight} {r.airport}</p></> : r ? <span className="text-xs text-[#4A4A4A]">kein Flug</span> : ''}</TableCell>
                <TableCell className="text-sm">{r?.arrives_by_plane ? <>{r.departure_date} {r.departure_time}<p className="text-xs text-[#4A4A4A]">{r.departure_flight}</p></> : ''}</TableCell>
                <TableCell>{r ? <>{r.persons}{r.companions?.length > 0 && <p className="text-xs text-[#4A4A4A]" title={r.companions.join(', ')}>+ {r.companions.join(', ')}</p>}</> : ''}</TableCell>
                <TableCell>{r?.arrives_by_plane ? <Badge className={r.interest === 'none' ? 'bg-gray-100 text-gray-700' : 'bg-[#F5F2EA] text-[#6B1D2A]'}>{INTEREST[r.interest] || r.interest}</Badge> : ''}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate" title={r?.notes || ''}>{r?.notes || ''}</TableCell>
              </TableRow>); })}
          </TableBody>
        </Table>
        {rows.length === 0 && <p className="text-center py-10 text-[#4A4A4A]" data-testid="transfer-empty">Keine Kontakte.</p>}
      </CardContent></Card>
    </div>
  );
};

export default TransferManagement;

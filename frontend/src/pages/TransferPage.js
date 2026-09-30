import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Bus, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const EMPTY = { name: '', email: '', arrives_by_plane: true, airport: 'BER', arrival_date: '', arrival_time: '', arrival_flight: '', departure_date: '', departure_time: '', departure_flight: '', persons: 1, companions: [], interest: 'both', notes: '' };

const Field = ({ id, label, type = 'text', value, onChange, placeholder }) => (
  <div>
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={`transfer-${id}`} />
  </div>
);

const TransferPage = () => {
  const { token } = useParams();
  const [settings, setSettings] = useState(null);
  const [contact, setContact] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await axios.get(`${API}/transfer/settings`);
        setSettings(s.data);
        if (token) {
          const f = await axios.get(`${API}/transfer/form/${token}`);
          setContact(f.data.contact);
          setForm({ ...EMPTY, name: f.data.contact.name, email: f.data.contact.email, arrival_date: f.data.contact.check_in || '', departure_date: f.data.contact.check_out || '', ...(f.data.response || {}) });
        }
        setStatus('ready');
      } catch (e) {
        setStatus(token ? 'invalid' : 'ready');
      }
    };
    load();
  }, [token]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setPersons = (n) => {
    const persons = Math.min(20, Math.max(1, parseInt(n || '1', 10)));
    setForm((f) => ({ ...f, persons, companions: Array.from({ length: persons - 1 }, (_, i) => f.companions[i] || '') }));
  };

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) return toast.error('Please enter your name and email.');
    if (!form.arrival_date) return toast.error('Please enter your arrival date.');
    setSubmitting(true);
    try {
      await axios.post(`${API}/transfer/respond`, { ...form, token: token || null, persons: Number(form.persons) });
      setStatus('done');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save your reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const deadline = settings ? new Date(settings.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <Card className="border-[#E5E0D5]" data-testid="transfer-page">
          <CardContent className="p-8 md:p-10">
            <div className="w-16 h-16 bg-[#F5F2EA] rounded-full flex items-center justify-center mx-auto mb-6"><Bus className="w-8 h-8 text-[#6B1D2A]" /></div>
            <h1 className="font-serif text-3xl text-[#1A1A1A] text-center mb-3">Airport Transfer Berlin ↔ Halle</h1>
            {status === 'loading' && <Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A] mx-auto" />}
            {status === 'invalid' && <p className="text-center text-red-700" data-testid="transfer-invalid">This link is not valid. You can still fill in the form at <a className="underline" href="/transfer">/transfer</a>.</p>}
            {status === 'done' && (
              <div className="text-center" data-testid="transfer-done">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-[#1A1A1A] font-medium">Thank you – your travel plans have been saved.</p>
                <p className="text-sm text-[#4A4A4A] mt-2">After {deadline} we will let you know by email whether the bus transfer will run and how to book it. <strong className="text-[#1A1A1A]">Your reply is not a booking yet.</strong></p>
              </div>
            )}
            {status === 'ready' && settings && (
              <>
                <p className="text-[#4A4A4A] text-center mb-2">{settings.intro.replace(/\s*[–-]?\s*this is not a booking yet\.?$/i, '').replace(/([^.!?])$/, '$1.')} <strong className="text-[#1A1A1A]">This is not a booking yet.</strong></p>
                <p className="text-center text-sm font-medium text-[#6B1D2A] mb-8" data-testid="transfer-deadline">Please reply by {deadline}. Price if the bus runs: €{settings.price} per person per way. A transfer only runs with a minimum of {settings.min_persons} persons.</p>
                {contact?.hotel_name && (
                  <p className="text-sm bg-[#F5F2EA] rounded-lg p-3 mb-6" data-testid="transfer-hotel-info">Your hotel booking: <strong>{contact.hotel_name}</strong>, {contact.check_in} – {contact.check_out}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field id="name" label="Your name *" value={form.name} onChange={set('name')} />
                  <Field id="email" label="Email *" type="email" value={form.email} onChange={set('email')} />
                      <Field id="arrival_date" label="Arrival date at BER *" type="date" value={form.arrival_date} onChange={set('arrival_date')} />
                      <Field id="arrival_time" label="Arrival time (landing)" type="time" value={form.arrival_time} onChange={set('arrival_time')} />
                      <Field id="arrival_flight" label="Arrival flight number" value={form.arrival_flight} onChange={set('arrival_flight')} placeholder="e.g. EI 334" />
                      <div />
                      <Field id="departure_date" label="Departure date" type="date" value={form.departure_date} onChange={set('departure_date')} />
                      <Field id="departure_time" label="Departure time (take-off)" type="time" value={form.departure_time} onChange={set('departure_time')} />
                      <Field id="departure_flight" label="Departure flight number" value={form.departure_flight} onChange={set('departure_flight')} />
                      <div />
                      <Field id="persons" label="Number of persons (including you)" type="number" value={form.persons} onChange={setPersons} />
                      <div />
                      {form.companions.map((c, i) => (
                        <Field key={i} id={`companion_${i}`} label={`Name of person ${i + 2}`} value={c} onChange={(v) => setForm((f) => { const companions = [...f.companions]; companions[i] = v; return { ...f, companions }; })} />
                      ))}
                      <div className="md:col-span-2">
                        <Label>Interested in the bus transfer (€{settings.price} per person per way)?</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {[['both', 'Both ways'], ['outbound', 'Berlin → Halle only'], ['return', 'Halle → Berlin only'], ['none', 'No, thanks']].map(([v, l]) => (
                            <button key={v} type="button" onClick={() => set('interest')(v)} data-testid={`transfer-interest-${v}`}
                              className={`rounded-full border px-4 py-2 text-sm ${form.interest === v ? 'bg-[#6B1D2A] text-white border-[#6B1D2A]' : 'bg-white border-[#E5E0D5]'}`}>{l}</button>
                          ))}
                        </div>
                      </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" value={form.notes || ''} onChange={(e) => set('notes')(e.target.value)} data-testid="transfer-notes" />
                  </div>
                </div>
                <Button onClick={submit} disabled={submitting} className="w-full mt-8 bg-[#6B1D2A] hover:bg-[#8A2536] text-white rounded-full py-6 text-base" data-testid="transfer-submit">
                  {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Bus className="w-5 h-5 mr-2" />}Send my travel plans
                </Button>
                <p className="text-sm text-[#1A1A1A] text-center mt-3"><strong>This is not a booking yet.</strong> No payment is required now.</p>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TransferPage;

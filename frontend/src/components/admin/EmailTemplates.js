import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Save, Loader2, Mail, Clock, Hotel, RefreshCw } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EmailTemplates = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState('default');
  const [templates, setTemplates] = useState({
    booking_confirmation_de: '',
    booking_confirmation_en: '',
    payment_reminder_de: '',
    payment_reminder_en: '',
    arrival_reminder_de: '',
    arrival_reminder_en: ''
  });
  const [schedulerInfo, setSchedulerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchHotels = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/hotels`, { headers: getAuthHeaders() });
      setHotels(response.data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    }
  }, [getAuthHeaders]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/email-templates/${selectedHotelId}`, { 
        headers: getAuthHeaders() 
      });
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Set defaults if not found
      setTemplates({
        booking_confirmation_de: getDefaultTemplate('booking_confirmation', 'de'),
        booking_confirmation_en: getDefaultTemplate('booking_confirmation', 'en'),
        payment_reminder_de: getDefaultTemplate('payment_reminder', 'de'),
        payment_reminder_en: getDefaultTemplate('payment_reminder', 'en'),
        arrival_reminder_de: getDefaultTemplate('arrival_reminder', 'de'),
        arrival_reminder_en: getDefaultTemplate('arrival_reminder', 'en')
      });
    }
  }, [getAuthHeaders, selectedHotelId]);

  const fetchSchedulerInfo = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/scheduler/status`, { headers: getAuthHeaders() });
      setSchedulerInfo(response.data);
    } catch (error) {
      console.error('Error fetching scheduler info:', error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchHotels(), fetchSchedulerInfo()]);
      setLoading(false);
    };
    loadData();
  }, [fetchHotels, fetchSchedulerInfo]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates, selectedHotelId]);

  const getDefaultTemplate = (type, lang) => {
    const defaults = {
      booking_confirmation: {
        de: `Sehr geehrte(r) {salutation} {last_name},

vielen Dank für Ihre Buchung im {hotel_name} zum Happy Birthday Händel Festival 2027.

Buchungsdetails:
- Buchungsnummer: {booking_number}
- Zimmertyp: {room_type}
- Check-in: {check_in}
- Check-out: {check_out}
- Gesamtpreis: {total_price} €

Die Anzahlung von {deposit_amount} € wurde erfolgreich bezahlt.
Die Restzahlung von {remaining_amount} € ist 6 Wochen vor Anreise fällig.

Mit freundlichen Grüßen,
Ihr Travel Events Team`,
        en: `Dear {salutation} {last_name},

Thank you for your booking at {hotel_name} for the Happy Birthday Händel Festival 2027.

Booking Details:
- Booking Number: {booking_number}
- Room Type: {room_type}
- Check-in: {check_in}
- Check-out: {check_out}
- Total Price: {total_price} €

The deposit of {deposit_amount} € has been successfully paid.
The remaining balance of {remaining_amount} € is due 6 weeks before arrival.

Best regards,
Your Travel Events Team`
      },
      payment_reminder: {
        de: `Sehr geehrte(r) {salutation} {last_name},

wir möchten Sie daran erinnern, dass die Restzahlung für Ihre Buchung im {hotel_name} fällig ist.

Restbetrag: {remaining_amount} €
Buchungsnummer: {booking_number}

Bitte überweisen Sie den Betrag innerhalb der nächsten 7 Tage.

Mit freundlichen Grüßen,
Ihr Travel Events Team`,
        en: `Dear {salutation} {last_name},

This is a reminder that the remaining payment for your booking at {hotel_name} is now due.

Remaining Balance: {remaining_amount} €
Booking Number: {booking_number}

Please transfer the amount within the next 7 days.

Best regards,
Your Travel Events Team`
      },
      arrival_reminder: {
        de: `Sehr geehrte(r) {salutation} {last_name},

Ihr Aufenthalt im {hotel_name} steht kurz bevor!

Check-in: {check_in}
Adresse: {hotel_address}

Wir freuen uns auf Sie und wünschen Ihnen eine gute Anreise.

Mit freundlichen Grüßen,
Ihr Travel Events Team`,
        en: `Dear {salutation} {last_name},

Your stay at {hotel_name} is approaching!

Check-in: {check_in}
Address: {hotel_address}

We look forward to welcoming you and wish you a pleasant journey.

Best regards,
Your Travel Events Team`
      }
    };
    return defaults[type]?.[lang] || '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/email-templates/${selectedHotelId}`, 
        { templates },
        { headers: getAuthHeaders() }
      );
      toast.success(language === 'de' ? 'Email-Vorlagen gespeichert' : 'Email templates saved');
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Speichern' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (key, value) => {
    setTemplates(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">
            {language === 'de' ? 'Email-Vorlagen' : 'Email Templates'}
          </h2>
          <p className="text-sm text-[#4A4A4A] mt-1">
            {language === 'de' 
              ? 'Bearbeiten Sie die automatischen Email-Texte' 
              : 'Edit automatic email texts'}
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#6B1D2A] hover:bg-[#5a1823]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {language === 'de' ? 'Speichern' : 'Save'}
        </Button>
      </div>

      {/* Scheduler Status */}
      {schedulerInfo && (
        <Card className="border-[#E5E0D5] bg-[#F5F2EA]">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#6B1D2A]" />
                <span className="font-medium">
                  {language === 'de' ? 'Automatischer Versand:' : 'Automatic Sending:'}
                </span>
              </div>
              <Badge variant="outline" className="bg-white">
                <Mail className="w-3 h-3 mr-1" />
                {language === 'de' ? 'Zahlungserinnerung: ' : 'Payment Reminder: '}
                {schedulerInfo.payment_reminder_schedule || 'Montag 9:00 UTC'}
              </Badge>
              <Badge variant="outline" className="bg-white">
                <Mail className="w-3 h-3 mr-1" />
                {language === 'de' ? 'Ankunftserinnerung: ' : 'Arrival Reminder: '}
                {schedulerInfo.arrival_reminder_schedule || '1 Woche vor Anreise'}
              </Badge>
              <Badge className={schedulerInfo.running ? 'bg-green-500' : 'bg-red-500'}>
                {schedulerInfo.running 
                  ? (language === 'de' ? 'Aktiv' : 'Active')
                  : (language === 'de' ? 'Inaktiv' : 'Inactive')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hotel Selection */}
      <Card className="border-[#E5E0D5]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hotel className="w-5 h-5" />
            {language === 'de' ? 'Hotel auswählen' : 'Select Hotel'}
          </CardTitle>
          <CardDescription>
            {language === 'de' 
              ? 'Wählen Sie ein Hotel für spezifische Texte oder "Standard" für alle Hotels' 
              : 'Select a hotel for specific texts or "Default" for all hotels'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                {language === 'de' ? 'Standard (alle Hotels)' : 'Default (all hotels)'}
              </SelectItem>
              {hotels.map(hotel => (
                <SelectItem key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Tabs defaultValue="booking_confirmation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="booking_confirmation">
            {language === 'de' ? 'Buchungsbestätigung' : 'Booking Confirmation'}
          </TabsTrigger>
          <TabsTrigger value="payment_reminder">
            {language === 'de' ? 'Zahlungserinnerung' : 'Payment Reminder'}
          </TabsTrigger>
          <TabsTrigger value="arrival_reminder">
            {language === 'de' ? 'Ankunftserinnerung' : 'Arrival Reminder'}
          </TabsTrigger>
        </TabsList>

        {['booking_confirmation', 'payment_reminder', 'arrival_reminder'].map(templateType => (
          <TabsContent key={templateType} value={templateType}>
            <Card className="border-[#E5E0D5]">
              <CardHeader>
                <CardTitle>
                  {templateType === 'booking_confirmation' && (language === 'de' ? 'Buchungsbestätigung' : 'Booking Confirmation')}
                  {templateType === 'payment_reminder' && (language === 'de' ? 'Zahlungserinnerung (6 Wochen vor Anreise)' : 'Payment Reminder (6 weeks before arrival)')}
                  {templateType === 'arrival_reminder' && (language === 'de' ? 'Ankunftserinnerung (1 Woche vor Anreise)' : 'Arrival Reminder (1 week before arrival)')}
                </CardTitle>
                <CardDescription>
                  {language === 'de' 
                    ? 'Platzhalter: {salutation}, {first_name}, {last_name}, {hotel_name}, {hotel_address}, {booking_number}, {room_type}, {check_in}, {check_out}, {total_price}, {deposit_amount}, {remaining_amount}' 
                    : 'Placeholders: {salutation}, {first_name}, {last_name}, {hotel_name}, {hotel_address}, {booking_number}, {room_type}, {check_in}, {check_out}, {total_price}, {deposit_amount}, {remaining_amount}'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Deutsch</Label>
                    <Textarea 
                      value={templates[`${templateType}_de`] || ''}
                      onChange={(e) => handleTemplateChange(`${templateType}_de`, e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">English</Label>
                    <Textarea 
                      value={templates[`${templateType}_en`] || ''}
                      onChange={(e) => handleTemplateChange(`${templateType}_en`, e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    handleTemplateChange(`${templateType}_de`, getDefaultTemplate(templateType, 'de'));
                    handleTemplateChange(`${templateType}_en`, getDefaultTemplate(templateType, 'en'));
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {language === 'de' ? 'Standardtext laden' : 'Load default text'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EmailTemplates;

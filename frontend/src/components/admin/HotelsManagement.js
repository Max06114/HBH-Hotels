import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HotelsManagement = () => {
  const { t, language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [formData, setFormData] = useState({
    name: '', name_en: '', description: '', description_en: '',
    stars: 4, address: '', distance_to_venue: '', distance_to_venue_en: '',
    amenities: [], amenities_en: [], images: [],
    single_price: 0, double_price: 0, twin_price: 0,
    breakfast_included: true, tax_included: true, active: true
  });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const response = await axios.get(`${API}/admin/hotels`, { headers: getAuthHeaders() });
      setHotels(response.data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name, name_en: hotel.name_en,
      description: hotel.description, description_en: hotel.description_en,
      stars: hotel.stars, address: hotel.address,
      distance_to_venue: hotel.distance_to_venue, distance_to_venue_en: hotel.distance_to_venue_en,
      amenities: hotel.amenities, amenities_en: hotel.amenities_en,
      images: hotel.images, single_price: hotel.single_price,
      double_price: hotel.double_price, twin_price: hotel.twin_price || 0,
      breakfast_included: hotel.breakfast_included, tax_included: hotel.tax_included,
      active: hotel.active
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingHotel(null);
    setFormData({
      name: '', name_en: '', description: '', description_en: '',
      stars: 4, address: '', distance_to_venue: '', distance_to_venue_en: '',
      amenities: [], amenities_en: [], images: [],
      single_price: 0, double_price: 0, twin_price: 0,
      breakfast_included: true, tax_included: true, active: true
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        amenities: typeof formData.amenities === 'string' ? formData.amenities.split(',').map(s => s.trim()) : formData.amenities,
        amenities_en: typeof formData.amenities_en === 'string' ? formData.amenities_en.split(',').map(s => s.trim()) : formData.amenities_en,
        images: typeof formData.images === 'string' ? formData.images.split(',').map(s => s.trim()) : formData.images,
      };
      
      if (editingHotel) {
        await axios.put(`${API}/admin/hotels/${editingHotel.id}`, payload, { headers: getAuthHeaders() });
        toast.success(language === 'de' ? 'Hotel aktualisiert' : 'Hotel updated');
      } else {
        await axios.post(`${API}/admin/hotels`, payload, { headers: getAuthHeaders() });
        toast.success(language === 'de' ? 'Hotel erstellt' : 'Hotel created');
      }
      fetchHotels();
      setDialogOpen(false);
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Speichern' : 'Error saving');
    }
  };

  const handleToggleActive = async (hotel) => {
    try {
      await axios.put(`${API}/admin/hotels/${hotel.id}`, { ...hotel, active: !hotel.active }, { headers: getAuthHeaders() });
      toast.success(hotel.active 
        ? (language === 'de' ? 'Hotel deaktiviert' : 'Hotel deactivated')
        : (language === 'de' ? 'Hotel aktiviert' : 'Hotel activated')
      );
      fetchHotels();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Aktualisieren' : 'Error updating');
    }
  };

  const handleDelete = async (hotelId) => {
    if (!window.confirm(language === 'de' ? 'Hotel wirklich löschen?' : 'Really delete hotel?')) return;
    try {
      await axios.delete(`${API}/admin/hotels/${hotelId}`, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Hotel gelöscht' : 'Hotel deleted');
      fetchHotels();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Löschen' : 'Error deleting');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-hotels">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">{t('adminHotels')}</h1>
        <Button onClick={handleCreate} className="bg-[#6B1D2A] hover:bg-[#8A2536]" data-testid="add-hotel-btn">
          <Plus className="w-4 h-4 mr-2" />
          {language === 'de' ? 'Hotel hinzufügen' : 'Add Hotel'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hotels.map((hotel) => (
          <Card key={hotel.id} className="border-[#E5E0D5]">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <img
                  src={hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200'}
                  alt={hotel.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{hotel.name}</h3>
                  <p className="text-sm text-[#4A4A4A]">{hotel.address}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-[#6B1D2A] font-semibold">EZ: {hotel.single_price}€</span>
                    <span className="mx-2">|</span>
                    <span className="text-[#6B1D2A] font-semibold">DZ: {hotel.double_price}€</span>
                  </div>
                  <Badge className={hotel.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {hotel.active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleToggleActive(hotel)}
                  className={hotel.active ? 'text-orange-600' : 'text-green-600'}
                  data-testid={`toggle-hotel-${hotel.id}`}
                >
                  {hotel.active ? (language === 'de' ? 'Deaktivieren' : 'Deactivate') : (language === 'de' ? 'Aktivieren' : 'Activate')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(hotel)} data-testid={`edit-hotel-${hotel.id}`}>
                  <Edit className="w-4 h-4 mr-1" /> {t('edit')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(hotel.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-1" /> {t('delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hotel Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHotel ? (language === 'de' ? 'Hotel bearbeiten' : 'Edit Hotel') : (language === 'de' ? 'Neues Hotel' : 'New Hotel')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name (DE)</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <Label>Name (EN)</Label>
              <Input value={formData.name_en} onChange={(e) => setFormData({...formData, name_en: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Beschreibung (DE)</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Description (EN)</Label>
              <Textarea value={formData.description_en} onChange={(e) => setFormData({...formData, description_en: e.target.value})} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div>
              <Label>Sterne</Label>
              <Input type="number" min="1" max="5" value={formData.stars} onChange={(e) => setFormData({...formData, stars: parseInt(e.target.value)})} />
            </div>
            <div>
              <Label>Entfernung (DE)</Label>
              <Input value={formData.distance_to_venue} onChange={(e) => setFormData({...formData, distance_to_venue: e.target.value})} />
            </div>
            <div>
              <Label>Distance (EN)</Label>
              <Input value={formData.distance_to_venue_en} onChange={(e) => setFormData({...formData, distance_to_venue_en: e.target.value})} />
            </div>
            <div>
              <Label>Einzelzimmer (€)</Label>
              <Input type="number" step="0.01" value={formData.single_price} onChange={(e) => setFormData({...formData, single_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <Label>Doppelzimmer (€)</Label>
              <Input type="number" step="0.01" value={formData.double_price} onChange={(e) => setFormData({...formData, double_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <Label>Zweibettzimmer (€)</Label>
              <Input type="number" step="0.01" value={formData.twin_price} onChange={(e) => setFormData({...formData, twin_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <Label>Bilder (URLs, kommagetrennt)</Label>
              <Input value={Array.isArray(formData.images) ? formData.images.join(', ') : formData.images} onChange={(e) => setFormData({...formData, images: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave} className="bg-[#6B1D2A] hover:bg-[#8A2536]">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelsManagement;

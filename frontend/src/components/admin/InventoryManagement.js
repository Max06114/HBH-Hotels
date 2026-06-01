import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Edit, Loader2, Package, RefreshCw } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const InventoryManagement = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [editValues, setEditValues] = useState({});

  const fetchInventory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/inventory`, { headers: getAuthHeaders() });
      setInventoryData(response.data.hotels || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error(language === 'de' ? 'Fehler beim Laden des Inventars' : 'Error loading inventory');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, language]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSeedInventory = async () => {
    if (!window.confirm(language === 'de' 
      ? 'Inventardaten initialisieren? (Überschreibt bestehende Werte)'
      : 'Initialize inventory data? (Overwrites existing values)')) {
      return;
    }
    
    setSeeding(true);
    try {
      await axios.post(`${API}/admin/seed-inventory`, {}, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Inventar initialisiert!' : 'Inventory initialized!');
      fetchInventory();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Initialisieren' : 'Error initializing');
    } finally {
      setSeeding(false);
    }
  };

  const handleEditStart = (hotel) => {
    setEditingHotel(hotel.hotel_id);
    setEditValues({
      single: hotel.inventory?.single || 0,
      double: hotel.inventory?.double || 0,
      twin: hotel.inventory?.twin || 0,
      standard_pool: hotel.inventory?.standard_pool || 0,
      comfort_pool: hotel.inventory?.comfort_pool || 0
    });
  };

  const handleSaveInventory = async (hotelId) => {
    try {
      await axios.put(`${API}/admin/inventory/${hotelId}`, editValues, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Inventar aktualisiert!' : 'Inventory updated!');
      setEditingHotel(null);
      fetchInventory();
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Speichern' : 'Error saving');
    }
  };

  const getRoomTypeLabel = (type, lang) => {
    const labels = {
      de: { single: 'EZ', double: 'DZ', twin: 'Twin', standard_pool: 'Standard Pool', comfort_pool: 'Komfort Pool' },
      en: { single: 'Single', double: 'Double', twin: 'Twin', standard_pool: 'Standard Pool', comfort_pool: 'Comfort Pool' }
    };
    return labels[lang]?.[type] || type;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-inventory">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl text-[#1A1A1A]">
          {language === 'de' ? 'Lagerhaltung / Zimmer-Inventar' : 'Room Inventory'}
        </h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchInventory}
            data-testid="refresh-inventory-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'de' ? 'Aktualisieren' : 'Refresh'}
          </Button>
          <Button 
            onClick={handleSeedInventory}
            disabled={seeding}
            className="bg-[#6B1D2A] hover:bg-[#8A2536]"
            data-testid="seed-inventory-btn"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
            {language === 'de' ? 'Inventar initialisieren' : 'Initialize Inventory'}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 mb-6">
        <CardContent className="pt-6">
          <p className="text-blue-800 text-sm">
            <strong>{language === 'de' ? 'Info:' : 'Info:'}</strong>{' '}
            {language === 'de' 
              ? 'Das Inventar wird bei erfolgreicher Zahlung (Anzahlung) reduziert und bei Stornierung wieder erhöht. Pool-basierte Hotels (z.B. Dorint) können Zimmer flexibel als EZ, DZ oder Twin nutzen.'
              : 'Inventory is decremented on successful payment (deposit) and restored on cancellation. Pool-based hotels (e.g., Dorint) can use rooms flexibly as single, double, or twin.'}
          </p>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <div className="space-y-6">
        {inventoryData.map((hotel) => (
          <Card key={hotel.hotel_id} className="border-[#E5E0D5]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{hotel.hotel_name}</CardTitle>
                <Badge className={hotel.inventory_type === 'pool' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                  {hotel.inventory_type === 'pool' 
                    ? (language === 'de' ? 'Pool-basiert (flexibel)' : 'Pool-based (flexible)')
                    : (language === 'de' ? 'Feste Zimmertypen' : 'Fixed room types')}
                </Badge>
                {!hotel.active && (
                  <Badge className="ml-2 bg-gray-100 text-gray-800">
                    {language === 'de' ? 'Inaktiv' : 'Inactive'}
                  </Badge>
                )}
              </div>
              {editingHotel === hotel.hotel_id ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingHotel(null)}>
                    {language === 'de' ? 'Abbrechen' : 'Cancel'}
                  </Button>
                  <Button size="sm" className="bg-[#6B1D2A] hover:bg-[#8A2536]" onClick={() => handleSaveInventory(hotel.hotel_id)}>
                    {language === 'de' ? 'Speichern' : 'Save'}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleEditStart(hotel)} data-testid={`edit-inventory-${hotel.hotel_id}`}>
                  <Edit className="w-4 h-4 mr-1" />
                  {language === 'de' ? 'Bearbeiten' : 'Edit'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'de' ? 'Zimmertyp' : 'Room Type'}</TableHead>
                      <TableHead className="text-center">{language === 'de' ? 'Verfügbar' : 'Available'}</TableHead>
                      <TableHead className="text-center">{language === 'de' ? 'Gebucht' : 'Booked'}</TableHead>
                      <TableHead className="text-center">{language === 'de' ? 'Gesamt' : 'Total'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotel.inventory_type === 'pool' ? (
                      <>
                        <TableRow className="bg-[#F5F2EA]/50">
                          <TableCell className="font-medium">
                            {language === 'de' ? 'Standard-Zimmer' : 'Standard Rooms'}
                            <span className="text-xs text-[#4A4A4A] block">(EZ/DZ/Twin)</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {editingHotel === hotel.hotel_id ? (
                              <Input 
                                type="number" 
                                min="0"
                                className="w-20 text-center mx-auto"
                                value={editValues.standard_pool}
                                onChange={(e) => setEditValues({...editValues, standard_pool: parseInt(e.target.value) || 0})}
                              />
                            ) : (
                              <span className={`font-bold ${(hotel.inventory?.standard_pool || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {hotel.inventory?.standard_pool || 0}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-[#4A4A4A]">
                            {(hotel.booked?.single || 0) + (hotel.booked?.double || 0) + (hotel.booked?.twin || 0)}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(hotel.inventory?.standard_pool || 0) + (hotel.booked?.single || 0) + (hotel.booked?.double || 0) + (hotel.booked?.twin || 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            {language === 'de' ? 'Komfort-Zimmer' : 'Comfort Rooms'}
                            <span className="text-xs text-[#4A4A4A] block">(EZ/DZ/Twin Komfort)</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {editingHotel === hotel.hotel_id ? (
                              <Input 
                                type="number" 
                                min="0"
                                className="w-20 text-center mx-auto"
                                value={editValues.comfort_pool}
                                onChange={(e) => setEditValues({...editValues, comfort_pool: parseInt(e.target.value) || 0})}
                              />
                            ) : (
                              <span className={`font-bold ${(hotel.inventory?.comfort_pool || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {hotel.inventory?.comfort_pool || 0}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-[#4A4A4A]">
                            {(hotel.booked?.single_comfort || 0) + (hotel.booked?.double_comfort || 0) + (hotel.booked?.twin_comfort || 0)}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(hotel.inventory?.comfort_pool || 0) + (hotel.booked?.single_comfort || 0) + (hotel.booked?.double_comfort || 0) + (hotel.booked?.twin_comfort || 0)}
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      ['single', 'double', 'twin'].map((roomType) => (
                        <TableRow key={roomType} className={roomType === 'double' ? 'bg-[#F5F2EA]/50' : ''}>
                          <TableCell className="font-medium">{getRoomTypeLabel(roomType, language)}</TableCell>
                          <TableCell className="text-center">
                            {editingHotel === hotel.hotel_id ? (
                              <Input 
                                type="number" 
                                min="0"
                                className="w-20 text-center mx-auto"
                                value={editValues[roomType]}
                                onChange={(e) => setEditValues({...editValues, [roomType]: parseInt(e.target.value) || 0})}
                              />
                            ) : (
                              <span className={`font-bold ${(hotel.inventory?.[roomType] || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {hotel.inventory?.[roomType] || 0}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-[#4A4A4A]">
                            {hotel.booked?.[roomType] || 0}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(hotel.inventory?.[roomType] || 0) + (hotel.booked?.[roomType] || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InventoryManagement;

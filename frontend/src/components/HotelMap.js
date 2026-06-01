import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon factory
const createIcon = (color, emoji) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: ${color};
    width: 36px;
    height: 36px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    border: 2px solid white;
  "><span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Pre-created icons
const ICONS = {
  hotel: createIcon('#6B1D2A', '🏨'),
  venue: createIcon('#D4AF37', '🎵'),
  train: createIcon('#1A1A1A', '🚂'),
};

// Map configuration
const MAP_CENTER = [51.4810, 11.9730];
const HOTEL_COORDS = {
  'b&b': [51.4817, 11.9656],
  'ankerhof': [51.4824, 11.9621],
  'dorint': [51.4799, 11.9811],
  'niu': [51.4786, 11.9836],  // Riebeckplatz 10, direkt am Hauptbahnhof
};

// Get hotel position by name matching
const getHotelPosition = (hotelName) => {
  const name = hotelName.toLowerCase();
  if (name.includes('b&b') || name.includes('b & b') || name.includes('bb hotel')) return HOTEL_COORDS['b&b'];
  if (name.includes('ankerhof')) return HOTEL_COORDS.ankerhof;
  if (name.includes('dorint') || name.includes('charlottenhof')) return HOTEL_COORDS.dorint;
  if (name.includes('niu') || name.includes('ridge') || name.includes('holiday inn')) return HOTEL_COORDS.niu;
  return MAP_CENTER;
};

const HotelMap = ({ hotels = [] }) => {
  const { language } = useLanguage();
  const isDE = language === 'de';

  // Memoize landmarks to prevent recreation on each render
  const landmarks = useMemo(() => [
    {
      id: 'haendelhalle',
      name: isDE ? 'Händelhalle (Veranstaltungsort)' : 'Händelhalle (Venue)',
      position: [51.4817, 11.9643],
      icon: ICONS.venue,
      description: isDE ? 'Konzerthaus und Veranstaltungsort für Happy Birthday Händel' : 'Concert hall and venue for Happy Birthday Händel'
    },
    {
      id: 'haendeldenkmal',
      name: isDE ? 'Händeldenkmal' : 'Händel Monument',
      position: [51.4826, 11.9703],
      icon: ICONS.venue,
      description: isDE ? 'Bronzestandbild von Georg Friedrich Händel auf dem Marktplatz (1859)' : 'Bronze statue of George Frideric Handel on the market square (1859)'
    },
    {
      id: 'bahnhof',
      name: isDE ? 'Hauptbahnhof Halle' : 'Halle Main Station',
      position: [51.4781, 11.9867],
      icon: ICONS.train,
      description: isDE ? 'ICE-Bahnhof mit Verbindungen nach Berlin, Leipzig, Frankfurt' : 'ICE station with connections to Berlin, Leipzig, Frankfurt'
    },
    {
      id: 'marktkirche',
      name: isDE ? 'Marktkirche Unser Lieben Frauen' : 'Market Church',
      position: [51.4826, 11.9681],
      icon: ICONS.venue,
      description: isDE ? 'Historische Kirche, in der Händel getauft wurde' : 'Historic church where Händel was baptized'
    }
  ], [isDE]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#E5E0D5] shadow-lg" data-testid="hotel-map">
      <MapContainer center={MAP_CENTER} zoom={15} style={{ height: '500px', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Landmarks */}
        {landmarks.map(({ id, position, icon, name, description }) => (
          <Marker key={id} position={position} icon={icon}>
            <Popup>
              <div className="font-sans">
                <h3 className="font-semibold text-[#1A1A1A] mb-1">{name}</h3>
                <p className="text-sm text-[#4A4A4A]">{description}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Hotels */}
        {hotels.map((hotel) => (
          <Marker key={hotel.id} position={getHotelPosition(hotel.name)} icon={ICONS.hotel}>
            <Popup>
              <div className="font-sans min-w-[200px]">
                <h3 className="font-semibold text-[#6B1D2A] mb-1">{isDE ? hotel.name : hotel.name_en}</h3>
                <p className="text-xs text-[#4A4A4A] mb-2">{hotel.address}</p>
                <p className="text-sm mb-2">{isDE ? hotel.distance_to_venue : hotel.distance_to_venue_en}</p>
                <div className="flex gap-2 text-xs">
                  <span className="bg-[#F5F2EA] px-2 py-1 rounded">EZ: {hotel.single_price}€</span>
                  <span className="bg-[#F5F2EA] px-2 py-1 rounded">DZ: {hotel.double_price}€</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg z-[1000]">
        <h4 className="font-semibold text-sm mb-3 text-[#1A1A1A]">{isDE ? 'Legende' : 'Legend'}</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#6B1D2A] rounded-full"></span>
            <span>Hotels</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#D4AF37] rounded-full"></span>
            <span>{isDE ? 'Happy-Birthday-Händel-Locations' : 'Happy Birthday Händel Locations'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#1A1A1A] rounded-full"></span>
            <span>{isDE ? 'Bahnhof' : 'Train Station'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelMap;

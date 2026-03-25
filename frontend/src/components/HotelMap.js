import React from 'react';
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

// Custom icons
const createIcon = (color, emoji) => {
  return L.divIcon({
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
};

const hotelIcon = createIcon('#6B1D2A', '🏨');
const venueIcon = createIcon('#D4AF37', '🎵');
const trainIcon = createIcon('#1A1A1A', '🚂');
const churchIcon = createIcon('#4A4A4A', '⛪');

const HotelMap = ({ hotels = [] }) => {
  const { language } = useLanguage();

  // Halle (Saale) center
  const center = [51.4825, 11.9700];

  // Points of interest
  const landmarks = [
    {
      id: 'haendelhalle',
      name: language === 'de' ? 'Händelhalle (Veranstaltungsort)' : 'Händelhalle (Venue)',
      position: [51.4833, 11.9680],
      icon: venueIcon,
      description: language === 'de' 
        ? 'Konzerthaus und Veranstaltungsort für Happy Birthday Händel'
        : 'Concert hall and venue for Happy Birthday Händel'
    },
    {
      id: 'bahnhof',
      name: language === 'de' ? 'Hauptbahnhof Halle' : 'Halle Main Station',
      position: [51.4769, 11.9870],
      icon: trainIcon,
      description: language === 'de'
        ? 'ICE-Bahnhof mit Verbindungen nach Berlin, Leipzig, Frankfurt'
        : 'ICE station with connections to Berlin, Leipzig, Frankfurt'
    },
    {
      id: 'marktkirche',
      name: language === 'de' ? 'Marktkirche Unser Lieben Frauen' : 'Market Church',
      position: [51.4829, 11.9694],
      icon: churchIcon,
      description: language === 'de'
        ? 'Historische Kirche, in der Händel getauft wurde'
        : 'Historic church where Händel was baptized'
    }
  ];

  // Hotel coordinates (approximate based on addresses)
  const hotelCoordinates = {
    'niu': [51.4775, 11.9865],
    'rotes': [51.4815, 11.9710],
    'ankerhof': [51.4840, 11.9675],
    'dorint': [51.4890, 11.9630]
  };

  const getHotelPosition = (hotel) => {
    const name = hotel.name.toLowerCase();
    if (name.includes('niu')) return hotelCoordinates.niu;
    if (name.includes('rotes') || name.includes('ross')) return hotelCoordinates.rotes;
    if (name.includes('ankerhof')) return hotelCoordinates.ankerhof;
    if (name.includes('dorint') || name.includes('charlottenhof')) return hotelCoordinates.dorint;
    return center;
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#E5E0D5] shadow-lg" data-testid="hotel-map">
      <MapContainer 
        center={center} 
        zoom={15} 
        style={{ height: '500px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Landmarks */}
        {landmarks.map((landmark) => (
          <Marker 
            key={landmark.id} 
            position={landmark.position} 
            icon={landmark.icon}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-semibold text-[#1A1A1A] mb-1">{landmark.name}</h3>
                <p className="text-sm text-[#4A4A4A]">{landmark.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Hotels */}
        {hotels.map((hotel) => (
          <Marker 
            key={hotel.id} 
            position={getHotelPosition(hotel)} 
            icon={hotelIcon}
          >
            <Popup>
              <div className="font-sans min-w-[200px]">
                <h3 className="font-semibold text-[#6B1D2A] mb-1">
                  {language === 'en' ? hotel.name_en : hotel.name}
                </h3>
                <p className="text-xs text-[#4A4A4A] mb-2">{hotel.address}</p>
                <p className="text-sm mb-2">
                  {language === 'en' ? hotel.distance_to_venue_en : hotel.distance_to_venue}
                </p>
                <div className="flex gap-2 text-xs">
                  <span className="bg-[#F5F2EA] px-2 py-1 rounded">
                    EZ: {hotel.single_price}€
                  </span>
                  <span className="bg-[#F5F2EA] px-2 py-1 rounded">
                    DZ: {hotel.double_price}€
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg z-[1000]">
        <h4 className="font-semibold text-sm mb-3 text-[#1A1A1A]">
          {language === 'de' ? 'Legende' : 'Legend'}
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#6B1D2A] rounded-full"></span>
            <span>{language === 'de' ? 'Hotels' : 'Hotels'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#D4AF37] rounded-full"></span>
            <span>{language === 'de' ? 'Händelhalle' : 'Händelhalle'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#1A1A1A] rounded-full"></span>
            <span>{language === 'de' ? 'Bahnhof' : 'Train Station'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#4A4A4A] rounded-full"></span>
            <span>{language === 'de' ? 'Marktkirche' : 'Market Church'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelMap;

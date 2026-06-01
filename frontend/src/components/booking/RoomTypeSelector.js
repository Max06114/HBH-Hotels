import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// German price format helper
const formatPrice = (price) => {
  return price.toFixed(2).replace('.', ',');
};

const RoomTypeSelector = ({ hotel, availability, value, onChange }) => {
  const { language } = useLanguage();

  const renderAvailabilityBadge = (count) => {
    if (count === 0) {
      return <span className="text-red-600 ml-2">{language === 'de' ? '(ausgebucht)' : '(sold out)'}</span>;
    }
    if (count > 0 && count <= 3) {
      return <span className="text-orange-600 ml-2">({count} {language === 'de' ? 'verfügbar' : 'available'})</span>;
    }
    return null;
  };

  return (
    <div>
      <Label htmlFor="roomType">{language === 'de' ? 'Zimmertyp' : 'Room Type'} *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="room-type-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* Standard rooms */}
          <SelectItem value="single" disabled={availability?.single === 0}>
            {language === 'de' ? 'Einzelzimmer Standard' : 'Single Room Standard'} - {formatPrice(hotel.single_price)} €
            {renderAvailabilityBadge(availability?.single)}
          </SelectItem>
          <SelectItem value="double" disabled={availability?.double === 0}>
            {language === 'de' ? 'Doppelzimmer Standard' : 'Double Room Standard'} - {formatPrice(hotel.double_price)} €
            {renderAvailabilityBadge(availability?.double)}
          </SelectItem>
          {hotel.twin_price && (
            <SelectItem value="twin" disabled={availability?.twin === 0}>
              {language === 'de' ? 'Zweibettzimmer Standard' : 'Twin Room Standard'} - {formatPrice(hotel.twin_price)} €
              {renderAvailabilityBadge(availability?.twin)}
            </SelectItem>
          )}
          
          {/* Comfort rooms (if available) */}
          {hotel.has_comfort_rooms && hotel.single_comfort_price && (
            <SelectItem value="single_comfort" disabled={availability?.single_comfort === 0}>
              {language === 'de' ? 'Einzelzimmer Comfort' : 'Single Room Comfort'} - {formatPrice(hotel.single_comfort_price)} €
              {renderAvailabilityBadge(availability?.single_comfort)}
            </SelectItem>
          )}
          {hotel.has_comfort_rooms && hotel.double_comfort_price && (
            <SelectItem value="double_comfort" disabled={availability?.double_comfort === 0}>
              {language === 'de' ? 'Doppelzimmer Comfort' : 'Double Room Comfort'} - {formatPrice(hotel.double_comfort_price)} €
              {renderAvailabilityBadge(availability?.double_comfort)}
            </SelectItem>
          )}
          {hotel.has_comfort_rooms && hotel.twin_comfort_price && (
            <SelectItem value="twin_comfort" disabled={availability?.twin_comfort === 0}>
              {language === 'de' ? 'Zweibettzimmer Comfort' : 'Twin Room Comfort'} - {formatPrice(hotel.twin_comfort_price)} €
              {renderAvailabilityBadge(availability?.twin_comfort)}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RoomTypeSelector;

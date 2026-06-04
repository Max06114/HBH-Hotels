import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardContent } from '../ui/card';
import { MapPin, Star, Building } from 'lucide-react';

// German price format helper
const formatPrice = (price) => {
  return price.toFixed(2).replace('.', ',');
};

const BookingSummary = ({ hotel, priceInfo }) => {
  const { language, t } = useLanguage();
  
  const hotelName = language === 'en' ? hotel.name_en : hotel.name;

  return (
    <Card className="border-[#E5E0D5] sticky top-24">
      <CardContent className="p-0">
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          <img
            src={hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'}
            alt={hotelName}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex items-center gap-1 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-sm">
            {[...Array(hotel.stars)].map((_, i) => (
              <Star key={`star-${i}`} className="w-3 h-3 fill-current" />
            ))}
          </div>
        </div>
        <CardContent className="p-6">
          <h3 className="font-serif text-xl font-semibold mb-2">{hotelName}</h3>
          
          {/* Hotel Address */}
          {hotel.address && (
            <div className="flex items-start gap-2 text-[#4A4A4A] text-sm mb-2">
              <Building className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{hotel.address}</span>
            </div>
          )}
          
          {/* Distance to Venue */}
          <div className="flex items-center gap-2 text-[#4A4A4A] text-sm mb-4">
            <MapPin className="w-4 h-4" />
            <span>{language === 'en' ? hotel.distance_to_venue_en : hotel.distance_to_venue}</span>
          </div>

          {priceInfo && (
            <div className="border-t border-[#E5E0D5] pt-4 mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#4A4A4A]">{priceInfo.nights} {t('nights')} × {formatPrice(priceInfo.pricePerNight)} €</span>
                <span>{formatPrice(priceInfo.total)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4A4A4A]">{t('deposit')}</span>
                <span className="font-semibold text-[#6B1D2A]">{formatPrice(priceInfo.deposit)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4A4A4A]">{t('remainingBalance')}</span>
                <span>{formatPrice(priceInfo.remaining)} €</span>
              </div>
              <div className="border-t border-[#E5E0D5] pt-3 flex justify-between">
                <span className="font-semibold">{t('total')}</span>
                <span className="font-semibold text-lg">{formatPrice(priceInfo.total)} €</span>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-[#F5F2EA] rounded-lg text-xs text-[#4A4A4A]">
            <p className="font-semibold mb-1">{language === 'de' ? 'Zahlungsbedingungen:' : 'Payment Terms:'}</p>
            <p>{language === 'de' 
              ? '25% Anzahlung bei Buchung, 75% Restzahlung 6 Wochen vor Anreise.' 
              : '25% deposit at booking, 75% balance due 6 weeks before arrival.'}</p>
          </div>

          {/* Hotel Description */}
          {(hotel.description || hotel.description_en) && (
            <div className="mt-4 pt-4 border-t border-[#E5E0D5]">
              <p className="font-semibold text-sm mb-2">{language === 'de' ? 'Hotelbeschreibung:' : 'Hotel Description:'}</p>
              <p className="text-xs text-[#4A4A4A] leading-relaxed">
                {language === 'en' ? hotel.description_en : hotel.description}
              </p>
            </div>
          )}
        </CardContent>
      </CardContent>
    </Card>
  );
};

export default BookingSummary;

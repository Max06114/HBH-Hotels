import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Coffee, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const HotelCard = ({ hotel, index }) => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const name = language === 'en' ? hotel.name_en : hotel.name;
  const description = language === 'en' ? hotel.description_en : hotel.description;
  const distance = language === 'en' ? hotel.distance_to_venue_en : hotel.distance_to_venue;
  const amenities = language === 'en' ? hotel.amenities_en : hotel.amenities;

  const images = hotel.images?.length > 0 
    ? hotel.images 
    : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'];

  const imageLabels = language === 'de' 
    ? ['Außenansicht', 'Zimmer', 'Restaurant'] 
    : ['Exterior', 'Room', 'Restaurant'];

  const handleBookNow = () => {
    navigate(`/booking/${hotel.id}`);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Card 
      className="hotel-card bg-white border border-[#E5E0D5] overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
      data-testid={`hotel-card-${hotel.id}`}
    >
      {/* Image Gallery */}
      <div className="relative h-56 overflow-hidden group">
        <img
          src={images[currentImageIndex]}
          alt={`${name} - ${imageLabels[currentImageIndex] || ''}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Navigation arrows - only show if more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 text-[#1A1A1A]" />
            </button>
          </>
        )}

        {/* Image label */}
        {images.length > 1 && imageLabels[currentImageIndex] && (
          <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs">
            {imageLabels[currentImageIndex]}
          </div>
        )}

        {/* Dots indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Stars badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-sm font-medium">
          {[...Array(hotel.stars)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-current" />
          ))}
        </div>
      </div>

      <CardContent className="p-6">
        {/* Title */}
        <h3 className="font-serif text-xl font-semibold text-[#1A1A1A] mb-2">{name}</h3>
        
        {/* Location */}
        <div className="flex items-center gap-2 text-[#4A4A4A] text-sm mb-4">
          <MapPin className="w-4 h-4" />
          <span>{distance}</span>
        </div>

        {/* Description */}
        <p className="text-[#4A4A4A] text-sm mb-4 line-clamp-3">{description}</p>

        {/* Amenities */}
        <div className="flex flex-wrap gap-2 mb-6">
          {amenities.slice(0, 3).map((amenity, i) => (
            <span 
              key={i} 
              className="flex items-center gap-1 text-xs bg-[#F5F2EA] text-[#4A4A4A] px-2 py-1 rounded-full"
            >
              <Check className="w-3 h-3 text-[#2E7D32]" />
              {amenity}
            </span>
          ))}
        </div>

        {/* Prices */}
        <div className="border-t border-[#E5E0D5] pt-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#4A4A4A]">{t('singleRoom')}</span>
              <p className="font-semibold text-[#6B1D2A]">{hotel.single_price.toFixed(2)} € <span className="font-normal text-xs text-[#4A4A4A]">{t('perNight')}</span></p>
            </div>
            <div>
              <span className="text-[#4A4A4A]">{t('doubleRoom')}</span>
              <p className="font-semibold text-[#6B1D2A]">{hotel.double_price.toFixed(2)} € <span className="font-normal text-xs text-[#4A4A4A]">{t('perNight')}</span></p>
            </div>
          </div>
          {hotel.twin_price && (
            <div className="mt-2 text-sm">
              <span className="text-[#4A4A4A]">{t('twinRoom')}: </span>
              <span className="font-semibold text-[#6B1D2A]">{hotel.twin_price.toFixed(2)} €</span>
            </div>
          )}
        </div>

        {/* Included */}
        <div className="flex items-center gap-4 text-xs text-[#2E7D32] mb-4">
          {hotel.breakfast_included && (
            <span className="flex items-center gap-1">
              <Coffee className="w-3 h-3" />
              {t('breakfastIncluded')}
            </span>
          )}
        </div>

        {/* Book Button */}
        <Button
          onClick={handleBookNow}
          className="w-full bg-[#6B1D2A] hover:bg-[#8A2536] text-white rounded-full py-6"
          data-testid={`book-hotel-${hotel.id}`}
        >
          {t('bookNow')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HotelCard;

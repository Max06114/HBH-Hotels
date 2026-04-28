import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HotelCard from '../components/HotelCard';
import HotelMap from '../components/HotelMap';
import { Button } from '../components/ui/button';
import { Music, Users, Calendar, MapPin, ArrowDown, Loader2, Map } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HomePage = () => {
  const { language, t } = useLanguage();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      // Try to seed hotels first
      await axios.post(`${API}/seed-hotels`).catch(() => {});
      
      const response = await axios.get(`${API}/hotels`);
      setHotels(response.data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToHotels = () => {
    document.getElementById('hotels')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center" data-testid="hero-section">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1763627516727-2ca3e324fa59?crop=entropy&cs=srgb&fm=jpg&w=1920&q=80"
            alt="Orchestra"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-gradient" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <span className="inline-block text-[#D4AF37] text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              21. - 23. Februar 2026 · Halle (Saale)
            </span>
            
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white font-bold mb-6 leading-tight">
              {t('heroTitle')}
            </h1>
            
            <p className="text-xl text-white/90 mb-4">
              {t('heroSubtitle')}
            </p>
            
            <p className="text-white/70 mb-8 max-w-2xl">
              {t('heroDescription')}
            </p>

            <div className="flex flex-wrap gap-6 mb-12">
              <div className="flex items-center gap-2 text-white/80">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                <span>450+ {language === 'de' ? 'Sänger' : 'Singers'}</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Music className="w-5 h-5 text-[#D4AF37]" />
                <span>Händels Messiah</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <MapPin className="w-5 h-5 text-[#D4AF37]" />
                <span>Händelhalle, Halle</span>
              </div>
            </div>

            <Button
              onClick={scrollToHotels}
              className="bg-[#D4AF37] hover:bg-[#B8962F] text-[#1A1A1A] rounded-full px-8 py-6 text-lg font-semibold"
              data-testid="view-hotels-btn"
            >
              {t('viewHotels')}
              <ArrowDown className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 bg-white rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* Info Section */}
      <section className="py-16 bg-[#F5F2EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[#4A4A4A] leading-relaxed">
              {language === 'de' ? (
                <>
                  <strong className="text-[#6B1D2A]">Mit den folgenden Hotels haben wir die besten Preise ausgehandelt.</strong> Übernachtung ist möglich ab 89 € im geteilten Doppelzimmer. <strong>Frühstück und Bettensteuer sind inklusive.</strong> Alle Unterkünfte sind gut fußläufig zur Händelhalle gelegen. Travel Events ist Vermittler. Eine 25% Anzahlung ist für die Reservierung nötig. Der Rest wird 6 Wochen vor Anreise fällig. Eine kostenfreie Stornierung ist bis zu einer Woche vorher möglich, danach 50% bis einen Tag vorher, wonach 100% Stornogebühren anfallen.
                </>
              ) : (
                <>
                  <strong className="text-[#6B1D2A]">We have negotiated the best prices with the following hotels.</strong> Accommodation is available from €75.50 in a shared double room. <strong>Breakfast and city tax are included.</strong> All accommodations are within walking distance of the Händelhalle. Travel Events is the intermediary. A 25% deposit is required for reservation. The remainder is due 6 weeks before arrival. Free cancellation is possible up to one week before, then 50% up to one day before, after which 100% cancellation fees apply.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Hotels Section */}
      <section id="hotels" className="py-20" data-testid="hotels-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#D4AF37] text-sm font-semibold tracking-[0.2em] uppercase">
              {language === 'de' ? 'Unterkünfte' : 'Accommodations'}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] mt-2 mb-4">
              {t('hotelsTitle')}
            </h2>
            <p className="text-[#4A4A4A] max-w-2xl mx-auto">
              {t('hotelsSubtitle')}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {hotels.map((hotel, index) => (
                <motion.div
                  key={hotel.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <HotelCard hotel={hotel} index={index} />
                </motion.div>
              ))}
            </div>
          )}

          {!loading && hotels.length === 0 && (
            <div className="text-center py-12 text-[#4A4A4A]">
              {language === 'de' ? 'Keine Hotels verfügbar.' : 'No hotels available.'}
            </div>
          )}
        </div>
      </section>

      {/* Map Section */}
      <section id="map" className="py-20 bg-[#F5F2EA]" data-testid="map-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[#D4AF37] text-sm font-semibold tracking-[0.2em] uppercase">
              {language === 'de' ? 'Lage' : 'Location'}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1A1A1A] mt-2 mb-4">
              {language === 'de' ? 'Übersichtskarte' : 'Overview Map'}
            </h2>
            <p className="text-[#4A4A4A] max-w-2xl mx-auto">
              {language === 'de' 
                ? 'Alle Hotels sind fußläufig zur Händelhalle und zum Hauptbahnhof gelegen.'
                : 'All hotels are within walking distance to Händelhalle and the main train station.'}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <HotelMap hotels={hotels} />
          </motion.div>
        </div>
      </section>

      {/* Event Info */}
      <section className="py-20 bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-8">
              <Calendar className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="font-serif text-xl text-white mb-2">
                {language === 'de' ? 'Datum' : 'Date'}
              </h3>
              <p className="text-white/70">21. - 23. Februar 2026</p>
            </div>
            <div className="p-8">
              <MapPin className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="font-serif text-xl text-white mb-2">
                {language === 'de' ? 'Veranstaltungsort' : 'Venue'}
              </h3>
              <p className="text-white/70">Händelhalle, Halle (Saale)</p>
            </div>
            <div className="p-8">
              <Music className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="font-serif text-xl text-white mb-2">
                {language === 'de' ? 'Programm' : 'Program'}
              </h3>
              <p className="text-white/70">G.F. Händel - Messiah</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Music, Mail, MapPin } from 'lucide-react';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#1A1A1A] text-[#FDFBF7] py-16" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#6B1D2A] rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-serif text-xl font-semibold">Travel Events</span>
                <p className="text-sm text-[#FDFBF7]/70">Music, Arts and Sport tours</p>
              </div>
            </div>
            <p className="text-[#FDFBF7]/70 text-sm leading-relaxed">
              Spezialisiert auf Musikreisen und Events in Deutschland und Europa. 
              Ihr Partner für unvergessliche Kulturerlebnisse.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-serif text-lg mb-6">Quick Links</h3>
            <nav className="flex flex-col gap-3">
              <Link to="/" className="text-[#FDFBF7]/70 hover:text-[#D4AF37] transition-colors">
                {t('home')}
              </Link>
              <Link to="/#hotels" className="text-[#FDFBF7]/70 hover:text-[#D4AF37] transition-colors">
                {t('hotels')}
              </Link>
              <a href="https://www.travel-events.de" target="_blank" rel="noopener noreferrer" className="text-[#FDFBF7]/70 hover:text-[#D4AF37] transition-colors">
                Travel Events Website
              </a>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-serif text-lg mb-6">Kontakt</h3>
            <div className="flex flex-col gap-4">
              <a href="mailto:info@travel-events.de" className="flex items-center gap-3 text-[#FDFBF7]/70 hover:text-[#D4AF37] transition-colors">
                <Mail className="w-5 h-5" />
                info@travel-events.de
              </a>
              <div className="flex items-start gap-3 text-[#FDFBF7]/70">
                <MapPin className="w-5 h-5 mt-0.5" />
                <span>Halle (Saale), Germany</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#FDFBF7]/10 text-center">
          <p className="text-[#FDFBF7]/50 text-sm">
            © {new Date().getFullYear()} Travel Events. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

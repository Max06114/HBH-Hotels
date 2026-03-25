import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Globe, Menu, X, Music } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState } from 'react';

const Header = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="glass-header fixed top-0 left-0 right-0 z-50" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <div className="w-10 h-10 bg-[#6B1D2A] rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-serif text-lg font-semibold text-[#6B1D2A]">Travel Events</span>
              <p className="text-xs text-[#4A4A4A]">Happy Birthday Händel</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-[#1A1A1A] hover:text-[#6B1D2A] transition-colors font-medium" data-testid="nav-home">
              {t('home')}
            </Link>
            <Link to="/#hotels" className="text-[#1A1A1A] hover:text-[#6B1D2A] transition-colors font-medium" data-testid="nav-hotels">
              {t('hotels')}
            </Link>
            {isAuthenticated && (
              <Link to="/admin" className="text-[#1A1A1A] hover:text-[#6B1D2A] transition-colors font-medium" data-testid="nav-admin">
                {t('admin')}
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-[#E5E0D5] hover:border-[#6B1D2A] transition-colors"
              data-testid="language-toggle"
            >
              <Globe className="w-4 h-4 text-[#4A4A4A]" />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </button>

            {isAuthenticated ? (
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                data-testid="logout-btn"
              >
                {t('logout')}
              </Button>
            ) : (
              <Link to="/admin/login" className="hidden md:inline-flex">
                <Button variant="outline" size="sm" data-testid="admin-login-link">
                  {t('adminLogin')}
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#E5E0D5]" data-testid="mobile-menu">
            <nav className="flex flex-col gap-4">
              <Link to="/" className="text-[#1A1A1A] hover:text-[#6B1D2A] font-medium" onClick={() => setMobileMenuOpen(false)}>
                {t('home')}
              </Link>
              <Link to="/#hotels" className="text-[#1A1A1A] hover:text-[#6B1D2A] font-medium" onClick={() => setMobileMenuOpen(false)}>
                {t('hotels')}
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/admin" className="text-[#1A1A1A] hover:text-[#6B1D2A] font-medium" onClick={() => setMobileMenuOpen(false)}>
                    {t('admin')}
                  </Link>
                  <button onClick={handleLogout} className="text-left text-[#6B1D2A] font-medium">
                    {t('logout')}
                  </button>
                </>
              ) : (
                <Link to="/admin/login" className="text-[#6B1D2A] font-medium" onClick={() => setMobileMenuOpen(false)}>
                  {t('adminLogin')}
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

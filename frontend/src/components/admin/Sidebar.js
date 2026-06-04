import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Hotel, CalendarCheck, CreditCard, LogOut, 
  Bell, Clock, Image as ImageIcon, Package, Music, BarChart3, FileText
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { t, language } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('adminDashboard') },
    { path: '/admin/analytics', icon: BarChart3, label: language === 'de' ? 'Analytics' : 'Analytics' },
    { path: '/admin/bookings', icon: CalendarCheck, label: t('adminBookings') },
    { path: '/admin/hotels', icon: Hotel, label: t('adminHotels') },
    { path: '/admin/inventory', icon: Package, label: language === 'de' ? 'Lagerhaltung' : 'Inventory' },
    { path: '/admin/content', icon: FileText, label: language === 'de' ? 'Inhalte' : 'Content' },
    { path: '/admin/images', icon: ImageIcon, label: language === 'de' ? 'Bildmanager' : 'Image Manager' },
    { path: '/admin/payments', icon: CreditCard, label: t('adminPayments') },
    { path: '/admin/reminders', icon: Bell, label: language === 'de' ? 'Erinnerungen' : 'Reminders' },
    { path: '/admin/scheduler', icon: Clock, label: language === 'de' ? 'Automatisierung' : 'Automation' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#1A1A1A] z-50 transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#6B1D2A] rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-serif text-lg text-white">Admin</span>
                <p className="text-xs text-white/50">Travel Events</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${location.pathname === item.path 
                        ? 'bg-[#6B1D2A] text-white' 
                        : 'text-white/70 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-white/70 hover:text-white transition-colors"
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

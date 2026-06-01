import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, Loader2 } from 'lucide-react';

// Import admin components
import {
  Sidebar,
  DashboardOverview,
  BookingsManagement,
  HotelsManagement,
  InventoryManagement,
  PaymentsManagement,
  RemindersManagement,
  SchedulerManagement,
  ImageManager,
  AnalyticsDashboard
} from '../components/admin';

// Main Admin Dashboard
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E0D5] flex items-center px-4 z-30">
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
        <span className="ml-4 font-serif text-lg">Admin</span>
      </div>

      {/* Main content */}
      <main className="md:ml-64 min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="bookings" element={<BookingsManagement />} />
          <Route path="hotels" element={<HotelsManagement />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="images" element={<ImageManager />} />
          <Route path="payments" element={<PaymentsManagement />} />
          <Route path="reminders" element={<RemindersManagement />} />
          <Route path="scheduler" element={<SchedulerManagement />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;

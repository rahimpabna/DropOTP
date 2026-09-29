import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { API } from './api';
import { ServiceItem, DomainItem, RentalSession } from './types';
import { Navbar, NavTabType } from './components/Navbar';
import { ServiceSelector } from './components/ServiceSelector';
import { DomainSelector } from './components/DomainSelector';
import { OrderPanel } from './components/OrderPanel';
import { LiveActivations } from './components/LiveActivations';
import { HistoryPanel } from './components/HistoryPanel';
import { TopUpHistory } from './components/TopUpHistory';
import { AdminPanel } from './components/AdminPanel';
import { TopUpModal } from './components/TopUpModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { AuthModal } from './components/AuthModal';
import { FloatingContactWidget } from './components/common/FloatingContactWidget';

// Marketing & CMS Pages
import { LandingPage } from './pages/LandingPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { FaqPage } from './pages/FaqPage';
import { ContactPage } from './pages/ContactPage';
import { PartnersPage } from './pages/PartnersPage';
import { PublicOfferPage } from './pages/PublicOfferPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';

const DashboardContent: React.FC = () => {
  const { user, socket, refreshMe } = useAuth();

  const getInitialNav = (): NavTabType => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash.startsWith('admin')) return 'admin';
    if (hash === 'history') return 'history';
    if (hash === 'topups') return 'topups';
    if (hash === 'api-docs' || hash === 'api') return 'api-docs';
    if (hash === 'faq') return 'faq';
    if (hash === 'partners') return 'partners';
    if (hash === 'contact') return 'contact';
    if (hash === 'public-offer') return 'public-offer';
    if (hash === 'privacy') return 'privacy';
    if (hash === 'home') return 'home';
    if (hash === 'rentals') return 'rentals';
    return 'rentals';
  };

  // Navigation & Modals state
  const [activeNav, setActiveNavState] = useState<NavTabType>(getInitialNav);

  const setActiveNav = (nav: NavTabType) => {
    setActiveNavState(nav);
    if (nav === 'admin') {
      if (!window.location.hash.startsWith('#admin')) {
        window.location.hash = '#admin';
      }
    } else {
      window.location.hash = `#${nav}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash.startsWith('admin')) setActiveNavState('admin');
      else if (hash === 'history') setActiveNavState('history');
      else if (hash === 'topups') setActiveNavState('topups');
      else if (hash === 'api-docs' || hash === 'api') setActiveNavState('api-docs');
      else if (hash === 'faq') setActiveNavState('faq');
      else if (hash === 'partners') setActiveNavState('partners');
      else if (hash === 'contact') setActiveNavState('contact');
      else if (hash === 'public-offer') setActiveNavState('public-offer');
      else if (hash === 'privacy') setActiveNavState('privacy');
      else if (hash === 'home') setActiveNavState('home');
      else if (hash === 'rentals' || hash === '') setActiveNavState('rentals');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const [activationsTab, setActivationsTab] = useState<'waiting' | 'paid' | 'canceled' | 'all'>('waiting');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Catalog Data
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<DomainItem | null>(null);

  // Rentals
  const [activeRentals, setActiveRentals] = useState<RentalSession[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load initial catalog & active orders
  const loadCatalog = async () => {
    try {
      const [sRes, dRes] = await Promise.all([
        API.get('/rentals/services'),
        API.get('/rentals/domains'),
      ]);
      setServices(sRes.data);
      setDomains(dRes.data);

      if (sRes.data.length > 0 && !selectedService) {
        setSelectedService(sRes.data[0]);
      }
      if (dRes.data.length > 0 && !selectedDomain) {
        setSelectedDomain(dRes.data[0]);
      }
    } catch (e) {
      console.error('Catalog load error', e);
    }
  };

  const loadActiveRentals = async () => {
    if (!user) return;
    try {
      const res = await API.get('/rentals/active');
      setActiveRentals(res.data);
    } catch (e) {
      console.error('Active rentals load error', e);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (user) {
      loadActiveRentals();
    } else {
      setActiveRentals([]);
    }
  }, [user]);

  // Real-time socket listener for incoming OTP codes
  useEffect(() => {
    if (!socket) return;

    const handleOtpUpdate = (data: any) => {
      console.log('[Socket] Real-time OTP received:', data);
      showToast(`⚡ New OTP code received for ${data.email}: ${data.code}`, 'success');
      loadActiveRentals();
      refreshMe();
    };

    socket.on('otp:update', handleOtpUpdate);

    return () => {
      socket.off('otp:update', handleOtpUpdate);
    };
  }, [socket]);

  // Order temporary email
  const handleBuy = async (serviceCode: string, domainId: string, count: number, time?: string, smsCount?: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    setLoadingOrder(true);
    try {
      const res = await API.post('/rentals/order', {
        service: serviceCode,
        domain: domainId,
        count,
        time,
        smsCount,
      });

      if (res.data?.success) {
        showToast(`Successfully ordered ${count} email(s)!`, 'success');
        await loadActiveRentals();
        await refreshMe();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      if (errorMsg.toLowerCase().includes('insufficient')) {
        showToast('Insufficient wallet balance! Please add funds.', 'error');
        setIsTopUpOpen(true);
      } else {
        showToast(errorMsg, 'error');
      }
    } finally {
      setLoadingOrder(false);
    }
  };

  // Cancel order
  const handleCancel = async (id: number) => {
    try {
      await API.post(`/rentals/cancel/${id}`);
      showToast('Activation canceled. Funds refunded to wallet.', 'info');
      await loadActiveRentals();
      await refreshMe();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  // Complete order
  const handleComplete = async (id: number) => {
    try {
      await API.post(`/rentals/complete/${id}`);
      showToast('Activation completed successfully.', 'success');
      await loadActiveRentals();
      await refreshMe();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#e9f4ee]/40">
      <Navbar
        onOpenTopUp={() => (user ? setIsTopUpOpen(true) : setIsAuthOpen(true))}
        onOpenApiSettings={() => (user ? setIsApiSettingsOpen(true) : setIsAuthOpen(true))}
        onOpenSettings={() => (user ? setIsUserSettingsOpen(true) : setIsAuthOpen(true))}
        activeTab={activeNav}
        setActiveTab={setActiveNav}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border text-sm font-bold flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-600 shadow-emerald-900/30'
                : notification.type === 'error'
                ? 'bg-rose-800 text-white border-rose-600 shadow-rose-900/30'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeNav === 'home' && (
          <LandingPage
            onGoToRentals={() => setActiveNav('rentals')}
            onOpenAuth={() => setIsAuthOpen(true)}
            onGoToApiDocs={() => setActiveNav('api-docs')}
          />
        )}

        {activeNav === 'rentals' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Service & Domain Selection */}
            <div className="lg:col-span-4 space-y-4">
              <ServiceSelector
                services={services}
                selectedService={selectedService}
                onSelectService={setSelectedService}
              />

              <DomainSelector
                domains={domains}
                selectedDomain={selectedDomain}
                onSelectDomain={setSelectedDomain}
                onQuickBuy={(d) => {
                  if (selectedService) {
                    handleBuy(selectedService.code, d.id, 1);
                  }
                }}
              />
            </div>

            {/* Right Column: Order Panel & Live Activations Feed */}
            <div className="lg:col-span-8">
              <OrderPanel
                services={services}
                domains={domains}
                selectedService={selectedService}
                selectedDomain={selectedDomain}
                onSelectService={setSelectedService}
                onSelectDomain={setSelectedDomain}
                onBuy={handleBuy}
                loading={loadingOrder}
              />

              <LiveActivations
                rentals={activeRentals}
                onCancel={handleCancel}
                onComplete={handleComplete}
                onRefresh={loadActiveRentals}
                activeTab={activationsTab}
                setActiveTab={setActivationsTab}
              />
            </div>
          </div>
        )}

        {activeNav === 'history' && <HistoryPanel />}

        {activeNav === 'topups' && <TopUpHistory />}

        {activeNav === 'api-docs' && <ApiDocsPage />}

        {activeNav === 'faq' && <FaqPage />}

        {activeNav === 'partners' && <PartnersPage />}

        {activeNav === 'contact' && <ContactPage />}

        {activeNav === 'public-offer' && <PublicOfferPage />}

        {activeNav === 'privacy' && <PrivacyPolicyPage />}

        {activeNav === 'admin' && <AdminPanel />}
      </main>

      {/* Floating Support Widget (matching img/contact up.png) */}
      <FloatingContactWidget />

      {/* Modals */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={() => {
          setIsTopUpOpen(false);
          refreshMe();
        }}
      />

      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
      />

      <ApiSettingsModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Enhanced Footer */}
      <footer className="border-t border-[#badacb] bg-[#d0eade]/60 py-8 mt-12 text-xs text-slate-600 font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#badacb]/60">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveNav('home')}>
              <img src="/logo-transparent.png" alt="DropOTP" className="h-8 w-auto object-contain" />
              <span className="font-bold text-slate-800 text-sm">DropOTP</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-brand-900">
              <button onClick={() => setActiveNav('home')} className="hover:text-emerald-700">Home</button>
              <span>•</span>
              <button onClick={() => setActiveNav('rentals')} className="hover:text-emerald-700">E-mail's</button>
              <span>•</span>
              <button onClick={() => setActiveNav('api-docs')} className="hover:text-emerald-700">API Docs</button>
              <span>•</span>
              <button onClick={() => setActiveNav('faq')} className="hover:text-emerald-700">FAQ</button>
              <span>•</span>
              <button onClick={() => setActiveNav('partners')} className="hover:text-emerald-700">Partners</button>
              <span>•</span>
              <button onClick={() => setActiveNav('contact')} className="hover:text-emerald-700">Contact</button>
              <span>•</span>
              <button onClick={() => setActiveNav('public-offer')} className="hover:text-emerald-700">Public Offer</button>
              <span>•</span>
              <button onClick={() => setActiveNav('privacy')} className="hover:text-emerald-700">Privacy Policy</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px]">
            <span>© 2026 DropOTP. All rights reserved. High-frequency live OTP reception cloud.</span>
            <span className="text-emerald-800 font-semibold">Real-Time Inbound IMAP & WebSockets Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
};

export default App;

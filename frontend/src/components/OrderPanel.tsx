import React, { useState, useEffect } from 'react';
import { ServiceItem, DomainItem } from '../types';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { API } from '../api';
import { useDialog } from '../context/DialogContext';

interface OrderPanelProps {
  services: ServiceItem[];
  domains: DomainItem[];
  selectedService: ServiceItem | null;
  selectedDomain: DomainItem | null;
  onSelectService: (service: ServiceItem) => void;
  onSelectDomain: (domain: DomainItem) => void;
  onBuy: (
    serviceCode: string,
    domainId: string,
    count: number,
    time?: string,
    smsCount?: number
  ) => Promise<void>;
  loading: boolean;
}

interface ProviderDomainItem {
  id: string;
  key: string;
  provider: string;
  name: string;
  icon: string;
  price: number;
  count: number;
  inStock: boolean;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
  services,
  domains,
  selectedService,
  selectedDomain,
  onSelectService,
  onSelectDomain,
  onBuy,
  loading,
}) => {
  const { showAlert } = useDialog();
  const [count, setCount] = useState<number>(3);
  const [time, setTime] = useState<string>('24 hours');
  const [smsCount, setSmsCount] = useState<number>(2);
  const [providers, setProviders] = useState<ProviderDomainItem[]>([]);

  // Load provider domains & real-time pool counts
  useEffect(() => {
    const fetchProviderDomains = async () => {
      try {
        const res = await API.get('/rentals/provider-domains');
        if (res.data?.providers) {
          setProviders(res.data.providers);
        }
      } catch (err) {
        console.error('Failed to load provider domains', err);
      }
    };
    fetchProviderDomains();
    const interval = setInterval(fetchProviderDomains, 20000);
    return () => clearInterval(interval);
  }, []);

  // Compute unit price
  const baseUnitPrice =
    selectedDomain && selectedService
      ? Math.max(Number(selectedDomain.defaultPrice), Number(selectedService.basePrice))
      : selectedDomain
      ? Number(selectedDomain.defaultPrice)
      : selectedService
      ? Number(selectedService.basePrice)
      : 0.0094;

  // Multipliers for rental time
  let timeMultiplier = 1.0;
  if (time === '1 hour') timeMultiplier = 1.25;
  else if (time === '24 hours') timeMultiplier = 1.5;

  // Multiplier for count of SMS
  const smsMultiplier = smsCount > 1 ? smsCount : 1;

  // Dynamic Total calculation
  const calculatedTotal = (baseUnitPrice * timeMultiplier * smsMultiplier * count).toFixed(4);

  const handleBuyClick = async () => {
    if (!selectedService) {
      await showAlert('Please select a service first!', 'Service Required', 'info');
      return;
    }
    const domainId = selectedDomain ? selectedDomain.id : '';
    onBuy(selectedService.code, domainId, count, time, smsCount);
  };

  const handleDomainChange = (val: string) => {
    if (!val) {
      onSelectDomain(null as any);
      return;
    }

    // Check if it matches a provider domain
    const matchedProvider = providers.find((p) => p.id === val || p.key === val || p.provider === val);
    if (matchedProvider) {
      onSelectDomain({
        id: matchedProvider.provider.toLowerCase(),
        domainName: matchedProvider.name,
        isPrivate: false,
        isActive: true,
        defaultPrice: matchedProvider.price as any,
        createdAt: '',
        updatedAt: '',
      });
      return;
    }

    // Otherwise match hosted domain
    const matchedHosted = domains.find((d) => d.id === val);
    if (matchedHosted) {
      onSelectDomain(matchedHosted);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 space-y-5">
      {/* Breadcrumb / Title matching exact prompt design */}
      <div className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5 border-b border-slate-100 pb-3">
        <span>Main</span>
        <span>/</span>
        <span className="text-teal-700 font-bold">
          Order Email's with txt email----url
        </span>
      </div>

      <div className="space-y-3.5">
        {/* Services Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
          <label className="text-sm font-bold text-teal-800">Services</label>
          <div className="md:col-span-3">
            <select
              value={selectedService?.id || ''}
              onChange={(e) => {
                const s = services.find((item) => item.id === e.target.value);
                if (s) onSelectService(s);
              }}
              className="w-full bg-[#f4fbf7] border border-emerald-200/80 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
            >
              <option value="" disabled>
                Select service...
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (${Number(s.basePrice).toFixed(4)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Domain Dropdown (Showing active email pool providers + hosted domains) */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
          <label className="text-sm font-bold text-teal-800">Domain</label>
          <div className="md:col-span-3">
            <select
              value={
                selectedDomain
                  ? providers.find((p) => p.provider.toLowerCase() === selectedDomain.id.toLowerCase() || p.id === selectedDomain.id)?.id ||
                    selectedDomain.id
                  : ''
              }
              onChange={(e) => handleDomainChange(e.target.value)}
              className="w-full bg-[#f4fbf7] border border-emerald-200/80 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
            >
              <option value="">Any Available Shared Domain (Auto-Select)</option>

              {/* Provider Domains Group */}
              {providers.length > 0 && (
                <optgroup label="─── Live Email Providers ───">
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.count > 0 ? `(${p.count} pcs available)` : '(Soon)'} — ${p.price.toFixed(4)}
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Hosted Catch-All Domains Group */}
              {domains.length > 0 && (
                <optgroup label="─── Hosted Domains ───">
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.domainName} {d.isPrivate ? '[Private]' : '[Shared]'} (${Number(d.defaultPrice).toFixed(4)})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Count Input */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
          <label className="text-sm font-bold text-teal-800">Count</label>
          <div className="md:col-span-3">
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-[#f4fbf7] border border-emerald-200/80 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Time / Duration Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
          <label className="text-sm font-bold text-teal-800">Time</label>
          <div className="md:col-span-3">
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[#f4fbf7] border border-emerald-200/80 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
            >
              <option value="20 minutes">20 minutes</option>
              <option value="1 hour">1 hour</option>
              <option value="24 hours">24 hours</option>
            </select>
          </div>
        </div>

        {/* Count of OTP Input */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
          <label className="text-sm font-bold text-teal-800">Count of OTP</label>
          <div className="md:col-span-3">
            <input
              type="number"
              min="1"
              max="20"
              value={smsCount}
              onChange={(e) => setSmsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-[#f4fbf7] border border-emerald-200/80 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Pricing and Action Section matching price auto up down.png */}
      <div className="pt-4 border-t border-slate-100 flex flex-col items-end space-y-2">
        {/* Total Price display */}
        <div className="text-right">
          <span className="text-2xl font-black text-teal-700 tracking-tight">
            Total: {calculatedTotal} $
          </span>
        </div>

        {/* Non-refundable red warning banner */}
        <div className="text-right">
          <p className="text-xs font-bold text-red-600 leading-snug">
            Attention! Batch purchases are non-refundable — we do NOT issue refunds for any reason after the purchase.
          </p>
        </div>

        {/* Buy Now Button */}
        <div className="pt-2">
          <button
            onClick={handleBuyClick}
            disabled={loading || !selectedService}
            className={`flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-black px-8 py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] ${
              loading || !selectedService ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{loading ? 'PROCESSING...' : 'BUY NOW'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

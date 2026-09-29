import React, { useState, useRef, useEffect } from 'react';
import { ServiceItem } from '../types';
import { Search, Mail, Check, X } from 'lucide-react';
import { getServiceIconUrl } from '../utils/serviceIcons';

interface ServiceSelectorProps {
  services: ServiceItem[];
  selectedService: ServiceItem | null;
  onSelectService: (service: ServiceItem) => void;
}

// Top 10 popular quick selection services matching SMSBower
const TOP_SERVICES_CONFIG = [
  { key: 'any', name: 'Other', query: 'other', fallbackIcon: 'ANY EMAIL.svg' },
  { key: 'ig', name: 'Instagram', query: 'instagram', fallbackIcon: 'Instagram.svg' },
  { key: 'aws', name: 'AWS', query: 'aws', fallbackIcon: 'Aws.jpg' },
  { key: 'apple', name: 'Apple', query: 'apple', fallbackIcon: 'Apple.svg' },
  { key: 'fb', name: 'Facebook', query: 'facebook', fallbackIcon: 'Facebook.svg' },
  { key: 'openai', name: 'ChatGPT', query: 'openai', fallbackIcon: 'OpenAI (ChatGPT).svg' },
  { key: 'amazon', name: 'Amazon', query: 'amazon', fallbackIcon: 'Amazon.svg' },
  { key: 'tg', name: 'Telegram', query: 'telegram', fallbackIcon: 'Telegram.svg' },
  { key: 'github', name: 'GitHub', query: 'github', fallbackIcon: 'GitHub.svg' },
  { key: 'tiktok', name: 'TikTok', query: 'tiktok', fallbackIcon: 'Tiktok.svg' },
];

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  services,
  selectedService,
  onSelectService,
}) => {
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  // Helper to render service brand icon
  const renderServiceIcon = (s: { code?: string; name?: string; icon?: string }, size: string = 'w-6 h-6') => {
    const iconUrl = getServiceIconUrl(s.code, s.name);
    if (iconUrl) {
      return (
        <img
          src={iconUrl}
          alt={s.name || 'Service'}
          className={`${size} object-contain rounded-md`}
          onError={(e) => {
            // fallback if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    return <Mail className={`${size} text-emerald-300 p-0.5`} />;
  };

  // Find matching service for top quick grid item
  const handleQuickSelect = (cfg: typeof TOP_SERVICES_CONFIG[0]) => {
    const matched = services.find(
      (s) =>
        s.code.toLowerCase() === cfg.key ||
        s.code.toLowerCase().includes(cfg.query) ||
        s.name.toLowerCase().includes(cfg.query)
    );
    if (matched) {
      onSelectService(matched);
    } else {
      // Fallback to first matching or any
      const fallback = services.find((s) => s.name.toLowerCase().includes(cfg.query));
      if (fallback) onSelectService(fallback);
    }
  };

  return (
    <div className="bg-[#00503d] text-white rounded-2xl p-4 shadow-md border border-[#00674f] relative">
      <div className="flex items-center space-x-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-white text-brand-800 flex items-center justify-center font-bold text-xs">
          1
        </span>
        <h3 className="font-bold text-base tracking-wide">Select service</h3>
      </div>

      {/* Search Bar with Floating Dropdown Popup (matching img/sev list.png) */}
      <div ref={searchContainerRef} className="relative mb-4">
        <Search className="w-4 h-4 text-emerald-300 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
        <input
          type="text"
          value={search}
          onFocus={() => setIsSearchOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsSearchOpen(true);
          }}
          placeholder="Search service..."
          className="w-full bg-[#003d2e] border border-emerald-800/80 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        {search && (
          <button
            onClick={() => {
              setSearch('');
              setIsSearchOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Floating Search Dropdown Popup (matches img/sev list.png) */}
        {isSearchOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="max-h-64 overflow-y-auto p-1.5 divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No service found for "{search}"
                </div>
              ) : (
                filtered.slice(0, 40).map((s) => {
                  const isSelected = selectedService?.id === s.id;
                  const iconUrl = getServiceIconUrl(s.code, s.name);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelectService(s);
                        setIsSearchOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center p-1 shrink-0 overflow-hidden border border-slate-200/60 shadow-sm">
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={s.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Mail className="w-4 h-4 text-emerald-700" />
                          )}
                        </div>
                        <span className="text-xs font-semibold truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          ${Number(s.basePrice).toFixed(3)}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Icon Grid (Top 10 Popular Services with Real Brand Logos) */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {TOP_SERVICES_CONFIG.map((cfg) => {
          const matchedService = services.find(
            (s) =>
              s.code.toLowerCase() === cfg.key ||
              s.code.toLowerCase().includes(cfg.query) ||
              s.name.toLowerCase().includes(cfg.query)
          );
          const isSelected =
            selectedService &&
            (selectedService.code.toLowerCase() === cfg.key ||
              selectedService.code.toLowerCase().includes(cfg.query) ||
              selectedService.name.toLowerCase().includes(cfg.query));

          const iconUrl = `/service_icons/${encodeURIComponent(cfg.fallbackIcon)}`;

          return (
            <button
              key={cfg.key}
              onClick={() => handleQuickSelect(cfg)}
              title={matchedService ? `${matchedService.name} ($${Number(matchedService.basePrice).toFixed(3)})` : cfg.name}
              className={`h-11 rounded-xl flex items-center justify-center p-1.5 transition-all relative ${
                isSelected
                  ? 'bg-emerald-500 shadow-lg ring-2 ring-white scale-105'
                  : 'bg-[#003d2e] hover:bg-[#004838]'
              }`}
            >
              <img
                src={iconUrl}
                alt={cfg.name}
                className="w-6 h-6 object-contain filter drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Scrollable list of services with real logos */}
      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
        {filtered.map((s) => {
          const isSelected = selectedService?.id === s.id;
          const iconUrl = getServiceIconUrl(s.code, s.name);

          return (
            <div
              key={s.id}
              onClick={() => onSelectService(s)}
              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-white font-semibold shadow-sm'
                  : 'bg-[#003d2e]/60 hover:bg-[#003d2e] text-emerald-100'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={s.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Mail className="w-4 h-4 text-emerald-300" />
                  )}
                </div>
                <span className="text-xs truncate font-medium">{s.name}</span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-xs font-mono font-medium opacity-90">
                  ${Number(s.basePrice).toFixed(3)}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

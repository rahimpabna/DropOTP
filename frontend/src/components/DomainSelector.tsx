import React, { useState, useEffect } from 'react';
import { DomainItem, StockAvailability } from '../types';
import { Globe, Mail, Cloud, MoreHorizontal, ShieldCheck, Check } from 'lucide-react';
import { API } from '../api';

interface DomainSelectorProps {
  domains: DomainItem[];
  selectedDomain: DomainItem | null;
  onSelectDomain: (domain: DomainItem) => void;
  onQuickBuy?: (domain: DomainItem) => void;
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({
  domains,
  selectedDomain,
  onSelectDomain,
  onQuickBuy,
}) => {
  const [stock, setStock] = useState<StockAvailability>({});

  // Fetch real stock numbers from backend
  const fetchStock = async () => {
    try {
      const res = await API.get('/rentals/stock');
      const map: Record<string, number> = {};
      if (Array.isArray(res.data)) {
        res.data.forEach((s: any) => {
          if (s.id) {
            map[s.id] = s.count;
            map[s.id.toLowerCase()] = s.count;
          }
          if (s.name) {
            map[s.name] = s.count;
            map[s.name.toLowerCase()] = s.count;
          }
          if (s.provider) {
            map[s.provider] = s.count;
            map[s.provider.toLowerCase()] = s.count;
          }
        });
      } else if (res.data?.stock) {
        Object.assign(map, res.data.stock);
      }
      setStock(map);
    } catch (err) {
      console.error('Failed to fetch stock availability', err);
    }
  };

  useEffect(() => {
    fetchStock();
    const interval = setInterval(fetchStock, 15000);
    return () => clearInterval(interval);
  }, []);

  // Built-in providers matching SMSBower
  const providerCards = [
    {
      id: 'gmail.com',
      domainName: 'Gmail',
      type: 'GMAIL',
      price: 0.009,
      iconType: 'google',
    },
    {
      id: 'outlook.com',
      domainName: 'Outlook',
      type: 'OUTLOOK',
      price: 0.0085,
      iconType: 'outlook',
    },
    {
      id: 'icloud.com',
      domainName: 'Icloud',
      type: 'ICLOUD',
      price: 0.0081,
      iconType: 'cloud',
    },
    {
      id: 'yahoo.com',
      domainName: 'Yahoo',
      type: 'YAHOO',
      price: 0.008,
      iconType: 'yahoo',
    },
  ];

  // Merge with server hosted domains (e.g. dropotp.com)
  const allDomainCards = [
    ...providerCards.map((p) => {
      const realStock = stock[p.type] ?? stock[p.id] ?? stock[p.type.toLowerCase()] ?? stock[p.id.toLowerCase()] ?? 0;
      return {
        id: p.id,
        domainName: p.domainName,
        isPrivate: false,
        isActive: true,
        defaultPrice: Number(p.price || 0),
        stockCount: realStock,
        iconType: p.iconType,
      };
    }),
    ...domains.map((d) => {
      const realStock = stock[d.id] ?? stock[d.domainName] ?? stock[d.domainName?.toLowerCase()] ?? 9999;
      return {
        id: d.id,
        domainName: d.domainName,
        isPrivate: d.isPrivate,
        isActive: d.isActive,
        defaultPrice: Number(d.defaultPrice || 0.008),
        stockCount: realStock,
        iconType: 'domain',
      };
    }),
  ];

  return (
    <div className="bg-[#00503d] text-white rounded-2xl p-4 shadow-md border border-[#00674f] space-y-3">
      <div className="flex items-center space-x-2">
        <span className="w-6 h-6 rounded-full bg-white text-brand-800 flex items-center justify-center font-bold text-xs">
          2
        </span>
        <h3 className="font-bold text-base tracking-wide">Find domain</h3>
      </div>
      <p className="text-[11px] text-emerald-300">
        Countries and providers are ranked by top performance
      </p>

      {/* Domain Cards List matching SMSBower screenshot */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {allDomainCards.map((item) => {
          const isSelected =
            selectedDomain?.id === item.id || selectedDomain?.domainName === item.domainName;
          const hasStock = item.stockCount > 0;

          return (
            <div
              key={item.id}
              onClick={() => onSelectDomain(item as any)}
              className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-[#003d2e] border-emerald-400 shadow-lg ring-1 ring-emerald-400'
                  : 'bg-[#003d2e]/80 hover:bg-[#003d2e] border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    {item.iconType === 'google' && (
                      <span className="font-black text-rose-500 text-sm">G</span>
                    )}
                    {item.iconType === 'cloud' && (
                      <Cloud className="w-4 h-4 text-sky-500" />
                    )}
                    {item.iconType === 'outlook' && (
                      <Mail className="w-4 h-4 text-blue-600" />
                    )}
                    {item.iconType === 'yahoo' && (
                      <span className="font-black text-purple-600 text-xs">Y!</span>
                    )}
                    {item.iconType === 'domain' && (
                      <Globe className="w-4 h-4 text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-sm tracking-tight text-white block">
                      {item.domainName}
                    </span>
                    <span className="text-[11px] text-emerald-300/80 font-mono">
                      fr. {Number(item.defaultPrice || 0).toFixed(4)}$
                    </span>
                  </div>
                </div>

                <div>
                  {hasStock ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDomain(item as any);
                        if (onQuickBuy) onQuickBuy(item as any);
                      }}
                      className="px-3.5 py-1.5 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
                    >
                      Buy | {Number(item.defaultPrice || 0).toFixed(3)}$
                    </button>
                  ) : (
                    <span className="px-3 py-1 bg-slate-700/80 text-slate-300 rounded-xl text-xs font-semibold">
                      Soon
                    </span>
                  )}
                </div>
              </div>

              {/* Stock count pill matching SMSBower screenshot */}
              <div className="bg-[#002b20] py-1.5 px-3 rounded-xl text-center text-xs font-mono font-bold tracking-wider">
                {hasStock ? (
                  <span className="text-emerald-300">
                    {item.stockCount.toLocaleString()} pcs
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px]">No mail available yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

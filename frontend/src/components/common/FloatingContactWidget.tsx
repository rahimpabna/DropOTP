import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send, Headphones, Bell } from 'lucide-react';
import { API } from '../../api';

interface WidgetConfig {
  telegramUrl?: string;
  supportEmail?: string;
  supportTitle?: string;
}

export const FloatingContactWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig>({
    telegramUrl: 'https://t.me/dropotp_support',
    supportEmail: 'support@dropotp.com',
    supportTitle: 'Need help with OTP reception?',
  });

  useEffect(() => {
    API.get('/public/content/floating_widget')
      .then((res) => {
        if (res.data?.data) {
          setConfig((prev) => ({ ...prev, ...res.data.data }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3 pointer-events-auto select-none">
      {/* Expanded Popup Action Buttons (matching img/contact up.png) */}
      {isOpen && (
        <div className="flex flex-col items-center space-y-3 animate-in slide-in-from-bottom-3 duration-200">
          {/* Telegram Action Button */}
          <a
            href={config.telegramUrl || 'https://t.me/dropotp_support'}
            target="_blank"
            rel="noopener noreferrer"
            title="Telegram Support"
            className="w-12 h-12 rounded-full bg-[#1b8560] hover:bg-[#156e4f] text-white flex items-center justify-center shadow-xl shadow-emerald-950/30 transition-all hover:scale-110 active:scale-95 group relative"
          >
            <Send className="w-5 h-5 -translate-x-0.5 translate-y-0.5" />
            <span className="absolute right-14 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none font-semibold">
              Telegram Support
            </span>
          </a>

          {/* Live Support / Helpdesk Action Button */}
          <a
            href="#contact"
            title="Live Support Helpdesk"
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-full bg-[#20926b] hover:bg-[#1a7757] text-white flex items-center justify-center shadow-lg shadow-emerald-950/20 transition-all hover:scale-110 active:scale-95 group relative"
          >
            <Headphones className="w-4 h-4" />
            <span className="absolute right-12 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none font-semibold">
              Contact Helpdesk
            </span>
          </a>
        </div>
      )}

      {/* Main Bottom Trigger Buttons */}
      <div className="flex items-center space-x-2">
        {/* Notification Bell Icon */}
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#rentals';
          }}
          title="Active Activations"
          className="w-12 h-12 rounded-full bg-[#3ca37c] hover:bg-[#34916d] text-white flex items-center justify-center shadow-xl shadow-emerald-950/20 transition-all hover:scale-105 active:scale-95"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* Floating Toggle Button (Green circle with Chat or X) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? 'Close Support' : 'Customer Support'}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 active:scale-95 ${
            isOpen
              ? 'bg-[#186f50] text-white rotate-90 scale-105 shadow-emerald-900/40'
              : 'bg-[#1b8560] hover:bg-[#156e4f] text-white shadow-emerald-900/30 hover:scale-105'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, Search } from 'lucide-react';
import { API } from '../api';

const DEFAULT_FAQS = [
  {
    category: 'General',
    question: 'What is DropOTP and how does it work?',
    answer:
      'DropOTP provides temporary and disposable email addresses tailored for receiving one-time passwords (OTP), activation links, and verification messages instantly from 114+ supported services.',
  },
  {
    category: 'General',
    question: 'Is DropOTP compatible with SMSBower API?',
    answer:
      'Yes! DropOTP is 100% compliant with standard SMSBower API protocols. You can automate activations using the same getActivation, getCode, and setStatus methods in your existing bots.',
  },
  {
    category: 'Ordering & Delivery',
    question: 'How fast will I receive my OTP code?',
    answer:
      'Our high-performance IMAP listener engine and direct Port 25 SMTP daemon deliver incoming verification codes to your dashboard in real time within 1 to 3 seconds via WebSockets.',
  },
  {
    category: 'Ordering & Delivery',
    question: 'What happens if no OTP code arrives?',
    answer:
      'Your funds are held safely in a temporary escrow state. If no verification code is received within the rental duration, or if you cancel manually, 100% of your funds are automatically refunded to your balance.',
  },
  {
    category: 'Ordering & Delivery',
    question: 'How does Re-code work if I need another code?',
    answer:
      'Clicking Re-code clears the previous code and advances the IMAP mailbox cursor so our listener waits specifically for the next new incoming email. The previous code will never be shown again.',
  },
  {
    category: 'Pricing & Limits',
    question: 'What payment methods are supported for wallet top-up?',
    answer:
      'We accept bKash, Nagad, Global Credit/Debit Cards via Paymento, and popular Cryptocurrencies (USDT, BTC, ETH) via Maxelpay with zero transaction delays.',
  },
  {
    category: 'Security & Privacy',
    question: 'Are the email accounts shared or recycled?',
    answer:
      'Each rental activation is strictly de-conflicted and isolated. The service you rent for an account will never be given to another user during your rental session, ensuring 100% privacy.',
  },
];

export const FaqPage: React.FC = () => {
  const [faqs, setFaqs] = useState<any[]>(DEFAULT_FAQS);
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    API.get('/public/content/faq')
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          setFaqs(res.data.data);
        } else if (Array.isArray(res.data?.data?.items)) {
          setFaqs(res.data.data.items);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = faqs.filter(
    (item) =>
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help Center & FAQ</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium">
          Have questions about temporary email activations, live OTP reception, or billing? Find your answers below.
        </p>

        {/* Search */}
        <div className="max-w-md mx-auto pt-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between space-x-4 font-bold text-sm sm:text-base text-slate-800 hover:text-emerald-700"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    isOpen ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium border-t border-slate-50 pt-3 animate-in fade-in">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

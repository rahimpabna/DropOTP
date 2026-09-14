import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  Globe,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Server,
  Code2,
  Mail,
  ChevronDown,
  Star,
  Users,
} from 'lucide-react';
import { API } from '../api';

interface LandingPageProps {
  onGoToRentals: () => void;
  onOpenAuth: () => void;
  onGoToApiDocs: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToRentals,
  onOpenAuth,
  onGoToApiDocs,
}) => {
  const [stats, setStats] = useState({
    activeAccounts: 40,
    activeServices: 114,
    totalDelivered: 128450,
    uptime: '99.98%',
    avgLatencySec: 2.4,
  });

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    API.get('/public/stats')
      .then((res) => {
        if (res.data?.stats) {
          setStats((prev) => ({ ...prev, ...res.data.stats }));
        }
      })
      .catch(() => {});
  }, []);

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      title: 'Sub-Second Real-Time OTP',
      desc: 'Instant code detection via direct IMAP IDLE sockets and smart multi-regex parsing. No manual refreshing needed.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      title: 'Deconfliction & Clean Inboxes',
      desc: 'Smart reuse tracking ensures accounts are never re-allocated for the same service. Automatic UID cursor prevents old code errors.',
    },
    {
      icon: <Globe className="w-6 h-6 text-sky-500" />,
      title: 'Top-Tier Providers & Domains',
      desc: 'Choose from active pools of Gmail, Outlook, Yahoo, and iCloud or custom catch-all domains with full SMTP fallback.',
    },
    {
      icon: <Code2 className="w-6 h-6 text-purple-500" />,
      title: 'SMSBower Compatible API',
      desc: 'Drop-in REST API endpoints for seamless integration with your bots, automated workflows, and multi-threaded scripts.',
    },
  ];

  const popularServices = [
    { name: 'ChatGPT / OpenAI', icon: '/service_icons/OpenAI%20(ChatGPT).svg', price: '$0.055' },
    { name: 'Telegram', icon: '/service_icons/Telegram.svg', price: '$0.045' },
    { name: 'Instagram', icon: '/service_icons/Instagram.svg', price: '$0.040' },
    { name: 'Amazon', icon: '/service_icons/Amazon.svg', price: '$0.045' },
    { name: 'Apple', icon: '/service_icons/Apple.svg', price: '$0.050' },
    { name: 'Facebook', icon: '/service_icons/Facebook.svg', price: '$0.040' },
    { name: 'TikTok', icon: '/service_icons/Tiktok.svg', price: '$0.040' },
    { name: 'Discord', icon: '/service_icons/Discord.svg', price: '$0.045' },
  ];

  const faqs = [
    {
      q: 'How does live OTP reception work on DropOTP?',
      a: 'When you order an email, our system allocates a live account from our pool and opens a real-time IMAP listener. As soon as the service sends an email, our extractor captures the verification code or magic link within 2-3 seconds and delivers it to your screen and API.',
    },
    {
      q: 'What if I need another code from the same email?',
      a: 'Simply click the "Re-code" button! Our system advances the IMAP cursor and listens specifically for the next incoming email without re-reading the old one.',
    },
    {
      q: 'Can I integrate DropOTP with my automation bots?',
      a: 'Yes! We offer a full REST API with high-frequency endpoints for ordering emails, reading live codes, and managing wallet balances. It is fully compatible with SMSBower-style bots.',
    },
    {
      q: 'What happens if no OTP code arrives?',
      a: 'You can cancel any activation before the countdown ends. When canceled, all held funds are immediately refunded back into your wallet balance.',
    },
  ];

  return (
    <div className="space-y-16 pb-16 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 overflow-hidden text-center sm:text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-emerald-100/80 border border-emerald-300 text-emerald-900 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Next-Gen Temporary Mail & Real-Time OTP Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Instant Temporary Emails with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800">
                  Live OTP Reception
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl font-medium leading-relaxed">
                Rent clean Gmail, Outlook, Yahoo, and iCloud accounts for verification. Receive confirmation codes and magic links in real-time with sub-second WebSocket delivery.
              </p>

              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                <button
                  onClick={onGoToRentals}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-700/25 flex items-center justify-center space-x-2 transition-all hover:scale-105 active:scale-95"
                >
                  <span>Rent E-mail's Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onGoToApiDocs}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-sm font-bold shadow-sm flex items-center justify-center space-x-2 transition-all"
                >
                  <Code2 className="w-4 h-4 text-emerald-700" />
                  <span>API Documentation</span>
                </button>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 text-xs font-semibold text-slate-600">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sub-3s Delivery</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Real Live Inboxes</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Auto-Refund on Cancel</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Mock Card */}
            <div className="lg:col-span-5">
              <div className="bg-[#004d3d] text-white rounded-3xl p-6 shadow-2xl border border-emerald-700 relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-300">Live Inbound Socket</span>
                </div>

                <div className="space-y-3">
                  <div className="bg-[#00372b] p-3.5 rounded-2xl border border-emerald-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-emerald-300 block font-medium">Allocated Email:</span>
                      <span className="text-sm font-mono font-bold text-white">nassermutefa@gmail.com</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                      GMAIL
                    </span>
                  </div>

                  <div className="bg-[#002f25] p-4 rounded-2xl border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>OTP RECEIVED:</span>
                      </span>
                      <span className="text-[10px] text-emerald-400/80 font-mono">1.8s latency</span>
                    </div>

                    <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                      <span className="text-2xl font-mono font-black tracking-widest text-white">
                        849201
                      </span>
                      <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                        Copied
                      </span>
                    </div>

                    <a
                      href="#rentals"
                      className="text-xs text-emerald-300 hover:text-white underline block font-mono truncate"
                    >
                      https://auth0.openai.com/u/verify?ticket=...
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-300/80 text-center font-medium">
                  ⚡ Connected to 114+ service extractors in real-time
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <span className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight">
              {stats.totalDelivered.toLocaleString()}+
            </span>
            <p className="text-xs text-slate-500 font-semibold mt-1">Codes Delivered</p>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight">
              &lt; {stats.avgLatencySec}s
            </span>
            <p className="text-xs text-slate-500 font-semibold mt-1">Average Latency</p>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight">
              {stats.activeServices}
            </span>
            <p className="text-xs text-slate-500 font-semibold mt-1">Supported Services</p>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight">
              {stats.uptime}
            </span>
            <p className="text-xs text-slate-500 font-semibold mt-1">Platform Uptime</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Why Professionals Choose DropOTP
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Engineered from the ground up for high-frequency registration and rock-solid reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Services Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Supported Services & Live Pricing
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Over 114+ services with instant email activation and automated price calibration.
            </p>
          </div>

          <button
            onClick={onGoToRentals}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
          >
            <span>View all 114 services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {popularServices.map((s, i) => (
            <div
              key={i}
              onClick={onGoToRentals}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 truncate">
                <img src={s.icon} alt={s.name} className="w-8 h-8 object-contain shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate">{s.name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 shrink-0">
                from {s.price}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Everything you need to know about renting temporary emails and receiving live OTPs.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaqIndex === i;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                  className="w-full p-4 text-left flex items-center justify-between space-x-4 font-bold text-sm text-slate-800"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-50 pt-2 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl space-y-6 relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight max-w-xl mx-auto">
            Ready to receive your first OTP code in seconds?
          </h2>
          <p className="text-sm text-emerald-100/90 max-w-lg mx-auto font-medium">
            Join thousands of developers and digital marketers using DropOTP for reliable, sub-second temporary email rentals.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={onGoToRentals}
              className="px-8 py-3.5 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-2xl text-sm font-black shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              Get Started Now — Rent E-mail
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

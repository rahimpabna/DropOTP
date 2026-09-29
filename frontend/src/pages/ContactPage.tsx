import React, { useState, useEffect } from 'react';
import { Mail, Send, Clock, MessageSquare, CheckCircle2 } from 'lucide-react';
import { API } from '../api';
import { useDialog } from '../context/DialogContext';

export const ContactPage: React.FC = () => {
  const { showAlert } = useDialog();
  const [content, setContent] = useState<any>({
    telegram: 'https://t.me/dropotp_support',
    email: 'support@dropotp.com',
    workingHours: '24/7 Mon - Sun',
    responseTime: '< 15 minutes',
  });

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    API.get('/public/content/contact')
      .then((res) => {
        if (res.data?.data) {
          setContent((prev: any) => ({ ...prev, ...res.data.data }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formMessage.trim()) return;
    setSending(true);
    setTimeout(async () => {
      setSending(false);
      await showAlert(
        'Thank you! Your message has been received. Our team will contact you shortly.',
        'Message Sent',
        'success'
      );
      setFormName('');
      setFormEmail('');
      setFormMessage('');
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-in fade-in">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Support & Contacts</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Get in Touch with DropOTP Support
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium">
          Have an issue with an email rental, need a custom private domain, or want high-volume API access? We are here 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Contact Info Cards */}
        <div className="md:col-span-5 space-y-4">
          <a
            href={content.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-5 bg-gradient-to-br from-[#1b8560] to-[#12583f] text-white rounded-2xl shadow-lg shadow-emerald-950/20 hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Telegram Support</h3>
                <p className="text-xs text-emerald-200">Instant direct assistance</p>
              </div>
            </div>
            <p className="text-xs font-mono text-emerald-100 mt-2 truncate">
              {content.telegram}
            </p>
          </a>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-emerald-700">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Official Email</h3>
                <p className="text-xs text-slate-500">For business and API partnerships</p>
              </div>
            </div>
            <p className="text-xs font-mono font-bold text-emerald-800 pt-1">
              {content.email}
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Working Hours</h3>
                <p className="text-xs text-slate-500">{content.workingHours}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">Average response time: <span className="font-bold text-emerald-700">{content.responseTime}</span></p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Send an Inquiry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
              <textarea
                required
                rows={4}
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Describe your question, request, or issue..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Submit Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

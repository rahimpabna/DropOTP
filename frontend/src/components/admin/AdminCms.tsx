import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { useDialog } from '../../context/DialogContext';
import {
  FileEdit,
  Save,
  RefreshCw,
  Layers,
  MessageSquare,
  ShieldCheck,
  Gift,
  HelpCircle,
  Sparkles,
  AlignLeft,
  Info,
  CheckCircle2,
} from 'lucide-react';

const CMS_PAGES = [
  { key: 'faq', name: 'FAQ Page', icon: HelpCircle, desc: 'Questions and answers displayed on FAQ and Landing page' },
  { key: 'contact', name: 'Contact & Support', icon: MessageSquare, desc: 'Support Telegram URL, email, working hours' },
  { key: 'partners', name: 'Partners Program', icon: Gift, desc: 'Commission rates, minimum payout, partner benefits' },
  { key: 'public_offer', name: 'Public Offer / Terms', icon: Layers, desc: 'Legal terms of service and refund policies' },
  { key: 'privacy_policy', name: 'Privacy Policy', icon: ShieldCheck, desc: 'Data protection and retention statement' },
  { key: 'floating_widget', name: 'Floating Support Widget', icon: MessageSquare, desc: 'Bottom-right support URLs and button triggers' },
];

export const CMS_DEFAULT_TEMPLATES: Record<string, any> = {
  faq: [
    {
      category: 'General',
      question: 'What is DropOTP and how does it work?',
      answer: 'DropOTP provides temporary and disposable email addresses tailored for receiving one-time passwords (OTP), activation links, and verification messages instantly from 114+ supported services.',
    },
    {
      category: 'General',
      question: 'Is DropOTP compatible with SMSBower API?',
      answer: 'Yes! DropOTP is 100% compliant with standard SMSBower API protocols. You can automate activations using the same getActivation, getCode, and setStatus methods in your existing bots.',
    },
    {
      category: 'Ordering & Delivery',
      question: 'How fast will I receive my OTP code?',
      answer: 'Our high-performance IMAP listener engine and direct Port 25 SMTP daemon deliver incoming verification codes to your dashboard in real time within 1 to 3 seconds via WebSockets.',
    },
    {
      category: 'Ordering & Delivery',
      question: 'What happens if no OTP code arrives?',
      answer: 'Your funds are held safely in a temporary escrow state. If no verification code is received within the rental duration, or if you cancel manually, 100% of your funds are automatically refunded to your balance.',
    },
    {
      category: 'Pricing & Limits',
      question: 'What payment methods are supported for wallet top-up?',
      answer: 'We accept bKash, Nagad, Global Credit/Debit Cards via Paymento, and popular Cryptocurrencies (USDT, BTC, ETH) via Maxelpay with zero transaction delays.',
    },
    {
      category: 'Security & Privacy',
      question: 'Are the email accounts shared or recycled?',
      answer: 'Each rental activation is strictly de-conflicted and isolated. The service you rent for an account will never be given to another user during your rental session, ensuring 100% privacy.',
    },
  ],
  contact: {
    title: 'Get in Touch with DropOTP Support',
    subtitle: 'Our dedicated support team is available 24/7 to assist with integrations, bulk rentals, and technical inquiries.',
    email: 'support@dropotp.com',
    telegram: 'https://t.me/dropotp_support',
    telegramChannel: 'https://t.me/dropotp_official',
    telegramSupport: 'https://t.me/dropotp_support',
    workingHours: '24/7 Mon - Sun',
    responseTime: '< 15 minutes',
    location: 'Global SaaS Platform Infrastructure',
  },
  partners: {
    commissionRate: '20%',
    minimumPayout: '$10.00',
    payoutMethods: 'Crypto (USDT TRC20, TON, BTC), bKash, Nagad',
    benefits: [
      '20% lifetime recurring commission on all referrals',
      'Real-time referral tracking and click statistics',
      'Instant payout requests with zero withdrawal fees',
      'Dedicated partner manager & custom promotional banners',
    ],
  },
  public_offer: {
    title: 'Terms of Service & Public Offer',
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: '1. General Provisions',
        text: 'This Public Offer constitutes an official proposal by DropOTP to provide temporary email access and automated OTP reception services under the conditions stated herein.',
      },
      {
        heading: '2. Nature of Service',
        text: 'DropOTP provides temporary disposable email addresses for receiving confirmation emails, registration verification codes, and activation links. Services are provided "as-is" with real-time IMAP and WebSocket delivery.',
      },
      {
        heading: '3. Cancellation and Refund Policy',
        text: 'Rentals may be canceled freely before an OTP code has been received or before the rental session expires. Upon cancellation, the full held amount is refunded automatically to the user wallet. Batch purchases and completed rentals are non-refundable once an OTP has been successfully received.',
      },
      {
        heading: '4. Prohibited Use',
        text: 'Users agree not to use DropOTP for fraudulent activities, illegal spam, payment system abuse, harassment, or actions violating international cyber laws.',
      },
    ],
  },
  privacy_policy: {
    title: 'Privacy Policy',
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        text: 'We collect minimal operational data necessary to deliver our services, including account email (for registration), transaction records, and API usage metrics. We do not store sensitive personal passwords.',
      },
      {
        heading: '2. Email Content & Data Retention',
        text: 'Incoming emails received during your rental session are processed in volatile memory to extract verification codes. We do not maintain long-term archives of email message bodies.',
      },
      {
        heading: '3. Security & Cryptography',
        text: 'All communications between your browser and our servers are encrypted with TLS 1.3. User passwords are encrypted using multi-round Argon2/bcrypt hashing.',
      },
      {
        heading: '4. Third-Party Sharing',
        text: 'DropOTP does not sell, rent, or share personal user details with third parties or advertising brokers.',
      },
    ],
  },
  floating_widget: {
    telegramUrl: 'https://t.me/dropotp_support',
    supportEmail: 'support@dropotp.com',
    supportTitle: 'Need help with OTP reception?',
    helpdeskUrl: '#contact',
    notificationText: 'New 114+ Services Added! Enjoy instant OTP extraction with 99.9% delivery rate.',
    enabled: true,
  },
};

const CMS_FIELD_GUIDES: Record<string, { desc: string; fields: { name: string; type: string; details: string }[] }> = {
  floating_widget: {
    desc: 'Controls the floating support button and expandable quick links at the bottom-right corner of the website.',
    fields: [
      { name: 'telegramUrl', type: 'string (URL)', details: 'Telegram support handle or group link (e.g. https://t.me/dropotp_support)' },
      { name: 'supportEmail', type: 'string (email)', details: 'Official support email address (e.g. support@dropotp.com)' },
      { name: 'supportTitle', type: 'string', details: 'Tooltip title shown on hover' },
      { name: 'helpdeskUrl', type: 'string', details: 'Internal hash or external link to help desk (e.g. #contact)' },
      { name: 'notificationText', type: 'string', details: 'Text shown in the notification badge if active' },
      { name: 'enabled', type: 'boolean (true/false)', details: 'Show or hide the floating widget on public pages' },
    ],
  },
  contact: {
    desc: 'Public contact information and support channels displayed on /#contact.',
    fields: [
      { name: 'title', type: 'string', details: 'Header title of the contact section' },
      { name: 'subtitle', type: 'string', details: 'Brief description under the title' },
      { name: 'email', type: 'string', details: 'Primary email address for direct inquiries' },
      { name: 'telegram', type: 'string (URL)', details: 'Telegram support account direct link' },
      { name: 'telegramChannel', type: 'string (URL)', details: 'Official announcement channel link' },
      { name: 'workingHours', type: 'string', details: 'Support availability (e.g. "24/7 Mon - Sun")' },
      { name: 'responseTime', type: 'string', details: 'Expected response delay (e.g. "< 15 minutes")' },
    ],
  },
  faq: {
    desc: 'List of frequently asked questions and answers displayed on the FAQ page and landing page.',
    fields: [
      { name: 'category', type: 'string', details: 'Grouping tag (e.g. "General", "Ordering & Delivery", "Pricing & Limits")' },
      { name: 'question', type: 'string', details: 'The question asked by users' },
      { name: 'answer', type: 'string', details: 'Detailed solution/answer' },
    ],
  },
  partners: {
    desc: 'Affiliate commission rates, payout minimums, and partner benefits shown on /#partners.',
    fields: [
      { name: 'commissionRate', type: 'string', details: 'Percentage commission (e.g. "20%")' },
      { name: 'minimumPayout', type: 'string', details: 'Minimum withdrawal amount (e.g. "$10.00")' },
      { name: 'payoutMethods', type: 'string', details: 'Supported payout gateways (e.g. Crypto USDT, bKash, Nagad)' },
      { name: 'benefits', type: 'array of strings', details: 'Bullet points highlighting affiliate perks' },
    ],
  },
  public_offer: {
    desc: 'Legal Terms of Service and refund terms displayed on /#public-offer.',
    fields: [
      { name: 'title', type: 'string', details: 'Document title' },
      { name: 'lastUpdated', type: 'string', details: 'Revision date or month (e.g. "September 2026")' },
      { name: 'sections', type: 'array of objects', details: 'List of legal articles with "heading" and "text"' },
    ],
  },
  privacy_policy: {
    desc: 'Data protection and retention statement displayed on /#privacy-policy.',
    fields: [
      { name: 'title', type: 'string', details: 'Document title' },
      { name: 'lastUpdated', type: 'string', details: 'Revision date or month' },
      { name: 'sections', type: 'array of objects', details: 'List of privacy sections with "heading" and "text"' },
    ],
  },
};

export const AdminCms: React.FC = () => {
  const { showAlert, showConfirm } = useDialog();
  const [selectedKey, setSelectedKey] = useState<string>(CMS_PAGES[0].key);
  const [contentJson, setContentJson] = useState<string>('{}');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadContent = async (key: string) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/cms/${key}`);
      if (res.data?.data && Object.keys(res.data.data).length > 0) {
        setContentJson(JSON.stringify(res.data.data, null, 2));
      } else if (CMS_DEFAULT_TEMPLATES[key]) {
        setContentJson(JSON.stringify(CMS_DEFAULT_TEMPLATES[key], null, 2));
      } else {
        setContentJson('{}');
      }
    } catch {
      if (CMS_DEFAULT_TEMPLATES[key]) {
        setContentJson(JSON.stringify(CMS_DEFAULT_TEMPLATES[key], null, 2));
      } else {
        setContentJson('{}');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent(selectedKey);
  }, [selectedKey]);

  const handleLoadExample = async () => {
    const template = CMS_DEFAULT_TEMPLATES[selectedKey];
    if (!template) {
      await showAlert('No default template found for this section.', 'Info', 'info');
      return;
    }
    const confirmed = await showConfirm(
      `Load standard example template for "${selectedKey}"? Any unsaved edits will be replaced with the standard example.`,
      'Load Example Template',
      'info'
    );
    if (confirmed) {
      setContentJson(JSON.stringify(template, null, 2));
      await showAlert(`Example template for "${selectedKey}" loaded into the editor! Click "Save to Database" when you are ready to publish.`, 'Template Loaded', 'success');
    }
  };

  const handleFormatJson = async () => {
    try {
      const parsed = JSON.parse(contentJson);
      setContentJson(JSON.stringify(parsed, null, 2));
      await showAlert('JSON formatted and validated successfully!', 'Format OK', 'success');
    } catch (e: any) {
      await showAlert(`Invalid JSON syntax: ${e.message}`, 'JSON Syntax Error', 'danger');
    }
  };

  const handleSave = async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(contentJson);
    } catch (e: any) {
      await showAlert(`Invalid JSON syntax: ${e.message}`, 'JSON Syntax Error', 'danger');
      return;
    }

    setSaving(true);
    try {
      await API.put(`/admin/cms/${selectedKey}`, { data: parsed });
      await showAlert(`CMS content for "${selectedKey}" saved successfully! Live website updated.`, 'Saved', 'success');
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to save CMS content', 'Error', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const activeGuide = CMS_FIELD_GUIDES[selectedKey];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <FileEdit className="w-6 h-6 text-emerald-700" />
            <span>Site Content & CMS Manager</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage public marketing content, FAQs, legal policies, support links, and floating widget
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save to Database'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section Selector */}
        <div className="lg:col-span-4 space-y-2">
          {CMS_PAGES.map((page) => {
            const isSelected = selectedKey === page.key;
            const Icon = page.icon;
            return (
              <button
                key={page.key}
                onClick={() => setSelectedKey(page.key)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start space-x-3 ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                    {page.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{page.desc}</p>
                </div>
              </button>
            );
          })}

          {/* Quick Help Card */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-2 mt-4 text-slate-700">
            <div className="flex items-center space-x-2 font-bold text-emerald-900">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>How to Use CMS</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
              <li>Select any page on the left to edit its content.</li>
              <li>Click <strong className="text-emerald-800">"✨ Load Example"</strong> if you want standard pre-filled data.</li>
              <li>Edit text, links, or items inside the JSON box.</li>
              <li>Click <strong className="text-emerald-800">"Save to Database"</strong> to push changes live instantly.</li>
            </ul>
          </div>
        </div>

        {/* Right Editor */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Editing: <code className="text-emerald-700 font-mono">/content/{selectedKey}</code>
                </span>
                <p className="text-[11px] text-slate-400">
                  Edit structured JSON data. Changes take effect on the live website immediately upon saving.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-all"
                  title="Load pre-built example template"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Load Example</span>
                </button>

                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                  title="Format JSON indentation"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Format</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadContent(selectedKey)}
                  disabled={loading}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 border border-slate-200"
                  title="Reload from server"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={18}
                value={contentJson}
                onChange={(e) => setContentJson(e.target.value)}
                className="w-full font-mono text-xs bg-slate-950 text-emerald-300 p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed shadow-inner"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Field Guide / Schema Reference */}
          {activeGuide && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
              <div className="flex items-center space-x-2 font-bold text-slate-800">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Field Reference Guide for <code className="text-emerald-700 font-mono font-bold">/{selectedKey}</code></span>
              </div>
              <p className="text-[11px] text-slate-600">{activeGuide.desc}</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-1.5 pr-3">Field Key</th>
                      <th className="py-1.5 pr-3">Type</th>
                      <th className="py-1.5">Description & Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeGuide.fields.map((f, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-3 font-mono font-bold text-emerald-900">{f.name}</td>
                        <td className="py-1.5 pr-3 text-slate-500 font-mono">{f.type}</td>
                        <td className="py-1.5 text-slate-700">{f.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { useDialog } from '../../context/DialogContext';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Server,
  RefreshCw,
  Key,
  Globe,
  Mail,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const AdminMailSettings: React.FC = () => {
  const { showAlert, showConfirm } = useDialog();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const [settings, setSettings] = useState({
    fromEmail: 'info@dropotp.com',
    fromName: 'DropOTP Support',
    provider: 'DIRECT_MX', // 'DIRECT_MX' | 'CUSTOM_SMTP' | 'BREVO' | 'RESEND'
    // Custom SMTP
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    // Brevo API
    brevoApiKey: '',
    // Resend API
    resendApiKey: '',
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/mail/settings');
      if (res.data?.settings && Object.keys(res.data.settings).length > 0) {
        setSettings((prev) => ({ ...prev, ...res.data.settings }));
      }
    } catch (err: any) {
      console.error('Failed to load mail settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put('/admin/mail/settings', { settings });
      await showAlert('Mail settings updated and saved successfully!', 'Saved', 'success');
    } catch (err: any) {
      await showAlert(err.response?.data?.error || err.message, 'Save Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      await showAlert('Please enter a valid recipient email address for testing.', 'Invalid Email', 'error');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await API.post('/admin/mail/test', { email: testEmail });
      setTestResult(res.data);
      if (res.data?.success) {
        await showAlert(`Verification test email was successfully dispatched to ${testEmail}!`, 'Email Sent', 'success');
      } else {
        await showAlert(`Delivery failed: ${res.data?.error || 'Unknown error'}`, 'Dispatch Failed', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      setTestResult({ success: false, error: msg });
      await showAlert(`Delivery error: ${msg}`, 'Error', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 mb-1">
            <Mail className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Outbound Mail Engine</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">Email Verification & SMTP Settings</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configures outbound email dispatch for User Registration OTPs from <strong>info@dropotp.com</strong>.
          </p>
        </div>
        <button
          onClick={loadSettings}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Sender Identity */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Sender Identity</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Sender Name</label>
                  <input
                    type="text"
                    value={settings.fromName}
                    onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="DropOTP Support"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Sender Email Address</label>
                  <input
                    type="email"
                    value={settings.fromEmail}
                    onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="info@dropotp.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Delivery Methods */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>Primary Delivery Provider</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'DIRECT_MX',
                    title: 'Direct VPS Port 25',
                    desc: 'Uses VPS host directly to recipient MX. Requires SPF/DKIM DNS record.',
                    icon: Zap,
                  },
                  {
                    id: 'CUSTOM_SMTP',
                    title: 'Custom SMTP Relay',
                    desc: 'Connect via custom SMTP server credentials (e.g. Hostkey, Postfix, external).',
                    icon: Server,
                  },
                  {
                    id: 'BREVO',
                    title: 'Brevo (Sendinblue) API',
                    desc: 'Free 300 emails/day via Port 443 API. 100% Google/Yahoo inbox delivery.',
                    icon: Globe,
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSettings({ ...settings, provider: item.id })}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      settings.provider === item.id
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <item.icon className={`w-4 h-4 ${settings.provider === item.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      </div>
                      {settings.provider === item.id && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Conditional Options */}
            {settings.provider === 'CUSTOM_SMTP' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in duration-200">
                <h4 className="text-xs font-bold text-slate-900">Custom SMTP Configuration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={settings.smtpHost}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      placeholder="mail.dropotp.com or smtp.example.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">SMTP Port</label>
                    <input
                      type="text"
                      value={settings.smtpPort}
                      onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                      placeholder="587 or 465"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">SMTP Username</label>
                    <input
                      type="text"
                      value={settings.smtpUser}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                      placeholder="info@dropotp.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">SMTP Password</label>
                    <input
                      type="password"
                      value={settings.smtpPass}
                      onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {settings.provider === 'BREVO' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <span>Brevo API Key (xkeysib-...)</span>
                </h4>
                <input
                  type="text"
                  value={settings.brevoApiKey}
                  onChange={(e) => setSettings({ ...settings, brevoApiKey: e.target.value })}
                  placeholder="xkeysib-..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  Sends emails via Brevo REST API over HTTPS (Port 443). Never blocked by firewall or spam filters.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Mail Settings'}</span>
            </button>
          </form>
        </div>

        {/* Live Test & Diagnostics */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Send className="w-4 h-4 text-emerald-600" />
              <span>Send Test Verification Code</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Send a real 6-digit confirmation email to verify delivery speed, spam scoring, and inbox receipt.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <button
                onClick={handleTestEmail}
                disabled={testing}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow"
              >
                <Send className={`w-3.5 h-3.5 ${testing ? 'animate-pulse' : ''}`} />
                <span>{testing ? 'Dispatching...' : 'Dispatch Test Code'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed mt-4 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="font-bold mb-1 flex items-center space-x-1.5">
                  {testResult.success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Email Delivered ({testResult.provider})</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Delivery Failed ({testResult.provider || 'ERROR'})</span>
                    </>
                  )}
                </div>
                {testResult.messageId && (
                  <p className="text-[11px] font-mono break-all text-slate-600">ID: {testResult.messageId}</p>
                )}
                {testResult.error && (
                  <p className="text-[11px] font-mono whitespace-pre-wrap break-all mt-1">{testResult.error}</p>
                )}
              </div>
            )}
          </div>

          {/* DNS SPF Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Direct Port 25 DNS Requirement</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Google and Yahoo require an <strong>SPF DNS TXT record</strong> for <code>dropotp.com</code> to accept mail without bouncing:
            </p>
            <div className="p-2.5 bg-amber-100/70 rounded-lg font-mono text-[10px] select-all break-all text-amber-950 border border-amber-200">
              v=spf1 ip4:162.141.78.116 ~all
            </div>
            <p className="text-[11px] text-amber-800">
              Add this TXT record at your DNS provider (Cloudflare/Registrar) for 100% inbox delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

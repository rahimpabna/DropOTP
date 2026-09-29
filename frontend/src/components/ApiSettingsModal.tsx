import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { X, Key, Copy, Check, RefreshCw, Globe, Code2 } from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshMe } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(user?.webhookUrl || '');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(user.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (confirm('Are you sure you want to regenerate your API key? All active bots using the old key will stop working.')) {
      await API.post('/auth/api-key/regenerate');
      await refreshMe();
    }
  };

  const handleSaveWebhook = async () => {
    setSavingWebhook(true);
    setWebhookStatus(null);
    try {
      await API.post('/auth/webhook/update', { webhookUrl });
      await refreshMe();
      setWebhookStatus('Webhook URL successfully updated!');
    } catch (err: any) {
      setWebhookStatus('Failed to update webhook URL.');
    } finally {
      setSavingWebhook(false);
    }
  };

  const maskedKey = user.apiKey.slice(0, 8) + '****************' + user.apiKey.slice(-4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-tight">API Keys & Webhooks</h3>
            <p className="text-xs text-slate-500">Integrate DropOTP automated bots and webhook listeners</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* API Key Box */}
          <div className="bg-[#f8faf9] p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Your Secret API-Key
              </label>
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-xs font-bold text-brand-700 hover:underline"
              >
                {showKey ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={showKey ? user.apiKey : maskedKey}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none"
              />
              <button
                onClick={handleCopyKey}
                className="px-3 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-all"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
              <button
                onClick={handleRegenerateKey}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all"
                title="Regenerate Key"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-[#f8faf9] p-4 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-1.5 mb-1">
              <Globe className="w-4 h-4 text-brand-700" />
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Instant Notification via Webhook
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              We will send an HTTP POST JSON payload to your server immediately when an incoming OTP arrives.
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/api/otp-webhook"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <button
                onClick={handleSaveWebhook}
                disabled={savingWebhook}
                className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shrink-0 transition-all disabled:opacity-50"
              >
                {savingWebhook ? 'Saving...' : 'Save Webhook'}
              </button>
            </div>

            {webhookStatus && (
              <p className="text-xs font-semibold text-emerald-700 mt-2">{webhookStatus}</p>
            )}
          </div>

          {/* Code Examples / SMSBower Compatibility */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 mb-3">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                API Integration Examples
              </span>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              <div>
                <p className="text-emerald-400 font-bold mb-1"># 1. Rent Email Activation:</p>
                <div className="bg-black/50 p-2.5 rounded-lg overflow-x-auto text-slate-300">
                  GET {window.location.origin}/api/mail/getActivation?api_key={user.apiKey}&service=tg
                </div>
              </div>

              <div>
                <p className="text-emerald-400 font-bold mb-1"># 2. Get Extracted OTP Code:</p>
                <div className="bg-black/50 p-2.5 rounded-lg overflow-x-auto text-slate-300">
                  GET {window.location.origin}/api/mail/getCode?api_key={user.apiKey}&mailId=MAIL_ID
                </div>
              </div>

              <div>
                <p className="text-emerald-400 font-bold mb-1"># 3. Complete Activation (status 3):</p>
                <div className="bg-black/50 p-2.5 rounded-lg overflow-x-auto text-slate-300">
                  GET {window.location.origin}/api/mail/setStatus?api_key={user.apiKey}&id=MAIL_ID&status=3
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

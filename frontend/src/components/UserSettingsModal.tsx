import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import {
  Settings as SettingsIcon,
  X,
  Eye,
  EyeOff,
  Shield,
  Key,
  Bell,
  Check,
  RotateCw,
} from 'lucide-react';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshMe } = useAuth();

  // Contact name editing
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactName, setContactName] = useState(user?.displayName || user?.username || '');

  // Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // API Key Visibility
  const [showApiKey, setShowApiKey] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState(user?.webhookUrl || '');
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);

  // Feedback Toast
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleUpdateContact = async () => {
    try {
      await API.put('/auth/profile', { displayName: contactName });
      setIsEditingContact(false);
      await refreshMe();
      showSuccess('Contact name updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update name');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters');
      return;
    }

    setPassLoading(true);
    setPassError(null);
    try {
      await API.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password changed successfully!');
    } catch (err: any) {
      setPassError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  const handleRotateApiKey = async () => {
    if (!confirm('Regenerate API key? Existing integrations will need to be updated with the new key.')) {
      return;
    }
    setRotatingKey(true);
    try {
      await API.post('/auth/rotate-api-key');
      await refreshMe();
      showSuccess('New API key generated!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate key');
    } finally {
      setRotatingKey(false);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      await API.put('/auth/profile', { webhookUrl });
      setIsEditingWebhook(false);
      await refreshMe();
      showSuccess('Webhook URL updated!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update webhook');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title matching Screenshot_8.png */}
        <div className="text-center space-y-1 mb-6">
          <p className="text-xs text-brand-700 font-semibold">Main / Profile</p>
          <div className="flex items-center justify-center space-x-2">
            <SettingsIcon className="w-6 h-6 text-amber-500 animate-spin-slow" />
            <h2 className="text-2xl font-black text-brand-900 tracking-tight">SETTINGS</h2>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold text-center">
            {successMsg}
          </div>
        )}

        {/* Card Form matching Screenshot_8.png */}
        <div className="bg-[#d0eade]/40 rounded-2xl p-5 border border-[#badacb] space-y-4">
          {/* ID */}
          <div>
            <label className="block text-[11px] font-bold text-amber-800 mb-1">ID</label>
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#cfe4d8] rounded-xl text-xs font-mono font-bold text-slate-700">
              <span>{user.id.slice(0, 8)}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                NOT AVAILABLE TO CHANGE
              </span>
            </div>
          </div>

          {/* Login/Email */}
          <div>
            <label className="block text-[11px] font-bold text-amber-800 mb-1">Login/Username</label>
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#cfe4d8] rounded-xl text-xs font-bold text-slate-700">
              <span>{user.username}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                NOT AVAILABLE TO CHANGE
              </span>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-bold text-amber-800 mb-1">Email</label>
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#cfe4d8] rounded-xl text-xs font-bold text-slate-700">
              <span>{user.email}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                NOT AVAILABLE TO CHANGE
              </span>
            </div>
          </div>

          {/* My contact */}
          <div>
            <label className="block text-[11px] font-bold text-amber-800 mb-1">My contact</label>
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#cfe4d8] rounded-xl text-xs font-bold text-slate-800">
              {isEditingContact ? (
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="bg-white px-2 py-1 rounded text-xs text-slate-900 w-full mr-2"
                />
              ) : (
                <span>{user.displayName || user.username}</span>
              )}
              <button
                onClick={() => (isEditingContact ? handleUpdateContact() : setIsEditingContact(true))}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shrink-0 ml-2"
              >
                {isEditingContact ? 'SAVE' : 'CHANGE'}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-bold text-amber-800 mb-1">Password</label>
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#cfe4d8] rounded-xl text-xs font-mono font-bold text-slate-700">
              <span>••••••••••••</span>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all font-sans"
              >
                CHANGE
              </button>
            </div>
          </div>

          {/* Two-factor authentication */}
          <div>
            <label className="block text-[11px] font-bold text-amber-800 mb-1">
              Two-factor authentication
            </label>
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#cfe4d8] rounded-xl text-xs font-bold text-slate-700">
              <span>2FA: Disabled</span>
              <button
                onClick={() => alert('Two-factor authentication setup is coming soon!')}
                className="px-3 py-1 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-lg text-xs font-bold transition-all"
              >
                ENABLE 2FA
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Enable two-factor authentication to enhance your account security and activate additional features.
            </p>
          </div>

          {/* API-key */}
          <div>
            <label className="block text-[11px] font-bold text-amber-800 mb-1">API-key</label>
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#cfe4d8] rounded-xl text-xs font-mono font-bold text-slate-700">
              <span className="truncate mr-2">
                {showApiKey
                  ? user.apiKey
                  : `${user.apiKey?.slice(0, 14)}*******`}
              </span>
              <div className="flex items-center space-x-1 shrink-0 font-sans">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
                >
                  {showApiKey ? 'HIDE' : 'SHOW'}
                </button>
                <button
                  onClick={handleRotateApiKey}
                  disabled={rotatingKey}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
                >
                  CHANGE
                </button>
              </div>
            </div>
          </div>

          {/* Webhook */}
          <div className="pt-2 border-t border-brand-200/60">
            <label className="block text-[11px] font-bold text-amber-800 mb-1">
              NOTIFICATION VIA WEBHOOK
            </label>
            {isEditingWebhook ? (
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  placeholder="https://yourserver.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="bg-white px-3 py-1.5 rounded-xl border border-brand-300 text-xs w-full"
                />
                <button
                  onClick={handleSaveWebhook}
                  className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  SAVE
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#cfe4d8] rounded-xl text-xs font-mono font-bold text-slate-700">
                <span className="truncate mr-2">{user.webhookUrl || 'Not configured'}</span>
                <button
                  onClick={() => setIsEditingWebhook(true)}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold font-sans shrink-0"
                >
                  + WEBHOOK
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal matching Change a password.png */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xl font-black text-brand-900 tracking-tight">
                CHANGE A PASSWORD
              </h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {passError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {passError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  Old password*
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    required
                    placeholder="Your old password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-[#dbece3] border border-transparent rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  New password*
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    placeholder="Your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#dbece3] border border-transparent rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-orange"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  Confirm your new password*
                </label>
                <input
                  type="password"
                  required
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#dbece3] border border-transparent rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-orange"
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="w-full py-3.5 bg-accent-orange hover:bg-accent-orange-hover text-white rounded-2xl text-xs font-black shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                <Shield className="w-4 h-4" />
                <span>{passLoading ? 'Updating password...' : 'CHANGE PASSWORD'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

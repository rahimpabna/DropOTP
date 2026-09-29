import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { User, UserDetailData } from '../../types';
import {
  Users,
  Search,
  ArrowLeft,
  LogIn,
  Download,
  Save,
  CheckCircle,
  XCircle,
  CreditCard,
  Wallet,
  ShieldCheck,
  Award,
  Clock,
  Key,
  Lock,
  PlusCircle,
  RefreshCw,
  Sliders,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Globe,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Selected User for Deep Details Drawer/View
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<UserDetailData | null>(null);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'topups' | 'wallets' | 'adjust' | 'bonuses' | 'otps' | 'apikey' | 'security'
  >('profile');

  // Edit form state for user
  const [displayName, setDisplayName] = useState('');
  const [userStatus, setUserStatus] = useState('ACTIVE');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('TR');
  const [address, setAddress] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [vipTier, setVipTier] = useState('Base');

  // Balance Adjustment state
  const [adjustAmount, setAdjustAmount] = useState('5.00');
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustReason, setAdjustReason] = useState('Customer loyalty bonus');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Security Tab State
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    setChangePasswordLoading(true);
    try {
      await API.post(`/admin/users/${selectedUserId}/change-password`, { newPassword });
      alert('Password updated successfully!');
      setNewPassword('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update password');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : (res.data?.users || []));
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/users/${userId}/details`);
      const data: UserDetailData = res.data;
      setDetailData(data);
      setSelectedUserId(userId);

      // Populate form
      setDisplayName(data.user.displayName || '');
      setUserStatus(data.user.status || 'ACTIVE');
      setFullName((data.user as any).fullName || '');
      setNationalId((data.user as any).nationalId || '');
      setPhone(data.user.phone || '');
      setBirthDate(data.user.birthDate || '');
      setCountry(data.user.country || 'TR');
      setAddress(data.user.address || '');
      setIsEmailVerified(data.user.isEmailVerified || false);
      setVipTier(data.user.vipTier || 'Base');
    } catch (err) {
      console.error('Failed to load user details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Save changes to profile
  const handleSaveChanges = async () => {
    if (!selectedUserId) return;
    try {
      await API.put(`/admin/users/${selectedUserId}/details`, {
        displayName,
        status: userStatus,
        fullName,
        nationalId,
        phone,
        birthDate,
        country,
        address,
        isEmailVerified,
        vipTier,
      });
      alert('User details saved successfully!');
      await loadUserDetails(selectedUserId);
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save changes');
    }
  };

  // Login as user (Impersonation in New Tab)
  const handleLoginAsUser = async () => {
    if (!selectedUserId) return;
    try {
      const res = await API.post(`/admin/users/${selectedUserId}/impersonate`);
      if (res.data?.token) {
        const adminToken = localStorage.getItem('token') || '';
        const url = `/?impersonate_token=${encodeURIComponent(res.data.token)}&admin_return=${encodeURIComponent(adminToken)}`;
        window.open(url, '_blank');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Impersonation failed');
    }
  };

  // Balance Adjustment submit
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setAdjustLoading(true);
    try {
      const amount = parseFloat(adjustAmount);
      await API.post('/admin/users/adjust-balance', {
        userId: selectedUserId,
        amount: adjustType === 'CREDIT' ? amount : -amount,
        reason: adjustReason,
      });
      alert('Wallet balance updated!');
      await loadUserDetails(selectedUserId);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to adjust balance');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedUserId && detailData) {
    const user = detailData.user;
    const metrics = detailData.metrics || (detailData as any).stats || {};
    const topups = detailData.topups || (detailData as any).topUpHistory || [];
    const ledger = detailData.ledger || (detailData as any).ledgerTransactions || [];
    const promosRedeemed = detailData.promosRedeemed || (detailData as any).promoRedemptions || [];
    const otpHistory = detailData.otpHistory || [];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Top Navigation & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedUserId(null)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to users</span>
            </button>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-bold text-slate-800">{user.username}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoginAsUser}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Login as user</span>
            </button>

            <button
              onClick={handleSaveChanges}
              className="flex items-center space-x-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save changes</span>
            </button>
          </div>
        </div>

        {/* User Identity Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xl border border-slate-200">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900">{user.username}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    user.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {user.status || 'Active'}
                </span>
                {user.role === 'ADMIN' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No tags</p>
            </div>
          </div>
        </div>

        {/* 5 Metric Cards matching user info.png */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Balance */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <CreditCard className="w-4 h-4" />
              <span>Balance</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              ${Number(user.wallet?.balance || metrics?.balance || 0).toFixed(2)}
            </div>
            <span className="text-[10px] font-semibold text-slate-400">USD</span>
          </div>

          {/* Net (User) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <Wallet className="w-4 h-4" />
              <span>Net (User)</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              ${Number(metrics?.netSpent || 0).toFixed(2)}
            </div>
            <span className="text-[10px] font-semibold text-slate-400">From OTP history</span>
          </div>

          {/* VIP tier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <Award className="w-4 h-4" />
              <span>VIP tier</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {metrics?.vipTier || vipTier || 'Base'}
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              {metrics?.xp || 0} XP
            </span>
          </div>

          {/* OTP Received RTP */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>OTP Received RTP</span>
            </div>
            <div className="text-xl font-black text-slate-900">
              {Number(metrics?.otpReceivedRtp || 0).toFixed(1)}%
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              ${Number(metrics?.netSpent || 0).toFixed(2)} / ${Number((Number(metrics?.netSpent || 0)) * 1.5).toFixed(2)}
            </span>
          </div>

          {/* Last IP */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <Clock className="w-4 h-4" />
              <span>Last IP</span>
            </div>
            <div className="text-sm font-black text-slate-900 truncate">
              {user.lastIp || metrics?.lastIp || '80.96.59.217'}
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              {user.country || 'TR'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex items-center space-x-6 text-xs font-bold overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'topups', label: 'Top Up History' },
            { id: 'wallets', label: 'Wallets & Ledger' },
            { id: 'adjust', label: 'Balance adjustment' },
            { id: 'bonuses', label: 'Bonuses & Promos' },
            { id: 'otps', label: 'OTP History' },
            { id: 'apikey', label: 'API Key' },
            { id: 'security', label: 'Security' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-700 text-brand-700 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Profile View matching user info.png */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Identity */}
              <div>
                <h3 className="text-sm font-black text-slate-900">Identity</h3>
                <p className="text-[11px] text-slate-400 mb-3">Core account and login details</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Display name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
                    <select
                      value={userStatus}
                      onChange={(e) => setUserStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="BANNED">Banned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Username</label>
                    <input
                      type="text"
                      disabled
                      value={user.username}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Email</label>
                    <input
                      type="text"
                      disabled
                      value={user.email}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed"
                    />
                    <div className="mt-1.5 flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isEmailVerified
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isEmailVerified ? 'Verified' : 'Unverified'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEmailVerified(!isEmailVerified)}
                        className="text-[11px] font-semibold text-brand-700 hover:underline"
                      >
                        {isEmailVerified ? 'Mark unverified' : 'Mark verified'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal details */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Personal details</h3>
                <p className="text-[11px] text-slate-400 mb-3">KYC / identity information</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Full name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">National ID</label>
                    <input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="National ID"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Birth date</label>
                    <input
                      type="text"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="TR"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Address"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* ID and Joined */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  User ID: <span className="font-mono text-slate-700 font-bold">{user.id}</span>
                </div>
                <div>
                  Joined: <span className="font-semibold text-slate-700">{new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Right Column: User Value */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900">User value</h3>
              <p className="text-[11px] text-slate-400">Tier, segment and lifetime figures</p>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">VIP Level</label>
                <select
                  value={vipTier}
                  onChange={(e) => setVipTier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Base">Base</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>XP</span>
                  <span className="font-bold text-slate-900">{metrics?.xp || 0}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Wagered</span>
                  <span className="font-bold text-slate-900">${Number(metrics?.netSpent || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Risk segment</span>
                  <span className="font-bold text-emerald-700">Normal</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Top Up History */}
        {activeTab === 'topups' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm text-slate-900">
              Payment Top Up Invoices ({topups.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Gateway</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {topups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        No top up invoices recorded yet.
                      </td>
                    </tr>
                  ) : (
                    topups.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-3 font-bold text-slate-900">${Number(t.amount || 0).toFixed(2)}</td>
                        <td className="px-6 py-3 uppercase text-[11px] font-bold text-slate-600">{t.gateway}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              t.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Wallets & Ledger */}
        {activeTab === 'wallets' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm text-slate-900">
              Immutable Wallet Ledger ({ledger.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Before</th>
                    <th className="px-6 py-3">After</th>
                    <th className="px-6 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No ledger transactions found.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">{new Date(l.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-3">
                          <span className="font-bold text-slate-800">{l.type}</span>
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-900">
                          {l.type === 'CREDIT' ? `+$${Number(l.amount || 0).toFixed(4)}` : `-$${Number(l.amount || 0).toFixed(4)}`}
                        </td>
                        <td className="px-6 py-3 text-slate-500">${Number(l.balanceBefore || 0).toFixed(4)}</td>
                        <td className="px-6 py-3 font-bold text-slate-800">${Number(l.balanceAfter || 0).toFixed(4)}</td>
                        <td className="px-6 py-3 text-slate-600">{l.description || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Balance Adjustment */}
        {activeTab === 'adjust' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-lg space-y-4">
            <h3 className="text-base font-black text-slate-900">Adjust User Balance</h3>
            <p className="text-xs text-slate-500">
              Directly credit or debit the user wallet. All balance changes are immutably logged into the ledger.
            </p>

            <form onSubmit={handleAdjustBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('CREDIT')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      adjustType === 'CREDIT'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Credit (Add Funds)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEBIT')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      adjustType === 'DEBIT'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Debit (Deduct Funds)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Manual test credit, compensation"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={adjustLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow"
              >
                {adjustLoading ? 'Processing...' : 'Apply Balance Change'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Bonuses & Promos */}
        {activeTab === 'bonuses' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm text-slate-900">
              Redeemed Promo Codes ({promosRedeemed.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Redeemed At</th>
                    <th className="px-6 py-3">Promo Code</th>
                    <th className="px-6 py-3">Bonus Granted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {promosRedeemed.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                        User has not redeemed any promo codes yet.
                      </td>
                    </tr>
                  ) : (
                    promosRedeemed.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">{new Date(p.redeemedAt).toLocaleString()}</td>
                        <td className="px-6 py-3 font-mono font-bold text-brand-700">
                          {typeof p.promoCode === 'object' && p.promoCode ? p.promoCode.code : String(p.promoCode || 'PROMO')}
                        </td>
                        <td className="px-6 py-3 font-bold text-emerald-600">
                          +${Number(p.amountCredited ?? p.amountGranted ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: OTP History */}
        {activeTab === 'otps' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm text-slate-900">
              User Rental Sessions & Received Codes ({otpHistory.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Service</th>
                    <th className="px-6 py-3">Assigned Email</th>
                    <th className="px-6 py-3">OTP Code</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {otpHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No rental sessions found for this user.
                      </td>
                    </tr>
                  ) : (
                    otpHistory.map((sess) => (
                      <tr key={sess.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">{new Date(sess.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-3 font-bold text-slate-900">{sess.serviceCode}</td>
                        <td className="px-6 py-3 font-mono text-slate-600">{sess.emailAddress}</td>
                        <td className="px-6 py-3 font-mono font-bold text-emerald-700">
                          {sess.code || '—'}
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-800">${Number(sess.price || 0).toFixed(4)}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              sess.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sess.status === 'WAITING_CODE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sess.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 7: API Key */}
        {activeTab === 'apikey' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-lg space-y-4">
            <h3 className="text-base font-black text-slate-900">API Credentials</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">API Key</label>
              <input
                type="text"
                readOnly
                value={user.apiKey}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Webhook URL</label>
              <input
                type="text"
                readOnly
                value={user.webhookUrl || 'Not configured'}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-700"
              />
            </div>
          </div>
        )}

        {/* Tab 8: Security (Matching user security.png) */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
            {/* Left Column: Password & Login Devices */}
            <div className="lg:col-span-7 space-y-6">
              {/* Password Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Password</h3>
                <p className="text-[11px] text-slate-400 mb-4">Set a new login password.</p>

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">New password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep"
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {newPassword.length > 0 && (
                    <button
                      type="submit"
                      disabled={changePasswordLoading}
                      className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow transition-all"
                    >
                      {changePasswordLoading ? 'Updating...' : 'Save Password'}
                    </button>
                  )}
                </form>
              </div>

              {/* Login Devices Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Login devices</h3>
                <p className="text-[11px] text-slate-400 mb-4">Recent devices and IP addresses used by this user.</p>

                <div className="space-y-3">
                  {((detailData as any).loginSessions || [
                    {
                      id: 'sess_1',
                      device: 'Chrome / Windows 10',
                      ip: user.lastIp || '89.40.143.151',
                      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                      lastActive: user.createdAt,
                    },
                  ]).map((sess: any, idx: number) => (
                    <div key={sess.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Monitor className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{sess.device || 'Web Browser'}</div>
                            <div className="text-[10px] text-slate-400">
                              Last seen: {new Date(sess.lastActive || Date.now()).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          Active
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/60">
                        <div className="p-2 bg-white rounded-lg border border-slate-100">
                          <div className="text-[10px] text-slate-400 font-bold">IP address</div>
                          <div className="font-bold text-slate-800 truncate">{sess.ip || user.lastIp || 'Unknown'}</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-100">
                          <div className="text-[10px] text-slate-400 font-bold">Browser</div>
                          <div className="font-bold text-slate-800 truncate">Chrome</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-100">
                          <div className="text-[10px] text-slate-400 font-bold">Operating system</div>
                          <div className="font-bold text-slate-800 truncate">Windows / Android</div>
                        </div>
                      </div>

                      {sess.userAgent && (
                        <div className="font-mono text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-100 break-all">
                          {sess.userAgent}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Shared IP accounts */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Shared IP accounts</h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Other accounts linked by the same IP address or device fingerprint.
                </p>

                {((detailData as any).sharedIpUsers || []).length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">
                    No related account found for shared IP or device.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {((detailData as any).sharedIpUsers || []).map((sharedUser: any) => (
                      <div
                        key={sharedUser.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900">{sharedUser.username}</div>
                          <div className="text-[10px] text-slate-400">{sharedUser.email}</div>
                        </div>
                        <button
                          onClick={() => loadUserDetails(sharedUser.id)}
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg transition-all"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Suspension Control */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Account Status</h3>
                <p className="text-[11px] text-slate-400 mb-3">Terminate active sessions or suspend this user account.</p>
                <button
                  onClick={() => setUserStatus(userStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition-all ${
                    userStatus === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {userStatus === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Users List View
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Users Management</h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage registered clients, balances, VIP tiers, KYC, and deep player profiles
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search user or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 shadow-sm"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Balance</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Email Verified</th>
                <th className="px-6 py-3.5">VIP Tier</th>
                <th className="px-6 py-3.5">Joined</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{u.username}</span>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-bold text-emerald-700">
                    ${Number(u.wallet?.balance || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'SUSPENDED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    {u.isEmailVerified ? (
                      <span className="text-emerald-700 font-bold">✓ Verified</span>
                    ) : (
                      <span className="text-amber-600 font-bold">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">{u.vipTier || 'Base'}</td>
                  <td className="px-6 py-3.5 text-slate-400">
                    {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => loadUserDetails(u.id)}
                      className="px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow transition-all"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

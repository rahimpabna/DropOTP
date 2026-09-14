import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { AdminOverviewStats } from '../../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  Users,
  Shield,
  Gamepad2,
  Gift,
  AlertTriangle,
  RefreshCw,
  Lock,
  Zap,
  DollarSign,
  Trophy,
} from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOverview = async (selectedRange = range) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/overview-stats?range=${selectedRange}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch overview stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(range);
  }, [range]);

  // Robust field mapping accommodating both response schemas
  const depAmount = data?.totalDeposits?.amount ?? data?.overview?.totalDeposits ?? 0;
  const depCount = data?.totalDeposits?.count ?? data?.overview?.totalDepositsCount ?? 0;
  const withAmount = data?.totalWithdrawals?.amount ?? data?.overview?.totalWithdrawals ?? 0;
  const withCount = data?.totalWithdrawals?.count ?? data?.overview?.totalWithdrawalsCount ?? 0;
  const profitAmount = data?.platformProfit?.amount ?? data?.overview?.platformProfit ?? 0;
  const userCount = data?.newUsers?.count ?? data?.overview?.newUsers ?? 0;
  const totalUserCount = data?.newUsers?.total ?? data?.overview?.totalUsers ?? 0;
  const rtpPercent = data?.platformRtp?.percentage ?? data?.rtp?.rate ?? 92.5;
  const rtpDelivered = data?.platformRtp?.totalDelivered ?? data?.rtp?.completedRentals ?? 0;
  const rtpTotal = data?.operationalMetrics?.totalRentals ?? data?.rtp?.totalRentals ?? 0;
  const activeNow = data?.presence?.activeNow ?? data?.presence?.inGame ?? 0;
  const onlineIdle = data?.presence?.onlineIdle ?? 0;
  const offlineCount = data?.presence?.offline ?? totalUserCount;
  const ops = data?.operationalMetrics;
  const topClients = data?.topClients || [];

  // Calculate RTP circle stroke dash
  const circumference = 2 * Math.PI * 45; // radius 45
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, rtpPercent)) / 100) * circumference;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium">Platform Overview & Operations Analytics</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Filter Pills */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 shadow-inner">
            {(['today', 'week', 'month', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRange(t)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  range === t
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {t === 'today' ? 'Today' : t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live</span>
          </div>

          <button
            onClick={() => fetchOverview(range)}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deposits */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div className="w-16 h-4">
              <svg viewBox="0 0 60 16" className="w-full h-full stroke-emerald-500 fill-none stroke-2">
                <path d="M 0,12 Q 15,10 30,5 T 60,2" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Deposits · {range === 'all' ? 'All Time' : range}
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              ${depAmount.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            {depCount} transactions
          </p>
        </div>

        {/* Total Withdrawals / Spend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div className="w-16 h-4">
              <svg viewBox="0 0 60 16" className="w-full h-full stroke-rose-400 fill-none stroke-2">
                <path d="M 0,8 Q 20,8 40,8 T 60,8" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Rentals Value · {range === 'all' ? 'All Time' : range}
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              ${withAmount.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            {withCount} completed rentals
          </p>
        </div>

        {/* Platform Profit */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="w-16 h-4">
              <svg viewBox="0 0 60 16" className="w-full h-full stroke-blue-500 fill-none stroke-2">
                <path d="M 0,14 Q 20,10 40,7 T 60,2" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Platform Revenue · {range === 'all' ? 'All Time' : range}
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">
              ${profitAmount.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600/80 font-medium mt-1">
            100% Net Margin on Catch-all
          </p>
        </div>

        {/* New Users */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="w-16 h-4">
              <svg viewBox="0 0 60 16" className="w-full h-full stroke-sky-500 fill-none stroke-2">
                <path d="M 0,15 C 20,14 40,4 60,2" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            New Users · {range === 'all' ? 'All Time' : range}
          </p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {userCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            {totalUserCount} total registered users
          </p>
        </div>
      </div>

      {/* Row 2: Finance Overview Chart & Platform Fee Due */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Finance Overview */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Finance Overview</h2>
              <p className="text-xs text-slate-400">Deposits vs Rental Volumes</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center space-x-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Deposits</span>
              </span>
              <span className="flex items-center space-x-1 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Rentals Spent</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full flex flex-col justify-end">
            <div className="flex-1 border-b border-slate-100 flex items-end justify-around px-4 pb-2">
              {[
                { period: 'Today', deposits: depAmount, spent: withAmount },
                { period: 'This Week', deposits: depAmount, spent: withAmount },
                { period: 'This Month', deposits: depAmount, spent: withAmount },
              ].map((bar, i) => {
                const maxVal = Math.max(bar.deposits, bar.spent, 10);
                const depHeight = Math.max(15, Math.min(100, (bar.deposits / maxVal) * 90));
                const spentHeight = Math.max(15, Math.min(100, (bar.spent / maxVal) * 90));

                return (
                  <div key={i} className="flex flex-col items-center space-y-2">
                    <div className="flex items-end space-x-2 h-40">
                      <div
                        style={{ height: `${depHeight}%` }}
                        className="w-8 bg-emerald-500/80 hover:bg-emerald-500 rounded-t-md transition-all shadow-sm flex items-top justify-center text-[9px] text-white font-bold pt-1"
                        title={`Deposits: $${bar.deposits}`}
                      >
                        ${bar.deposits.toFixed(0)}
                      </div>
                      <div
                        style={{ height: `${spentHeight}%` }}
                        className="w-8 bg-rose-400 hover:bg-rose-500 rounded-t-md transition-all shadow-sm flex items-top justify-center text-[9px] text-white font-bold pt-1"
                        title={`Spent: $${bar.spent}`}
                      >
                        ${bar.spent.toFixed(0)}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{bar.period}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Platform Fee Due */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Platform Fee Due</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Paid / Free
              </span>
            </div>

            <div className="mt-4 flex items-center space-x-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900">$0.00</span>
                <p className="text-[11px] text-slate-400 font-medium">Billing cycle: 2026-09-01</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Profit share · 0%</span>
                <span className="font-bold text-slate-900">$0.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Maintenance fee</span>
                <span className="font-bold text-slate-900">$0.00</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Next settlement</span>
                <span className="font-bold text-slate-900">Oct 01, 2026</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow">
              Download Invoices
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Player Presence, Platform RTP, Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6">
        {/* User Presence Donut Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-base font-bold text-slate-900 mb-4">User Presence</h2>

          <div className="flex items-center justify-around py-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (activeNow / Math.max(1, totalUserCount || 1)) * 251.2}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900">
                  {activeNow}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Active Now</span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-medium">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Active Rentals:</span>
                <span className="font-bold text-slate-900">{activeNow}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-slate-600">Online (idle):</span>
                <span className="font-bold text-slate-900">{onlineIdle}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-600">Offline:</span>
                <span className="font-bold text-slate-900">{offlineCount}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-center text-slate-400 font-medium border-t border-slate-100 pt-3">
            Total registered accounts: <span className="font-bold text-slate-700">{totalUserCount}</span>
          </div>
        </div>

        {/* Platform RTP Semi-Circular Gauge */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">Platform RTP</h2>
            <span className="text-xs text-slate-400 font-semibold">Success Rate</span>
          </div>

          <div className="relative w-40 h-40 my-3 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="#f1f5f9" strokeWidth="9" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#0284c7"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900">
                {rtpPercent.toFixed(1)}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Platform RTP</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
            <div className="bg-slate-50 p-2 rounded-xl text-left">
              <span className="text-slate-400 block text-[10px]">Delivered OTPs</span>
              <span className="font-bold text-slate-800">{rtpDelivered}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl text-left">
              <span className="text-slate-400 block text-[10px]">Total Orders</span>
              <span className="font-bold text-slate-800">{rtpTotal}</span>
            </div>
          </div>
        </div>

        {/* Operational Metrics 8-Item Grid */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Operational Metrics</h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Bet Volume */}
            <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">${withAmount.toFixed(0)}</p>
                <p className="text-[10px] text-slate-400">Total Spent</p>
              </div>
            </div>

            {/* Total Wins */}
            <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{rtpDelivered}</p>
                <p className="text-[10px] text-slate-400">Successful OTPs</p>
              </div>
            </div>

            {/* Locked Balance */}
            <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">${(ops?.lockedBalance || 0).toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">Locked Balance</p>
              </div>
            </div>

            {/* Locked Accounts */}
            <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">0</p>
                <p className="text-[10px] text-slate-400">Locked Accounts</p>
              </div>
            </div>

            {/* Online Now */}
            <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{totalUserCount}</p>
                <p className="text-[10px] text-slate-400">Online Now</p>
              </div>
            </div>

            {/* In-Game (Active) */}
            <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{activeNow}</p>
                <p className="text-[10px] text-slate-400">Active Rentals</p>
              </div>
            </div>

            {/* Games / Services */}
            <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">11</p>
                <p className="text-[10px] text-slate-400">Services Active</p>
              </div>
            </div>

            {/* Providers / Pool */}
            <div className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{ops?.totalAccounts ?? 40}</p>
                <p className="text-[10px] text-slate-400">Pool Accounts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Top Wagerers (Clients) Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Top Wagerers</h2>
            <p className="text-xs text-slate-400">Highest volume clients on the platform</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Showing top {topClients.length} clients
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 w-12">#</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3 text-right">Wagered</th>
                <th className="px-6 py-3 text-right">Locked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {topClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No wagerers recorded in this period.
                  </td>
                </tr>
              ) : (
                topClients.map((client: any, idx: number) => (
                  <tr key={client.userId || client.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-800'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-700'
                            : idx === 2
                            ? 'bg-amber-50 text-amber-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{client.name || client.username}</span>
                        <span className="text-[11px] text-slate-400">{client.userId || client.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">
                      ${(client.wagered ?? client.totalSpent ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-400">
                      {Number(client.locked ?? client.lockedBalance ?? 0) > 0
                        ? `$${Number(client.locked ?? client.lockedBalance ?? 0).toFixed(2)}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

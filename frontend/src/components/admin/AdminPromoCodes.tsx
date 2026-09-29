import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { PromoCode } from '../../types';
import {
  Gift,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

export const AdminPromoCodes: React.FC = () => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [rewardType, setRewardType] = useState<'CASH' | 'BONUS' | 'DISCOUNT'>('CASH');
  const [rewardValue, setRewardValue] = useState('5');
  const [currency, setCurrency] = useState('USD');
  const [maxReward, setMaxReward] = useState('100');
  const [maxUses, setMaxUses] = useState('0');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [startAt, setStartAt] = useState('2026-01-01');
  const [endAt, setEndAt] = useState('2026-12-31');
  const [submitting, setSubmitting] = useState(false);

  const loadPromos = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/promo-codes');
      setPromos(res.data || []);
    } catch (err) {
      console.error('Failed to load promo codes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleGenerateRandomCode = () => {
    const prefixes = ['DROP', 'BONUS', 'FREE', 'VIP', 'WELCOME', 'RIVO'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    setCode(`${randomPrefix}${randomNum}`);
    if (!name) setName(`${randomPrefix} $${rewardValue} Promo`);
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    setSubmitting(true);
    try {
      await API.post('/admin/promo-codes', {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        rewardType,
        rewardValue: parseFloat(rewardValue),
        currency,
        maxReward: parseFloat(maxReward),
        maxUses: parseInt(maxUses) || 0,
        perUserLimit: parseInt(perUserLimit) || 1,
        startAt: startAt ? new Date(startAt).toISOString() : null,
        endAt: endAt ? new Date(endAt).toISOString() : null,
      });

      alert('Promo code created successfully!');
      setIsAddModalOpen(false);
      setName('');
      setCode('');
      await loadPromos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create promo code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePromo = async (p: PromoCode) => {
    if (!confirm(`Delete promo code "${p.code}"?`)) return;
    try {
      await API.delete(`/admin/promo-codes/${p.id}`);
      await loadPromos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete promo code');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header matching promo add system.png */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Promo Codes</h1>
          <p className="text-xs text-slate-500 font-medium">
            Redeemable promo codes granting bonus, cash or free try.
          </p>
          <div className="text-[11px] text-slate-400 mt-0.5">Promotions · Promo Codes</div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadPromos}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              handleGenerateRandomCode();
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Promo Codes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Reward</th>
                <th className="px-6 py-3.5">Uses / Limit</th>
                <th className="px-6 py-3.5">Per-User</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No promo codes created yet. Click "+ Add" to create one.
                  </td>
                </tr>
              ) : (
                promos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {p.code}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-emerald-700">
                      ${Number(p.rewardValue || 0).toFixed(2)} {p.rewardType}
                    </td>
                    <td className="px-6 py-3.5">
                      {p.usedCount} / {p.maxUses === 0 ? '∞ Unlimited' : p.maxUses}
                    </td>
                    <td className="px-6 py-3.5">{p.perUserLimit} per user</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        Enabled
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleDeletePromo(p)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Delete promo code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal matching promo add system.png */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Add</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Redeemable promo codes granting bonus, cash or free try.
              </p>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3">
              {/* Language pill bar matching screenshot */}
              <div className="inline-flex bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                EN-US
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Name (en-US)</label>
                  <input
                    type="text"
                    required
                    placeholder="Welcome Bonus"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500">Code</label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Randomize</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="DROP100"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Reward type</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BONUS">Bonus</option>
                    <option value="DISCOUNT">Discount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Reward value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rewardValue}
                    onChange={(e) => setRewardValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Max reward ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxReward}
                    onChange={(e) => setMaxReward(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Max uses (0 = ∞)</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Per-user limit</label>
                  <input
                    type="number"
                    value={perUserLimit}
                    onChange={(e) => setPerUserLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Start at</label>
                  <input
                    type="date"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">End at</label>
                  <input
                    type="date"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

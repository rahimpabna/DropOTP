import React, { useState } from 'react';
import { API } from '../api';
import { X, CreditCard, ShieldCheck, ArrowRight, Gift, CheckCircle } from 'lucide-react';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onSuccess }) => {
  // Top category tabs matching promo code.png
  const [categoryTab, setCategoryTab] = useState<'crypto' | 'wallets' | 'cards' | 'promo'>('crypto');

  // Gateways
  const [selectedGateway, setSelectedGateway] = useState<'bkash' | 'nagad' | 'paymento' | 'maxelpay'>('maxelpay');
  const [amount, setAmount] = useState<string>('10');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Promo code tab state
  const [promoInput, setPromoInput] = useState<string>('');
  const [redeemingPromo, setRedeemingPromo] = useState<boolean>(false);

  if (!isOpen) return null;

  const isBdtGateway = selectedGateway === 'bkash' || selectedGateway === 'nagad';

  const handleDeposit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (selectedGateway === 'bkash') {
        const res = await API.post('/payments/bkash/create', { amount: parseFloat(amount) });
        if (res.data?.bkashURL) {
          window.location.href = res.data.bkashURL;
        } else {
          setError('Failed to initiate bKash payment');
        }
      } else if (selectedGateway === 'nagad') {
        const res = await API.post('/payments/nagad/create', { amount: parseFloat(amount) });
        if (res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
        } else {
          setError('Failed to initiate Nagad payment');
        }
      } else if (selectedGateway === 'paymento') {
        const res = await API.post('/payments/paymento/create', { amountUSD: parseFloat(amount) });
        if (res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
        } else {
          setError('Failed to create Paymento invoice');
        }
      } else if (selectedGateway === 'maxelpay') {
        const res = await API.post('/payments/maxelpay/create', { amountUSD: parseFloat(amount) });
        if (res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
        } else {
          setError('Failed to create Maxelpay crypto invoice');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setRedeemingPromo(true);
    setError(null);
    setPromoSuccess(null);

    try {
      const res = await API.post('/payments/redeem-promo', {
        code: promoInput.trim().toUpperCase(),
      });

      if (res.data?.success) {
        setPromoSuccess(`🎉 Success! Credited $${Number(res.data.amountGranted || 0).toFixed(2)} to your wallet!`);
        setPromoInput('');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired promotional code');
    } finally {
      setRedeemingPromo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1 mb-6">
          <p className="text-xs text-brand-700 font-semibold">Main / Payments type</p>
          <h2 className="text-2xl font-black text-brand-900 tracking-tight">Add Funds to Balance</h2>
        </div>

        {/* Top Category Tabs matching promo code.png */}
        <div className="flex items-center justify-center space-x-2 mb-6 overflow-x-auto">
          {[
            { id: 'crypto', label: 'Cryptocurrencies' },
            { id: 'wallets', label: 'E-wallets' },
            { id: 'cards', label: 'Bank cards' },
            { id: 'promo', label: 'Promo code' },
          ].map((tab) => {
            const isSelected = categoryTab === tab.id;
            const isPromo = tab.id === 'promo';
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCategoryTab(tab.id as any);
                  setError(null);
                  setPromoSuccess(null);
                  if (tab.id === 'crypto') setSelectedGateway('maxelpay');
                  if (tab.id === 'wallets') setSelectedGateway('bkash');
                  if (tab.id === 'cards') setSelectedGateway('paymento');
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm whitespace-nowrap ${
                  isSelected
                    ? isPromo
                      ? 'bg-accent-orange text-white ring-2 ring-accent-orange'
                      : 'bg-brand-700 text-white ring-2 ring-brand-700'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {promoSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{promoSuccess}</span>
          </div>
        )}

        {/* Tab 1: Promo Code Tab matching promo code.png */}
        {categoryTab === 'promo' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-brand-900">Top-up via Promotional code</h3>

            <form onSubmit={handleRedeemPromo} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="w-full bg-[#dbece3] border border-transparent rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-orange font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={redeemingPromo || !promoInput.trim()}
                className="w-full py-3.5 bg-[#e7d8cb] hover:bg-accent-orange hover:text-white text-stone-700 font-extrabold text-sm rounded-2xl shadow transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {redeemingPromo ? 'Validating code...' : 'Add Funds'}
              </button>

              <p className="text-[11px] text-slate-400 font-medium leading-relaxed pt-2">
                Always pay to the address shown in your current invoice or static wallet. Addresses may change over time, and old or third-party addresses may not be credited.
              </p>
            </form>
          </div>
        ) : (
          /* Payment Gateways View */
          <div>
            {/* Gateways for Cryptocurrencies */}
            {categoryTab === 'crypto' && (
              <div className="space-y-3 mb-5">
                <div
                  onClick={() => setSelectedGateway('maxelpay')}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    selectedGateway === 'maxelpay'
                      ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                      M
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900">Maxelpay Crypto</span>
                      <p className="text-[11px] text-slate-400">USDT, BTC, ETH, LTC & 15+ coins</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    Instant
                  </span>
                </div>
              </div>
            )}

            {/* Gateways for E-wallets */}
            {categoryTab === 'wallets' && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  onClick={() => setSelectedGateway('bkash')}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col items-center space-y-1 transition-all ${
                    selectedGateway === 'bkash'
                      ? 'bg-pink-50 border-pink-500 ring-2 ring-pink-500'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-black text-base text-pink-600">bKash</span>
                  <span className="text-[11px] text-slate-500">Automated BDT</span>
                </div>

                <div
                  onClick={() => setSelectedGateway('nagad')}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col items-center space-y-1 transition-all ${
                    selectedGateway === 'nagad'
                      ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="font-black text-base text-orange-600">Nagad</span>
                  <span className="text-[11px] text-slate-500">Automated BDT</span>
                </div>
              </div>
            )}

            {/* Gateways for Bank cards */}
            {categoryTab === 'cards' && (
              <div className="space-y-3 mb-5">
                <div
                  onClick={() => setSelectedGateway('paymento')}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    selectedGateway === 'paymento'
                      ? 'bg-emerald-50 border-brand-600 ring-2 ring-brand-600'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm">
                      P
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900">Paymento.io</span>
                      <p className="text-[11px] text-slate-400">Global Visa, Mastercard, AMEX & Cards</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    USD Global
                  </span>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Top-up Amount ({isBdtGateway ? 'BDT ৳' : 'USD $'})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  {isBdtGateway ? '৳' : '$'}
                </span>
                <input
                  type="number"
                  min={isBdtGateway ? '50' : '1'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#f8faf9] border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="Enter amount"
                />
              </div>

              {isBdtGateway && (
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  ≈ ${(parseFloat(amount || '0') / 120.0).toFixed(2)} USD (Exchange rate: 1 USD ≈ 120 BDT)
                </p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleDeposit}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full py-3.5 bg-accent-orange hover:bg-accent-orange-hover text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Redirecting to Gateway...'
                  : `Proceed to Pay (${isBdtGateway ? '৳' + amount : '$' + amount})`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center space-x-1.5 text-slate-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Secured 256-bit encrypted transaction system</span>
        </div>
      </div>
    </div>
  );
};

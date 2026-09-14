import React, { useState, useEffect } from 'react';
import { RentalSession } from '../types';
import { getServiceIconUrl } from '../utils/serviceIcons';
import {
  Clock,
  Copy,
  Check,
  XCircle,
  CheckCircle2,
  RotateCw,
  BellRing,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { API } from '../api';

interface LiveActivationsProps {
  rentals: RentalSession[];
  onCancel: (id: number) => Promise<void>;
  onComplete: (id: number) => Promise<void>;
  onRefresh: () => void;
  activeTab: 'waiting' | 'paid' | 'canceled' | 'all';
  setActiveTab: (tab: 'waiting' | 'paid' | 'canceled' | 'all') => void;
}

export const LiveActivations: React.FC<LiveActivationsProps> = ({
  rentals,
  onCancel,
  onComplete,
  onRefresh,
  activeTab,
  setActiveTab,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [recodingId, setRecodingId] = useState<number | null>(null);

  // Ticking timer for countdowns and auto-refresh when timer hits 0
  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      // Check if any waiting rental just expired right now
      const hasJustExpired = rentals.some((r) => {
        if (r.status === 'WAITING_CODE' || r.status === 'WAITING_NEXT') {
          const diff = new Date(r.expiresAt).getTime() - currentNow;
          return diff <= 0 && diff > -2000;
        }
        return false;
      });

      if (hasJustExpired) {
        onRefresh();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [rentals, onRefresh]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Request free another code (Re-code)
  const handleRecode = async (id: number) => {
    setRecodingId(id);
    try {
      await API.post(`/rentals/recode/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to request another code');
    } finally {
      setRecodingId(null);
    }
  };

  const waitingCount = rentals.filter(
    (r) => r.status === 'WAITING_CODE' || r.status === 'WAITING_NEXT'
  ).length;

  const lockedSum = rentals
    .filter((r) => r.status === 'WAITING_CODE' || r.status === 'WAITING_NEXT')
    .reduce((acc, curr) => acc + Number(curr.price), 0);

  const filteredRentals = rentals.filter((r) => {
    if (activeTab === 'waiting') return r.status === 'WAITING_CODE' || r.status === 'WAITING_NEXT';
    if (activeTab === 'paid') return r.status === 'COMPLETED';
    if (activeTab === 'canceled') return r.status === 'CANCELLED' || r.status === 'EXPIRED';
    return true;
  });

  const formatCountdown = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return '00:00 (Expired)';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-mint-border mt-6">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-brand-900 tracking-tight flex items-center space-x-2">
            <span>EMAIL HISTORY ACTIVATIONS</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time live incoming OTP codes powered by Inbound SMTP & WebSockets
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="self-start sm:self-auto text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs matching SMSBower */}
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('waiting')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'waiting'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Waiting for code ({waitingCount})
        </button>

        <button
          onClick={() => setActiveTab('paid')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'paid'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Paid only
        </button>

        <button
          onClick={() => setActiveTab('canceled')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'canceled'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Canceled only
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All mail Activations
        </button>
      </div>

      {/* Status Pill Badge */}
      <div className="mt-4 mb-4 flex">
        <span className="bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-inner">
          WAITING FOR CODE: {waitingCount} PCS / LOCKED ${lockedSum.toFixed(3)}
        </span>
      </div>

      {/* Activations List / Table */}
      {filteredRentals.length === 0 ? (
        <div className="text-center py-12 bg-[#f4fbf7] rounded-xl border border-dashed border-mint-border">
          <Clock className="w-8 h-8 text-brand-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-slate-600">No active rental orders in this tab</p>
          <p className="text-xs text-slate-400 mt-1">
            Choose a service on the left and click "BUY NOW" to receive an OTP.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRentals.map((r) => {
            const isWaiting = r.status === 'WAITING_CODE' || r.status === 'WAITING_NEXT';
            const hasCode = Boolean(r.code);

            return (
              <div
                key={r.id}
                className={`p-4 rounded-xl border transition-all ${
                  hasCode
                    ? 'bg-emerald-50/80 border-emerald-400 shadow-md ring-1 ring-emerald-300'
                    : isWaiting
                    ? 'bg-[#fafffd] border-mint-border hover:border-brand-300'
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left Info */}
                  <div className="flex items-center space-x-3">
                    {getServiceIconUrl(r.serviceCode, r.serviceItem?.name) ? (
                      <img
                        src={getServiceIconUrl(r.serviceCode, r.serviceItem?.name)!}
                        alt={r.serviceCode}
                        className="w-10 h-10 p-1.5 rounded-xl bg-white border border-slate-200 object-contain shrink-0 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-sm uppercase shrink-0">
                        {r.serviceCode.slice(0, 2)}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-800 font-mono tracking-wide">
                          {r.emailAddress}
                        </span>
                        <button
                          onClick={() => copyToClipboard(r.emailAddress, `email-${r.id}`)}
                          className="text-slate-400 hover:text-brand-700 p-1 transition-colors"
                          title="Copy Email"
                        >
                          {copiedId === `email-${r.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 font-medium">
                        <span>
                          Service: <strong className="text-slate-700 uppercase">{r.serviceCode}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Price: <strong className="text-slate-700">${Number(r.price).toFixed(3)}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-[11px] font-mono text-slate-400">ID: #{r.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Code, Magic Link & Live Status */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {hasCode ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center space-x-2 bg-emerald-100 border border-emerald-400 px-4 py-2 rounded-xl shadow-inner">
                          <BellRing className="w-4 h-4 text-emerald-700 animate-bounce" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                              Received OTP
                            </span>
                            <span className="text-xl font-black text-emerald-900 tracking-widest font-mono">
                              {r.code}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(r.code!, `code-${r.id}`)}
                            className="ml-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1 shadow transition-all"
                          >
                            {copiedId === `code-${r.id}` ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>Copy</span>
                          </button>
                        </div>

                        {/* Magic Verification Link if found */}
                        {r.verificationUrl && (
                          <a
                            href={r.verificationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Verification Link</span>
                          </a>
                        )}
                      </div>
                    ) : isWaiting ? (
                      <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span className="text-xs font-semibold text-amber-800">
                          Waiting for code...
                        </span>
                        <div className="flex items-center space-x-1 text-xs font-mono font-bold text-amber-900 ml-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{formatCountdown(r.expiresAt)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-200 text-slate-600 uppercase">
                        {r.status}
                      </span>
                    )}
                  </div>

                  {/* Right Actions: Re-code / Complete / Cancel */}
                  <div className="flex items-center space-x-2">
                    {hasCode && isWaiting && (
                      <button
                        onClick={() => handleRecode(r.id)}
                        disabled={recodingId === r.id}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1 shadow transition-all"
                        title="Free second OTP code within rental time window"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${recodingId === r.id ? 'animate-spin' : ''}`} />
                        <span>Re-code</span>
                      </button>
                    )}

                    {isWaiting && hasCode && (
                      <button
                        onClick={() => onComplete(r.id)}
                        className="bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center space-x-1 shadow transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </button>
                    )}

                    {isWaiting && !hasCode && (
                      <button
                        onClick={() => onCancel(r.id)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel & Refund</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../api';
import { EmailAccount } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  X,
  Download,
  Filter,
} from 'lucide-react';

interface LiveCheckProgressModalProps {
  isOpen: boolean;
  accountsToCheck: EmailAccount[];
  onClose: () => void;
  onFinished?: () => void;
}

interface CheckResultItem {
  id: string;
  email: string;
  provider: string;
  proxyUrl?: string;
  status: 'PENDING' | 'CHECKING' | 'LIVE' | 'FAILED';
  latencyMs?: number;
  error?: string;
}

export const LiveCheckProgressModal: React.FC<LiveCheckProgressModalProps> = ({
  isOpen,
  accountsToCheck,
  onClose,
  onFinished,
}) => {
  const [items, setItems] = useState<CheckResultItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const stopRequestedRef = useRef(false);

  // Initialize accounts list
  useEffect(() => {
    if (isOpen && accountsToCheck.length > 0) {
      setItems(
        accountsToCheck.map((acc) => ({
          id: acc.id,
          email: acc.email,
          provider: acc.provider,
          proxyUrl: acc.proxyUrl,
          status: 'PENDING',
        }))
      );
      setCurrentIndex(0);
      stopRequestedRef.current = false;
      startLiveCheck(accountsToCheck);
    }
  }, [isOpen, accountsToCheck]);

  const startLiveCheck = async (accounts: EmailAccount[]) => {
    setIsChecking(true);
    stopRequestedRef.current = false;

    for (let i = 0; i < accounts.length; i++) {
      if (stopRequestedRef.current) break;

      const acc = accounts[i];
      setCurrentIndex(i + 1);

      // Mark current as CHECKING
      setItems((prev) =>
        prev.map((item) => (item.id === acc.id ? { ...item, status: 'CHECKING' } : item))
      );

      const startTime = Date.now();
      try {
        const res = await API.post(`/admin/email-pool/${acc.id}/live-check`);
        const latencyMs = Date.now() - startTime;
        const isLive = res.data?.live === true || res.data?.success === true;
        const err = res.data?.error || (isLive ? undefined : 'Connection or authentication failed');

        setItems((prev) =>
          prev.map((item) =>
            item.id === acc.id
              ? {
                  ...item,
                  status: isLive ? 'LIVE' : 'FAILED',
                  latencyMs,
                  error: err,
                }
              : item
          )
        );
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        setItems((prev) =>
          prev.map((item) =>
            item.id === acc.id
              ? {
                  ...item,
                  status: 'FAILED',
                  latencyMs,
                  error: err.response?.data?.error || err.message || 'Check request failed',
                }
              : item
          )
        );
      }

      // Small 150ms delay between checks to keep UI reactive
      await new Promise((r) => setTimeout(r, 150));
    }

    setIsChecking(false);
    if (onFinished) onFinished();
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    setIsChecking(false);
  };

  if (!isOpen) return null;

  const total = items.length;
  const liveCount = items.filter((i) => i.status === 'LIVE').length;
  const failedCount = items.filter((i) => i.status === 'FAILED').length;
  const pendingCount = items.filter((i) => i.status === 'PENDING').length;
  const completedCount = liveCount + failedCount;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const downloadFailedList = () => {
    const failedList = items
      .filter((i) => i.status === 'FAILED')
      .map((i) => `${i.email},${i.error || 'Connection failed'}`)
      .join('\n');
    const blob = new Blob([failedList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_email_accounts_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] space-y-5 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Live IMAP / SMTP Inspection
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Testing mailbox connectivity, credential validity, and proxy routing in real time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isChecking}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Progress Bar & Stats */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>
              Checking:{' '}
              <strong className="text-teal-700">
                {completedCount} / {total} accounts ({progressPercent}%)
              </strong>
            </span>
            <span className="flex items-center space-x-1.5 text-xs text-slate-500">
              {isChecking ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span className="text-teal-700 font-bold">Inspection Running...</span>
                </>
              ) : (
                <span className="text-emerald-700 font-bold">Inspection Completed</span>
              )}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-600 to-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center text-xs">
            <div className="bg-white rounded-xl p-2 border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Total</span>
              <span className="text-sm font-black text-slate-900">{total}</span>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 font-bold block uppercase">Live</span>
              <span className="text-sm font-black text-emerald-700">{liveCount}</span>
            </div>
            <div className="bg-rose-50 rounded-xl p-2 border border-rose-200">
              <span className="text-[10px] text-rose-700 font-bold block uppercase">Failed</span>
              <span className="text-sm font-black text-rose-700">{failedCount}</span>
            </div>
            <div className="bg-slate-100 rounded-xl p-2 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Pending</span>
              <span className="text-sm font-black text-slate-600">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Live List with Status */}
        <div className="flex-1 overflow-y-auto max-h-72 border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white shadow-inner">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`p-3 text-xs flex items-center justify-between transition-colors ${
                item.status === 'CHECKING'
                  ? 'bg-teal-50/60 font-semibold'
                  : item.status === 'LIVE'
                  ? 'hover:bg-emerald-50/30'
                  : item.status === 'FAILED'
                  ? 'bg-rose-50/20'
                  : 'text-slate-500'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate pr-2">
                <span className="w-5 text-[10px] text-slate-400 font-mono text-right shrink-0">
                  {idx + 1}.
                </span>
                <div className="truncate">
                  <span className="font-bold text-slate-900 block truncate">{item.email}</span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Provider: {item.provider} {item.proxyUrl ? `• Proxy: ${item.proxyUrl}` : '• Direct'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {item.latencyMs !== undefined && (
                  <span className="text-[10px] font-mono text-slate-500">
                    {item.latencyMs}ms
                  </span>
                )}

                {item.status === 'CHECKING' && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Checking...</span>
                  </span>
                )}

                {item.status === 'LIVE' && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>LIVE</span>
                  </span>
                )}

                {item.status === 'FAILED' && (
                  <span
                    title={item.error}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800"
                  >
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>FAILED</span>
                  </span>
                )}

                {item.status === 'PENDING' && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Pending</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            {failedCount > 0 && !isChecking && (
              <button
                type="button"
                onClick={downloadFailedList}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Failed List ({failedCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isChecking ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow"
              >
                Stop Check
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow"
              >
                Close Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

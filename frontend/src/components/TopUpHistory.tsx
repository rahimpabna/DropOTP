import React, { useState, useEffect } from 'react';
import { API } from '../api';
import { FileCheck, Search, Eye, EyeOff, RotateCcw } from 'lucide-react';

export const TopUpHistory: React.FC = () => {
  const [topups, setTopups] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [showFilterCard, setShowFilterCard] = useState(true);
  const [status, setStatus] = useState('ALL');
  const [gateway, setGateway] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.append('status', status);
      if (gateway !== 'ALL') {
        params.append('paymentType', gateway.toUpperCase());
        params.append('gateway', gateway.toUpperCase());
      }
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('page', page.toString());
      params.append('limit', rowsPerPage.toString());

      const res = await API.get(`/payments/user-topups?${params.toString()}`);
      setTopups(res.data.items || res.data.orders || []);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load top up history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, rowsPerPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHistory();
  };

  const handleReset = () => {
    setStatus('ALL');
    setGateway('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    loadHistory();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Centered Title matching user-topup history.png */}
      <div className="text-center space-y-2">
        <p className="text-xs text-brand-700 font-semibold">Main / Top up history</p>
        <div className="flex items-center justify-center space-x-2">
          <FileCheck className="w-6 h-6 text-brand-700" />
          <h1 className="text-2xl font-black text-brand-900 tracking-tight">
            TOP UP HISTORY
          </h1>
        </div>
      </div>

      {/* Filter Card matching user-topup history.png */}
      <div className="bg-[#e9f4ee] rounded-2xl border border-[#badacb] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilterCard(!showFilterCard)}
              className="flex items-center space-x-1 px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow hover:bg-emerald-800 transition-all"
            >
              {showFilterCard ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showFilterCard ? 'HIDE' : 'SHOW'}</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>
          </div>

          <button
            onClick={handleSearch}
            className="flex items-center space-x-1 px-4 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow hover:bg-emerald-800 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>SEARCH</span>
          </button>
        </div>

        {showFilterCard && (
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">Status</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment type</label>
              <select
                value={gateway}
                onChange={(e) => setGateway(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">Payment type</option>
                <option value="bkash">bKash (BDT)</option>
                <option value="nagad">Nagad (BDT)</option>
                <option value="paymento">Paymento (USD)</option>
                <option value="maxelpay">Maxelpay (Crypto)</option>
                <option value="promo">Promo Code</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Date from</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Date to</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </form>
        )}
      </div>

      {/* History Table matching user-topup history.png */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#e9f4ee] text-slate-600 font-bold uppercase tracking-wider border-b border-[#badacb]">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Top up sum</th>
                <th className="px-6 py-3.5">Amount to currency</th>
                <th className="px-6 py-3.5">Top up type</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {topups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No data for table
                  </td>
                </tr>
              ) : (
                topups.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 font-medium">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {t.currency === 'BDT' ? `৳${Number(t.amount || 0).toFixed(2)}` : `$${Number(t.amount || 0).toFixed(2)}`}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-emerald-700">
                      ${(t.currency === 'BDT' ? Number(t.amount || 0) / 120.0 : Number(t.amount || 0)).toFixed(2)} USD
                    </td>
                    <td className="px-6 py-3.5 font-bold uppercase text-slate-700">
                      {t.gateway}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          t.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
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

        {/* Rows per page & Pagination matching screenshot */}
        <div className="px-6 py-4 border-t border-slate-200 bg-[#f4fbf7] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center space-x-2">
            <span>Number of rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400">(Total: {totalCount} records)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100"
            >
              Previous
            </button>
            <span className="px-2 text-slate-800">
              Page {page} of {Math.max(1, Math.ceil(totalCount / rowsPerPage))}
            </span>
            <button
              onClick={() => setPage((p) => (page * rowsPerPage < totalCount ? p + 1 : p))}
              disabled={page * rowsPerPage >= totalCount}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

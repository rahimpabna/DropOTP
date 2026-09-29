import React, { useEffect, useState } from 'react';
import { API } from '../api';
import { RentalSession, LedgerTransaction } from '../types';
import {
  FileText,
  Copy,
  Check,
  DollarSign,
  RefreshCw,
  Search,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';

export const HistoryPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<'activations' | 'ledger'>('activations');

  // Activations state
  const [statusTab, setStatusTab] = useState<'all' | 'waiting' | 'paid' | 'canceled'>('all');
  const [rentals, setRentals] = useState<RentalSession[]>([]);
  const [totalRentals, setTotalRentals] = useState(0);
  const [service, setService] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilterCard, setShowFilterCard] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Ledger state
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);

  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'activations') {
        const params = new URLSearchParams();
        params.append('statusTab', statusTab);
        if (service !== 'ALL') params.append('service', service);
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        params.append('page', page.toString());
        params.append('limit', rowsPerPage.toString());

        const res = await API.get(`/rentals/history?${params.toString()}`);
        setRentals(res.data.items || []);
        setTotalRentals(res.data.total || 0);
      } else {
        const res = await API.get('/payments/transactions');
        setTransactions(res.data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subTab, statusTab, page, rowsPerPage]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleReset = () => {
    setService('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    loadData();
  };

  const handleDownloadCsv = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    params.append('statusTab', statusTab);
    if (service !== 'ALL') params.append('service', service);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (token) params.append('token', token);

    window.open(`/api/rentals/history/export-csv?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Toggle Switch */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSubTab('activations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'activations'
                ? 'bg-brand-700 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Activations History
          </button>
          <button
            onClick={() => setSubTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              subTab === 'ledger'
                ? 'bg-brand-700 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Wallet Ledger</span>
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {subTab === 'activations' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Centered Title matching Emails.png */}
          <div className="text-center space-y-2">
            <p className="text-xs text-brand-700 font-semibold">Main / Mail history</p>
            <div className="flex items-center justify-center space-x-2">
              <FileText className="w-6 h-6 text-brand-700" />
              <h1 className="text-2xl font-black text-brand-900 tracking-tight">
                EMAIL HISTORY ACTIVATIONS
              </h1>
            </div>

            {/* Toggle Pill */}
            <div className="inline-flex bg-brand-700 text-white rounded-xl px-4 py-1.5 text-xs font-bold shadow-sm">
              Mail history
            </div>

            {/* Sub-Tabs */}
            <div className="flex items-center justify-center space-x-6 text-xs font-bold pt-2 border-b border-brand-200">
              {[
                { id: 'waiting', label: 'Waiting for code' },
                { id: 'paid', label: 'Paid only' },
                { id: 'canceled', label: 'Canceled only' },
                { id: 'all', label: 'All mail Activations' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusTab(tab.id as any);
                    setPage(1);
                  }}
                  className={`pb-2.5 transition-all border-b-2 ${
                    statusTab === tab.id
                      ? 'border-brand-700 text-brand-800 font-black'
                      : 'border-transparent text-slate-500 hover:text-brand-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Card matching Emails.png */}
          <div className="bg-[#e9f4ee] rounded-2xl border border-[#badacb] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilterCard(!showFilterCard)}
                  className="flex items-center space-x-1 px-3 py-1 bg-brand-700 text-white rounded-lg text-xs font-bold shadow hover:bg-brand-800 transition-all"
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

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSearch}
                  className="flex items-center space-x-1 px-4 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow hover:bg-emerald-800 transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>SEARCH</span>
                </button>
                <button
                  onClick={handleDownloadCsv}
                  className="flex items-center space-x-1 px-4 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow hover:bg-emerald-800 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD CSV</span>
                </button>
              </div>
            </div>

            {showFilterCard && (
              <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Service</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="ALL">All Services</option>
                    <option value="telegram">Telegram</option>
                    <option value="google">Google / Gmail</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="other">Any Other Service</option>
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

          {/* Table matching Emails.png */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#e9f4ee] text-slate-600 font-bold uppercase tracking-wider border-b border-[#badacb]">
                  <tr>
                    <th className="px-6 py-3.5 w-12">#</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Service</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Mail</th>
                    <th className="px-6 py-3.5">Code</th>
                    <th className="px-6 py-3.5 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {rentals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                        No data for table
                      </td>
                    </tr>
                  ) : (
                    rentals.map((sess, idx) => (
                      <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 text-slate-400">
                          {(page - 1) * rowsPerPage + idx + 1}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500">
                          {new Date(sess.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900 uppercase">
                          {sess.serviceCode}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              sess.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sess.status === 'WAITING_CODE' || sess.status === 'WAITING_NEXT'
                                ? 'bg-blue-100 text-blue-800'
                                : sess.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sess.status === 'COMPLETED'
                              ? 'Paid'
                              : sess.status === 'WAITING_CODE'
                              ? 'Waiting for code'
                              : sess.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-900 font-bold">
                          <div className="flex items-center space-x-1.5">
                            <span>{sess.emailAddress}</span>
                            <button
                              onClick={() => copyText(sess.emailAddress, `hist-m-${sess.id}`)}
                              className="text-slate-400 hover:text-brand-700"
                            >
                              {copiedId === `hist-m-${sess.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          {sess.code ? (
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                {sess.code}
                              </span>
                              {sess.verificationUrl && (
                                <a
                                  href={sess.verificationUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Open Verification URL"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                          ${Number(sess.price || 0).toFixed(4)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Rows per page */}
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
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-slate-400">(Total: {totalRentals} activations)</span>
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
                  Page {page} of {Math.max(1, Math.ceil(totalRentals / rowsPerPage))}
                </span>
                <button
                  onClick={() => setPage((p) => (page * rowsPerPage < totalRentals ? p + 1 : p))}
                  disabled={page * rowsPerPage >= totalRentals}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Ledger Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8faf9] text-slate-500 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Balance After</th>
                <th className="p-3.5">Reference</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          tx.type === 'CREDIT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.type === 'DEBIT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`p-3.5 font-mono font-bold ${
                        tx.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-800'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}${Number(tx.amount).toFixed(4)}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 font-medium">
                      ${Number(tx.balanceAfter).toFixed(4)}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 uppercase">
                      {tx.referenceType}
                    </td>
                    <td className="p-3.5 text-slate-700">{tx.description}</td>
                    <td className="p-3.5 text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

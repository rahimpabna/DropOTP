import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { RentalSession } from '../../types';
import { getServiceIconUrl } from '../../utils/serviceIcons';
import {
  FileText,
  Search,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const AdminEmailsHistory: React.FC = () => {
  const [sessions, setSessions] = useState<RentalSession[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [servicesList, setServicesList] = useState<{ id?: string; name: string; code: string }[]>([]);

  // Status Tab
  const [statusTab, setStatusTab] = useState<'all' | 'waiting' | 'paid' | 'canceled'>('all');

  // Filter Card State
  const [showFilterCard, setShowFilterCard] = useState(true);
  const [service, setService] = useState('ALL');
  const [customStatus, setCustomStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    API.get('/rentals/services')
      .then((res) => {
        const list = res.data.services || res.data || [];
        setServicesList(list);
      })
      .catch(() => {
        API.get('/admin/services')
          .then((res) => setServicesList(res.data.services || res.data || []))
          .catch(() => {});
      });
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('statusTab', statusTab);
      if (service !== 'ALL') params.append('service', service);
      if (customStatus !== 'ALL') params.append('status', customStatus);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('page', page.toString());
      params.append('limit', rowsPerPage.toString());

      const res = await API.get(`/admin/emails-history?${params.toString()}`);
      setSessions(res.data.sessions || res.data.items || []);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load email activations history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [statusTab, page, rowsPerPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHistory();
  };

  const handleReset = () => {
    setService('ALL');
    setCustomStatus('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    loadHistory();
  };

  const handleDownloadCsv = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    params.append('statusTab', statusTab);
    if (service !== 'ALL') params.append('service', service);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (token) params.append('token', token);

    window.open(`/api/admin/emails-history/export-csv?${params.toString()}`, '_blank');
  };

  return (
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

        {/* Status Sub-Tabs */}
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
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Service</label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Services</option>
                {servicesList.map((svc) => (
                  <option key={svc.code || svc.name} value={svc.code || svc.name}>
                    {svc.name} ({svc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
              <select
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="WAITING_CODE">Waiting for code</option>
                <option value="COMPLETED">Completed (Paid)</option>
                <option value="CANCELLED">Canceled</option>
                <option value="EXPIRED">Expired</option>
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

      {/* History Activations Table matching Emails.png */}
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
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No data for table
                  </td>
                </tr>
              ) : (
                sessions.map((sess, idx) => (
                  <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 text-slate-400">
                      {(page - 1) * rowsPerPage + idx + 1}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(sess.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-2">
                        {getServiceIconUrl(sess.serviceCode, sess.serviceItem?.name) ? (
                          <img
                            src={getServiceIconUrl(sess.serviceCode, sess.serviceItem?.name)!}
                            alt={sess.serviceCode}
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="font-bold text-slate-900 capitalize">
                          {sess.serviceItem?.name || sess.serviceCode}
                        </span>
                      </div>
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
                          ? 'Paid (Completed)'
                          : sess.status === 'WAITING_CODE'
                          ? 'Waiting for code'
                          : sess.status === 'WAITING_NEXT'
                          ? 'Waiting next code'
                          : sess.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-900 font-bold">
                      {sess.emailAddress}
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
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Open Verification URL"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">Waiting...</span>
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

        {/* Pagination & Rows per page matching Emails.png */}
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
            <span className="text-slate-400">(Total: {totalCount} activations)</span>
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

import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { EmailAccount } from '../../types';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UploadCloud,
  ArrowUpDown,
  CheckSquare,
  Square,
  Edit,
  Repeat,
  ShieldCheck,
  Download,
  FileText,
} from 'lucide-react';
import { LiveCheckProgressModal } from './LiveCheckProgressModal';
import { useDialog } from '../../context/DialogContext';

export const AdminAccountsPool: React.FC = () => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [provider, setProvider] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Multi-selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isExclusive, setIsExclusive] = useState(false);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);

  // Single Action Loading State
  const { showAlert, showConfirm } = useDialog();
  const [isLiveCheckModalOpen, setIsLiveCheckModalOpen] = useState(false);
  const [liveCheckAccounts, setLiveCheckAccounts] = useState<EmailAccount[]>([]);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [replaceModalAccount, setReplaceModalAccount] = useState<EmailAccount | null>(null);
  const [replaceNewEmailText, setReplaceNewEmailText] = useState('');

  // Edit Account State
  const [editModalAccount, setEditModalAccount] = useState<EmailAccount | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editProxyUrl, setEditProxyUrl] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'DEAD' | 'CHECKING' | 'BUSY'>('ACTIVE');
  const [editBlockedServices, setEditBlockedServices] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (provider !== 'ALL') params.append('provider', provider);
      if (status !== 'ALL') params.append('status', status);
      if (search) params.append('search', search);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('page', page.toString());
      params.append('limit', rowsPerPage.toString());

      const res = await API.get(`/admin/email-pool?${params.toString()}`);
      setAccounts(res.data.accounts || []);
      setTotalCount(res.data.total || 0);
      setSelectedIds([]); // reset selection on re-query
    } catch (err) {
      console.error('Failed to load email pool', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [page, rowsPerPage, provider, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAccounts();
  };

  const handleResetFilters = () => {
    setProvider('ALL');
    setStatus('ALL');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.length === accounts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(accounts.map((a) => a.id));
    }
  };

  const handleSelectEntirePool = async () => {
    try {
      setBulkActionLoading(true);
      const res = await API.get('/admin/email-pool?limit=10000');
      const allAccs = res.data.accounts || [];
      setSelectedIds(allAccs.map((a: any) => a.id));
    } catch (e) {
      console.error(e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'live_check' | 'delete' | 'set_active' | 'set_dead') => {
    if (selectedIds.length === 0) return;

    if (action === 'live_check') {
      const selectedAccs = accounts.filter((a) => selectedIds.includes(a.id));
      if (selectedAccs.length > 0) {
        setLiveCheckAccounts(selectedAccs);
        setIsLiveCheckModalOpen(true);
      }
      return;
    }

    if (action === 'delete') {
      const confirmed = await showConfirm(
        `Are you sure you want to permanently delete ${selectedIds.length} accounts?`,
        'Delete Accounts',
        'danger'
      );
      if (!confirmed) return;
    }

    setBulkActionLoading(true);
    try {
      let reqAction = action;
      let targetStatus = undefined;
      if (action === 'set_active') {
        reqAction = 'set_status' as any;
        targetStatus = 'ACTIVE';
      } else if (action === 'set_dead') {
        reqAction = 'set_status' as any;
        targetStatus = 'DEAD';
      }

      await API.post('/admin/email-pool/bulk-action', {
        action: reqAction,
        ids: selectedIds,
        accountIds: selectedIds,
        targetStatus,
      });

      await loadAccounts();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Bulk action failed', 'Error', 'danger');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Single Row Actions
  const handleLiveCheckSingle = (account: EmailAccount) => {
    setLiveCheckAccounts([account]);
    setIsLiveCheckModalOpen(true);
  };

  const handleDeleteSingle = async (account: EmailAccount) => {
    const confirmed = await showConfirm(
      `Delete email account ${account.email}?`,
      'Delete Email Account',
      'danger'
    );
    if (!confirmed) return;
    try {
      await API.delete(`/admin/email-pool/${account.id}`);
      await loadAccounts();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to delete account', 'Error', 'danger');
    }
  };

  const openEditModal = (acc: EmailAccount) => {
    setEditModalAccount(acc);
    setEditPassword('');
    setEditProxyUrl(acc.proxyUrl || '');
    setEditStatus(acc.status);
    setEditBlockedServices((acc.blockedServices || []).join('|'));
  };

  const handleSaveEditAccount = async () => {
    if (!editModalAccount) return;
    setEditSaving(true);
    try {
      const payload: any = {
        status: editStatus,
        proxyUrl: editProxyUrl || null,
        blockedServices: editBlockedServices ? editBlockedServices.split(/[|,]/).map((s) => s.trim()).filter(Boolean) : [],
      };
      if (editPassword.trim()) payload.password = editPassword.trim();

      await API.put(`/admin/email-pool/${editModalAccount.id}`, payload);
      await showAlert('Email account updated successfully!', 'Success', 'success');
      setEditModalAccount(null);
      await loadAccounts();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to update account', 'Error', 'danger');
    } finally {
      setEditSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleReplaceAccount = async () => {
    if (!replaceModalAccount || !replaceNewEmailText.trim()) return;
    try {
      await API.post(`/admin/email-pool/${replaceModalAccount.id}/replace`, {
        replacementLine: replaceNewEmailText.trim(),
      });
      await showAlert('Account replaced successfully!', 'Success', 'success');
      setReplaceModalAccount(null);
      setReplaceNewEmailText('');
      await loadAccounts();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to replace account', 'Error', 'danger');
    }
  };

  // Bulk Upload
  const handleBulkUpload = async () => {
    if (!bulkText.trim()) return;
    setBulkUploadLoading(true);
    try {
      const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
      const res = await API.post('/admin/email-pool/bulk-upload', {
        rawText: bulkText,
        lines,
        isExclusive,
      });
      await showAlert(`Uploaded! Added: ${res.data.imported || 0}, Errors: ${res.data.errors?.length || 0}`, 'Bulk Upload Completed', 'success');
      setBulkText('');
      setIsBulkModalOpen(false);
      await loadAccounts();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Bulk upload failed', 'Error', 'danger');
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const handleDownloadExampleFile = () => {
    const exampleContent = `email,apppw,Proxy,block_service
srichai081964@gmail.com,uzrgafejufdtjzew,http://user:pass@gw.dataimpulse.com:823,Biglion|Claude|Hinge
gwacdagwagwalada@gmail.com,fcaxmjywltibzpqo,http://user:pass@gw.dataimpulse.com:823,OLX
k.newphama@gmail.com,pcrrnvlpdqmeczuj,http://user:pass@gw.dataimpulse.com:823,Leboncoin|Oxinchain
masayakubu2026@gmail.com,sffsivkfgfpxxezm,http://user:pass@gw.dataimpulse.com:823,Leboncoin|Oxinchain
user_all_services@gmail.com,abcd efgh ijkl mnop,,
`;
    const blob = new Blob([exampleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'upload_email_list.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">📧 Email Accounts Pool</h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage Gmail, Outlook, Yahoo, GMX, AOL & custom SMTP/IMAP credentials pool
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Bulk Upload Accounts</span>
          </button>

          <button
            onClick={loadAccounts}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Provider Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Providers</option>
              <option value="GMAIL">Gmail</option>
              <option value="OUTLOOK">Outlook / Hotmail</option>
              <option value="YAHOO">Yahoo</option>
              <option value="AOL">AOL</option>
              <option value="GMX">GMX</option>
              <option value="CUSTOM">Custom Domain Mail</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE (Live)</option>
              <option value="DEAD">DEAD (Failed check)</option>
              <option value="BUSY">BUSY (In Rental)</option>
              <option value="CHECKING">CHECKING</option>
            </select>
          </div>

          {/* Email Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Email / Domain Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="search email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Date from</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Date to</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Action Buttons in row */}
          <div className="lg:col-span-5 flex justify-end items-center space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow transition-all"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-100/70 px-4 py-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            {selectedIds.length === accounts.length && accounts.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-brand-700" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'Select All on Page'}
            </span>
          </button>

          {totalCount > accounts.length && (
            <button
              onClick={handleSelectEntirePool}
              disabled={bulkActionLoading}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200 transition-all"
            >
              Select All {totalCount} Accounts in Pool
            </button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2 animate-in fade-in">
            <span className="text-xs text-slate-500 font-semibold">Bulk Actions:</span>
            <button
              onClick={() => handleBulkAction('live_check')}
              disabled={bulkActionLoading}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              Live Check ({selectedIds.length})
            </button>
            <button
              onClick={() => handleBulkAction('set_active')}
              disabled={bulkActionLoading}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              Set Active
            </button>
            <button
              onClick={() => handleBulkAction('set_dead')}
              disabled={bulkActionLoading}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              Set Dead
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              Delete ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Table System View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-3.5">Email / Credentials</th>
                <th className="px-4 py-3.5">Provider</th>
                <th className="px-4 py-3.5">IMAP Host:Port</th>
                <th className="px-4 py-3.5">Proxy</th>
                <th className="px-4 py-3.5">Blocked Services</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last Checked</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No email accounts match your filter.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  const isSelected = selectedIds.includes(acc.id);
                  return (
                    <tr
                      key={acc.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelectRow(acc.id)}
                          className="text-slate-400 hover:text-brand-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-700" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{acc.email}</span>
                          <span className="text-[10px] text-slate-400">
                            Created: {new Date(acc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {acc.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {acc.imapHost}:{acc.imapPort}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {acc.proxyUrl ? acc.proxyUrl.replace(/:\/\/[^@]+@/, '://***@') : 'Direct (No Proxy)'}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        {acc.blockedServices && acc.blockedServices.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {acc.blockedServices.map((srv, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                              >
                                {srv}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            All Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            acc.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : acc.status === 'DEAD'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {acc.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3" />}
                          {acc.status === 'DEAD' && <XCircle className="w-3 h-3" />}
                          <span>{acc.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-400">
                        {acc.lastCheckedAt
                          ? new Date(acc.lastCheckedAt).toLocaleString()
                          : 'Not checked'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center space-x-1">
                          {/* Live check button */}
                          <button
                            onClick={() => handleLiveCheckSingle(acc)}
                            disabled={checkingId === acc.id}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Live check IMAP"
                          >
                            <ShieldCheck className={`w-4 h-4 ${checkingId === acc.id ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(acc)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Edit Account"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Replace button */}
                          <button
                            onClick={() => setReplaceModalAccount(acc)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Replace Account"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteSingle(acc)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Rows per page & Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center space-x-2">
            <span>Number of rows per page:</span>
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
            <span className="text-slate-400">
              (Total: {totalCount} accounts)
            </span>
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

      {/* Bulk Upload Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Bulk Upload Email Accounts</h3>
                <p className="text-xs text-slate-500">
                  Format: <code>email,apppw,Proxy,block_service</code>
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-dashed border-brand-400 bg-brand-50/50 hover:bg-brand-50 text-brand-700 text-xs font-bold cursor-pointer transition-all">
                  <UploadCloud className="w-4 h-4" />
                  <span>Load from .txt / .csv File</span>
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleDownloadExampleFile}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm"
                  title="Download sample format file"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Example (.txt)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkText(`email,apppw,Proxy,block_service
srichai081964@gmail.com,uzrgafejufdtjzew,http://user:pass@gw.dataimpulse.com:823,Biglion|Claude|Hinge
gwacdagwagwalada@gmail.com,fcaxmjywltibzpqo,http://user:pass@gw.dataimpulse.com:823,OLX
k.newphama@gmail.com,pcrrnvlpdqmeczuj,http://user:pass@gw.dataimpulse.com:823,Leboncoin|Oxinchain
user_all_services@gmail.com,abcd efgh ijkl mnop,,`);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all"
                  title="Paste template into box"
                >
                  Load Sample
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                Single or multi-service names separated by |
              </span>
            </div>

            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`email,apppw,Proxy,block_service\nsrichai081964@gmail.com,uzrgafejufdtjzew,http://user:pass@gw.dataimpulse.com:823,Biglion|Claude|Hinge\ngwacdagwagwalada@gmail.com,fcaxmjywltibzpqo,http://user:pass@gw.dataimpulse.com:823,\nk.newphama@gmail.com,pcrrnvlpdqmeczuj,http://user:pass@gw.dataimpulse.com:823,Leboncoin|Oxinchain`}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-700">📌 Blocked Services Rules:</p>
              <p>• If an email has single or pipe-separated services (e.g. <code>Biglion|Claude|Hinge</code> or <code>OLX</code>), those services will be <strong>blocked</strong> for that email.</p>
              <p>• For other services, this email remains active and usable.</p>
              <p>• If left blank, <strong>all services</strong> are active for that email.</p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                id="exclusiveCheck"
                checked={isExclusive}
                onChange={(e) => setIsExclusive(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="exclusiveCheck">
                Exclusive Accounts (Dedicate each account exclusively to one customer)
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={bulkUploadLoading}
                className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow"
              >
                {bulkUploadLoading ? 'Importing...' : 'Upload Accounts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editModalAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit Email Account</h3>
                <p className="text-xs text-slate-500 font-mono">{editModalAccount.email}</p>
              </div>
              <button
                onClick={() => setEditModalAccount(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DEAD">DEAD</option>
                  <option value="BUSY">BUSY</option>
                  <option value="CHECKING">CHECKING</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Proxy URL (optional)
                </label>
                <input
                  type="text"
                  placeholder="http://user:pass@host:port"
                  value={editProxyUrl}
                  onChange={(e) => setEditProxyUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Blocked Services (pipe-separated e.g. Biglion|Claude|Hinge)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Biglion|Claude|Hinge or OLX"
                  value={editBlockedServices}
                  onChange={(e) => setEditBlockedServices(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave empty if all services are allowed for this email account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Update App Password (leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditModalAccount(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditAccount}
                disabled={editSaving}
                className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Account Modal */}
      {replaceModalAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Replace Email Account</h3>
                <p className="text-xs text-slate-500">
                  Replacing: <span className="font-bold text-slate-800">{replaceModalAccount.email}</span>
                </p>
              </div>
              <button
                onClick={() => setReplaceModalAccount(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Account Credentials Line:
              </label>
              <input
                type="text"
                placeholder="newemail@domain.com:password"
                value={replaceNewEmailText}
                onChange={(e) => setReplaceNewEmailText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              The old account will be permanently marked DEAD or removed, and all active rentals will transition seamlessly to the new account.
            </p>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setReplaceModalAccount(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleReplaceAccount}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Confirm Replacement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Check Progress Modal */}
      <LiveCheckProgressModal
        isOpen={isLiveCheckModalOpen}
        accountsToCheck={liveCheckAccounts}
        onClose={() => setIsLiveCheckModalOpen(false)}
        onFinished={() => {
          loadAccounts();
        }}
      />
    </div>
  );
};

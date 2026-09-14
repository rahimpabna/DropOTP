import React, { useState } from 'react';
import { AdminOverview } from './admin/AdminOverview';
import { AdminAccountsPool } from './admin/AdminAccountsPool';
import { AdminServices } from './admin/AdminServices';
import { AdminUsers } from './admin/AdminUsers';
import { AdminPromoCodes } from './admin/AdminPromoCodes';
import { AdminEmailsHistory } from './admin/AdminEmailsHistory';
import { AdminCms } from './admin/AdminCms';
import { AdminMailSettings } from './admin/AdminMailSettings';
import { AdminWebmail } from './admin/AdminWebmail';
import {
  LayoutDashboard,
  Mail,
  Sliders,
  Users,
  Gift,
  FileText,
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  FileEdit,
  Send,
  Inbox,
} from 'lucide-react';
import { API } from '../api';
import { DomainItem } from '../types';
import { useDialog } from '../context/DialogContext';

export const AdminPanel: React.FC = () => {
  const { showAlert, showConfirm } = useDialog();
  const getInitialAdminTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('admin/')) {
      const sub = hash.replace('admin/', '');
      if (['overview', 'email-pool', 'services', 'domains', 'cms', 'mail', 'mail-settings', 'users', 'promos', 'emails'].includes(sub)) {
        return (sub === 'mail-settings' ? 'mail' : sub) as any;
      }
    }
    return 'overview';
  };

  const [adminTab, setAdminTabState] = useState<
    'overview' | 'email-pool' | 'services' | 'domains' | 'users' | 'promos' | 'emails' | 'cms' | 'mail'
  >(getInitialAdminTab);

  const setAdminTab = (tab: 'overview' | 'email-pool' | 'services' | 'domains' | 'users' | 'promos' | 'emails' | 'cms' | 'mail') => {
    setAdminTabState(tab);
    window.location.hash = `admin/${tab}`;
  };

  // Domains state for the domains tab
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainPrice, setNewDomainPrice] = useState('0.05');
  const [newDomainPrivate, setNewDomainPrivate] = useState(false);
  const [domainLoading, setDomainLoading] = useState(false);

  const loadDomains = async () => {
    setDomainLoading(true);
    try {
      const res = await API.get('/admin/domains');
      setDomains(res.data || []);
    } catch (err) {
      console.error('Failed to load domains', err);
    } finally {
      setDomainLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    try {
      await API.post('/admin/domains', {
        domainName: newDomainName.trim().toLowerCase(),
        defaultPrice: parseFloat(newDomainPrice),
        isPrivate: newDomainPrivate,
      });
      await showAlert('Domain added successfully!', 'Success', 'success');
      setNewDomainName('');
      await loadDomains();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to add domain', 'Error', 'danger');
    }
  };

  const handleDeleteDomain = async (id: string, name: string) => {
    const ok = await showConfirm(`Delete domain ${name}?`, 'Delete Domain', 'danger');
    if (!ok) return;
    try {
      await API.delete(`/admin/domains/${id}`);
      await loadDomains();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to delete domain', 'Error', 'danger');
    }
  };

  React.useEffect(() => {
    if (adminTab === 'domains') {
      loadDomains();
    }
  }, [adminTab]);

  return (
    <div className="space-y-6">
      {/* Admin Tab Navigation Bar - All Options Visible in Clean Grid / Flex */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex flex-wrap items-center gap-1.5 sm:gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'email-pool', label: 'Email Pool', icon: Mail },
          { id: 'services', label: 'Services', icon: Sliders },
          { id: 'domains', label: 'Catch-All Domains', icon: Globe },
          { id: 'cms', label: 'Site Content & CMS', icon: FileEdit },
          { id: 'mail', label: 'Webmail & Campaigns', icon: Inbox },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'promos', label: 'Promo Codes', icon: Gift },
          { id: 'emails', label: 'Email History', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = adminTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setAdminTab(item.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {adminTab === 'overview' && <AdminOverview />}
      {adminTab === 'email-pool' && <AdminAccountsPool />}
      {adminTab === 'services' && <AdminServices />}
      {adminTab === 'cms' && <AdminCms />}
      {adminTab === 'mail' && <AdminWebmail />}
      {adminTab === 'users' && <AdminUsers />}
      {adminTab === 'promos' && <AdminPromoCodes />}
      {adminTab === 'emails' && <AdminEmailsHistory />}

      {/* Catch-All Domains Tab */}
      {adminTab === 'domains' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Catch-All Domains</h1>
              <p className="text-xs text-slate-500 font-medium">
                Hosted Port 25 Inbound SMTP Domains for Infinite Random Aliases
              </p>
            </div>

            <button
              onClick={loadDomains}
              disabled={domainLoading}
              className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${domainLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Add Domain Form */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900">Add Inbound Domain</h2>
              <form onSubmit={handleAddDomain} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Domain Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dropotp.com"
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Default Rental Price ($)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={newDomainPrice}
                    onChange={(e) => setNewDomainPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="privateCheck"
                    checked={newDomainPrivate}
                    onChange={(e) => setNewDomainPrivate(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="privateCheck" className="text-xs font-semibold text-slate-700">
                    Private Domain (Exclusive to VIPs)
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Domain</span>
                </button>
              </form>
            </div>

            {/* Domains List */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-sm text-slate-900">
                Active Hosted Domains ({domains.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Domain</th>
                      <th className="px-6 py-3.5">Price</th>
                      <th className="px-6 py-3.5">Privacy</th>
                      <th className="px-6 py-3.5">Total Orders</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {domains.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-brand-700" />
                          <span>{d.domainName}</span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-800">${Number(d.defaultPrice || 0).toFixed(4)}</td>
                        <td className="px-6 py-3.5">
                          {d.isPrivate ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Private
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Public Shared
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-slate-600">
                          {d._count?.rentalSessions || 0}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteDomain(d.id, d.domainName)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

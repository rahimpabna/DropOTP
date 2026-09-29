import React, { useState, useEffect, useMemo } from 'react';
import { API } from '../../api';
import { ServiceItem, BlockedServiceRule } from '../../types';
import {
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  Check,
  X,
  RefreshCw,
  Link,
  Code,
  Zap,
  Sliders,
  Percent,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckSquare,
  Square,
  Search,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { getServiceIconUrl } from '../../utils/serviceIcons';
import { useDialog } from '../../context/DialogContext';

export const AdminServices: React.FC = () => {
  const { showAlert, showConfirm } = useDialog();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [blockedRules, setBlockedRules] = useState<BlockedServiceRule[]>([]);
  const [loading, setLoading] = useState(false);

  // Selection & Bulk Multi-Service Price Auto % System
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [percentageInput, setPercentageInput] = useState<string>('10');
  const [fixedPriceInput, setFixedPriceInput] = useState<string>('0.05');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Edit / Add Service Modal
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('mail');
  const [formBasePrice, setFormBasePrice] = useState('0.05');
  const [formOtpPattern, setFormOtpPattern] = useState('\\b\\d{4,8}\\b');
  const [formExtractUrl, setFormExtractUrl] = useState(true);
  const [formPriorityMode, setFormPriorityMode] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  // Add Blocked Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [rulePattern, setRulePattern] = useState('');
  const [ruleReason, setRuleReason] = useState('High value service protected from generic other selection');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        API.get('/admin/services'),
        API.get('/admin/blocked-rules'),
      ]);
      setServices(sRes.data || []);
      setBlockedRules(rRes.data || []);
    } catch (err) {
      console.error('Failed to load services & rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.isActive) ||
        (statusFilter === 'inactive' && !s.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedServiceIds.length === filteredServices.length && filteredServices.length > 0) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(filteredServices.map((s) => s.id));
    }
  };

  const toggleSelectService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectActiveOnly = () => {
    setSelectedServiceIds(services.filter((s) => s.isActive).map((s) => s.id));
  };

  // Bulk Price Adjust: Auto % or Fixed Price
  const handleBulkAdjust = async (percentage?: number, fixedPrice?: number) => {
    const targetIds = selectedServiceIds.length > 0 ? selectedServiceIds : services.map((s) => s.id);
    if (targetIds.length === 0) {
      await showAlert('No services selected or available to adjust.', 'Notice', 'info');
      return;
    }

    const confirmMsg =
      percentage !== undefined
        ? `Adjust prices by ${percentage > 0 ? '+' : ''}${percentage}% for ${targetIds.length} service(s)?`
        : `Set base price to $${fixedPrice} for ${targetIds.length} service(s)?`;

    const ok = await showConfirm(confirmMsg, 'Confirm Price Adjustment', 'warning');
    if (!ok) return;

    setBulkLoading(true);
    try {
      const res = await API.post('/admin/services/bulk-price-adjust', {
        serviceIds: targetIds,
        percentage,
        fixedPrice,
      });
      await showAlert(`Success! Updated prices for ${res.data.updatedCount} services.`, 'Prices Updated', 'success');
      await loadData();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to adjust prices', 'Error', 'danger');
    } finally {
      setBulkLoading(false);
    }
  };

  // Sync all 114 services from seeds
  const handleSyncAllServices = async () => {
    const ok = await showConfirm(
      'Sync all 114 SMSBower services catalog into the system? Existing configurations and prices will be retained.',
      'Sync Services Catalog',
      'info'
    );
    if (!ok) return;

    setSyncLoading(true);
    try {
      const res = await API.post('/admin/services/sync-all-services');
      await showAlert(
        `Catalog Sync Complete!\n- Newly Added: ${res.data.added}\n- Updated: ${res.data.updated}\n- Total in Database: ${res.data.total}`,
        'Catalog Synced',
        'success'
      );
      await loadData();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to sync services', 'Error', 'danger');
    } finally {
      setSyncLoading(false);
    }
  };

  const openAddServiceModal = () => {
    setEditingService(null);
    setFormCode('');
    setFormName('');
    setFormIcon('mail');
    setFormBasePrice('0.05');
    setFormOtpPattern('\\b\\d{4,8}\\b');
    setFormExtractUrl(true);
    setFormPriorityMode(false);
    setFormIsActive(true);
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (s: ServiceItem) => {
    setEditingService(s);
    setFormCode(s.code);
    setFormName(s.name);
    setFormIcon(s.icon || 'mail');
    setFormBasePrice(s.basePrice.toString());
    setFormOtpPattern(s.otpPattern || '\\b\\d{4,8}\\b');
    setFormExtractUrl(s.extractUrl ?? true);
    setFormPriorityMode(s.priorityMode ? true : false);
    setFormIsActive(s.isActive ?? true);
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formCode.toLowerCase().trim(),
        name: formName.trim(),
        icon: formIcon.trim(),
        basePrice: parseFloat(formBasePrice),
        otpPattern: formOtpPattern.trim() || null,
        extractUrl: formExtractUrl,
        priorityMode: formPriorityMode ? 1 : 0,
        isActive: formIsActive,
      };

      if (editingService) {
        await API.put(`/admin/services/${editingService.id}`, payload);
      } else {
        await API.post('/admin/services', payload);
      }

      setIsServiceModalOpen(false);
      await showAlert('Service saved successfully!', 'Saved', 'success');
      await loadData();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to save service', 'Error', 'danger');
    }
  };

  const handleDeleteService = async (s: ServiceItem) => {
    const ok = await showConfirm(`Delete service "${s.name}" (${s.code})?`, 'Delete Service', 'danger');
    if (!ok) return;
    try {
      await API.delete(`/admin/services/${s.id}`);
      await loadData();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to delete service', 'Error', 'danger');
    }
  };

  const handleAddBlockedRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !rulePattern.trim()) return;
    try {
      await API.post('/admin/blocked-rules', {
        keyword: (rulePattern || ruleName).trim(),
        serviceName: ruleName.trim(),
        matchPattern: rulePattern.trim(),
        reason: ruleReason.trim(),
      });
      setIsRuleModalOpen(false);
      setRuleName('');
      setRulePattern('');
      await showAlert('Blocked service rule added successfully!', 'Rule Created', 'success');
      await loadData();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to add blocked rule', 'Error', 'danger');
    }
  };

  const handleDeleteBlockedRule = async (ruleId: string) => {
    const ok = await showConfirm('Remove this blocked service rule?', 'Delete Rule', 'danger');
    if (!ok) return;
    try {
      await API.delete(`/admin/blocked-rules/${ruleId}`);
      await loadData();
    } catch (err: any) {
      await showAlert(err.response?.data?.error || 'Failed to delete rule', 'Error', 'danger');
    }
  };

  const isAllSelected = filteredServices.length > 0 && selectedServiceIds.length === filteredServices.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Services Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Services Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {services.length} Total Services
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Configure all 114 services, bulk automated % pricing, OTP regex, priority queues, and security
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Sync 114 Services button */}
          <button
            onClick={handleSyncAllServices}
            disabled={syncLoading}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            title="Import/Sync all 114 services from master catalog"
          >
            <Database className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
            <span>{syncLoading ? 'Syncing Catalog...' : 'Sync All 114 Services'}</span>
          </button>

          {/* Add Single Service */}
          <button
            onClick={openAddServiceModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Multi-Service Price Auto % & Bulk Adjustment System */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 shadow-xl text-white border border-slate-700 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-white uppercase flex items-center space-x-2">
                <span>Multi-Service Price Auto % System</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  Bulk Controller
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Instantly adjust prices for multiple services via auto % markup / markdown or fixed values
              </p>
            </div>
          </div>

          {/* Target Indicator & Selection Helpers */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-600 font-semibold text-slate-200">
              Target:{' '}
              <strong className="text-emerald-400">
                {selectedServiceIds.length > 0
                  ? `${selectedServiceIds.length} selected service(s)`
                  : `ALL ${services.length} services`}
              </strong>
            </span>
            {selectedServiceIds.length > 0 && (
              <button
                onClick={() => setSelectedServiceIds([])}
                className="text-[11px] text-rose-300 hover:text-rose-100 underline px-1"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Quick Percentage Presets & Custom Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Quick Presets */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Auto % Presets
            </label>
            <div className="flex items-center flex-wrap gap-1.5">
              {[5, 10, 20, 50].map((pct) => (
                <button
                  key={`plus-${pct}`}
                  onClick={() => handleBulkAdjust(pct)}
                  disabled={bulkLoading}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white rounded-lg text-xs font-bold transition-all"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+{pct}%</span>
                </button>
              ))}

              {[-5, -10, -20].map((pct) => (
                <button
                  key={`minus-${pct}`}
                  onClick={() => handleBulkAdjust(pct)}
                  disabled={bulkLoading}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-600/30 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white rounded-lg text-xs font-bold transition-all"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>{pct}%</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom % Form */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Custom % Markup / Markdown
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 15 or -10"
                  value={percentageInput}
                  onChange={(e) => setPercentageInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-bold placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
              </div>
              <button
                onClick={() => handleBulkAdjust(parseFloat(percentageInput))}
                disabled={bulkLoading || !percentageInput}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-lg text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                Apply %
              </button>
            </div>
          </div>

          {/* Fixed Price Form */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Set Fixed Base Price
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.05"
                  value={fixedPriceInput}
                  onChange={(e) => setFixedPriceInput(e.target.value)}
                  className="w-full pl-6 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-bold placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <button
                onClick={() => handleBulkAdjust(undefined, parseFloat(fixedPriceInput))}
                disabled={bulkLoading || !fixedPriceInput}
                className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                Set Fixed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Services Search, Filters & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name or code (e.g. biglion, claude, olx)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-bold text-slate-600">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                All ({services.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Active ({services.filter((s) => s.isActive).length})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'inactive' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Inactive ({services.filter((s) => !s.isActive).length})
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
            >
              {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-brand-600" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isAllSelected ? 'Deselect All' : 'Select All Filtered'}</span>
            </button>
            <button
              onClick={selectActiveOnly}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
            >
              Select Active
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">Service</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Base Price</th>
                <th className="px-4 py-3.5">OTP Pattern / Regex</th>
                <th className="px-4 py-3.5">URL Extract</th>
                <th className="px-4 py-3.5">Priority Mode</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No services found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredServices.map((s) => {
                  const isSelected = selectedServiceIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectService(s.id)}
                          className="rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                            {getServiceIconUrl(s.code, s.name) ? (
                              <img
                                src={getServiceIconUrl(s.code, s.name)!}
                                alt={s.name}
                                className="w-5 h-5 object-contain"
                              />
                            ) : (
                              <span className="font-bold text-xs text-slate-700 uppercase">
                                {s.code.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-slate-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">{s.code}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                        ${Number(s.basePrice || 0).toFixed(4)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 bg-slate-50 rounded px-2">
                        {s.otpPattern || 'Default (\\b\\d{4,8}\\b)'}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.extractUrl ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            <Link className="w-3 h-3" />
                            <span>Enabled</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Disabled</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.priorityMode ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            <Zap className="w-3 h-3" />
                            <span>High Priority</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => openEditServiceModal(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                            title="Edit Service"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(s)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Service"
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
      </div>

      {/* Global Blocked Service Rules for "Any Other Service" (Anti-Abuse) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">
                Global Blocked Service Rules (Anti-Abuse Protection)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Protects against users buying generic "Any Other Service" to sneak OTPs for high-value services (Google, Telegram, WhatsApp, etc.)
            </p>
          </div>

          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Blocked Rule</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {blockedRules.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 col-span-full text-center">
              No blocked service rules defined yet.
            </p>
          ) : (
            blockedRules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{rule.serviceName}</span>
                    <p className="text-[11px] font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {rule.matchPattern}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteBlockedRule(rule.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remove rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">{rule.reason || 'No description'}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Service Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingService}
                    placeholder="telegram, google, etc."
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Telegram Messenger"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Icon identifier</label>
                  <input
                    type="text"
                    placeholder="telegram, google, mail, etc."
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Custom OTP Pattern / Regex (Optional)
                </label>
                <input
                  type="text"
                  placeholder="\b\d{4,8}\b or G-\d{6}"
                  value={formOtpPattern}
                  onChange={(e) => setFormOtpPattern(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formExtractUrl}
                    onChange={(e) => setFormExtractUrl(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Extract Magic Link Verification URL if email has no digits</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPriorityMode}
                    onChange={(e) => setFormPriorityMode(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Priority Queue Processing (Checks IMAP every 2.5s)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Service is Active and visible to users</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Blocked Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Add Blocked Service Rule</h3>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBlockedRule} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, Telegram, OpenAI"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Sender Match Pattern / Regex
                </label>
                <input
                  type="text"
                  required
                  placeholder="google\.com|accounts\.google|telegram"
                  value={rulePattern}
                  onChange={(e) => setRulePattern(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={ruleReason}
                  onChange={(e) => setRuleReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Add Blocked Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../api';
import { useDialog } from '../../context/DialogContext';
import {
  Inbox,
  Send,
  PlusCircle,
  Megaphone,
  RefreshCw,
  Mail,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Filter,
  Shield,
  ExternalLink,
  Paperclip,
  X,
  Code,
  Eye,
  File,
  Trash2,
} from 'lucide-react';
import { AdminMailSettings } from './AdminMailSettings';

interface AttachedFile {
  filename: string;
  content: string; // base64
  encoding: 'base64';
  contentType: string;
  size: number;
}

export const AdminWebmail: React.FC = () => {
  const { showAlert, showConfirm } = useDialog();

  // Active sub-tab: 'inbox' | 'compose' | 'campaign' | 'settings'
  const [subTab, setSubTab] = useState<'inbox' | 'compose' | 'campaign' | 'settings'>('inbox');

  // Selected mailbox filter: 'all' | 'info@dropotp.com' | 'admin@dropotp.com' | 'support@dropotp.com'
  const [activeMailbox, setActiveMailbox] = useState<string>('all');

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Message preview drawer / modal
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  // Compose State
  const [composeFrom, setComposeFrom] = useState('admin@dropotp.com');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeIsHtml, setComposeIsHtml] = useState(false);
  const [composeAttachments, setComposeAttachments] = useState<AttachedFile[]>([]);
  const [sendingSingle, setSendingSingle] = useState(false);
  const composeFileInputRef = useRef<HTMLInputElement>(null);

  // Campaign State
  const [campaignFrom, setCampaignFrom] = useState('info@dropotp.com');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignIsHtml, setCampaignIsHtml] = useState(false);
  const [campaignAttachments, setCampaignAttachments] = useState<AttachedFile[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<'ALL' | 'ACTIVE'>('ALL');
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignResult, setCampaignResult] = useState<any | null>(null);
  const campaignFileInputRef = useRef<HTMLInputElement>(null);

  const [perPage, setPerPage] = useState(25);

  const fetchMessages = async (p = page, q = search, mb = activeMailbox, l = perPage) => {
    setLoading(true);
    try {
      const res = await API.get('/admin/mailbox/messages', {
        params: {
          mailbox: mb,
          page: p,
          limit: l,
          search: q,
        },
      });
      if (res.data?.success) {
        setMessages(res.data.messages || []);
        setTotalMessages(res.data.total || 0);
        setUnreadMessages(res.data.unreadCount || 0);
        setTotalPages(res.data.totalPages || 1);
        setPage(res.data.page || 1);
      }
    } catch (err: any) {
      console.error('Failed to load mailbox messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'inbox') {
      fetchMessages(1, search, activeMailbox, perPage);
    }
  }, [subTab, activeMailbox, perPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(1, search, activeMailbox, perPage);
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = await showConfirm(
      'Are you sure you want to delete this message permanently?',
      'Delete Email',
      'warning'
    );
    if (!confirmed) return;

    try {
      await API.post('/admin/mailbox/delete', { id: msgId });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      setTotalMessages((t) => Math.max(0, t - 1));
      if (selectedMessage?.id === msgId) {
        setSelectedMessage(null);
      }
      showAlert('Message deleted permanently.', 'Deleted', 'success');
    } catch (err: any) {
      showAlert(err.response?.data?.error || err.message, 'Delete Failed', 'error');
    }
  };

  // Mark message as read when clicked
  const handleOpenMessage = async (msg: any) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      try {
        await API.post('/admin/mailbox/mark-read', { id: msg.id });
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
        );
        setUnreadMessages((c) => Math.max(0, c - 1));
      } catch (e) {
        console.warn('Failed to mark read', e);
      }
    }
  };

  // Convert uploaded file to base64
  const processFiles = (files: FileList | null): Promise<AttachedFile[]> => {
    if (!files || files.length === 0) return Promise.resolve([]);
    const promises: Promise<AttachedFile>[] = Array.from(files).map((file) => {
      return new Promise<AttachedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1] || '';
          resolve({
            filename: file.name,
            content: base64String,
            encoding: 'base64',
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    return Promise.all(promises);
  };

  const handleComposeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = await processFiles(e.target.files);
    setComposeAttachments((prev) => [...prev, ...newFiles]);
    if (e.target) e.target.value = '';
  };

  const handleCampaignFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = await processFiles(e.target.files);
    setCampaignAttachments((prev) => [...prev, ...newFiles]);
    if (e.target) e.target.value = '';
  };

  const handleSendSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      await showAlert('Please fill out recipient email, subject, and message content.', 'Required Fields', 'error');
      return;
    }
    setSendingSingle(true);
    try {
      const htmlContent = composeIsHtml
        ? composeBody
        : `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${composeBody.replace(/\n/g, '<br>')}
            <br><br>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #64748b;">
              Sent from <strong>${composeFrom}</strong> • DropOTP Platform
            </p>
          </div>`;

      const res = await API.post('/admin/mailbox/send', {
        fromAddress: composeFrom,
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        text: composeIsHtml ? composeBody.replace(/<[^>]*>?/gm, '') : composeBody,
        html: htmlContent,
        attachments: composeAttachments,
      });

      if (res.data?.success) {
        await showAlert(`Email successfully dispatched from ${composeFrom} to ${composeTo} via ${res.data.provider}!`, 'Sent', 'success');
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeAttachments([]);
        setSubTab('inbox');
        fetchMessages(1, '', activeMailbox);
      } else {
        await showAlert(`Failed to send email: ${res.data?.error || 'Unknown error'}`, 'Dispatch Failed', 'error');
      }
    } catch (err: any) {
      await showAlert(err.response?.data?.error || err.message, 'Send Error', 'error');
    } finally {
      setSendingSingle(false);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignSubject || !campaignBody) {
      await showAlert('Please enter campaign subject and content.', 'Required Fields', 'error');
      return;
    }

    const confirmed = await showConfirm(
      `Are you sure you want to broadcast this campaign to ALL registered platform users?`,
      'Confirm Email Broadcast',
      'warning'
    );
    if (!confirmed) return;

    setSendingCampaign(true);
    setCampaignResult(null);
    try {
      const baseHtml = campaignIsHtml
        ? campaignBody
        : `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: #065f46; padding: 24px; text-align: center; color: #ffffff;">
              <img src="https://dropotp.com/logo-transparent.png" alt="DropOTP" style="height: 40px; margin-bottom: 8px;" />
              <h2 style="margin: 0; font-size: 20px; font-weight: 800;">DropOTP Platform Notification</h2>
            </div>
            <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
              <p>Hello <strong>{{username}}</strong>,</p>
              ${campaignBody.replace(/\n/g, '<br>')}
            </div>
            <div style="background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              © 2026 DropOTP.com • Temporary & Dedicated OTP SaaS Platform
            </div>
          </div>
        `;

      const res = await API.post('/admin/mailbox/campaign', {
        fromAddress: campaignFrom,
        subject: campaignSubject.trim(),
        filter: campaignFilter,
        text: campaignIsHtml ? campaignBody.replace(/<[^>]*>?/gm, '') : campaignBody,
        html: baseHtml,
        attachments: campaignAttachments,
      });

      setCampaignResult(res.data);
      if (res.data?.success) {
        await showAlert(res.data.message, 'Campaign Broadcasted', 'success');
        setCampaignAttachments([]);
      } else {
        await showAlert(res.data?.error || 'Campaign failed', 'Broadcast Failed', 'error');
      }
    } catch (err: any) {
      await showAlert(err.response?.data?.error || err.message, 'Broadcast Error', 'error');
    } finally {
      setSendingCampaign(false);
    }
  };

  const getRecipientBadge = (email: string) => {
    const e = (email || '').toLowerCase();
    if (e.includes('info@dropotp.com')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">info@</span>;
    }
    if (e.includes('admin@dropotp.com')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">admin@</span>;
    }
    if (e.includes('support@dropotp.com')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">support@</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{email}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 mb-1">
            <Mail className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Official Webmail & Campaigns</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Mailbox Management & Outbound Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Read, receive, reply, and broadcast emails for <strong>info@dropotp.com</strong>, <strong>admin@dropotp.com</strong>, and <strong>support@dropotp.com</strong>.
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setSubTab('inbox')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'inbox' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Inbox {unreadMessages > 0 ? `(${unreadMessages})` : ''}</span>
          </button>

          <button
            onClick={() => setSubTab('compose')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'compose' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose</span>
          </button>

          <button
            onClick={() => setSubTab('campaign')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'campaign' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Campaign</span>
          </button>

          <button
            onClick={() => setSubTab('settings')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>SMTP Settings</span>
          </button>
        </div>
      </div>

      {/* SUBTAB: INBOX */}
      {subTab === 'inbox' && (
        <div className="space-y-4">
          {/* Controls Bar: Mailbox Filters & Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Mailbox Selector Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
              {[
                { id: 'all', label: 'All Inboxes' },
                { id: 'info@dropotp.com', label: 'info@dropotp.com' },
                { id: 'admin@dropotp.com', label: 'admin@dropotp.com' },
                { id: 'support@dropotp.com', label: 'support@dropotp.com' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveMailbox(item.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeMailbox === item.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Search & Refresh */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search sender, subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </form>

              <button
                onClick={() => fetchMessages(page, search, activeMailbox)}
                disabled={loading}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                title="Refresh Inbox"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Email Messages Table / List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading && messages.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs">Loading mailbox messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Inbox className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No emails in this mailbox</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Incoming messages sent to <strong>info@dropotp.com</strong>, <strong>admin@dropotp.com</strong>, or <strong>support@dropotp.com</strong> will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {messages.map((msg) => {
                  const isSent = (msg.subject || '').startsWith('[SENT]');
                    const isUnread = !isSent && !msg.isRead;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleOpenMessage(msg)}
                        className={`p-4 hover:bg-emerald-50/40 cursor-pointer transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3 group ${
                          isUnread ? 'bg-emerald-50/20 font-semibold' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className="mt-0.5 relative">
                            {isSent ? (
                              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Send className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Mail className="w-4 h-4" />
                              </span>
                            )}
                            {isUnread && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {getRecipientBadge(msg.recipientEmail)}
                              <span className={`text-xs truncate ${isUnread ? 'font-black text-slate-950' : 'font-semibold text-slate-800'}`}>
                                {msg.senderEmail}
                              </span>
                              {isUnread && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                                  New
                                </span>
                              )}
                            </div>
                            <h4 className={`text-sm truncate group-hover:text-emerald-700 transition-colors ${isUnread ? 'font-black text-slate-950' : 'font-medium text-slate-800'}`}>
                              {msg.subject || '(No Subject)'}
                            </h4>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {msg.textBody || msg.htmlBody?.replace(/<[^>]*>?/gm, '') || 'No content preview'}
                            </p>
                          </div>
                        </div>

                      <div className="flex items-center space-x-3 text-right shrink-0">
                        {msg.extractedCode && (
                          <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-mono font-bold">
                            OTP: {msg.extractedCode}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(msg.receivedAt).toLocaleDateString()}{' '}
                          {new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMessage(msg.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center space-x-3">
                <span>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalMessages} total)
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-400">Show:</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value, 10);
                      setPerPage(newLimit);
                      setPage(1);
                      fetchMessages(1, search, activeMailbox, newLimit);
                    }}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      if (page > 1) {
                        setPage(page - 1);
                        fetchMessages(page - 1, search, activeMailbox, perPage);
                      }
                    }}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      if (page < totalPages) {
                        setPage(page + 1);
                        fetchMessages(page + 1, search, activeMailbox, perPage);
                      }
                    }}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: COMPOSE */}
      {subTab === 'compose' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <span>Compose Official Message</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Send an email directly from your DropOTP verified domains to customers or partners.
            </p>
          </div>

          <form onSubmit={handleSendSingle} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">From Address</label>
                <select
                  value={composeFrom}
                  onChange={(e) => setComposeFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="info@dropotp.com">info@dropotp.com (Platform Info)</option>
                  <option value="admin@dropotp.com">admin@dropotp.com (Admin Office)</option>
                  <option value="support@dropotp.com">support@dropotp.com (Customer Support)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Recipient (To Email)</label>
                <input
                  type="email"
                  required
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Subject</label>
              <input
                type="text"
                required
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Important update regarding your DropOTP account"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Message Body</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setComposeIsHtml(!composeIsHtml)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      composeIsHtml
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{composeIsHtml ? 'HTML Mode: ON' : 'HTML Mode: OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => composeFileInputRef.current?.click()}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach Files</span>
                  </button>
                </div>
              </div>

              <input
                type="file"
                multiple
                ref={composeFileInputRef}
                onChange={handleComposeFileUpload}
                className="hidden"
              />

              <textarea
                required
                rows={8}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder={
                  composeIsHtml
                    ? "<h1>Welcome</h1><p>Write your HTML email template here with tables, styles, buttons...</p>"
                    : "Write your email content here..."
                }
                className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed ${
                  composeIsHtml ? 'font-mono text-[11px]' : 'font-sans'
                }`}
              />

              {/* Attachments Preview */}
              {composeAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {composeAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs text-slate-800 border border-slate-200 font-medium"
                    >
                      <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[180px]">{att.filename}</span>
                      <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                      <button
                        type="button"
                        onClick={() =>
                          setComposeAttachments((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-0.5 hover:bg-slate-300 rounded text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSubTab('inbox')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingSingle}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-2"
              >
                <Send className={`w-3.5 h-3.5 ${sendingSingle ? 'animate-spin' : ''}`} />
                <span>{sendingSingle ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB: CAMPAIGN */}
      {subTab === 'campaign' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-emerald-600" />
              <span>Bulk Email Campaign Broadcast</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Send marketing announcements, service updates, and discount codes to all registered platform users.
            </p>
          </div>

          <form onSubmit={handleSendCampaign} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">From Address</label>
                <select
                  value={campaignFrom}
                  onChange={(e) => setCampaignFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="info@dropotp.com">info@dropotp.com (Official Announcement)</option>
                  <option value="admin@dropotp.com">admin@dropotp.com (Platform Admin)</option>
                  <option value="support@dropotp.com">support@dropotp.com (Support Team)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Audience Target</label>
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Registered Users</option>
                  <option value="ACTIVE">Only Active Users</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Campaign Subject</label>
              <input
                type="text"
                required
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
                placeholder="🔥 Special Promotion: 20% Extra Balance on All Top-Ups!"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <label className="block text-xs font-bold text-slate-700">Campaign Content</label>
                  <span className="text-[11px] text-emerald-600 font-medium">Variable: {'{{username}}'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCampaignIsHtml(!campaignIsHtml)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      campaignIsHtml
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>{campaignIsHtml ? 'HTML Mode: ON' : 'HTML Mode: OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => campaignFileInputRef.current?.click()}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach Files</span>
                  </button>
                </div>
              </div>

              <input
                type="file"
                multiple
                ref={campaignFileInputRef}
                onChange={handleCampaignFileUpload}
                className="hidden"
              />

              <textarea
                required
                rows={9}
                value={campaignBody}
                onChange={(e) => setCampaignBody(e.target.value)}
                placeholder={
                  campaignIsHtml
                    ? "<div><h1>Hello {{username}},</h1><p>Design rich custom HTML campaigns here...</p></div>"
                    : "Write your campaign message. You can use {{username}} which will automatically be replaced with each user's username..."
                }
                className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed ${
                  campaignIsHtml ? 'font-mono text-[11px]' : 'font-sans'
                }`}
              />

              {/* Attachments Preview */}
              {campaignAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {campaignAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs text-slate-800 border border-slate-200 font-medium"
                    >
                      <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[180px]">{att.filename}</span>
                      <span className="text-[10px] text-slate-400">({Math.round(att.size / 1024)} KB)</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCampaignAttachments((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-0.5 hover:bg-slate-300 rounded text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {campaignResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{campaignResult.message}</span>
                </p>
                <p className="text-[11px] text-emerald-700">
                  Total Users: {campaignResult.totalUsers} • Delivered: {campaignResult.sentCount} • Failed: {campaignResult.failCount}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="submit"
                disabled={sendingCampaign}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-2"
              >
                <Megaphone className={`w-3.5 h-3.5 ${sendingCampaign ? 'animate-pulse' : ''}`} />
                <span>{sendingCampaign ? 'Broadcasting...' : 'Broadcast Campaign to All Users'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB: SETTINGS */}
      {subTab === 'settings' && <AdminMailSettings />}

      {/* Message Reader Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="flex items-center space-x-2 mb-1.5">
                  {getRecipientBadge(selectedMessage.recipientEmail)}
                  <span className="text-xs text-slate-500 font-medium">From: {selectedMessage.senderEmail}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedMessage.subject || '(No Subject)'}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Received at: {new Date(selectedMessage.receivedAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {selectedMessage.extractedCode && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Extracted OTP Code</span>
                  <span className="text-lg font-mono font-black text-emerald-700">
                    {selectedMessage.extractedCode}
                  </span>
                </div>
              )}

              {selectedMessage.htmlBody ? (
                <div
                  className="prose prose-sm max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }}
                />
              ) : (
                <div className="text-sm font-sans whitespace-pre-wrap text-slate-800 leading-relaxed">
                  {selectedMessage.textBody || '(Empty body)'}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const replyTo = selectedMessage.senderEmail;
                    const replySubject = `Re: ${selectedMessage.subject || ''}`;
                    setComposeTo(replyTo);
                    setComposeSubject(replySubject);
                    setSelectedMessage(null);
                    setSubTab('compose');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
                <button
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

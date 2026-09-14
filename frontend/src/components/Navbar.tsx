import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  PlusCircle,
  Shield,
  Key,
  LogOut,
  User as UserIcon,
  ExternalLink,
  Settings,
  Receipt,
  HelpCircle,
  Gift,
  Menu,
  X,
  ArrowLeftRight,
} from 'lucide-react';

export type NavTabType =
  | 'home'
  | 'rentals'
  | 'history'
  | 'topups'
  | 'api-docs'
  | 'faq'
  | 'partners'
  | 'contact'
  | 'privacy'
  | 'public-offer'
  | 'admin';

interface NavbarProps {
  onOpenTopUp: () => void;
  onOpenApiSettings: () => void;
  onOpenSettings: () => void;
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTopUp,
  onOpenApiSettings,
  onOpenSettings,
  activeTab,
  setActiveTab,
  onOpenAuth,
}) => {
  const { user, logout, isImpersonating, returnToAdmin } = useAuth();
  const [userDropdown, setUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40">
      {/* Admin Impersonation Top Banner */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-4 h-4 animate-pulse" />
            <span>
              Admin Impersonation Active: You are browsing as{' '}
              <strong className="underline">{user?.email || 'User'}</strong>
            </span>
          </div>
          <button
            onClick={returnToAdmin}
            className="px-3.5 py-1 bg-white text-slate-950 rounded-lg text-xs font-black shadow hover:bg-slate-100 transition-all hover:scale-105 active:scale-95"
          >
            ← Return to Admin Panel
          </button>
        </div>
      )}

      {/* Main Navbar Header */}
      <header className="bg-[#d0eade] border-b border-[#badacb] shadow-sm relative z-30">
        <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Desktop Nav */}
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-2 cursor-pointer select-none group py-1 shrink-0"
            >
              <img
                src="/logo.svg"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo-transparent.png';
                }}
                alt="DropOTP"
                className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </div>

            <nav className="hidden lg:flex items-center space-x-1 shrink-0">
              <button
                onClick={() => setActiveTab('rentals')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'rentals'
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-brand-900 hover:bg-[#c2e4d4]'
                }`}
              >
                E-mail's
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'history'
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-brand-900 hover:bg-[#c2e4d4]'
                }`}
              >
                Histories
              </button>

              <button
                onClick={() => setActiveTab('topups')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'topups'
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-brand-900 hover:bg-[#c2e4d4]'
                }`}
              >
                Top Up History
              </button>

              <button
                onClick={() => setActiveTab('api-docs')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap shrink-0 flex items-center space-x-1 ${
                  activeTab === 'api-docs'
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-brand-900 hover:bg-[#c2e4d4]'
                }`}
              >
                <span>API Docs</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 shrink-0" />
              </button>

              <button
                onClick={() => setActiveTab('faq')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'faq'
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-brand-900 hover:bg-[#c2e4d4]'
                }`}
              >
                FAQ
              </button>

              <button
                onClick={() => setActiveTab('partners')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'partners'
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-brand-900 hover:bg-[#c2e4d4]'
                }`}
              >
                Partners
              </button>

              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center space-x-1 transition-all whitespace-nowrap shrink-0 ${
                    activeTab === 'admin'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Admin Panel</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Actions: Balance, Add Funds, Profile */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                {/* Balance Badge */}
                <div className="hidden sm:flex items-center bg-white/80 border border-brand-200 px-3.5 py-1.5 rounded-full shadow-inner">
                  <span className="text-xs text-slate-500 mr-1.5 font-medium">Balance:</span>
                  <span className="text-sm font-bold text-brand-800">
                    ${Number(user.wallet?.balance || 0).toFixed(4)}
                  </span>
                  {user.wallet && Number(user.wallet.reservedBalance || 0) > 0 && (
                    <span className="ml-2 text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                      ${Number(user.wallet.reservedBalance || 0).toFixed(2)} held
                    </span>
                  )}
                </div>

                {/* Add Funds Button (Orange) */}
                <button
                  onClick={onOpenTopUp}
                  className="flex items-center space-x-1.5 bg-accent-orange hover:bg-accent-orange-hover text-white text-sm font-bold px-4 py-2 rounded-lg shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add funds</span>
                </button>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdown(!userDropdown)}
                    className="w-10 h-10 rounded-full bg-brand-800 text-white font-bold flex items-center justify-center hover:bg-brand-900 transition-colors shadow-sm"
                  >
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </button>

                  {userDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setUserDropdown(false);
                          setActiveTab('rentals');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Rent E-mail's</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdown(false);
                          setActiveTab('api-docs');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>API Documentation</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdown(false);
                          onOpenSettings();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Account Settings</span>
                      </button>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        onClick={() => {
                          setUserDropdown(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-brand-900 hover:bg-[#c2e4d4] transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-700 text-white hover:bg-brand-800 shadow transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-brand-900 hover:bg-[#c2e4d4]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#d0eade] border-t border-[#badacb] px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2">
            <button
              onClick={() => {
                setActiveTab('rentals');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-brand-900 hover:bg-[#c2e4d4]"
            >
              E-mail's (Rentals)
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-brand-900 hover:bg-[#c2e4d4]"
            >
              Histories
            </button>
            <button
              onClick={() => {
                setActiveTab('topups');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-brand-900 hover:bg-[#c2e4d4]"
            >
              Top Up History
            </button>
            <button
              onClick={() => {
                setActiveTab('api-docs');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-brand-900 hover:bg-[#c2e4d4]"
            >
              API Documentation
            </button>
            <button
              onClick={() => {
                setActiveTab('faq');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-brand-900 hover:bg-[#c2e4d4]"
            >
              FAQ
            </button>
            <button
              onClick={() => {
                setActiveTab('partners');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-brand-900 hover:bg-[#c2e4d4]"
            >
              Partners
            </button>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-purple-900 hover:bg-purple-100"
              >
                Admin Panel
              </button>
            )}
          </div>
        )}
      </header>
    </div>
  );
};

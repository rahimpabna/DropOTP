import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, RotateCw } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, refreshMe } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Verification Step
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const res = await API.post('/auth/register', {
          email: email.trim().toLowerCase(),
          username: username.trim(),
          password,
        });

        if (res.data?.token) {
          localStorage.setItem('token', res.data.token);
        }

        // Check if verification OTP is required
        if (res.data?.requiresVerification || !res.data?.user?.isEmailVerified) {
          setAwaitingOtp(true);
          setResendCooldown(60);
        } else {
          await refreshMe();
          onClose();
        }
      } else {
        await login(email || username, password);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await API.post('/auth/verify-email', {
        email: email.trim().toLowerCase(),
        otp: otpCode.trim(),
      });

      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
      }
      await refreshMe();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await API.post('/auth/resend-otp', { email: email.trim().toLowerCase() });
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {awaitingOtp ? (
          /* OTP Verification Screen */
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Verify Your Email</h3>
              <p className="text-xs text-slate-500 mt-1">
                We sent a 6-digit confirmation code to{' '}
                <strong className="text-slate-800">{email}</strong> from{' '}
                <span className="text-brand-700 font-semibold">info@dropotp.com</span>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6-Digit Verification OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#f8faf9] border border-slate-200 rounded-2xl px-4 py-3 text-center text-2xl font-mono font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-black rounded-2xl shadow-lg shadow-brand-700/20 text-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resending}
                  className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50 inline-flex items-center space-x-1"
                >
                  <RotateCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend OTP in ${resendCooldown}s`
                      : 'Did not receive code? Resend'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Login / Register Form */
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-700 mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                {isRegister ? 'Create an Account' : 'Welcome Back'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isRegister
                  ? 'Join to rent temporary emails and receive OTPs'
                  : 'Log in to your account and manage rentals'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. john_doe"
                      className="w-full bg-[#f8faf9] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isRegister ? 'Email Address' : 'Email or Username'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={isRegister ? 'email' : 'text'}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isRegister ? 'user@example.com' : 'Enter email or username'}
                    className="w-full bg-[#f8faf9] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f8faf9] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-black rounded-2xl shadow-md shadow-brand-700/20 transition-all disabled:opacity-50 text-sm"
              >
                {loading ? 'Processing...' : isRegister ? 'Create Account & Send OTP' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-500">
              {isRegister ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setError(null);
                    }}
                    className="font-bold text-brand-700 hover:underline"
                  >
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setError(null);
                    }}
                    className="font-bold text-brand-700 hover:underline"
                  >
                    Register Now
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

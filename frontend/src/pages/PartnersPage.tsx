import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Gift, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { API } from '../api';

export const PartnersPage: React.FC = () => {
  const [content, setContent] = useState<any>({
    commissionRate: '20%',
    minimumPayout: '$10.00',
    payoutMethods: 'Crypto (USDT TRC20, TON, BTC), Payeer, WebMoney',
    benefits: [
      '20% lifetime recurring commission on all referrals',
      'Real-time referral tracking and click statistics',
      'Instant payout requests with zero withdrawal fees',
      'Dedicated partner manager & custom promotional banners',
    ],
  });

  useEffect(() => {
    API.get('/public/content/partners')
      .then((res) => {
        if (res.data?.data) {
          setContent((prev: any) => ({ ...prev, ...res.data.data }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-in fade-in">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
          <Gift className="w-3.5 h-3.5" />
          <span>Affiliate & Partner Program</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Earn With DropOTP Partner Program
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium">
          Monetize your traffic, community, or developer tools. Earn up to 20% recurring commissions from every deposit made by your referrals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{content.commissionRate}</span>
          <p className="text-xs text-slate-500 font-semibold">Lifetime Commission</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{content.minimumPayout}</span>
          <p className="text-xs text-slate-500 font-semibold">Minimum Payout</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">Instant</span>
          <p className="text-xs text-slate-500 font-semibold">Automated Payouts</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Partner Program Advantages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(content.benefits || []).map((b: string, i: number) => (
            <div key={i} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-slate-700">{b}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Supported Withdrawal Methods:</span>
            <span className="text-xs font-semibold text-slate-800">{content.payoutMethods}</span>
          </div>

          <a
            href="#contact"
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow transition-all"
          >
            Apply for Partner Program
          </a>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { FileText, ShieldAlert } from 'lucide-react';
import { API } from '../api';

export const PublicOfferPage: React.FC = () => {
  const [content, setContent] = useState<any>({
    title: 'Terms of Service & Public Offer',
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: '1. General Provisions',
        text: 'This Public Offer constitutes an official proposal by DropOTP to provide temporary email access and automated OTP reception services under the conditions stated herein.',
      },
      {
        heading: '2. Nature of Service',
        text: 'DropOTP provides temporary disposable email addresses for receiving confirmation emails, registration verification codes, and activation links. Services are provided "as-is" with real-time IMAP and WebSocket delivery.',
      },
      {
        heading: '3. Cancellation and Refund Policy',
        text: 'Rentals may be canceled freely before an OTP code has been received or before the rental session expires. Upon cancellation, the full held amount is refunded automatically to the user wallet. As stated on the platform, batch purchases and completed rentals are non-refundable once an OTP has been successfully received.',
      },
      {
        heading: '4. Prohibited Use',
        text: 'Users agree not to use DropOTP for fraudulent activities, illegal spam, payment system abuse, harassment, or actions violating international cyber laws.',
      },
    ],
  });

  useEffect(() => {
    API.get('/public/content/public_offer')
      .then((res) => {
        if (res.data?.data) {
          setContent((prev: any) => ({ ...prev, ...res.data.data }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
          <FileText className="w-3.5 h-3.5" />
          <span>Legal & User Agreement</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{content.title}</h1>
        <p className="text-xs text-slate-400 font-medium">Last Updated: {content.lastUpdated}</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
        {(content.sections || []).map((sec: any, idx: number) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">{sec.heading}</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              {sec.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

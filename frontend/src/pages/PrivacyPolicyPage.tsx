import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { API } from '../api';

export const PrivacyPolicyPage: React.FC = () => {
  const [content, setContent] = useState<any>({
    title: 'Privacy Policy',
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        text: 'We collect minimal operational data necessary to deliver our services, including account email (for registration), transaction records, and API usage metrics. We do not store sensitive personal passwords.',
      },
      {
        heading: '2. Email Content & Data Retention',
        text: 'Incoming emails received during your rental session are processed in volatile memory to extract verification codes. We do not maintain long-term archives of email message bodies.',
      },
      {
        heading: '3. Security & Cryptography',
        text: 'All communications between your browser and our servers are encrypted with TLS 1.3. User passwords are encrypted using multi-round Argon2/bcrypt hashing.',
      },
      {
        heading: '4. Third-Party Sharing',
        text: 'DropOTP does not sell, rent, or share personal user details with third parties or advertising brokers.',
      },
    ],
  });

  useEffect(() => {
    API.get('/public/content/privacy_policy')
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
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Data Protection & Privacy</span>
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

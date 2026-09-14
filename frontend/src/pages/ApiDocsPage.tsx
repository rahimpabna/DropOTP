import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Code,
  Copy,
  Check,
  Play,
  Terminal,
  Key,
  ExternalLink,
  ShieldCheck,
  Zap,
  BookOpen,
  ArrowRight,
  Server,
  Globe,
} from 'lucide-react';
import { API } from '../api';

interface EndpointDoc {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; desc: string }[];
  curlExample: (apiKey: string) => string;
  pythonExample: (apiKey: string) => string;
  nodeExample: (apiKey: string) => string;
  phpExample: (apiKey: string) => string;
  responseExample: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    id: 'balance',
    name: 'Get User Balance',
    method: 'GET',
    path: '/api/user/balance',
    description: 'Retrieve current available wallet balance and reserved balance.',
    params: [
      { name: 'api_key', type: 'string', required: true, desc: 'Your personal API Key' },
    ],
    curlExample: (key) => `curl -X GET "https://dropotp.com/api/user/balance" \\
  -H "Authorization: Bearer ${key || 'YOUR_API_KEY'}"`,
    pythonExample: (key) => `import requests

headers = {"Authorization": "Bearer ${key || 'YOUR_API_KEY'}"}
res = requests.get("https://dropotp.com/api/user/balance", headers=headers)
print(res.json())`,
    nodeExample: (key) => `const axios = require('axios');

const res = await axios.get('https://dropotp.com/api/user/balance', {
  headers: { Authorization: 'Bearer ${key || 'YOUR_API_KEY'}' }
});
console.log(res.data);`,
    phpExample: (key) => `<?php
$ch = curl_init('https://dropotp.com/api/user/balance');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ${key || 'YOUR_API_KEY'}']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo $res;`,
    responseExample: JSON.stringify(
      {
        success: true,
        balance: 15.45,
        reservedBalance: 0.12,
        currency: 'USD',
      },
      null,
      2
    ),
  },
  {
    id: 'services',
    name: 'Get Services & Prices',
    method: 'GET',
    path: '/api/rentals/services',
    description: 'Retrieve the active catalog of all 114+ services, base prices, and codes.',
    params: [],
    curlExample: () => `curl -X GET "https://dropotp.com/api/rentals/services"`,
    pythonExample: () => `import requests

res = requests.get("https://dropotp.com/api/rentals/services")
print(res.json())`,
    nodeExample: () => `const axios = require('axios');

const res = await axios.get('https://dropotp.com/api/rentals/services');
console.log(res.data);`,
    phpExample: () => `<?php
$res = file_get_contents('https://dropotp.com/api/rentals/services');
echo $res;`,
    responseExample: JSON.stringify(
      [
        { id: 'cm1...', code: 'openai', name: 'OpenAI (ChatGPT)', basePrice: 0.055, isActive: true },
        { id: 'cm2...', code: 'tg', name: 'Telegram', basePrice: 0.045, isActive: true },
        { id: 'cm3...', code: 'ig', name: 'Instagram', basePrice: 0.040, isActive: true },
      ],
      null,
      2
    ),
  },
  {
    id: 'providers',
    name: 'Get Live Providers & Stock',
    method: 'GET',
    path: '/api/rentals/provider-domains',
    description: 'Check real-time stock availability across Gmail, Outlook, Yahoo, and iCloud pools.',
    params: [],
    curlExample: () => `curl -X GET "https://dropotp.com/api/rentals/provider-domains"`,
    pythonExample: () => `import requests

res = requests.get("https://dropotp.com/api/rentals/provider-domains")
print(res.json())`,
    nodeExample: () => `const axios = require('axios');

const res = await axios.get('https://dropotp.com/api/rentals/provider-domains');
console.log(res.data);`,
    phpExample: () => `<?php
$res = file_get_contents('https://dropotp.com/api/rentals/provider-domains');
echo $res;`,
    responseExample: JSON.stringify(
      {
        success: true,
        providers: [
          { provider: 'GMAIL', name: 'Gmail', count: 40, price: 0.009, inStock: true },
          { provider: 'OUTLOOK', name: 'Outlook', count: 12, price: 0.0085, inStock: true },
        ],
      },
      null,
      2
    ),
  },
  {
    id: 'order',
    name: 'Order / Rent Temporary Email',
    method: 'POST',
    path: '/api/rentals/order',
    description: 'Instantly allocate a clean email account and start live IMAP listening for incoming OTP.',
    params: [
      { name: 'service', type: 'string', required: true, desc: 'Target service code (e.g. "openai", "tg")' },
      { name: 'domain', type: 'string', required: false, desc: 'Optional provider ("gmail", "outlook") or domain ID' },
      { name: 'count', type: 'number', required: false, desc: 'Number of mail activations (default 1, max 10)' },
      { name: 'time', type: 'string', required: false, desc: '"20 minutes", "1 hour", or "24 hours"' },
    ],
    curlExample: (key) => `curl -X POST "https://dropotp.com/api/rentals/order" \\
  -H "Authorization: Bearer ${key || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"service": "openai", "domain": "gmail", "count": 1}'`,
    pythonExample: (key) => `import requests

headers = {"Authorization": "Bearer ${key || 'YOUR_API_KEY'}", "Content-Type": "application/json"}
payload = {"service": "openai", "domain": "gmail", "count": 1}
res = requests.post("https://dropotp.com/api/rentals/order", json=payload, headers=headers)
print(res.json())`,
    nodeExample: (key) => `const axios = require('axios');

const res = await axios.post('https://dropotp.com/api/rentals/order', {
  service: 'openai',
  domain: 'gmail',
  count: 1
}, {
  headers: { Authorization: 'Bearer ${key || 'YOUR_API_KEY'}' }
});
console.log(res.data);`,
    phpExample: (key) => `<?php
$ch = curl_init('https://dropotp.com/api/rentals/order');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer ${key || 'YOUR_API_KEY'}',
  'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['service' => 'openai', 'domain' => 'gmail']));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo $res;`,
    responseExample: JSON.stringify(
      {
        success: true,
        orders: [
          {
            id: 64,
            email: 'nassermutefa@gmail.com',
            service: 'OPENAI',
            status: 'WAITING_CODE',
            price: 0.060,
            expiresAt: '2026-09-12T17:15:00.000Z',
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: 'active_check',
    name: 'Get Active Rentals & Real-Time OTP',
    method: 'GET',
    path: '/api/rentals/active',
    description: 'Fetch your active activations and read live incoming OTP code / verification link.',
    params: [],
    curlExample: (key) => `curl -X GET "https://dropotp.com/api/rentals/active" \\
  -H "Authorization: Bearer ${key || 'YOUR_API_KEY'}"`,
    pythonExample: (key) => `import requests

headers = {"Authorization": "Bearer ${key || 'YOUR_API_KEY'}"}
res = requests.get("https://dropotp.com/api/rentals/active", headers=headers)
print(res.json())`,
    nodeExample: (key) => `const axios = require('axios');

const res = await axios.get('https://dropotp.com/api/rentals/active', {
  headers: { Authorization: 'Bearer ${key || 'YOUR_API_KEY'}' }
});
console.log(res.data);`,
    phpExample: (key) => `<?php
$ch = curl_init('https://dropotp.com/api/rentals/active');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ${key || 'YOUR_API_KEY'}']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo $res;`,
    responseExample: JSON.stringify(
      [
        {
          id: 64,
          email: 'nassermutefa@gmail.com',
          status: 'RECEIVED',
          code: '849201',
          fullLink: 'https://auth0.openai.com/u/verify?ticket=...',
          serviceItem: { name: 'OpenAI (ChatGPT)' },
        },
      ],
      null,
      2
    ),
  },
  {
    id: 'recode',
    name: 'Re-Code / Next Incoming Code',
    method: 'POST',
    path: '/api/rentals/recode/:id',
    description: 'Wait for the next live incoming email. Advances IMAP listener UID cursor without re-reading old codes.',
    params: [
      { name: 'id', type: 'number', required: true, desc: 'Activation ID (e.g. 64)' },
    ],
    curlExample: (key) => `curl -X POST "https://dropotp.com/api/rentals/recode/64" \\
  -H "Authorization: Bearer ${key || 'YOUR_API_KEY'}"`,
    pythonExample: (key) => `import requests

headers = {"Authorization": "Bearer ${key || 'YOUR_API_KEY'}"}
res = requests.post("https://dropotp.com/api/rentals/recode/64", headers=headers)
print(res.json())`,
    nodeExample: (key) => `const axios = require('axios');

const res = await axios.post('https://dropotp.com/api/rentals/recode/64', {}, {
  headers: { Authorization: 'Bearer ${key || 'YOUR_API_KEY'}' }
});
console.log(res.data);`,
    phpExample: (key) => `<?php
$ch = curl_init('https://dropotp.com/api/rentals/recode/64');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ${key || 'YOUR_API_KEY'}']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo $res;`,
    responseExample: JSON.stringify(
      {
        success: true,
        message: 'Listening restarted for next incoming email.',
        status: 'WAITING_NEXT',
      },
      null,
      2
    ),
  },
  {
    id: 'cancel',
    name: 'Cancel & Auto-Refund',
    method: 'POST',
    path: '/api/rentals/cancel/:id',
    description: 'Cancel an activation before code is used. Automatically unlocks and refunds held balance.',
    params: [
      { name: 'id', type: 'number', required: true, desc: 'Activation ID to cancel' },
    ],
    curlExample: (key) => `curl -X POST "https://dropotp.com/api/rentals/cancel/64" \\
  -H "Authorization: Bearer ${key || 'YOUR_API_KEY'}"`,
    pythonExample: (key) => `import requests

headers = {"Authorization": "Bearer ${key || 'YOUR_API_KEY'}"}
res = requests.post("https://dropotp.com/api/rentals/cancel/64", headers=headers)
print(res.json())`,
    nodeExample: (key) => `const axios = require('axios');

const res = await axios.post('https://dropotp.com/api/rentals/cancel/64', {}, {
  headers: { Authorization: 'Bearer ${key || 'YOUR_API_KEY'}' }
});
console.log(res.data);`,
    phpExample: (key) => `<?php
$ch = curl_init('https://dropotp.com/api/rentals/cancel/64');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ${key || 'YOUR_API_KEY'}']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo $res;`,
    responseExample: JSON.stringify(
      {
        success: true,
        status: 'CANCELED',
        refundedAmount: 0.060,
      },
      null,
      2
    ),
  },
];

export const ApiDocsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDoc>(ENDPOINTS[0]);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'python' | 'node' | 'php'>('curl');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Sandbox State
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);

  const apiKey = user?.apiKey || '';

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const currentSnippet =
    activeCodeTab === 'curl'
      ? selectedEndpoint.curlExample(apiKey)
      : activeCodeTab === 'python'
      ? selectedEndpoint.pythonExample(apiKey)
      : activeCodeTab === 'node'
      ? selectedEndpoint.nodeExample(apiKey)
      : selectedEndpoint.phpExample(apiKey);

  const runSandboxTest = async () => {
    setSandboxLoading(true);
    setSandboxOutput(null);
    try {
      if (selectedEndpoint.method === 'GET') {
        const res = await API.get(selectedEndpoint.path);
        setSandboxOutput(JSON.stringify(res.data, null, 2));
      } else {
        setSandboxOutput(selectedEndpoint.responseExample);
      }
    } catch (err: any) {
      setSandboxOutput(JSON.stringify(err.response?.data || { error: err.message }, null, 2));
    } finally {
      setSandboxLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#004d3d] to-[#002f25] text-white rounded-3xl p-8 border border-emerald-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-emerald-300 font-bold mb-2">
              <Terminal className="w-4 h-4" />
              <span>Developer Documentation & REST API</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              DropOTP REST API & WebSockets
            </h1>
            <p className="text-sm text-emerald-100/80 max-w-2xl mt-2 font-medium">
              High-frequency temporary email renting API with sub-second real-time OTP reception, fully compatible with SMSBower formats.
            </p>
          </div>

          {/* API Key Box */}
          <div className="bg-black/30 backdrop-blur-md border border-emerald-500/30 p-4 rounded-2xl w-full md:w-80 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1">
                <Key className="w-3.5 h-3.5" />
                <span>Your API Key</span>
              </span>
              {apiKey && (
                <button
                  onClick={handleCopyKey}
                  className="text-xs text-emerald-400 hover:text-white flex items-center space-x-1"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div className="bg-black/40 rounded-xl px-3 py-2 font-mono text-xs text-emerald-200 truncate">
              {apiKey || 'Log in to view your live API key'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Documentation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Endpoints Navigation */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
              Available Endpoints
            </h3>
            <nav className="space-y-1">
              {ENDPOINTS.map((ep) => {
                const isSelected = selectedEndpoint.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setSelectedEndpoint(ep);
                      setSandboxOutput(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <span className="truncate">{ep.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-black ${
                        ep.method === 'GET'
                          ? isSelected
                            ? 'bg-emerald-800 text-emerald-200'
                            : 'bg-emerald-100 text-emerald-800'
                          : isSelected
                          ? 'bg-sky-800 text-sky-200'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {ep.method}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Info Box */}
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200/80 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Base URL</span>
            </div>
            <p className="font-mono text-xs text-emerald-800 bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-200 select-all">
              https://dropotp.com/api
            </p>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Pass your API key in the <code className="font-mono bg-white/60 px-1 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code> header or as query parameter <code className="font-mono bg-white/60 px-1 py-0.5 rounded">?api_key=&lt;key&gt;</code>.
            </p>
          </div>
        </div>

        {/* Right Content Area: Details, Sandbox & Code Snippets */}
        <div className="lg:col-span-8 space-y-6">
          {/* Endpoint Card */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-mono font-black uppercase ${
                      selectedEndpoint.method === 'GET'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {selectedEndpoint.path}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{selectedEndpoint.description}</p>
              </div>

              <button
                onClick={runSandboxTest}
                disabled={sandboxLoading}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{sandboxLoading ? 'Testing...' : 'Test Request'}</span>
              </button>
            </div>

            {/* Parameters Table */}
            {selectedEndpoint.params.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Parameters
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Parameter</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Required</th>
                        <th className="px-3 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {selectedEndpoint.params.map((p) => (
                        <tr key={p.name}>
                          <td className="px-3 py-2 font-mono font-bold text-emerald-700">{p.name}</td>
                          <td className="px-3 py-2 text-slate-500 font-mono">{p.type}</td>
                          <td className="px-3 py-2">
                            {p.required ? (
                              <span className="text-rose-600 font-bold text-[11px]">Required</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Optional</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Code Snippets Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Request Examples
                </h4>
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                  {(['curl', 'python', 'node', 'php'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveCodeTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        activeCodeTab === tab
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab === 'node' ? 'Node.js' : tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="relative rounded-2xl bg-slate-950 text-slate-200 p-4 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                <button
                  onClick={() => handleCopySnippet(currentSnippet)}
                  className="absolute right-3 top-3 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-sans font-bold flex items-center space-x-1 transition-all"
                >
                  {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="pr-16 leading-relaxed whitespace-pre-wrap">{currentSnippet}</pre>
              </div>
            </div>

            {/* Response Preview or Sandbox Output */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                {sandboxOutput ? 'Live Test Output' : 'Example Response (200 OK)'}
              </h4>
              <div className="rounded-2xl bg-[#031d16] text-emerald-300 p-4 font-mono text-xs overflow-x-auto border border-emerald-900/60 shadow-inner">
                <pre className="leading-relaxed">
                  {sandboxOutput || selectedEndpoint.responseExample}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Comprehensive service icon mapping supporting 111+ service SVGs from /service_icons/

const ICON_FILES: string[] = [
  "500px.svg", "Alfagift.svg", "AliExpress.svg", "Amazon.svg", "Angi.svg", "Ankama.svg", "ANY EMAIL.svg",
  "Apple.svg", "Audible.svg", "Aws.jpg", "Beboo.svg", "Biglion.svg", "Binance.svg", "Black Forest Labs.svg",
  "BLIBLI.svg", "Bosslike.svg", "BPJSTK.svg", "Brevistay.svg", "Brevo.svg", "Claude.svg", "Craigslist.svg",
  "Cursor.png", "CWG.svg", "Depop.svg", "DigitalOcean.svg", "Discord.svg", "DNS.svg", "Etsy.svg",
  "Facebook business.svg", "Facebook.svg", "Feeld.svg", "Fiverr.svg", "FMCPay.svg", "GitHub.svg", "Grok.svg",
  "Hepsiburadacom.webp", "Hindustan.svg", "Hinge.svg", "Hotlive.svg", "Instagram.svg", "IRCTC.svg", "Kick.svg",
  "Kleinanzeigen.svg", "Kolotibablo.svg", "KVB.svg", "Leboncoin.svg", "Linode.svg", "Loloo.svg", "Microsoft.svg",
  "MMLive.svg", "Mulerun.svg", "Neosurf.svg", "NextOtp.svg", "Nielsen.svg", "Nuum.ru.svg", "OfferUp.webp",
  "OLX.svg", "OLXbg.svg", "OLXkz.svg", "OLXpl.svg", "OLXpt.svg", "OLXro.svg", "OLXua.svg", "OLXuz.svg",
  "OneOne.svg", "OpenAI (ChatGPT).svg", "Owlproxy.svg", "Oxinchain.svg", "Piattos.svg", "PolloAI.svg",
  "Prime video.svg", "QQLive.svg", "Quarkip.svg", "Quoka.svg", "RapidApi.svg", "Reddit.svg", "Research 360.svg",
  "SerpApi.svg", "Shopee.svg", "Skills.svg", "Snapchat.svg", "Streamlabs.svg", "Subito.svg", "Swarail.svg",
  "Talkatone.svg", "Telegram.svg", "Telnyx.svg", "TextMe.svg", "Textnow.svg", "Tiktok shop.svg", "Tiktok.svg",
  "Tinder.svg", "Tokopedia.svg", "Toluna.svg", "Trendyol.webp", "Tumblr.svg", "Twilio.svg", "Twitch.svg",
  "Twitter.svg", "Ubisoft.svg", "Unstop.svg", "Vercel.svg", "Vinted.svg", "Wallapop.svg", "Walmart.svg",
  "Wamba.svg", "WeChat.svg", "Wolt.svg", "WorkUA.svg", "Yandex.svg", "Yemeksepeti.svg"
];

// Explicit aliases for fast O(1) matching
const CODE_TO_FILENAME: Record<string, string> = {
  openai: 'OpenAI (ChatGPT).svg',
  chatgpt: 'OpenAI (ChatGPT).svg',
  gpt: 'OpenAI (ChatGPT).svg',
  tg: 'Telegram.svg',
  telegram: 'Telegram.svg',
  fb: 'Facebook.svg',
  facebook: 'Facebook.svg',
  ig: 'Instagram.svg',
  instagram: 'Instagram.svg',
  amazon: 'Amazon.svg',
  github: 'GitHub.svg',
  git: 'GitHub.svg',
  google: 'ANY EMAIL.svg', // Or fallback
  gmail: 'ANY EMAIL.svg',
  tinder: 'Tinder.svg',
  ms: 'Microsoft.svg',
  microsoft: 'Microsoft.svg',
  outlook: 'Microsoft.svg',
  wa: 'WeChat.svg', // Or fallback
  whatsapp: 'WeChat.svg',
  x: 'Twitter.svg',
  twitter: 'Twitter.svg',
  other: 'ANY EMAIL.svg',
  any: 'ANY EMAIL.svg',
  binance: 'Binance.svg',
  discord: 'Discord.svg',
  claude: 'Claude.svg',
  reddit: 'Reddit.svg',
  apple: 'Apple.svg',
  tiktok: 'Tiktok.svg',
  steam: 'Twitch.svg',
  uber: 'Wolt.svg',
  netflix: 'Prime video.svg',
};

export function getServiceIconUrl(code?: string, name?: string): string | null {
  const cleanCode = (code || '').trim().toLowerCase();
  const cleanName = (name || '').trim().toLowerCase();

  // 1. Direct code alias lookup
  if (cleanCode && CODE_TO_FILENAME[cleanCode]) {
    return `/service_icons/${encodeURIComponent(CODE_TO_FILENAME[cleanCode])}`;
  }

  // 2. Direct name alias lookup
  if (cleanName && CODE_TO_FILENAME[cleanName]) {
    return `/service_icons/${encodeURIComponent(CODE_TO_FILENAME[cleanName])}`;
  }

  // 3. Search in actual files
  for (const filename of ICON_FILES) {
    const base = filename.replace(/\.(svg|png|webp|jpg)$/i, '').toLowerCase();
    if (cleanCode && (base === cleanCode || base.includes(cleanCode) || cleanCode.includes(base))) {
      return `/service_icons/${encodeURIComponent(filename)}`;
    }
    if (cleanName && (base === cleanName || cleanName.includes(base) || base.includes(cleanName))) {
      return `/service_icons/${encodeURIComponent(filename)}`;
    }
  }

  return null;
}

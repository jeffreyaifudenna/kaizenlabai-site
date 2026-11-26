// Shared bot list and Upstash Redis (REST) helpers. No npm dependencies.
// Bots are identified by the name they announce in their User-Agent header ("self-identified").

// Order matters: specific names first, generic catch-all last.
export const BOTS = [
  ['GPTBot', /GPTBot/i],
  ['ChatGPT-User', /ChatGPT-User/i],
  ['OAI-SearchBot', /OAI-SearchBot/i],
  ['ClaudeBot', /ClaudeBot/i],
  ['Claude-User', /Claude-User/i],
  ['Claude-SearchBot', /Claude-SearchBot/i],
  ['Anthropic (other)', /anthropic-ai|Claude-Web/i],
  ['PerplexityBot', /PerplexityBot/i],
  ['Perplexity-User', /Perplexity-User/i],
  ['Google-CloudVertexBot', /Google-CloudVertexBot/i],
  ['Googlebot', /Googlebot|Google-InspectionTool|GoogleOther|Storebot-Google/i],
  ['Bingbot', /bingbot|BingPreview|msnbot/i],
  ['Applebot', /Applebot/i],
  ['DuckDuckBot', /DuckDuck(Go-Favicons-)?Bot|DuckAssistBot/i],
  ['YandexBot', /Yandex(Bot|Images|Mobile)/i],
  ['Baiduspider', /Baiduspider/i],
  ['Bytespider', /Bytespider/i],
  ['Amazonbot', /Amazonbot/i],
  ['Meta', /meta-externalagent|meta-externalfetcher|facebookexternalhit|FacebookBot/i],
  ['CCBot', /CCBot/i],
  ['cohere-ai', /cohere-ai|cohere-training-data-crawler/i],
  ['Mistral', /MistralAI-User/i],
  ['DeepSeek', /DeepSeekBot/i],
  ['Diffbot', /Diffbot/i],
  ['Twitterbot', /Twitterbot/i],
  ['LinkedInBot', /LinkedInBot/i],
  ['Slackbot', /Slackbot/i],
  ['Discordbot', /Discordbot/i],
  ['Telegram', /TelegramBot/i],
  ['WhatsApp', /WhatsApp/i],
  ['AhrefsBot', /AhrefsBot/i],
  ['SemrushBot', /SemrushBot/i],
  ['MJ12bot', /MJ12bot/i],
  ['DotBot', /DotBot/i],
  ['PetalBot', /PetalBot/i],
  ['Other bots', /bot\b|bot\/|crawler|spider|slurp|scrapy|headless/i],
];

// Developer tools and scripts (curl, wget, python-requests, ...). Counted apart, never as bots.
export const TOOLS = /curl\/|wget\/|python-requests|python-urllib|aiohttp|httpx|httpclient|okhttp|go-http-client|node-fetch|undici|axios\/|postmanruntime|insomnia|httpie|libwww-perl|java\//i;

// Named bot, or null. Named bots win over tools; tools win over the generic catch-all.
export function botName(ua) {
  if (!ua) return null;
  for (let i = 0; i < BOTS.length - 1; i++) if (BOTS[i][1].test(ua)) return BOTS[i][0];
  if (TOOLS.test(ua)) return null;
  return BOTS[BOTS.length - 1][1].test(ua) ? BOTS[BOTS.length - 1][0] : null;
}
export function isTool(ua) { return !!ua && !botName(ua) && TOOLS.test(ua); }

// ---- Verification: these operators publish the addresses their bots use. A visit that claims the name
// but comes from elsewhere is counted as "unverified". Lists are fetched at most once a day per server.
export const VERIFY = {
  'Googlebot': 'https://developers.google.com/static/crawling/ipranges/common-crawlers.json',
  'Bingbot': 'https://www.bing.com/toolbox/bingbot.json',
  'GPTBot': 'https://openai.com/gptbot.json',
  'OAI-SearchBot': 'https://openai.com/searchbot.json',
  'ChatGPT-User': 'https://openai.com/chatgpt-user.json',
};
const rangeCache = {}; // name -> { at, ranges: [[bits, base, prefixLen]] }

function ipToBig(ip) {
  if (ip.includes(':')) {
    let [head, tail] = ip.split('::');
    const h = head ? head.split(':') : [], t = tail !== undefined ? (tail ? tail.split(':') : []) : null;
    const parts = t === null ? h : h.concat(Array(8 - h.length - t.length).fill('0'), t);
    if (parts.length !== 8) return null;
    let n = 0n; for (const p of parts) n = (n << 16n) + BigInt(parseInt(p || '0', 16)); return [128, n];
  }
  const q = ip.split('.').map(Number);
  if (q.length !== 4 || q.some(x => !(x >= 0 && x <= 255))) return null;
  return [32, BigInt(((q[0] << 24) >>> 0) + (q[1] << 16) + (q[2] << 8) + q[3])];
}
function parseCidr(c) { const [ip, len] = c.split('/'); const v = ipToBig(ip); return v ? [v[0], v[1], Number(len)] : null; }
function inRange(v, r) { if (v[0] !== r[0]) return false; const shift = BigInt(r[0] - r[2]); return (v[1] >> shift) === (r[1] >> shift); }

async function ranges(name) {
  const c = rangeCache[name];
  if (c && Date.now() - c.at < 864e5) return c.ranges;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await fetch(VERIFY[name], { signal: ctl.signal });
    const j = await r.json();
    const list = (j.prefixes || []).map(p => parseCidr(p.ipv4Prefix || p.ipv6Prefix || '')).filter(Boolean);
    if (list.length) rangeCache[name] = { at: Date.now(), ranges: list };
    return list.length ? list : null;
  } catch (e) { return c ? c.ranges : null; } finally { clearTimeout(t); }
}

// true = from the operator's published addresses, false = claims the name but is not, null = can't tell
export async function verify(name, ip) {
  if (!VERIFY[name] || !ip) return null;
  const v = ipToBig(ip.trim()); if (!v) return null;
  const list = await ranges(name); if (!list) return null;
  return list.some(r => inRange(v, r));
}

// A one-way hash of address + browser name, so different visitors can be estimated without keeping addresses.
export async function visitorHash(ip, ua) {
  const data = new TextEncoder().encode((ip || '') + '|' + (ua || ''));
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return Array.from(h.slice(0, 12), b => b.toString(16).padStart(2, '0')).join('');
}

export function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export async function redisPipeline(cmds) {
  const cfg = redisConfig();
  if (!cfg) throw new Error('Redis not configured');
  const r = await fetch(cfg.url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('Redis HTTP ' + r.status);
  return r.json();
}

export function day(d) { return d.toISOString().slice(0, 10); } // UTC date, YYYY-MM-DD

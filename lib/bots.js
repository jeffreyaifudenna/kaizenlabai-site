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
  ['Other bots', /bot\b|bot\/|crawler|spider|slurp|scrapy|python-requests|curl\/|wget\/|httpclient|headless/i],
];

export function botName(ua) {
  if (!ua) return null;
  for (const [name, re] of BOTS) if (re.test(ua)) return name;
  return null;
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

// Vercel Routing Middleware: counts self-identified bots that request our pages.
// It never changes or blocks the response; counting happens after the page is served (waitUntil).
// Keys (Upstash Redis):
//   bots:since                     first day counted (YYYY-MM-DD)
//   bots:all / bots:d:<day>        requests per bot name (+ _total)
//   bots:u:<day>:<name|_total>     estimated different visitors (HyperLogLog of a one-way hash; no addresses kept)
//   bots:v:d:<day> / bots:x:d:<day> verified / unverified requests, for bots whose operators publish addresses
//   tools:d:<day>                  developer tools and scripts (curl etc.), kept out of the bot counts
import { botName, isTool, verify, visitorHash, redisConfig, redisPipeline, day } from './lib/bots.js';

export const config = {
  // Pages and the files bots read; skip images, icons, scripts and the API itself.
  matcher: ['/', '/learning/:path*', '/agents/:path*', '/open-source/:path*', '/bots/:path*', '/robots.txt', '/llms.txt', '/sitemap.xml', '/index.md'],
};

const TEN_DAYS = 60 * 60 * 24 * 10;

async function count(request, name, tool) {
  const ua = request.headers.get('user-agent') || '';
  const ip = (request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim();
  const d = day(new Date());
  if (tool) {
    const k = 'tools:d:' + d;
    return redisPipeline([['HINCRBY', k, '_total', 1], ['EXPIRE', k, TEN_DAYS]]);
  }
  const [hash, ok] = await Promise.all([visitorHash(ip, ua), verify(name, ip).catch(() => null)]);
  const dayKey = 'bots:d:' + d, uName = 'bots:u:' + d + ':' + name, uAll = 'bots:u:' + d + ':_total';
  const cmds = [
    ['SET', 'bots:since', d, 'NX'],
    ['HINCRBY', 'bots:all', name, 1],
    ['HINCRBY', 'bots:all', '_total', 1],
    ['HINCRBY', dayKey, name, 1],
    ['HINCRBY', dayKey, '_total', 1],
    ['EXPIRE', dayKey, TEN_DAYS],
    ['PFADD', uName, hash], ['EXPIRE', uName, TEN_DAYS],
    ['PFADD', uAll, hash], ['EXPIRE', uAll, TEN_DAYS],
  ];
  if (ok !== null) { const k = (ok ? 'bots:v:d:' : 'bots:x:d:') + d; cmds.push(['HINCRBY', k, name, 1], ['EXPIRE', k, TEN_DAYS]); }
  return redisPipeline(cmds);
}

export default function middleware(request, context) {
  if (!redisConfig()) return;
  const ua = request.headers.get('user-agent') || '';
  const name = botName(ua), tool = !name && isTool(ua);
  if (!name && !tool) return;
  const work = count(request, name, tool).catch(() => {});
  if (context && typeof context.waitUntil === 'function') context.waitUntil(work);
}

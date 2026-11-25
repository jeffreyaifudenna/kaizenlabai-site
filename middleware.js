// Vercel Routing Middleware: counts self-identified bots that request our pages.
// It never changes or blocks the response; counting happens after the page is served (waitUntil).
import { botName, redisConfig, redisPipeline, day } from './lib/bots.js';

export const config = {
  // Pages and the files bots read; skip images, icons, scripts and the API itself.
  matcher: ['/', '/learning/:path*', '/agents/:path*', '/automations/:path*', '/open-source/:path*', '/bots/:path*', '/robots.txt', '/llms.txt', '/sitemap.xml', '/index.md'],
};

export default function middleware(request, context) {
  const name = botName(request.headers.get('user-agent') || '');
  if (!name || !redisConfig()) return;
  const now = new Date(), d = day(now), dayKey = 'bots:d:' + d;
  const work = redisPipeline([
    ['SET', 'bots:since', d, 'NX'],
    ['HINCRBY', 'bots:all', name, 1],
    ['HINCRBY', 'bots:all', '_total', 1],
    ['HINCRBY', dayKey, name, 1],
    ['HINCRBY', dayKey, '_total', 1],
    ['EXPIRE', dayKey, 60 * 60 * 24 * 10],
  ]).catch(() => {});
  if (context && typeof context.waitUntil === 'function') context.waitUntil(work);
}

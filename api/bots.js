// Public, read-only bot counts: GET /api/bots
// { since, updated, last7: { total, bots: [{name,count}] }, allTime: { total, bots: [...] } }
import { redisConfig, redisPipeline, day } from '../lib/bots.js';

export const config = { runtime: 'edge' };

function toList(flat) {
  // HGETALL returns [field, value, field, value, ...]
  const m = {};
  for (let i = 0; flat && i < flat.length; i += 2) m[flat[i]] = Number(flat[i + 1]) || 0;
  const total = m._total || 0; delete m._total;
  const bots = Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return { total, bots };
}

export default async function handler() {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', 'Access-Control-Allow-Origin': '*' };
  if (!redisConfig()) return new Response(JSON.stringify({ error: 'not configured' }), { status: 503, headers });
  try {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(day(new Date(Date.now() - i * 864e5)));
    const res = await redisPipeline([['GET', 'bots:since'], ['HGETALL', 'bots:all'], ...days.map(d => ['HGETALL', 'bots:d:' + d])]);
    const since = res[0].result || null;
    const allTime = toList(res[1].result);
    const sum = {};
    res.slice(2).forEach(r => { const f = r.result || []; for (let i = 0; i < f.length; i += 2) sum[f[i]] = (sum[f[i]] || 0) + (Number(f[i + 1]) || 0); });
    const last7 = toList(Object.entries(sum).flat());
    return new Response(JSON.stringify({ since, updated: new Date().toISOString(), last7, allTime }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers });
  }
}

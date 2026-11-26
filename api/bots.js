// Public, read-only bot counts: GET /api/bots
// { since, updated,
//   last7:   { total, visitors, bots: [{ name, count, visitors, verified, unverified }] },
//   allTime: { total, bots: [{ name, count }] },
//   tools7:  requests from developer tools and scripts (not counted as bots),
//   verifiable: bot names whose operators publish their addresses }
// visitors is an estimate (HyperLogLog), counted from the day it was added; verified/unverified only for verifiable bots.
import { redisConfig, redisPipeline, day, VERIFY } from '../lib/bots.js';

export const config = { runtime: 'edge' };

function toMap(flat) {
  // HGETALL returns [field, value, field, value, ...]
  const m = {};
  for (let i = 0; flat && i < flat.length; i += 2) m[flat[i]] = Number(flat[i + 1]) || 0;
  return m;
}
function toList(m) {
  m = { ...m }; const total = m._total || 0; delete m._total;
  const bots = Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return { total, bots };
}
function addInto(sum, m) { for (const k in m) sum[k] = (sum[k] || 0) + m[k]; }

export default async function handler() {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', 'Access-Control-Allow-Origin': '*' };
  if (!redisConfig()) return new Response(JSON.stringify({ error: 'not configured' }), { status: 503, headers });
  try {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(day(new Date(Date.now() - i * 864e5)));
    const res = await redisPipeline([
      ['GET', 'bots:since'], ['HGETALL', 'bots:all'],
      ...days.map(d => ['HGETALL', 'bots:d:' + d]),
      ...days.map(d => ['HGETALL', 'bots:v:d:' + d]),
      ...days.map(d => ['HGETALL', 'bots:x:d:' + d]),
      ...days.map(d => ['HGET', 'tools:d:' + d, '_total']),
      ['PFCOUNT', ...days.map(d => 'bots:u:' + d + ':_total')],
    ]);
    const since = res[0].result || null;
    const allTime = toList(toMap(res[1].result));
    const sum = {}, ver = {}, unv = {};
    res.slice(2, 9).forEach(r => addInto(sum, toMap(r.result)));
    res.slice(9, 16).forEach(r => addInto(ver, toMap(r.result)));
    res.slice(16, 23).forEach(r => addInto(unv, toMap(r.result)));
    const tools7 = res.slice(23, 30).reduce((a, r) => a + (Number(r.result) || 0), 0);
    const last7 = toList(sum);
    last7.visitors = Number(res[30].result) || 0;
    // different visitors per bot (union of the 7 daily estimates)
    if (last7.bots.length) {
      const u = await redisPipeline(last7.bots.map(b => ['PFCOUNT', ...days.map(d => 'bots:u:' + d + ':' + b.name)]));
      last7.bots.forEach((b, i) => {
        b.visitors = Number(u[i].result) || 0;
        if (VERIFY[b.name]) { b.verified = ver[b.name] || 0; b.unverified = unv[b.name] || 0; }
      });
    }
    return new Response(JSON.stringify({ since, updated: new Date().toISOString(), last7, allTime, tools7, verifiable: Object.keys(VERIFY) }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers });
  }
}

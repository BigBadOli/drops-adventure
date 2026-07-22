// Live leaderboard — Cloudflare Pages Function backed by KV (binding: SCORES).
// GET  /api/scores  → top 8 entries [{n, s, t}]
// POST /api/scores  {n, s, t} → validates, stores top 50, returns top 8
const TOP_KEY = "top";
const RETURN_N = 8;
const KEEP_N = 50;

async function readTop(env) {
  try { return JSON.parse((await env.SCORES.get(TOP_KEY)) || "[]"); }
  catch (e) { return []; }
}

export async function onRequestGet({ env }) {
  const list = await readTop(env);
  return Response.json(list.slice(0, RETURN_N), {
    headers: { "cache-control": "no-store" },
  });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  const n = String(body?.n ?? "").toUpperCase().replace(/[^A-Z0-9•?]/g, "").slice(0, 3);
  const s = Math.max(0, Math.min(99999, Number(body?.s) | 0));
  const t = Math.max(0, Math.min(360000, Number(body?.t) | 0));
  if (n.length !== 3) return new Response("bad initials", { status: 400 });
  const list = await readTop(env);
  list.push({ n, s, t, at: Date.now() });
  list.sort((a, b) => b.t - a.t || b.s - a.s);
  await env.SCORES.put(TOP_KEY, JSON.stringify(list.slice(0, KEEP_N)));
  return Response.json(list.slice(0, RETURN_N), {
    headers: { "cache-control": "no-store" },
  });
}

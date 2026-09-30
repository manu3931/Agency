/* What the desk's server functions share: reading and writing the docs table with the service key (which
   skips row-level security, so every function checks who is asking itself), knowing who is calling,
   talking to Stripe, and the job-money arithmetic the site uses too. */

export const env = (k: string): string => Deno.env.get(k) ?? '';
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// deno-lint-ignore no-explicit-any
export type Json = any;
export interface Row { path: string; data: Json; owner: string | null }
export interface User { id: string; email: string; confirmed: boolean }

const base = () => env('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = () => env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
/* New-style secret keys (sb_secret_…) go in the apikey header only; legacy service-role keys are JWTs and go in both. */
function headers(extra: Record<string, string> = {}): Record<string, string> {
  const k = serviceKey();
  return { apikey: k, ...(k.startsWith('sb_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json', ...extra };
}
async function rest(url: string, init: RequestInit = {}): Promise<Json> {
  const r = await fetch(url, { ...init, headers: headers((init.headers as Record<string, string>) || {}) });
  const t = await r.text();
  if (!r.ok) throw new Error(`database ${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
export const db = {
  async get(path: string): Promise<Row | null> {
    const rows = await rest(`${base()}/rest/v1/docs?path=eq.${encodeURIComponent(path)}&select=path,data,owner`);
    return rows && rows[0] ? rows[0] : null;
  },
  async list(coll: string, filter = ''): Promise<Row[]> {
    return (await rest(`${base()}/rest/v1/docs?coll=eq.${encodeURIComponent(coll)}&select=path,data,owner${filter ? '&' + filter : ''}`)) || [];
  },
  async put(path: string, data: Json, owner?: string | null): Promise<void> {
    const row: Json = { path, data }; if (owner !== undefined) row.owner = owner;
    await rest(`${base()}/rest/v1/docs?on_conflict=path`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([row]) });
  },
  /* Merge top-level fields into a document in one statement, so a payment never overwrites an edit made meanwhile. */
  async merge(path: string, patch: Json): Promise<void> {
    await rest(`${base()}/rest/v1/rpc/merge_doc`, { method: 'POST', body: JSON.stringify({ p_path: path, p_patch: patch }) });
  },
};

/* The person behind the request's bearer token, as Supabase Auth sees them. */
export async function caller(req: Request): Promise<User | null> {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const r = await fetch(`${base()}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY') || serviceKey(), Authorization: auth } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: String(u.email || '').toLowerCase(), confirmed: !!(u.email_confirmed_at || u.confirmed_at) } : null;
}
export async function onTeam(u: User | null): Promise<boolean> {
  if (!u || !u.confirmed || !u.email) return false;
  return !!(await db.get('team/' + u.email));
}

/* ---------- Stripe, over its plain HTTP API ---------- */
export async function stripe(path: string, params: Record<string, string | number | undefined>, idempotencyKey?: string): Promise<Json> {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') body.append(k, String(v)); });
  const h: Record<string, string> = { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' };
  if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey;
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: h, body });
  const j = await r.json();
  if (!r.ok) throw new Error((j && j.error && j.error.message) || `Stripe answered ${r.status}`);
  return j;
}
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
export function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/* Stripe signs each webhook: HMAC-SHA256 of "<timestamp>.<body>" with the endpoint's secret. */
export async function verifyStripe(raw: string, header: string | null, secret: string, now = Date.now(), tolerance = 300): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(',').map((x) => x.split('='));
  const t = parts.find((p) => p[0] === 't')?.[1];
  const sigs = parts.filter((p) => p[0] === 'v1').map((p) => p[1]);
  if (!t || !sigs.length || Math.abs(now / 1000 - Number(t)) > tolerance) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)));
  return sigs.some((s) => sameText(s, mac));
}

/* ---------- money on a job, the same rules as the site's amountDue ---------- */
const PAID = new Set(['paid', 'received', 'captured']);
export async function paymentsFor(bookingId: string): Promise<Json[]> {
  return (await db.list('payments', `data->>bookingId=eq.${encodeURIComponent(bookingId)}`)).map((r) => r.data);
}
export function paidOf(list: Json[]): number {
  return Math.round(list.filter((p) => PAID.has(p.status) && p.kind !== 'hold').reduce((a, p) => a + (p.kind === 'refund' ? -1 : 1) * Number(p.amount || 0), 0) * 100) / 100;
}
/* The job's own deposit, paid and hold flags, worked out from its payments. */
export function flagsFor(b: Json, list: Json[]): Json {
  const bill = b.bill || {}; const paid = paidOf(list);
  const hold = list.find((p) => p.kind === 'hold' && p.status === 'authorized');
  const out: Json = {
    deposit: { ...(b.deposit || {}), status: paid > 0 && paid + 0.5 >= Number(bill.deposit || 0) ? 'received' : (b.deposit && b.deposit.status) || 'none' },
    payment: Number(bill.total) && paid + 0.5 >= Number(bill.total) ? 'paid' : 'unpaid',
  };
  if (list.some((p) => p.kind === 'hold')) out.hold = { ...(b.hold || {}), placed: !!hold, amount: hold ? Number(hold.amount) : 0, payment: hold ? hold.id : null };
  return out;
}

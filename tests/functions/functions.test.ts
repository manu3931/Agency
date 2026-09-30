/* The server functions against a stand-in for the database, Supabase Auth and Stripe.
     deno test --allow-env tests/functions/ */
import { assert, assertEquals } from './assert.ts';

Deno.env.set('SUPABASE_URL', 'https://db.test');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-jwt');
Deno.env.set('SUPABASE_ANON_KEY', 'anon');
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_x');
Deno.env.set('STRIPE_WEBHOOK_SECRET', 'whsec_test');
Deno.env.set('SITE_URL', 'https://site.test/');

// deno-lint-ignore no-explicit-any
type Json = any;
const rows = new Map<string, { path: string; data: Json; owner: string | null }>();
const stripeCalls: { path: string; params: URLSearchParams; key: string | null }[] = [];
const users: Record<string, Json> = {
  'tok-client': { id: 'u-client', email: 'client@test.com', email_confirmed_at: '2026-01-01' },
  'tok-other': { id: 'u-other', email: 'other@test.com', email_confirmed_at: '2026-01-01' },
  'tok-team': { id: 'u-team', email: 'team@test.com', email_confirmed_at: '2026-01-01' },
};
function reset() {
  rows.clear(); stripeCalls.length = 0;
  const put = (path: string, data: Json, owner: string | null = null) => rows.set(path, { path, data, owner });
  put('team/team@test.com', { email: 'team@test.com' });
  put('settings/company', { company: 'Shared Gear Pool', pickup: 'The unit' });
  put('bookings/b1', { id: 'b1', ref: 'SGP-1', status: 'quoted', project: 'Spot', protection: 'coi', client: { email: 'client@test.com', name: 'Cee' }, pickup: '2026-10-16', pickupTime: '15:00', returnDate: '2026-10-19', returnTime: '10:00', shootDays: 1, deposit: { status: 'none' }, bill: { total: 1000, deposit: 250, repl: 5000 } }, 'u-client');
  put('bookings/b2', { id: 'b2', ref: 'SGP-2', status: 'confirmed', protection: 'hold', client: { email: 'client@test.com' }, pickup: '2026-10-20', returnDate: '2026-10-21', bill: { total: 400, deposit: 100, repl: 3000 } }, 'u-client');
  put('bookings/b3', { id: 'b3', ref: 'SGP-3', status: 'cancelled', pickup: '2026-10-20', returnDate: '2026-10-21' }, null);
}
const ok = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const h = new Headers(init.headers);
  if (url.host === 'db.test' && url.pathname === '/auth/v1/user') { const u = users[(h.get('Authorization') || '').replace('Bearer ', '')]; return u ? ok(u) : ok({ msg: 'bad jwt' }, 401); }
  if (url.host === 'db.test') {
    assertEquals(h.get('apikey'), 'service-jwt');
    if (url.pathname === '/rest/v1/rpc/merge_doc') { const b = JSON.parse(String(init.body)); const r = rows.get(b.p_path); if (r) r.data = { ...r.data, ...b.p_patch }; return new Response(null, { status: 204 }); }
    if (init.method === 'POST') { for (const r of JSON.parse(String(init.body))) { const prev = rows.get(r.path); rows.set(r.path, { path: r.path, data: r.data, owner: 'owner' in r ? r.owner : prev ? prev.owner : null }); } return new Response(null, { status: 201 }); }
    const p = url.searchParams.get('path'); const c = url.searchParams.get('coll'); const bid = url.searchParams.get('data->>bookingId');
    let list = [...rows.values()];
    if (p) list = list.filter((r) => r.path === p.replace(/^eq\./, ''));
    if (c) list = list.filter((r) => r.path.startsWith(c.replace(/^eq\./, '') + '/'));
    if (bid) list = list.filter((r) => r.data.bookingId === bid.replace(/^eq\./, ''));
    return ok(list);
  }
  if (url.host === 'api.stripe.com') {
    const params = new URLSearchParams(String(init.body || ''));
    stripeCalls.push({ path: url.pathname.replace('/v1/', ''), params, key: h.get('Idempotency-Key') });
    if (url.pathname === '/v1/checkout/sessions') return ok({ id: 'cs_test_' + stripeCalls.length, url: 'https://checkout.stripe.test/c/' + stripeCalls.length });
    return ok({ id: url.pathname.split('/')[3], status: 'ok' });
  }
  throw new Error('unexpected fetch ' + url.href);
}) as typeof fetch;

const checkout = (await import('../../supabase/functions/stripe-checkout/index.ts')).handler;
const webhook = (await import('../../supabase/functions/stripe-webhook/index.ts')).handler;
const hold = (await import('../../supabase/functions/stripe-hold/index.ts')).handler;
const calendar = (await import('../../supabase/functions/calendar/index.ts')).handler;
const post = (fn: (r: Request) => Promise<Response>, token: string | null, body: Json) =>
  fn(new Request('https://fn.test/', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: JSON.stringify(body) }));
async function signed(body: Json, secret = 'whsec_test', t = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(body);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)))).map((b) => b.toString(16).padStart(2, '0')).join('');
  return new Request('https://fn.test/', { method: 'POST', headers: { 'Stripe-Signature': `t=${t},v1=${mac}` }, body: raw });
}

Deno.test('checkout: the client pays their own deposit, worked out on the server', async () => {
  reset();
  assertEquals((await post(checkout, null, { bookingId: 'b1', kind: 'deposit' })).status, 401);
  assertEquals((await post(checkout, 'tok-other', { bookingId: 'b1', kind: 'deposit' })).status, 404);
  const r = await post(checkout, 'tok-client', { bookingId: 'b1', kind: 'deposit', amount: 1 });
  assertEquals(r.status, 200);
  assertEquals((await r.json()).url, 'https://checkout.stripe.test/c/1');
  const p = stripeCalls[0].params;
  assertEquals(p.get('line_items[0][price_data][unit_amount]'), '25000');
  assertEquals(p.get('metadata[booking_id]'), 'b1');
  assertEquals(p.get('success_url'), 'https://site.test/#paid/b1/deposit');
  assertEquals(p.get('customer_email'), 'client@test.com');
  assertEquals(p.get('payment_intent_data[capture_method]'), null);
  assert(stripeCalls[0].key && stripeCalls[0].key.startsWith('checkout-b1-deposit-25000-'));
});

Deno.test('checkout: the balance subtracts what is paid; holds only where the job uses one', async () => {
  reset();
  rows.set('payments/p1', { path: 'payments/p1', data: { id: 'p1', bookingId: 'b1', kind: 'deposit', amount: 250, status: 'received' }, owner: 'u-client' });
  rows.set('payments/p2', { path: 'payments/p2', data: { id: 'p2', bookingId: 'b1', kind: 'balance', amount: 100, status: 'reported' }, owner: 'u-client' });
  assertEquals((await post(checkout, 'tok-client', { bookingId: 'b1', kind: 'deposit' })).status, 409);
  assertEquals((await post(checkout, 'tok-team', { bookingId: 'b1', kind: 'balance' })).status, 200);
  assertEquals(stripeCalls[0].params.get('line_items[0][price_data][unit_amount]'), '75000');
  assertEquals((await post(checkout, 'tok-client', { bookingId: 'b1', kind: 'hold' })).status, 409);
  assertEquals((await post(checkout, 'tok-client', { bookingId: 'b2', kind: 'hold' })).status, 200);
  assertEquals(stripeCalls[1].params.get('payment_intent_data[capture_method]'), 'manual');
  assertEquals(stripeCalls[1].params.get('line_items[0][price_data][unit_amount]'), '300000');
  assertEquals((await post(checkout, 'tok-client', { bookingId: 'b3', kind: 'deposit' })).status, 404);
  assertEquals((await post(checkout, 'tok-client', { bookingId: '../x', kind: 'deposit' })).status, 400);
});

Deno.test('webhook: only Stripe-signed events count, and each payment is recorded once', async () => {
  reset();
  const evt = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_9', payment_status: 'paid', amount_total: 25000, payment_intent: 'pi_9', metadata: { booking_id: 'b1', kind: 'deposit' } } } };
  assertEquals((await webhook(await signed(evt, 'whsec_wrong'))).status, 400);
  assertEquals((await webhook(await signed(evt, 'whsec_test', Math.floor(Date.now() / 1000) - 3600))).status, 400);
  assertEquals((await webhook(await signed(evt))).status, 200);
  assertEquals((await webhook(await signed(evt))).status, 200);
  const pays = [...rows.values()].filter((r) => r.path.startsWith('payments/'));
  assertEquals(pays.length, 1);
  assertEquals(pays[0].owner, 'u-client');
  assertEquals(pays[0].data.amount, 250);
  assertEquals(pays[0].data.status, 'paid');
  assertEquals(rows.get('bookings/b1')!.data.deposit.status, 'received');
  assertEquals(rows.get('bookings/b1')!.data.payment, 'unpaid');
  assertEquals(rows.get('bookings/b1')!.data.project, 'Spot');
});

Deno.test('webhook and hold: a card hold is placed, then released by the team', async () => {
  reset();
  await webhook(await signed({ type: 'checkout.session.completed', data: { object: { id: 'cs_h', payment_status: 'unpaid', amount_total: 300000, payment_intent: 'pi_h', metadata: { booking_id: 'b2', kind: 'hold' } } } }));
  const p = [...rows.values()].find((r) => r.path.startsWith('payments/'))!;
  assertEquals(p.data.status, 'authorized');
  assertEquals(rows.get('bookings/b2')!.data.hold.placed, true);
  assertEquals((await post(hold, 'tok-client', { paymentId: p.data.id, action: 'release' })).status, 403);
  assertEquals((await post(hold, 'tok-team', { paymentId: p.data.id, action: 'capture', amount: 5000 })).status, 400);
  assertEquals((await post(hold, 'tok-team', { paymentId: p.data.id, action: 'release' })).status, 200);
  assertEquals(stripeCalls[0].path, 'payment_intents/pi_h/cancel');
  assertEquals(rows.get(p.path)!.data.status, 'released');
  assertEquals(rows.get('bookings/b2')!.data.hold.placed, false);
  await webhook(await signed({ type: 'payment_intent.canceled', data: { object: { id: 'pi_h', metadata: { booking_id: 'b2', kind: 'hold' } } } }));
  assertEquals(rows.get(p.path)!.data.status, 'released');
});

Deno.test('calendar: the feed needs its token, and carries a reminder the day before each return', async () => {
  reset();
  const get = (q: string) => calendar(new Request('https://fn.test/calendar' + q));
  assertEquals((await get('?token=' + 'a'.repeat(48))).status, 404);
  rows.set('secrets/calendar', { path: 'secrets/calendar', data: { token: 'f'.repeat(48) }, owner: null });
  assertEquals((await get('?token=' + 'a'.repeat(48))).status, 404);
  assertEquals((await get('?token=short')).status, 404);
  const r = await get('?token=' + 'f'.repeat(48));
  assertEquals(r.status, 200);
  assert((r.headers.get('Content-Type') || '').startsWith('text/calendar'));
  const body = await r.text();
  assert(body.includes('UID:b1-out@sharedgearpool') && body.includes('DTSTART;TZID=America/New_York:20261016T150000'));
  assert(body.includes('TRIGGER:-P1D'));
  assert(!body.includes('SGP-3'), 'cancelled jobs stay off the calendar');
  assert(body.split('\r\n').every((l) => l.length <= 75), 'long lines are folded');
});

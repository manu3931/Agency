/* Releases a card hold, or charges part or all of it for damage or loss. Only the team can call it. */
import { caller, cors, db, env, flagsFor, json, onTeam, paymentsFor, stripe } from '../_shared/desk.ts';

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!env('STRIPE_SECRET_KEY')) return json({ error: 'Card payments are not set up.' }, 503);
  const user = await caller(req);
  if (!(await onTeam(user))) return json({ error: 'Only the team can do that.' }, 403);
  let body: { paymentId?: string; action?: string; amount?: number };
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const pid = String(body.paymentId || ''); const action = String(body.action || '');
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(pid) || !['release', 'capture'].includes(action)) return json({ error: 'Bad request.' }, 400);
  const prow = await db.get('payments/' + pid); const p = prow && prow.data;
  if (!p || p.kind !== 'hold' || p.status !== 'authorized' || !p.stripe || !p.stripe.intent) return json({ error: 'That hold is not active.' }, 409);
  const cents = Math.round(Number(body.amount || 0) * 100);
  if (action === 'capture' && (cents < 50 || cents > Math.round(Number(p.amount) * 100))) return json({ error: `Charge between $0.50 and $${Number(p.amount).toFixed(2)}.` }, 400);
  if (action === 'release') await stripe(`payment_intents/${p.stripe.intent}/cancel`, { cancellation_reason: 'requested_by_customer' });
  else await stripe(`payment_intents/${p.stripe.intent}/capture`, { amount_to_capture: cents });
  const next = { ...p, status: action === 'release' ? 'released' : 'captured', endedAt: new Date().toISOString(), endedBy: user!.email, ...(action === 'capture' ? { captured: cents / 100 } : {}) };
  await db.put('payments/' + pid, next, prow!.owner);
  const row = await db.get('bookings/' + p.bookingId);
  if (row) await db.merge('bookings/' + p.bookingId, flagsFor(row.data, (await paymentsFor(p.bookingId)).map((x) => (x.id === pid ? next : x))));
  return json({ ok: true, status: next.status });
}

if (import.meta.main) Deno.serve(handler);

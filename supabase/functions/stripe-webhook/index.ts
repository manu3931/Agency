/* Stripe tells the desk when a checkout went through or a hold ended. Each payment is recorded once (its path is
   the Stripe session's), and the job's deposit, paid and hold flags are worked out again from all its payments.
   Deployed without Supabase's own JWT check, since Stripe signs its calls instead; the signature is verified here. */
import { db, env, flagsFor, json, paymentsFor, verifyStripe, type Json } from '../_shared/desk.ts';

async function recordSession(s: Json): Promise<void> {
  const id = s.metadata && s.metadata.booking_id; const kind = s.metadata && s.metadata.kind;
  if (!id || !['deposit', 'balance', 'hold'].includes(kind)) return;
  if (kind !== 'hold' && s.payment_status !== 'paid') return;
  const row = await db.get('bookings/' + id); if (!row) return;
  const pid = 'card-' + String(s.id).replace(/[^A-Za-z0-9_-]/g, '').slice(-80);
  const pay = { id: pid, bookingId: id, ref: row.data.ref, method: 'card', kind, amount: Number(s.amount_total || 0) / 100, status: kind === 'hold' ? 'authorized' : 'paid', note: '', at: new Date().toISOString(), stripe: { session: s.id, intent: s.payment_intent || '' } };
  const existing = await db.get('payments/' + pid);
  if (!existing) await db.put('payments/' + pid, pay, row.owner);
  await db.merge('bookings/' + id, flagsFor(row.data, await paymentsFor(id)));
}
async function holdEnded(pi: Json, status: 'released' | 'captured'): Promise<void> {
  const id = pi.metadata && pi.metadata.booking_id; if (!id || pi.metadata.kind !== 'hold') return;
  const pays = await paymentsFor(id); const p = pays.find((x) => x.stripe && x.stripe.intent === pi.id); if (!p) return;
  if (p.status === status) return;
  const next = { ...p, status, endedAt: new Date().toISOString(), ...(status === 'captured' ? { captured: Number(pi.amount_received || 0) / 100 } : {}) };
  const row = await db.get('bookings/' + id);
  await db.put('payments/' + p.id, next, row ? row.owner : undefined);
  if (row) await db.merge('bookings/' + id, flagsFor(row.data, pays.map((x) => (x.id === p.id ? next : x))));
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const raw = await req.text();
  if (!(await verifyStripe(raw, req.headers.get('Stripe-Signature'), env('STRIPE_WEBHOOK_SECRET')))) return json({ error: 'Bad signature.' }, 400);
  const evt = JSON.parse(raw); const obj = evt.data && evt.data.object;
  if (evt.type === 'checkout.session.completed' || evt.type === 'checkout.session.async_payment_succeeded') await recordSession(obj);
  else if (evt.type === 'payment_intent.canceled') await holdEnded(obj, 'released');
  else if (evt.type === 'payment_intent.succeeded' && obj && obj.capture_method === 'manual') await holdEnded(obj, 'captured');
  return json({ received: true });
}

if (import.meta.main) Deno.serve(handler);

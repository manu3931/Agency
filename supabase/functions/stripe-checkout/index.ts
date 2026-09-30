/* Starts a Stripe Checkout for a job's deposit, its balance, or a card hold, and returns the page to send the
   client to. The amount is worked out here from the quote the team sent and the payments already in, never
   taken from the browser. Called by the site as the signed-in client (or a teammate). */
import { caller, cors, db, env, json, onTeam, paidOf, paymentsFor, stripe } from '../_shared/desk.ts';

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!env('STRIPE_SECRET_KEY')) return json({ error: 'Card payments are not set up yet. Pay by Venmo or Zelle for now.' }, 503);
  const site = env('SITE_URL').replace(/#.*$/, '');
  if (!/^https?:\/\//.test(site)) return json({ error: 'SITE_URL is not set on the server.' }, 503);
  const user = await caller(req);
  if (!user) return json({ error: 'Sign in first.' }, 401);
  let body: { bookingId?: string; kind?: string };
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const id = String(body.bookingId || ''); const kind = String(body.kind || '');
  if (!/^[A-Za-z0-9_.@+-]{1,120}$/.test(id) || !['deposit', 'balance', 'hold'].includes(kind)) return json({ error: 'Bad request.' }, 400);

  const row = await db.get('bookings/' + id);
  if (!row || (row.owner !== user.id && !(await onTeam(user)))) return json({ error: 'That booking was not found.' }, 404);
  const b = row.data; const bill = b.bill;
  if (b.status === 'request' || b.status === 'cancelled' || !bill || !(Number(bill.total) > 0)) return json({ error: 'There is nothing to pay on this booking yet.' }, 409);

  const pays = await paymentsFor(id); const paid = paidOf(pays);
  let dollars = 0; let label = '';
  if (kind === 'hold') {
    if (b.protection !== 'hold') return json({ error: 'This booking is not covered by a card hold.' }, 409);
    if (pays.some((p) => p.kind === 'hold' && p.status === 'authorized')) return json({ error: 'The card hold is already placed.' }, 409);
    dollars = Number(bill.repl || 0); label = 'Card hold (released when the gear is back)';
  } else if (kind === 'deposit') { dollars = Number(bill.deposit || 0) - paid; label = 'Deposit'; }
  else { dollars = Number(bill.total) - paid; label = 'Balance'; }
  const cents = Math.round(dollars * 100);
  if (cents < 50) return json({ error: kind === 'deposit' ? 'The deposit is already paid.' : 'Nothing is owed right now.' }, 409);

  const session = await stripe('checkout/sessions', {
    mode: 'payment',
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': cents,
    'line_items[0][price_data][product_data][name]': `${label} · ${b.ref}`,
    'line_items[0][price_data][product_data][description]': String(b.project || 'Equipment rental').slice(0, 200),
    customer_email: row.owner === user.id ? user.email : (b.client && b.client.email) || undefined,
    client_reference_id: id,
    'metadata[booking_id]': id,
    'metadata[kind]': kind,
    'payment_intent_data[metadata][booking_id]': id,
    'payment_intent_data[metadata][kind]': kind,
    'payment_intent_data[description]': `${label} · ${b.ref}`,
    'payment_intent_data[capture_method]': kind === 'hold' ? 'manual' : undefined,
    success_url: `${site}#paid/${id}/${kind}`,
    cancel_url: `${site}#job/${id}`,
  }, `checkout-${id}-${kind}-${cents}-${Math.floor(Date.now() / 600000)}`);
  return json({ url: session.url });
}

if (import.meta.main) Deno.serve(handler);

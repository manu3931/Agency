/* Stand-in for a real backend when the desk runs as a plain website with no Supabase project
   configured: the public preview. Everything is kept in this browser's localStorage, so every
   visitor gets their own private copy and nobody sees anyone else's jobs.

   It answers the same calls the live site makes, including who is signed in. The preview has no
   real accounts; instead a visitor picks who to look around as (an owner, a client or someone
   who hasn't signed in), and this file applies the same rules as the live database's row-level
   security and client functions in supabase/migrations, so each view behaves as it will for real.
   Card payments are simulated. Not for real client data. */
(function () {
  'use strict';
  if (window.claude && typeof window.claude.use === 'function') return;

  const TYPES = { csv: 'text/csv', html: 'text/html', json: 'application/json', txt: 'text/plain', md: 'text/markdown', ics: 'text/calendar' };
  const downloads = {
    async save({ filename, data }) {
      const ext = String(filename).split('.').pop().toLowerCase();
      const blob = data instanceof Blob ? data : new Blob([data], { type: TYPES[ext] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { status: 'saved' };
    },
  };

  // The live site (src/config.js names a Supabase project) only borrows the file downloads.
  if (window.SGP_LIVE) { window.SGP_LOCAL = { kind: 'live', downloads }; return; }

  const KEY = 'sgp.db.v1';
  const ROLE_KEY = 'sgp.demo.role';
  const PEOPLE = {
    admin: { id: 'demo-owner', email: 'owner@example.com', name: 'You, as an owner', confirmed: true },
    client: { id: 'demo-client', email: 'client@example.com', name: 'Alex Rivera', confirmed: true },
  };
  let mem = {};
  let persistent = true;

  function read() {
    try { const raw = localStorage.getItem(KEY); return raw == null ? null : (JSON.parse(raw) || {}); }
    catch (_) { persistent = false; return null; }
  }
  function write() {
    if (!persistent) return;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); }
    catch (_) { persistent = false; if (window.console) console.warn('This browser is out of room for the preview. New changes last until the page closes.'); }
  }
  const owners = () => (mem.__owners = mem.__owners || {});
  const files = () => (mem.__files = mem.__files || {});

  const first = read();
  if (first) mem = first;
  else if (window.SGP_EXAMPLE) {
    mem['bookings/' + window.SGP_EXAMPLE.id] = window.SGP_EXAMPLE;
    owners()['bookings/' + window.SGP_EXAMPLE.id] = PEOPLE.client.id; // so "view as a client" has a quote to open
    write();
  }

  let role = 'admin';
  try { const r = localStorage.getItem(ROLE_KEY); if (r === 'client' || r === 'guest') role = r; } catch (_) { /* stays the owner */ }
  const me = () => PEOPLE[role] || null;
  const isAdmin = () => role === 'admin';

  /* The live database's read policy, in one function. */
  function visible(path) {
    if (isAdmin()) return true;
    const [coll, id] = path.split('/');
    if ((coll === 'settings' && id === 'company') || (coll === 'catalog' && id === 'public') || coll === 'photos') return true;
    return role === 'client' && ['bookings', 'payments', 'clients'].includes(coll) && owners()[path] === PEOPLE.client.id;
  }
  const denied = () => ({ code: 'permission_denied', message: 'Only the team can change this.' });

  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  const later = (fn) => setTimeout(fn, 0);
  window.addEventListener('storage', (e) => { if (e.key === KEY) { mem = read() || {}; emit(); } });

  const meta = { fromCache: false, hasPendingWrites: false };
  const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const newId = (p) => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const isChild = (coll, key) => key.startsWith(coll + '/') && key.split('/').length === coll.split('/').length + 1;
  const docSnap = (path) => ({ id: path.split('/').pop(), exists: path in mem && visible(path), data: () => (visible(path) ? copy(mem[path]) : undefined), metadata: meta });
  const collSnap = (coll) => {
    const docs = Object.keys(mem).filter((k) => isChild(coll, k) && visible(k)).sort().map(docSnap);
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
  };
  const watch = (make, next) => { const fn = () => next(make()); listeners.add(fn); later(fn); return () => listeners.delete(fn); };

  /* The live database links a job to a client's account by the email on it. */
  function put(path, data) {
    mem[path] = copy(data);
    if (path.startsWith('bookings/') && data && data.source !== 'storefront' && !data.example) {
      const em = String((data.client && data.client.email) || '').trim().toLowerCase();
      if (em && em === PEOPLE.client.email) owners()[path] = PEOPLE.client.id; else delete owners()[path];
    }
    if (path.startsWith('payments/') && data && data.bookingId && !owners()[path] && owners()['bookings/' + data.bookingId]) owners()[path] = owners()['bookings/' + data.bookingId];
    write(); later(emit);
  }

  function docRef(path) {
    return {
      id: path.split('/').pop(), path,
      get: async () => docSnap(path),
      set: async (data) => { if (!isAdmin()) throw denied(); put(path, data); },
      update: async (data) => {
        if (!isAdmin()) throw denied();
        if (!(path in mem)) throw { code: 'not_found', message: 'There is no document to update.' };
        put(path, Object.assign({}, mem[path], copy(data)));
      },
      delete: async () => {
        if (!isAdmin()) throw denied();
        if (path.startsWith('team/') && Object.keys(mem).filter((k) => k.startsWith('team/')).length <= 1) throw { code: 'error', message: 'Keep at least one person on the team.' };
        delete mem[path]; delete owners()[path]; write(); later(emit);
      },
      onSnapshot: (next) => watch(() => docSnap(path), next),
      collection: (sub) => collRef(path + '/' + sub),
    };
  }
  function collRef(coll) {
    return {
      path: coll,
      doc: (id) => docRef(coll + '/' + (id || newId())),
      add: async (data) => { const ref = docRef(coll + '/' + newId()); await ref.set(data); return ref; },
      get: async () => collSnap(coll),
      onSnapshot: (next) => watch(() => collSnap(coll), next),
    };
  }

  /* ---------- sign-in: pick who to look around as ---------- */
  const authSubs = new Set();
  const auth = {
    demo: true,
    role: () => role,
    async current() { return me(); },
    onChange(cb) { authSubs.add(cb); },
    async setRole(r) {
      role = r === 'client' || r === 'guest' ? r : 'admin';
      try { localStorage.setItem(ROLE_KEY, role); } catch (_) { /* this visit only */ }
      authSubs.forEach((cb) => cb(role === 'guest' ? 'SIGNED_OUT' : 'SIGNED_IN', me()));
      later(emit);
    },
    async signIn() { await auth.setRole('client'); },
    async signUp() { await auth.setRole('client'); return { needsConfirm: false }; },
    async magic() { throw { code: 'demo', message: 'The preview has no real accounts.' }; },
    async reset() { throw { code: 'demo', message: 'The preview has no real accounts.' }; },
    async setPassword() { /* nothing to set */ },
    async signOut() { await auth.setRole('guest'); },
  };

  /* ---------- the client functions, as the live database runs them ---------- */
  const pad = (x) => String(x).padStart(2, '0');
  const ymd = (t) => `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  const today = () => ymd(new Date());
  const addDays = (s, k) => { const [y, m, d] = s.split('-').map(Number); return ymd(new Date(y, m - 1, d + k)); };
  const okDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s));
  const n = (v, d) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const str = (v, max) => String(v == null ? '' : v).slice(0, max);
  const fail = (message) => { throw { code: 'error', message }; };
  const signedIn = () => { if (!me()) fail('Sign in first.'); return me(); };
  const mine = (id) => { const u = signedIn(); const path = 'bookings/' + id; if (!(path in mem) || owners()[path] !== u.id) fail('That booking was not found.'); return path; };
  async function sha256(text) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join(''); }
  const settings = () => mem['settings/company'] || {};
  function store(path, data, owner) { mem[path] = data; if (owner) owners()[path] = owner; write(); later(emit); }
  const paidOn = (id) => Object.keys(mem).filter((k) => k.startsWith('payments/') && mem[k].bookingId === id && ['paid', 'received', 'captured'].includes(mem[k].status) && mem[k].kind !== 'hold').reduce((a, k) => a + n(mem[k].amount, 0), 0);

  const RPC = {
    is_admin: async () => isAdmin(),
    async submit_request({ p }) {
      const u = signedIn(); p = p || {};
      const waiting = Object.keys(mem).filter((k) => k.startsWith('bookings/') && owners()[k] === u.id && mem[k].status === 'request').length;
      if (waiting >= 5) fail('You already have 5 requests waiting for a quote. We will be in touch soon.');
      if (!okDate(p.pickup) || !okDate(p.returnDate) || p.returnDate < p.pickup || p.pickup < addDays(today(), -1) || p.returnDate > addDays(today(), 730)) fail('Pick a pickup date from today on, and a return date on or after it.');
      const sd = clamp(Math.round(n(p.shootDays, 1)), 0, 60);
      const tier = (t) => (['A', 'B', 'C'].includes(t) ? t : 'C');
      const lines = (Array.isArray(p.lines) ? p.lines : []).filter((l) => /^[A-Z?]-[A-Z]{3}-\d{1,4}$/.test(l && l.id)).slice(0, 150)
        .map((l) => ({ id: l.id, qty: clamp(Math.round(n(l.qty, 1)), 1, 50), days: clamp(n(l.days, sd), 0, 365), tier: tier(l.tier), comp: false, rate: null, pkg: /^PKG-[A-Z0-9-]{1,40}$/.test(l.pkg || '') ? l.pkg : null }));
      if (!lines.length) fail('Add at least one piece of gear.');
      const crew = (Array.isArray(p.crew) ? p.crew : []).filter((c) => c && c.role).slice(0, 10)
        .map((c) => ({ role: str(c.role, 80), rate: clamp(n(c.rate, 0), 0, 10000), people: clamp(Math.round(n(c.people, 1)), 1, 10), days: clamp(n(c.days, sd), 0, 365), tier: tier(c.tier) }));
      const hand = (v, d) => (['pickup', 'delivery', 'afterhours'].includes(v) ? v : d);
      const time = (v, d) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v || '') ? v : d);
      const S = settings(); const out = hand(p.handoff && p.handoff.out, 'pickup');
      const prefix = (String(S.company || 'Rental').match(/[A-Za-z0-9]+/g) || ['R']).slice(0, 3).map((w) => w[0].toUpperCase()).join('');
      const id = newId('b');
      const ref = `${prefix}-${today().replace(/-/g, '').slice(2)}-${Math.random().toString(16).slice(2, 5).toUpperCase()}`;
      const shoot = okDate(p.shootStart) && p.shootStart >= p.pickup && p.shootStart <= p.returnDate ? p.shootStart : p.pickup;
      const student = p.discount && p.discount.kind === 'student' && n(S.studentPct, 15) > 0;
      store('bookings/' + id, {
        id, ref, status: 'request', source: 'storefront', project: str(p.project, 120),
        client: { name: str(p.client && p.client.name, 120), company: str(p.client && p.client.company, 120), email: u.email, phone: str(p.client && p.client.phone, 40) },
        pickup: p.pickup, pickupTime: time(p.pickupTime, '15:00'), shootStart: shoot, shootDays: sd, possessionDays: clamp(Math.round(n(p.possessionDays, 0)), 0, 60),
        returnDate: p.returnDate, returnTime: time(p.returnTime, '10:00'), prepDate: '', rateMode: S.rateMode === 'week' ? 'week' : 'straight',
        favor: false, budget: 'A', expendables: 0, lines, crew, notes: str(p.notes, 2000),
        handoff: { out, back: hand(p.handoff && p.handoff.back, out), address: str(p.handoff && p.handoff.address, 300) },
        protection: ['coi', 'hold', 'waiver'].includes(p.protection) ? p.protection : 'coi',
        discount: student ? { kind: 'student', pct: n(S.studentPct, 15) } : { kind: 'none', pct: 0 },
        tax: { exempt: !!(p.tax && p.tax.exempt === true), cert: false },
        coi: { status: 'none' }, hold: { placed: false }, waiver: { accepted: false }, contract: { status: 'draft' }, deposit: { status: 'none' },
        checkout: { out: {}, back: {}, notes: {} }, createdAt: new Date().toISOString(), createdBy: u.id,
      }, u.id);
      return { id, ref };
    },
    async client_sign({ p_id, p_name, p_signature, p_hash, p_consent }) {
      const path = mine(p_id); const b = mem[path]; const c = b.contract || {};
      if (c.status !== 'sent' || !c.text) fail('This agreement is not ready to sign yet.');
      if (p_hash !== await sha256(c.text)) fail('The agreement changed since you opened it. Reload the page to read the latest version.');
      if (!p_consent) fail('Tick the box to agree to sign electronically.');
      if (String(p_name || '').trim().length < 2 || String(p_name).length > 120) fail('Type your full name.');
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p_signature || '') || p_signature.length > 300000) fail('Draw your signature in the box.');
      const signed = Object.assign({}, c, { status: 'signed', signer: String(p_name).trim(), signedOn: today(), signedAt: new Date().toISOString(), signature: p_signature, signedBy: me().id, signedHash: p_hash, signedFrom: 'preview', signedAgent: navigator.userAgent.slice(0, 300) });
      const next = Object.assign({}, b, { contract: signed });
      if (b.protection === 'waiver') next.waiver = Object.assign({}, b.waiver, { accepted: true, acceptedAt: new Date().toISOString() });
      store(path, next);
      const r = Object.assign({}, signed); delete r.signature; delete r.html; delete r.text; return r;
    },
    async client_report_payment({ p_id, p_method, p_kind, p_amount, p_note }) {
      const path = mine(p_id); const u = me();
      if (!['venmo', 'zelle'].includes(p_method)) fail('Choose Venmo or Zelle.');
      const amount = n(p_amount, 0); if (amount <= 0 || amount > 100000) fail('Enter the amount you sent.');
      const open = Object.keys(mem).filter((k) => k.startsWith('payments/') && owners()[k] === u.id && mem[k].bookingId === p_id && mem[k].status === 'reported').length;
      if (open >= 5) fail('We already have your payment notes for this booking. We will confirm them soon.');
      const id = newId('p');
      store('payments/' + id, { id, bookingId: p_id, ref: mem[path].ref, method: p_method, kind: ['deposit', 'balance'].includes(p_kind) ? p_kind : 'balance', amount: Math.round(amount * 100) / 100, status: 'reported', note: str(p_note, 200), at: new Date().toISOString(), by: u.id }, u.id);
      return { id };
    },
    async client_cancel({ p_id }) {
      const path = mine(p_id); if (mem[path].status !== 'request') fail('This booking is already quoted. Get in touch to change or cancel it.');
      store(path, Object.assign({}, mem[path], { status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: 'client' }));
      return { id: p_id, status: 'cancelled' };
    },
    async client_save_profile({ p }) {
      const u = signedIn(); const path = 'clients/' + u.id; p = p || {};
      const patch = { uid: u.id, email: u.email, name: str(p.name, 120), company: str(p.company, 120), phone: str(p.phone, 40) };
      store(path, Object.assign({ docs: [] }, mem[path], patch), u.id);
      return patch;
    },
    async client_add_doc({ p_kind, p_file, p_name, p_expires, p_booking }) {
      const u = signedIn();
      if (!['coi', 'st121'].includes(p_kind)) fail('Unknown document type.');
      if (!p_file || !String(p_file).startsWith(u.id + '/') || /\.\./.test(p_file)) fail('Upload the file first.');
      const path = 'clients/' + u.id; const rec = Object.assign({ uid: u.id, email: u.email, docs: [] }, mem[path]);
      if ((rec.docs || []).length >= 40) fail('That is a lot of documents. Get in touch and we will tidy them up.');
      const entry = { id: newId('d'), kind: p_kind, file: p_file, name: str(p_name, 200), expires: okDate(p_expires) ? p_expires : '', at: new Date().toISOString(), status: 'new', from: 'client' };
      rec.docs = (rec.docs || []).concat([entry]); store(path, rec, u.id);
      if (p_booking) {
        const bp = 'bookings/' + p_booking;
        if (bp in mem && owners()[bp] === u.id) {
          const b = Object.assign({}, mem[bp]);
          if (p_kind === 'coi') { const c = b.coi || {}; b.coi = Object.assign({}, c, { status: ['none', 'requested', 'rejected', undefined].includes(c.status) ? 'received' : c.status, file: p_file, docId: entry.id, expires: entry.expires || c.expires || '' }); }
          else b.tax = Object.assign({}, b.tax, { exempt: true, certFile: p_file, certDocId: entry.id });
          store(bp, b);
        }
      }
      return entry;
    },
    async claim_my_bookings() { return 0; },
    async busy_holds({ p_from, p_to }) {
      return Object.keys(mem).filter((k) => k.startsWith('bookings/')).map((k) => mem[k])
        .filter((b) => ['request', 'quoted', 'confirmed', 'out'].includes(b.status) && b.pickup <= p_to && (b.returnDate >= p_from || b.status === 'out'))
        .map((b, i) => ({ id: 'h' + i + String(b.id || '').slice(-4), status: b.status, pickup: b.pickup, returnDate: b.returnDate, budget: b.budget || 'A', lines: (b.lines || []).map((l) => ({ id: l.id, qty: l.qty, tier: l.tier || 'C' })) }));
    },
    /* What the Stripe webhook does when a card payment goes through, for the simulated checkout. */
    async demo_card_paid({ p_id, p_kind, p_amount }) {
      const u = signedIn(); const path = 'bookings/' + p_id; if (!(path in mem)) fail('That booking was not found.');
      if (!isAdmin() && owners()[path] !== u.id) fail('That booking was not found.');
      const id = newId('p'); const hold = p_kind === 'hold'; const amount = Math.round(n(p_amount, 0) * 100) / 100;
      store('payments/' + id, { id, bookingId: p_id, ref: mem[path].ref, method: 'card', kind: p_kind, amount, status: hold ? 'authorized' : 'paid', note: 'Simulated card payment (preview)', at: new Date().toISOString(), by: u.id, stripe: { simulated: true } }, owners()[path]);
      const b = Object.assign({}, mem[path]); const paid = paidOn(p_id); const bill = b.bill || {};
      if (hold) b.hold = Object.assign({}, b.hold, { placed: true, amount, at: new Date().toISOString(), payment: id });
      else {
        if (paid + 0.5 >= n(bill.deposit, 0)) b.deposit = Object.assign({}, b.deposit, { status: 'received', at: new Date().toISOString() });
        if (bill.total && paid + 0.5 >= n(bill.total, 0)) b.payment = 'paid';
      }
      store(path, b);
      return { id };
    },
  };
  async function rpc(name, args) { const f = RPC[name]; if (!f) throw { code: 'not_found', message: `No function ${name} in the preview.` }; return f(args || {}); }

  /* ---------- files: kept as data URLs in the browser ---------- */
  const asDataUrl = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
  const filesApi = {
    local: true,
    async photo(itemId, full, thumb) { const url = await asDataUrl(thumb); return { url, thumb: url, ref: '' }; },
    async removePhoto() { /* the data URL goes with the photo */ },
    async clientDoc(file, ownerId) {
      if (file.size > 1500000) throw { code: 'too_big', message: 'The preview keeps files in this browser, so they have to be under 1.5 MB. The live site takes up to 15 MB.' };
      const path = `${ownerId}/${Date.now().toString(36)}-${String(file.name || 'document').replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80)}`;
      files()[path] = await asDataUrl(file); write();
      return { path, name: file.name || 'document' };
    },
    async docUrl(path) { if (!files()[path]) throw { code: 'not_found', message: 'That file is not in this browser.' }; return files()[path]; },
  };

  window.SGP_LOCAL = { kind: 'preview', db: { doc: docRef, collection: collRef }, downloads, auth, rpc, files: filesApi, user: null, mcp: null, people: PEOPLE };
})();

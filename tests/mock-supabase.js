/* A stand-in for supabase-js, for tests only: just enough of createClient to drive src/supabase-runtime.js
   the way the live site does. The docs table follows the same read rule as the real row-level security
   (see supabase/migrations), writes other than the team's are refused, and every change is pushed to
   subscribers the way Realtime does. Seed data comes from window.__seed. */
(function () {
  const seed = window.__seed || {};
  const users = seed.users || [];
  const rows = new Map(Object.entries(seed.docs || {}).map(([path, v]) => [path, { path, data: v.data, owner: v.owner || null }]));
  const files = new Map();
  let session = null;
  const authSubs = new Set(); const changeSubs = new Set();
  window.__invoked = []; window.__rpc = []; window.__rows = rows;
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const me = () => (session ? users.find((u) => u.id === session.user.id) : null);
  const isAdmin = () => { const u = me(); return !!(u && u.confirmed && rows.has('team/' + u.email.toLowerCase())); };
  function visible(r) {
    const [coll, id] = r.path.split('/');
    if ((coll === 'settings' && id === 'company') || (coll === 'catalog' && id === 'public') || coll === 'photos') return true;
    if (isAdmin()) return true;
    const u = me(); return !!(u && r.owner === u.id && ['bookings', 'payments', 'clients'].includes(coll));
  }
  const emit = (eventType, row) => setTimeout(() => changeSubs.forEach((fn) => { if (eventType === 'DELETE' || visible(row)) fn({ eventType, new: eventType === 'DELETE' ? {} : copy(row), old: { path: row.path } }); }), 5);
  const denied = { code: '42501', message: 'new row violates row-level security policy for table "docs"' };
  function put(path, data, owner) {
    const prev = rows.get(path); let own = owner !== undefined ? owner : prev ? prev.owner : null;
    if (path.startsWith('bookings/') && data.source !== 'storefront') { const em = String((data.client && data.client.email) || '').toLowerCase(); const u = users.find((x) => x.confirmed && x.email.toLowerCase() === em); own = u ? u.id : null; }
    const r = { path, data: copy(data), owner: own }; rows.set(path, r); emit(prev ? 'UPDATE' : 'INSERT', r); return r;
  }

  function query() {
    const q = { filters: [], op: 'select', single: false };
    const run = () => {
      if (q.op === 'upsert') { if (!isAdmin()) return { data: null, error: denied }; put(q.row.path, q.row.data); return { data: null, error: null }; }
      const hit = [...rows.values()].filter((r) => q.filters.every(([c, v]) => (c === 'coll' ? r.path.split('/')[0] === v : r[c] === v)));
      if (q.op === 'delete') { if (!isAdmin()) return { data: null, error: denied }; hit.forEach((r) => { rows.delete(r.path); emit('DELETE', r); }); return { data: null, error: null }; }
      const out = hit.filter(visible).map((r) => ({ path: r.path, data: copy(r.data) }));
      return { data: q.single ? out[0] || null : out, error: null };
    };
    const api = {
      select() { return api; }, eq(c, v) { q.filters.push([c, v]); return api; }, limit() { return api; },
      maybeSingle() { q.single = true; return Promise.resolve(run()); },
      upsert(row) { q.op = 'upsert'; q.row = row; return Promise.resolve(run()); },
      delete() { q.op = 'delete'; return api; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return api;
  }

  const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const RPC = {
    is_admin: () => isAdmin(),
    claim_my_bookings: () => 0,
    busy_holds: () => [...rows.values()].filter((r) => r.path.startsWith('bookings/') && ['request', 'quoted', 'confirmed', 'out'].includes(r.data.status)).map((r, i) => ({ id: 'h' + i, status: r.data.status, pickup: r.data.pickup, returnDate: r.data.returnDate, budget: r.data.budget || 'A', lines: (r.data.lines || []).map((l) => ({ id: l.id, qty: l.qty, tier: l.tier })) })),
    submit_request: ({ p }) => { const u = me(); if (!u) throw { message: 'Sign in to send a request.' }; const id = newId('b'); const ref = 'SGP-TEST-' + id.slice(-3).toUpperCase(); put('bookings/' + id, Object.assign({}, p, { id, ref, status: 'request', source: 'storefront', client: Object.assign({}, p.client, { email: u.email }) }), u.id); return { id, ref }; },
    client_save_profile: ({ p }) => { const u = me(); const path = 'clients/' + u.id; const prev = rows.get(path); put(path, Object.assign({ docs: [] }, prev && prev.data, p, { uid: u.id, email: u.email }), u.id); return p; },
    client_add_doc: ({ p_kind, p_file, p_name, p_expires, p_booking }) => {
      const u = me(); if (!String(p_file).startsWith(u.id + '/')) throw { message: 'Upload the file first.' };
      const path = 'clients/' + u.id; const rec = Object.assign({ uid: u.id, email: u.email, docs: [] }, rows.get(path) && rows.get(path).data);
      const entry = { id: newId('d'), kind: p_kind, file: p_file, name: p_name, expires: p_expires || '', status: 'new', from: 'client', at: new Date().toISOString() };
      rec.docs = rec.docs.concat([entry]); put(path, rec, u.id);
      const b = p_booking && rows.get('bookings/' + p_booking);
      if (b && b.owner === u.id && p_kind === 'coi') put(b.path, Object.assign({}, b.data, { coi: Object.assign({}, b.data.coi, { status: 'received', file: p_file, expires: p_expires || '' }) }));
      return entry;
    },
  };

  const auth = {
    async getSession() { return { data: { session }, error: null }; },
    onAuthStateChange(cb) { authSubs.add(cb); setTimeout(() => cb('INITIAL_SESSION', session), 0); return { data: { subscription: { unsubscribe() { authSubs.delete(cb); } } } }; },
    async signInWithPassword({ email, password }) {
      const u = users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
      if (!u || u.password !== password) return { data: null, error: { message: 'Invalid login credentials' } };
      if (!u.confirmed) return { data: null, error: { message: 'Email not confirmed' } };
      session = { user: { id: u.id, email: u.email, user_metadata: { name: u.name || '' }, email_confirmed_at: '2026-01-01' } };
      authSubs.forEach((cb) => cb('SIGNED_IN', session)); return { data: { session }, error: null };
    },
    async signUp({ email, password, options }) {
      if (users.some((x) => x.email === email)) return { data: null, error: { message: 'User already registered' } };
      users.push({ id: newId('u'), email, password, name: options && options.data && options.data.name, confirmed: false });
      window.__signups = (window.__signups || []).concat([{ email, redirect: options && options.emailRedirectTo }]);
      return { data: { user: { email }, session: null }, error: null };
    },
    async signInWithOtp({ email }) { window.__otp = email; return { data: {}, error: null }; },
    async resetPasswordForEmail(email) { window.__reset = email; return { data: {}, error: null }; },
    async updateUser() { return { data: {}, error: null }; },
    async signOut() { session = null; authSubs.forEach((cb) => cb('SIGNED_OUT', null)); return { error: null }; },
  };

  const storage = {
    from(bucket) {
      return {
        async upload(path, blob) { if (bucket === 'gear' && !isAdmin()) return { data: null, error: denied }; if (bucket === 'client-docs' && !isAdmin() && !path.startsWith(me().id + '/')) return { data: null, error: denied }; files.set(bucket + '/' + path, blob); return { data: { path }, error: null }; },
        getPublicUrl(path) { const b = files.get(bucket + '/' + path); return { data: { publicUrl: b ? URL.createObjectURL(b) : 'about:blank' } }; },
        async remove(paths) { paths.forEach((x) => files.delete(bucket + '/' + x)); return { data: null, error: null }; },
        async createSignedUrl(path) { const b = files.get(bucket + '/' + path); return b ? { data: { signedUrl: URL.createObjectURL(b) }, error: null } : { data: null, error: { message: 'Object not found', status: 404 } }; },
      };
    },
  };

  window.supabase = {
    createClient(url, key, opts) {
      window.__client = { url, key, opts };
      return {
        from: () => query(),
        async rpc(name, args) { window.__rpc.push(name); try { return { data: copy(RPC[name] ? RPC[name](args || {}) : null), error: RPC[name] ? null : { message: 'no function ' + name } }; } catch (e) { return { data: null, error: { message: e.message } }; } },
        auth,
        storage,
        functions: { async invoke(name, { body }) { window.__invoked.push({ name, body }); return name === 'stripe-checkout' ? { data: { url: location.href.split('#')[0] + '#checkout-test' }, error: null } : { data: { ok: true }, error: null }; } },
        channel() { const ch = { on(_t, _f, fn) { changeSubs.add(fn); return ch; }, subscribe(cb) { setTimeout(() => cb && cb('SUBSCRIBED'), 0); return ch; } }; return ch; },
      };
    },
  };
})();

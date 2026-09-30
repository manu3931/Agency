/* Connects the desk to Supabase when src/config.js names a project, which turns the public
   site into the real one: accounts, shared jobs, payments, photos and client paperwork.
   It offers the app the same small database interface the claude.ai viewer does (doc and
   collection, get/set/delete, onSnapshot), backed by the public.docs table, plus sign-in,
   file storage and the server functions. Row-level security in supabase/migrations decides
   what each person gets back, so this file never has to. */
(function () {
  'use strict';
  const CFG = window.SGP_CONFIG || {};
  if (window.claude && typeof window.claude.use === 'function') return;
  const KEY = CFG.supabaseKey || CFG.supabaseAnonKey;
  if (!CFG.supabaseUrl || !KEY) return;

  const here = (document.currentScript && document.currentScript.src) || location.href;
  const libUrl = new URL('vendor/supabase.js', here).href;
  const siteUrl = CFG.siteUrl || (location.origin + location.pathname);

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = libUrl; s.async = true;
      s.onload = () => (window.supabase && window.supabase.createClient ? resolve(window.supabase) : reject(new Error('Supabase did not load.')));
      s.onerror = () => reject(new Error('Supabase could not be loaded.'));
      document.head.appendChild(s);
    });
  }

  /* Errors come back in the app's terms: permission_denied, not_found, or a readable message. */
  function norm(e) {
    if (!e) return { code: 'unknown', message: 'Something went wrong.' };
    const code = e.code === '42501' || /row-level security|permission denied/i.test(e.message || '') ? 'permission_denied'
      : e.status === 404 ? 'not_found' : e.code || 'error';
    return { code, message: e.message || String(e) };
  }
  const safeKey = (s) => String(s).replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 80);

  function makeDb(sb) {
    const cache = new Map();
    const watchers = new Set();
    const meta = { fromCache: false, hasPendingWrites: false };
    const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
    const isChild = (coll, path) => path.startsWith(coll + '/') && path.split('/').length === 2;
    const docSnap = (path) => ({ id: path.split('/').pop(), exists: cache.has(path), data: () => copy(cache.get(path)), metadata: meta });
    const collSnap = (coll) => {
      const docs = [...cache.keys()].filter((k) => isChild(coll, k)).sort().map(docSnap);
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
    };
    const notify = (path) => watchers.forEach((w) => { if (w.coll ? isChild(w.coll, path) : w.path === path) w.emit(); });

    async function fetchColl(coll) {
      const { data, error } = await sb.from('docs').select('path,data').eq('coll', coll).limit(5000);
      if (error) throw norm(error);
      [...cache.keys()].filter((k) => isChild(coll, k)).forEach((k) => cache.delete(k));
      (data || []).forEach((r) => cache.set(r.path, r.data));
    }
    async function fetchDoc(path) {
      const { data, error } = await sb.from('docs').select('path,data').eq('path', path).maybeSingle();
      if (error) throw norm(error);
      if (data) cache.set(path, data.data); else cache.delete(path);
    }
    async function refresh(w) {
      try { if (w.coll) await fetchColl(w.coll); else await fetchDoc(w.path); w.emit(); }
      catch (e) { if (w.error) w.error(e); }
    }
    const refreshAll = () => Promise.all([...watchers].map(refresh));

    let channel = null;
    function listen() {
      if (channel) return;
      channel = sb.channel('docs-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, (p) => {
          const path = (p.new && p.new.path) || (p.old && p.old.path); if (!path) return;
          if (p.eventType === 'DELETE') cache.delete(path); else if (p.new && p.new.data) cache.set(path, p.new.data);
          notify(path);
        })
        .subscribe((status) => { if (status === 'SUBSCRIBED') refreshAll(); });
    }
    /* Signing in or out changes what the database lets this person see, so everything reloads. */
    sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(refreshAll, 0); });
    let lastFocus = Date.now();
    const onFocus = () => { if (Date.now() - lastFocus > 30000) { lastFocus = Date.now(); refreshAll(); } };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) onFocus(); });

    function watch(spec, next, error) {
      const w = Object.assign({ next, error }, spec);
      w.emit = () => { try { next(spec.coll ? collSnap(spec.coll) : docSnap(spec.path)); } catch (e) { console.error(e); } };
      watchers.add(w); listen(); refresh(w);
      return () => watchers.delete(w);
    }
    function docRef(path) {
      return {
        id: path.split('/').pop(), path,
        async get() { await fetchDoc(path); return docSnap(path); },
        async set(data) {
          const { error } = await sb.from('docs').upsert({ path, data }, { onConflict: 'path' });
          if (error) throw norm(error);
          cache.set(path, copy(data)); notify(path);
        },
        async update(data) {
          if (!cache.has(path)) await fetchDoc(path);
          if (!cache.has(path)) throw { code: 'not_found', message: 'There is no document to update.' };
          await this.set(Object.assign({}, cache.get(path), copy(data)));
        },
        async delete() {
          const { error } = await sb.from('docs').delete().eq('path', path);
          if (error) throw norm(error);
          cache.delete(path); notify(path);
        },
        onSnapshot: (next, error) => watch({ path }, next, error),
      };
    }
    function collRef(coll) {
      return {
        path: coll,
        doc: (id) => docRef(coll + '/' + (id || Math.random().toString(36).slice(2, 12))),
        async get() { await fetchColl(coll); return collSnap(coll); },
        onSnapshot: (next, error) => watch({ coll }, next, error),
      };
    }
    return { doc: docRef, collection: collRef, refresh: refreshAll };
  }

  function makeAuth(sb) {
    const toUser = (u) => (u ? { id: u.id, email: u.email || '', name: (u.user_metadata && u.user_metadata.name) || '', confirmed: !!(u.email_confirmed_at || u.confirmed_at) } : null);
    const need = (r) => { if (r.error) throw norm(r.error); return r.data; };
    return {
      async current() { const d = need(await sb.auth.getSession()); return d.session ? toUser(d.session.user) : null; },
      onChange(cb) { sb.auth.onAuthStateChange((event, session) => cb(event, session ? toUser(session.user) : null)); },
      async signIn(email, password) { need(await sb.auth.signInWithPassword({ email, password })); },
      async signUp(email, password, name) {
        const d = need(await sb.auth.signUp({ email, password, options: { data: { name: name || '' }, emailRedirectTo: siteUrl } }));
        return { needsConfirm: !d.session };
      },
      async magic(email) { need(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: siteUrl } })); },
      async reset(email) { need(await sb.auth.resetPasswordForEmail(email, { redirectTo: siteUrl })); },
      async setPassword(password) { need(await sb.auth.updateUser({ password })); },
      async signOut() { need(await sb.auth.signOut()); },
    };
  }

  function makeFiles(sb) {
    const gear = () => sb.storage.from('gear'); const docs = () => sb.storage.from('client-docs');
    const up = async (bucket, path, blob) => { const { error } = await bucket.upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false, cacheControl: '31536000' }); if (error) throw norm(error); };
    return {
      async photo(itemId, full, thumb) {
        const ref = `items/${safeKey(itemId)}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        await up(gear(), ref + '.jpg', full); await up(gear(), ref + '-t.jpg', thumb);
        return { url: gear().getPublicUrl(ref + '.jpg').data.publicUrl, thumb: gear().getPublicUrl(ref + '-t.jpg').data.publicUrl, ref };
      },
      async removePhoto(ref) { if (!ref) return; const { error } = await gear().remove([ref + '.jpg', ref + '-t.jpg']); if (error) throw norm(error); },
      async clientDoc(file, ownerId) {
        const clean = String(file.name || 'document').replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80);
        const path = `${ownerId}/${Date.now().toString(36)}-${clean}`;
        const { error } = await docs().upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
        if (error) throw norm(error);
        return { path, name: file.name || clean };
      },
      async docUrl(path) { const { data, error } = await docs().createSignedUrl(path, 600); if (error) throw norm(error); return data.signedUrl; },
    };
  }

  window.SGP_LIVE = loadLib().then((lib) => {
    const sb = lib.createClient(CFG.supabaseUrl, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return {
      kind: 'live',
      siteUrl,
      db: makeDb(sb),
      auth: makeAuth(sb),
      files: makeFiles(sb),
      async rpc(name, args) { const { data, error } = await sb.rpc(name, args || {}); if (error) throw norm(error); return data; },
      async fn(name, body) {
        const { data, error } = await sb.functions.invoke(name, { body });
        if (error) {
          let message = error.message;
          try { const j = error.context && typeof error.context.json === 'function' ? await error.context.json() : null; if (j && j.error) message = j.error; } catch (_) { /* keep the generic message */ }
          throw { code: 'function_error', message };
        }
        return data;
      },
      feedUrl: (token) => `${CFG.supabaseUrl.replace(/\/$/, '')}/functions/v1/calendar?token=${encodeURIComponent(token)}`,
    };
  });
})();

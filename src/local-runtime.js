/* Stand-in for the claude.ai runtime when the desk runs as a plain website.
   On claude.ai the viewer provides window.claude, with a database shared by everyone the page is shared with.
   Here the same calls are answered from this browser's localStorage instead, so every visitor
   gets their own private copy and nobody sees anyone else's bookings. Not for real client data. */
(function () {
  'use strict';
  if (window.claude && typeof window.claude.use === 'function') return;

  const KEY = 'sgp.db.v1';
  let mem = {};
  let persistent = true;

  function read() {
    try { const raw = localStorage.getItem(KEY); return raw == null ? null : (JSON.parse(raw) || {}); }
    catch (_) { persistent = false; return null; }
  }
  function write() {
    if (!persistent) return;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (_) { persistent = false; }
  }

  const first = read();
  if (first) mem = first;
  else if (window.SGP_EXAMPLE) { mem['bookings/' + window.SGP_EXAMPLE.id] = window.SGP_EXAMPLE; write(); }

  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  const later = (fn) => setTimeout(fn, 0);
  window.addEventListener('storage', (e) => { if (e.key === KEY) { mem = read() || {}; emit(); } });

  const meta = { fromCache: false, hasPendingWrites: false };
  const copy = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const newId = () => Math.random().toString(36).slice(2, 12);
  const isChild = (coll, key) => key.startsWith(coll + '/') && key.split('/').length === coll.split('/').length + 1;
  const docSnap = (path) => ({ id: path.split('/').pop(), exists: path in mem, data: () => copy(mem[path]), metadata: meta });
  const collSnap = (coll) => {
    const docs = Object.keys(mem).filter((k) => isChild(coll, k)).sort().map(docSnap);
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
  };
  const watch = (make, next) => { const fn = () => next(make()); listeners.add(fn); later(fn); return () => listeners.delete(fn); };

  function docRef(path) {
    return {
      id: path.split('/').pop(), path,
      get: async () => docSnap(path),
      set: async (data) => { mem[path] = copy(data); write(); later(emit); },
      update: async (data) => {
        if (!(path in mem)) throw { code: 'invalid_argument', message: 'There is no document to update.' };
        mem[path] = Object.assign({}, mem[path], copy(data)); write(); later(emit);
      },
      delete: async () => { delete mem[path]; write(); later(emit); },
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

  const TYPES = { csv: 'text/csv', html: 'text/html', json: 'application/json', txt: 'text/plain', md: 'text/markdown' };
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

  // No user identity, no connectors: the page hides names and the Google Sheet sync.
  window.SGP_LOCAL = { db: { doc: docRef, collection: collRef }, downloads, user: null, mcp: null };
})();

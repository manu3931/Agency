/* A mock of the claude.ai viewer runtime, for tests only: an in-memory shared database,
   a signed-in user, and a downloads capability that records file names instead of saving. */
(function () {
  const store = new Map(); const subs = new Set();
  const meta = { fromCache: false, hasPendingWrites: false };
  const copy = (v) => v && JSON.parse(JSON.stringify(v));
  const docSnap = (path) => ({ id: path.split('/').pop(), exists: store.has(path), data: () => copy(store.get(path)), metadata: meta });
  const collSnap = (c) => {
    const docs = [...store.keys()].filter((k) => k.startsWith(c + '/') && k.split('/').length === c.split('/').length + 1).sort().map(docSnap);
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
  };
  const notify = () => setTimeout(() => subs.forEach((s) => s()), 5);
  const watch = (make, next) => { const f = () => next(make()); subs.add(f); setTimeout(f, 10); return () => subs.delete(f); };
  const docRef = (path) => ({
    id: path.split('/').pop(), path,
    get: async () => docSnap(path),
    set: async (d) => { store.set(path, copy(d)); notify(); },
    update: async (d) => { store.set(path, Object.assign({}, store.get(path), copy(d))); notify(); },
    delete: async () => { store.delete(path); notify(); },
    onSnapshot: (next) => watch(() => docSnap(path), next),
  });
  const collection = (c) => ({ path: c, doc: (id) => docRef(c + '/' + (id || Math.random().toString(36).slice(2))), get: async () => collSnap(c), onSnapshot: (next) => watch(() => collSnap(c), next) });
  window.__store = store; window.__saved = [];
  const caps = {
    db: { doc: docRef, collection },
    user: { id: async () => 'u_test000000000000000000', can: async () => true, canEdit: async () => true, isOwner: async () => true, profiles: async (ids) => Object.fromEntries([].concat(ids).map((i) => [i, { id: i, name: 'Tester' }])) },
    downloads: { save: async (r) => { window.__saved.push(r.filename); return { status: 'saved' }; } },
  };
  window.claude = { use: (n) => new Promise((r) => setTimeout(() => r(caps[n] || null), 30)) };
})();

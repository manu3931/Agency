(function () {
'use strict';

/* ================= helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v, d = 0) => { const n = parseFloat(String(v == null ? '' : v).replace(/[$,]/g, '')); return Number.isFinite(n) ? n : d; };
const numOrNull = (v) => { if (v == null || String(v).trim() === '' || String(v).trim() === '-') return null; const n = num(v, NaN); return Number.isFinite(n) ? n : null; };
const short = (n) => n >= 1e6 && n % 1e5 === 0 ? `$${n / 1e6}M` : null;
const money = (n) => (n == null || !Number.isFinite(n)) ? '—' : (n < 0 ? '−$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayStr = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s) || new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => { const A = parseYmd(a), B = parseYmd(b); return A && B ? Math.round((B - A) / 86400000) : 0; };
const fmtDay = (s, o) => { const d = parseYmd(s); return d ? d.toLocaleDateString('en-US', o || { weekday: 'short', month: 'short', day: 'numeric' }) : '—'; };
const fmtLong = (s) => fmtDay(s, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const fmtStamp = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const hh = ((h + 11) % 12) + 1; return (m ? `${hh}:${pad(m)}` : `${hh}`) + (h >= 12 ? ' pm' : ' am'); };
const mondayOf = (s) => { const d = parseYmd(s) || new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
const uid6 = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');
const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;
const stable = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((a, x) => (a[x] = v[x], a), {}) : v);
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);

/* ================= constants ================= */
/* Owner names, internal notes and the sheet link come from the rate card file, not the code,
   so the public repo can ship a stripped rate card without touching the app. */
const OWNERS = SNAPSHOT.owners || { M: { name: 'Owner M', short: 'M' }, C: { name: 'Owner C', short: 'C' }, S: { name: 'Owner S', short: 'S' } };
const OWN = ['M', 'C', 'S'];
const CAT_ORDER = ['Camera', 'Lens', 'Support', 'Media', 'Accessory', 'Sound', 'Electric', 'Power', 'Grip', 'Consumable'];
const STATUS = {
  request: { label: 'Request', tone: 'amber' }, quoted: { label: 'Quoted', tone: 'info' }, confirmed: { label: 'Confirmed', tone: 'good' },
  out: { label: 'Out', tone: 'accent' }, returned: { label: 'Returned', tone: 'plain' }, closed: { label: 'Closed', tone: 'plain' }, cancelled: { label: 'Cancelled', tone: 'bad' },
};
const FLOW = ['request', 'quoted', 'confirmed', 'out', 'returned', 'closed'];
const HOLDS = new Set(['request', 'quoted', 'confirmed', 'out']);
const FIRM = new Set(['confirmed', 'out']);
const EARNED = new Set(['confirmed', 'out', 'returned', 'closed']);
const TIERS = ['A', 'B', 'C'];
const TIER_NAME = { A: 'Full', B: 'Mid', C: 'Core' };
const COI_STATUS = { none: 'Not requested', requested: 'Requested', received: 'Received', verified: 'Verified', rejected: 'Rejected' };
const GE = new Set(['Electric', 'Power', 'Grip', 'Expendables', 'Safety']);
const STORE_GROUPS = [
  { key: 'packages', label: 'Packages' },
  { key: 'camera', label: 'Camera', cats: ['Camera', 'Media', 'Accessory', 'Support'] },
  { key: 'lens', label: 'Lenses', cats: ['Lens'] },
  { key: 'lighting', label: 'Lighting', cats: ['Electric'] },
  { key: 'grip', label: 'Grip & power', cats: ['Grip', 'Power'] },
  { key: 'sound', label: 'Sound', cats: ['Sound'] },
];
const DEFAULTS = {
  company: 'Shared Gear Pool',
  legalName: '',
  address: '',
  email: '',
  phone: '',
  pickup: 'Shared storage unit, New York (address on confirmation)',
  hours: 'Pickups from 3 pm, returns by 10 am',
  possessionPct: 50,
  rateMode: 'straight',
  depositPct: 25,
  glOcc: 1000000,
  glAgg: 2000000,
  lossOfUseCap: 30,
  paymentTerms: 'The deposit is due to confirm the booking. The balance is due on return.',
  lateRule: 'Equipment returned after the agreed return time bills the full day rate for each day or part day it is late.',
  cancelRule: 'Cancel 72 hours or more before pickup: no charge. Within 72 hours: 50% of the equipment total. After pickup: 100%.',
  governing: 'New York',
};
const VIEWS = [
  ['today', 'Today'], ['calendar', 'Calendar'], ['bookings', 'Bookings'], ['inventory', 'Inventory'], ['packages', 'Packages'],
  ['insurance', 'Insurance'], ['owners', 'Owners'], null, ['storefront', 'Storefront'], ['roadmap', 'Roadmap'], ['settings', 'Settings'],
];

/* ================= catalog ================= */
function buildCatalog(src) {
  const items = src.rows.map((r) => ({
    id: r[0], cat: r[1], name: r[2], qty: num(r[3]), own: r[4], kit: r[5] || '', resale: r[6], lo: r[7], rec: r[8], hi: r[9],
    basis: r[10] || '', conf: r[11] || '', notes: r[12] || '', rent: r[13] || '', payback: r[14],
  }));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const packages = src.packages.map((p) => {
    const ids = String(p[2]).split(/\s*,\s*/).filter(Boolean);
    let day = 0, repl = 0; const missing = []; const own = { M: 0, C: 0, S: 0 };
    ids.forEach((id) => { const it = byId[id]; if (!it) { missing.push(id); return; } day += (it.rec || 0) * it.qty; repl += (it.resale || 0) * it.qty; if (own[it.own] != null) own[it.own] += (it.rec || 0) * it.qty; });
    return { id: p[0], name: p[1], ids, contents: p[3], day, repl, missing, own };
  });
  const labor = src.labor.map((l) => ({ role: l[0], band: l[1], lo: l[2], rec: l[3], hi: l[4], basis: l[5] }));
  return { items, byId, packages, pkgById: Object.fromEntries(packages.map((p) => [p.id, p])), labor, asOf: src.asOf, source: src.source || 'snapshot', syncedAt: src.syncedAt || null };
}
const OPEN = SNAPSHOT.open || [];
const OPEN_BY_ITEM = {};
OPEN.forEach((o) => { if (o[0] === 'Open' && /^[A-Z]-[A-Z]{3}-\d+$/.test(o[2])) (OPEN_BY_ITEM[o[2]] = OPEN_BY_ITEM[o[2]] || []).push(o); });
/* Checks the sheet does not make on itself, found while building the desk. */
const DATA_CHECKS = SNAPSHOT.dataChecks || [];

/* ================= state ================= */
const state = {
  view: 'today', bookingId: null, tab: 'quote', draft: null, dirty: false, confirmDelete: false,
  bookings: [], dbState: 'wait', dbErr: '', readOnly: false,
  settings: Object.assign({}, DEFAULTS), catalogDoc: null, cat: buildCatalog(SNAPSHOT),
  inv: { q: '', cat: 'all', own: 'all', conf: 'all', from: '', to: '' },
  bk: { filter: 'active' },
  cal: { start: mondayOf(todayStr()) },
  store: { group: 'packages', cart: [], form: { name: '', company: '', email: '', phone: '', project: '', pickup: '', ret: '', shootDays: 1, coi: 'have', notes: '' }, sent: '' },
  road: { phase: 1, showClosed: false },
  drawer: null, picker: { q: '', open: false }, crewRole: '',
  uid: null, canWrite: null, canDownload: false, mcpReady: false, syncing: false, syncMsg: '',
};
let db = null, userNs = null, downloadsNs = null, mcpNs = null;
const main = () => $('#main');

/* ================= money logic ================= */
function inTier(lineTier, budget) { return budget === 'A' || (budget === 'B' ? lineTier !== 'A' : lineTier === 'C'); }
function weekFactor(d) {
  d = Math.max(0, Math.round(num(d)));
  const t = [0, 1, 1.85, 2.5, 3, 3, 3, 3];
  if (d <= 7) return t[d];
  const extra = Math.floor((d - 1) / 7), rem = d - extra * 7;
  return 3 + (extra - 1) * 2.5 + Math.min(t[rem], 2.5);
}
function lineRate(ln) { const it = state.cat.byId[ln.id]; return ln.rate != null && ln.rate !== '' ? num(ln.rate) : (it && it.rec) || 0; }
function calc(b) {
  const pctP = num(state.settings.possessionPct, 50) / 100;
  const res = {};
  TIERS.forEach((T) => {
    let equip = 0, dayRate = 0, comp = 0, repl = 0;
    const own = {}; OWN.forEach((o) => (own[o] = { billed: 0, comped: 0, day: 0, repl: 0, poss: 0 }));
    (b.lines || []).forEach((ln) => {
      if (!inTier(ln.tier || 'C', T)) return;
      const it = state.cat.byId[ln.id]; const rate = lineRate(ln); const qty = num(ln.qty);
      const factor = b.rateMode === 'week' ? weekFactor(ln.days) : num(ln.days);
      const total = rate * qty * factor; const o = it && own[it.own];
      const value = ((it && it.resale) || 0) * qty; repl += value; if (o) o.repl += value;
      if (ln.comp || b.favor) { comp += total; if (o) o.comped += total; }
      else { equip += total; dayRate += rate * qty; if (o) { o.billed += total; o.day += rate * qty; } }
    });
    const possession = dayRate * pctP * num(b.possessionDays);
    OWN.forEach((o) => (own[o].poss = dayRate ? possession * own[o].day / dayRate : 0));
    let crew = 0; (b.crew || []).forEach((c) => { if (inTier(c.tier || 'C', T)) crew += num(c.rate) * num(c.people) * num(c.days); });
    const exp = num(b.expendables); const late = num(b.late && b.late.fee);
    const total = equip + possession + crew + exp + late;
    res[T] = { equip, dayRate, possession, crew, exp, late, total, comp, repl, own, perDay: num(b.shootDays) ? total / num(b.shootDays) : total };
  });
  return res;
}
const chosen = (b) => calc(b)[b.budget || 'A'];
function includedLines(b) { return (b.lines || []).filter((ln) => inTier(ln.tier || 'C', b.budget || 'A')); }
function bookingEnd(b) { const t = todayStr(); return b.status === 'out' && b.returnDate && b.returnDate < t ? t : b.returnDate; }
function usage(itemId, from, to, exceptId) {
  let firm = 0, tent = 0; const who = [];
  state.bookings.forEach((b) => {
    if (b.id === exceptId || !HOLDS.has(b.status) || !b.pickup || !b.returnDate) return;
    if (!(b.pickup <= to && from <= bookingEnd(b))) return;
    let q = 0; (b.lines || []).forEach((ln) => { if (ln.id === itemId && inTier(ln.tier || 'C', b.budget || 'A')) q += num(ln.qty); });
    if (!q) return;
    if (FIRM.has(b.status)) firm += q; else tent += q;
    who.push({ b, q });
  });
  return { firm, tent, who };
}
function conflicts(b) {
  if (!b.pickup || !b.returnDate) return [];
  const need = {}; includedLines(b).forEach((ln) => (need[ln.id] = (need[ln.id] || 0) + num(ln.qty)));
  const out = [];
  Object.keys(need).forEach((id) => {
    const it = state.cat.byId[id];
    if (!it) { out.push({ id, kind: 'missing', need: need[id], have: 0, who: [] }); return; }
    const u = usage(id, b.pickup, bookingEnd(b), b.id);
    const free = it.qty - u.firm;
    if (need[id] > free) out.push({ id, kind: 'over', need: need[id], have: Math.max(0, free), who: u.who });
    else if (need[id] > free - u.tent) out.push({ id, kind: 'hold', need: need[id], have: free - u.tent, who: u.who });
  });
  return out;
}
function coiState(b) {
  const c = chosen(b); const coi = b.coi || {}; const S = state.settings;
  const checks = [
    { ok: num(coi.equipLimit) >= c.repl && c.repl > 0, t: `Equipment cover of at least ${money(c.repl)}`, have: coi.equipLimit ? money(num(coi.equipLimit)) : 'not entered' },
    { ok: num(coi.glOcc) >= num(S.glOcc), t: `General liability of ${money(num(S.glOcc))} per occurrence`, have: coi.glOcc ? money(num(coi.glOcc)) : 'not entered' },
    { ok: !!coi.expires && !!b.returnDate && coi.expires >= b.returnDate, t: 'Policy runs past the return date', have: coi.expires ? 'expires ' + fmtDay(coi.expires) : 'no expiry entered' },
    { ok: !!coi.ai && !!coi.lp, t: 'Names us as additional insured and loss payee', have: coi.ai && coi.lp ? 'both' : (coi.ai ? 'additional insured only' : coi.lp ? 'loss payee only' : 'not confirmed') },
  ];
  return { checks, allOk: checks.every((x) => x.ok), status: coi.status || 'none' };
}
function paperwork(b) {
  const coi = coiState(b);
  return {
    contract: (b.contract && b.contract.status) || 'draft',
    coi: coi.status, coiOk: coi.status === 'verified',
    deposit: (b.deposit && b.deposit.status) || 'none',
  };
}
function fifaCrew(b) { return (b.crew || []).filter((c) => num(c.rate) * num(c.days) >= 800); }

/* ================= bookings ================= */
function companyPrefix() { const w = String(state.settings.company || 'Rental').match(/[A-Za-z0-9]+/g) || ['R']; return w.slice(0, 3).map((x) => x[0].toUpperCase()).join(''); }
function newRef() { const d = new Date(); return `${companyPrefix()}-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${uid6().slice(0, 3).toUpperCase()}`; }
function newBooking(p) {
  const pickup = addDays(todayStr(), 7);
  return Object.assign({
    id: 'b' + Date.now().toString(36) + uid6(), ref: newRef(), status: 'quoted', project: '', client: { name: '', company: '', email: '', phone: '' },
    pickup, pickupTime: '15:00', shootStart: addDays(pickup, 1), shootDays: 1, possessionDays: 0, returnDate: addDays(pickup, 2), returnTime: '10:00',
    rateMode: state.settings.rateMode || 'straight', favor: false, budget: 'A', expendables: 0, lines: [], crew: [], notes: '',
    coi: { status: 'none' }, contract: { status: 'draft' }, deposit: { status: 'none' }, checkout: { out: {}, back: {}, notes: {} },
    createdAt: new Date().toISOString(), createdBy: state.uid || null,
  }, p || {});
}
function suggestPossession(b) { const nights = diffDays(b.pickup, b.returnDate); return Math.max(0, nights - num(b.shootDays)); }
function addLineTo(b, id, qty) {
  const it = state.cat.byId[id]; if (!it) return;
  const have = (b.lines || []).find((l) => l.id === id);
  if (have) { have.qty = num(have.qty) + (qty || 1); return; }
  b.lines = b.lines || [];
  b.lines.push({ id, qty: qty || 1, days: num(b.shootDays) || 1, tier: 'C', comp: false, rate: null });
}
function addPackageTo(b, pid) {
  const p = state.cat.pkgById[pid]; if (!p) return;
  p.ids.forEach((id) => { const it = state.cat.byId[id]; if (it && !(b.lines || []).some((l) => l.id === id)) { addLineTo(b, id, Math.max(1, it.qty)); b.lines[b.lines.length - 1].pkg = pid; } });
}
async function createBooking(b, openIt) {
  if (!db) { toast('Bookings need the shared database, which is not available in this view.'); return null; }
  try { await db.collection('bookings').doc(b.id).set(b); }
  catch (e) { writeError(e); return null; }
  if (openIt) openBooking(b.id, clone(b));
  return b;
}
let saveTimer = null, saving = false, saveAgain = false;
function scheduleSave(delay) { state.dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, delay == null ? 600 : delay); }
async function flushSave() {
  clearTimeout(saveTimer);
  if (!db || !state.draft) { state.dirty = false; return; }
  if (saving) { saveAgain = true; return; }
  saving = true;
  state.draft.updatedAt = new Date().toISOString(); state.draft.updatedBy = state.uid || null;
  const body = clone(state.draft);
  try { await db.collection('bookings').doc(body.id).set(body); }
  catch (e) { writeError(e); }
  saving = false;
  if (saveAgain) { saveAgain = false; flushSave(); } else { state.dirty = false; }
}
function writeError(e) {
  const code = e && e.code;
  if (code === 'invalid_argument') { state.readOnly = true; toast('You can view bookings here but not change them. Ask the owner for Contributor access.'); }
  else if (code === 'quota_exceeded') toast('The shared database is full. Delete old cancelled bookings to make room.');
  else if (code === 'resource_exhausted') toast('Too many saves at once. Wait a moment and try again.');
  else toast('That change did not save. Check your connection and try again.');
  requestRender();
}
function openBooking(id, fresh) {
  if (state.draft && state.dirty) flushSave();
  const b = fresh || state.bookings.find((x) => x.id === id); if (!b) return;
  state.view = 'booking'; state.bookingId = id; state.draft = clone(b); state.dirty = false; state.confirmDelete = false;
  state.picker = { q: '', open: false };
  if (!['quote', 'agreement', 'insurance', 'checkout'].includes(state.tab)) state.tab = 'quote';
  render(); window.scrollTo(0, 0);
}

/* ================= rendering ================= */
let pendingRender = false;
function editing() { const a = document.activeElement; return a && main() && main().contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox'; }
function requestRender() { if (editing()) { pendingRender = true; return; } render(); }
function render() {
  pendingRender = false;
  renderRail();
  const views = { today: vToday, calendar: vCalendar, bookings: vBookings, booking: vBooking, inventory: vInventory, packages: vPackages, insurance: vInsurance, owners: vOwners, storefront: vStore, roadmap: vRoadmap, settings: vSettings };
  main().innerHTML = (views[state.view] || vToday)();
  renderDrawer();
  resolveNames();
}
function renderRail() {
  const active = state.bookings.filter((b) => HOLDS.has(b.status)).length;
  const openQ = OPEN.filter((o) => o[0] === 'Open').length + DATA_CHECKS.length;
  $('#nav').innerHTML = VIEWS.map((v) => {
    if (!v) return '<div class="sep" role="separator"></div>';
    const cur = state.view === v[0] || (v[0] === 'bookings' && state.view === 'booking');
    const count = v[0] === 'bookings' && active ? active : v[0] === 'roadmap' ? openQ : '';
    return `<button type="button" data-act="nav" data-v="${v[0]}" ${cur ? 'aria-current="page"' : ''}><span>${v[1]}</span>${count !== '' ? `<span class="count">${count}</span>` : ''}</button>`;
  }).join('');
  $('#brandName').textContent = state.settings.company || 'Shared Gear Pool';
  $('#brandMark').textContent = companyPrefix();
  const c = state.cat;
  const src = c.source === 'sheet' ? `Rates synced from the sheet ${esc(fmtStamp(c.syncedAt))}` : `Rate card as of ${esc(fmtDay(c.asOf, { month: 'short', day: 'numeric' }))}`;
  const dbl = { wait: ['', 'Connecting to shared bookings…'], off: ['bad', 'Shared bookings unavailable here'], error: ['bad', 'Shared bookings stopped updating'], ready: ['ok', HOSTED ? 'Shared bookings live' : 'Bookings saved in this browser only'] }[state.dbState];
  $('#railFoot').innerHTML = `<div><span class="dot ${dbl[0]}"></span>${dbl[1]}${state.readOnly ? ' · view only' : ''}</div><div>${src}</div>`;
}
function pill(status) { const s = STATUS[status] || { label: status, tone: 'plain' }; return `<span class="pill ${s.tone}">${esc(s.label)}</span>`; }
function tape(id, own) { return `<span class="tape ${own || (state.cat.byId[id] || {}).own || ''}">${esc(id)}</span>`; }
function ownerTag(o, full) { return OWNERS[o] ? `<span class="own ${o}">${full ? OWNERS[o].name : OWNERS[o].short}</span>` : '<span class="own">Unassigned</span>'; }
function rangeBar(it) {
  if (it.rec == null) return '<span class="faint small">In kit rate</span>';
  const lo = it.lo == null ? it.rec : it.lo, hi = it.hi == null ? it.rec : it.hi;
  const max = Math.max(hi, 1);
  const L = (lo / max) * 100, R = (it.rec / max) * 100;
  return `<div class="range" title="Low ${money(lo)} · quote ${money(it.rec)} · high ${money(hi)}"><div class="bar"><div class="fill" style="left:${L}%;right:0"></div><div class="rec" style="left:${R}%"></div></div><div class="lbl"><span>${money(lo)}</span><b>${money(it.rec)}</b><span>${money(hi)}</span></div></div>`;
}
function shareBar(parts) { const t = sum(OWN, (o) => parts[o] || 0) || 1; return `<div class="share" role="img" aria-label="${OWN.map((o) => `${OWNERS[o].short} ${Math.round((parts[o] || 0) / t * 100)}%`).join(', ')}">${OWN.map((o) => `<span class="${o}" style="width:${(parts[o] || 0) / t * 100}%"></span>`).join('')}</div>`; }
function who(id) { return id ? `<span data-uid="${esc(id)}">someone</span>` : 'someone'; }
async function resolveNames() {
  const els = $$('[data-uid]'); if (!els.length || !userNs) return;
  const ids = [...new Set(els.map((e) => e.dataset.uid))];
  try { const ps = await userNs.profiles(ids); els.forEach((e) => { const p = ps[e.dataset.uid]; e.textContent = (p && p.name) || 'a teammate'; }); } catch (_) { /* names stay generic */ }
}
function dbGate(what) {
  if (state.dbState === 'ready') return '';
  const msg = state.dbState === 'wait' ? `<div class="empty"><span class="loading">Loading ${what}…</span></div>`
    : `<div class="empty"><b>${what[0].toUpperCase() + what.slice(1)} aren't available in this view</b><span>Bookings, check-outs and paperwork live in this page's shared database. Open the page signed in to claude.ai to use them. The inventory, packages and storefront still work.</span></div>`;
  return `<div class="panel">${msg}</div>`;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3800); }

/* ---------- Today ---------- */
function collectIssues() {
  const t = todayStr(); const out = [];
  state.bookings.forEach((b) => {
    const label = `${b.ref}${b.project ? ' · ' + b.project : ''}`;
    if (b.status === 'out' && b.returnDate < t) out.push({ tone: 'bad', b, t: `Overdue by ${plural(diffDays(b.returnDate, t), 'day')}`, d: `${label} was due back ${fmtDay(b.returnDate)}.` });
    if (b.status === 'request') out.push({ tone: 'info', b, t: 'New request to quote', d: `${label} from ${b.client && (b.client.company || b.client.name) || 'a client'}.` });
    if (['quoted', 'confirmed'].includes(b.status) && b.pickup) {
      const days = diffDays(t, b.pickup); const pw = paperwork(b);
      if (days <= 10 && days >= -1) {
        if (pw.contract !== 'signed') out.push({ tone: days <= 2 ? 'bad' : 'warn', b, t: 'Agreement not signed', d: `${label} picks up ${fmtDay(b.pickup)}.`, tab: 'agreement' });
        if (!pw.coiOk) out.push({ tone: days <= 2 ? 'bad' : 'warn', b, t: `Insurance certificate ${COI_STATUS[pw.coi].toLowerCase()}`, d: `${label} needs ${money(chosen(b).repl)} equipment cover before pickup.`, tab: 'insurance' });
        if (b.status === 'confirmed' && pw.deposit !== 'received') out.push({ tone: 'warn', b, t: 'Deposit not received', d: `${label}.` });
      }
    }
    if (HOLDS.has(b.status)) {
      const cf = conflicts(b).filter((c) => c.kind !== 'hold');
      if (cf.length) out.push({ tone: 'bad', b, t: `Short on ${plural(cf.length, 'item')}`, d: `${label}: ${cf.slice(0, 2).map((c) => `${c.id} needs ${c.need}, ${c.have} free`).join('; ')}${cf.length > 2 ? '…' : ''}` });
    }
  });
  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
function vToday() {
  const t = todayStr(); const S = state.settings; const c = state.cat;
  const out = state.bookings.filter((b) => b.status === 'out');
  const soon = state.bookings.filter((b) => ['request', 'quoted', 'confirmed'].includes(b.status) && b.pickup >= t && b.pickup <= addDays(t, 7));
  const due = out.filter((b) => b.returnDate <= addDays(t, 2));
  const overdue = out.filter((b) => b.returnDate < t);
  const issues = state.dbState === 'ready' ? collectIssues() : [];
  const outValue = sum(out, (b) => chosen(b).repl);
  const pipeline = sum(state.bookings.filter((b) => ['quoted', 'confirmed', 'out'].includes(b.status)), (b) => chosen(b).total);
  const resale = sum(c.items, (i) => (i.resale || 0) * i.qty);
  const byOwn = {}; OWN.forEach((o) => (byOwn[o] = sum(c.items.filter((i) => i.own === o), (i) => (i.resale || 0) * i.qty)));
  const countOwn = {}; OWN.forEach((o) => (countOwn[o] = c.items.filter((i) => i.own === o).length));
  const openQ = OPEN.filter((o) => o[0] === 'Open');

  // agenda: next 14 days
  const days = {}; const end = addDays(t, 13);
  state.bookings.filter((b) => HOLDS.has(b.status) || b.status === 'returned').forEach((b) => {
    const push = (d, kind, txt) => { if (d >= t && d <= end) (days[d] = days[d] || []).push({ b, kind, txt }); };
    if (b.status !== 'out' && b.status !== 'returned') push(b.pickup, 'out', `Pickup${b.pickupTime ? ' ' + fmtTime(b.pickupTime) : ''}`);
    for (let i = 0; i < num(b.shootDays); i++) push(addDays(b.shootStart || b.pickup, i), 'shoot', `Shoot day ${i + 1}`);
    if (b.status !== 'returned') push(b.returnDate, 'in', `Return${b.returnTime ? ' by ' + fmtTime(b.returnTime) : ''}`);
  });
  const agendaDays = Object.keys(days).sort();
  const kindTone = { out: 'amber', shoot: 'info', in: 'good' };

  return `<section class="view">
    <div class="head"><div><div class="eyebrow">${esc(fmtLong(t))}</div><h1>Rental desk</h1><p>What is going out, what is coming back, and what still blocks a release.</p></div>
      <div class="actions"><button class="btn" data-act="nav" data-v="calendar">Calendar</button><button class="btn primary" data-act="newBooking">New booking</button></div></div>
    <div class="kpis">
      <div class="kpi"><span class="v">${out.length}</span><span class="l">${plural(out.length, 'job')} out now${outValue ? ` · ${money(outValue)} of gear` : ''}</span></div>
      <div class="kpi"><span class="v">${soon.length}</span><span class="l">going out in the next 7 days</span></div>
      <div class="kpi ${overdue.length ? 'alert' : ''}"><span class="v">${due.length}</span><span class="l">due back within 2 days${overdue.length ? ` · ${overdue.length} overdue` : ''}</span></div>
      <div class="kpi ${issues.some((i) => i.tone === 'bad') ? 'alert' : issues.length ? 'warn' : ''}"><span class="v">${issues.length}</span><span class="l">things need attention</span></div>
    </div>
    <div class="cols">
      <div class="panel"><header><h2>Next 14 days</h2><span class="muted small">${pipeline ? `${money(pipeline)} quoted or booked` : ''}</span></header>
        <div class="body flush">${state.dbState !== 'ready' ? dbGate('bookings') : agendaDays.length ? `<div class="agenda">${agendaDays.map((d) => `<div class="day"><div class="date">${esc(fmtDay(d, { weekday: 'short' }))}<small>${esc(fmtDay(d, { month: 'short', day: 'numeric' }))}</small></div><div>${days[d].map((e) => `<div class="ev" data-act="openBooking" data-id="${e.b.id}" tabindex="0"><span class="pill ${kindTone[e.kind]} plain">${esc(e.txt)}</span><span class="t">${esc(e.b.project || e.b.ref)}</span><span class="muted small">${esc((e.b.client && (e.b.client.company || e.b.client.name)) || '')}</span>${e.b.status === 'request' || e.b.status === 'quoted' ? '<span class="faint small">tentative</span>' : ''}</div>`).join('')}</div></div>`).join('')}</div>`
          : `<div class="empty"><b>Nothing on the books for the next two weeks</b><span>Start a booking from a package, or from the storefront's request form.</span><button class="btn" data-act="nav" data-v="packages">Browse packages</button></div>`}</div></div>
      <div class="panel"><header><h2>Needs attention</h2><span class="muted small">${issues.length ? plural(issues.length, 'item') : ''}</span></header>
        <div class="body flush">${state.dbState !== 'ready' ? dbGate('bookings') : issues.length ? `<div class="issues">${issues.slice(0, 12).map((i) => `<div class="issue ${i.tone}" data-act="openBooking" data-id="${i.b.id}" ${i.tab ? `data-tab="${i.tab}"` : ''} tabindex="0"><div><div class="t">${esc(i.t)}</div><div class="d">${esc(i.d)}</div></div>${pill(i.b.status)}</div>`).join('')}</div>`
          : '<div class="empty"><b>Nothing is blocked</b><span>Every upcoming job has its agreement, certificate and gear lined up.</span></div>'}</div></div>
    </div>
    <div class="cols">
      <div class="panel"><header><h2>The pool</h2><span class="muted small">${c.items.length} items${resale ? ` · ${money(resale)} insured value` : ''}</span></header>
        <div class="body stack">${resale ? shareBar(byOwn) : shareBar(countOwn)}
          <div class="kv">${OWN.map((o) => `<dt>${ownerTag(o, true)}</dt><dd>${resale ? `${money(byOwn[o])} · ${(byOwn[o] / resale * 100).toFixed(1)}%` : plural(countOwn[o], 'item')}</dd>`).join('')}</div>
          ${SNAPSHOT.poolNote ? `<div class="note">${esc(SNAPSHOT.poolNote)}</div>` : ''}${resale ? '' : '<span class="faint small">This copy of the rate card has no resale values.</span>'}</div></div>
      <div class="panel"><header><h2>Open questions</h2><button class="btn sm" data-act="nav" data-v="roadmap">All ${openQ.length + DATA_CHECKS.length}</button></header>
        <div class="body flush">${DATA_CHECKS.length + openQ.length === 0 ? '<div class="empty"><b>No open questions</b><span>This copy of the rate card carries none.</span></div>' : ''}${[...DATA_CHECKS.map((d) => ({ tone: 'bad', t: d.title, d: d.text, id: d.id })), ...openQ.filter((o) => ['Blocked', 'Insurance', 'Model ambiguous'].includes(o[1])).map((o) => ({ tone: o[1] === 'Blocked' || o[1] === 'Insurance' ? 'bad' : 'warn', t: `${o[1]}: ${o[3]}`, d: o[5], id: o[2] }))].map((q) => `<div class="issue ${q.tone}" ${state.cat.byId[q.id] ? `data-act="item" data-id="${q.id}" tabindex="0"` : ''}><div><div class="t">${esc(q.t)}</div><div class="d">${esc(q.d)}</div></div>${state.cat.byId[q.id] ? tape(q.id) : ''}</div>`).join('')}</div></div>
    </div>
  </section>`;
}

/* ---------- Calendar ---------- */
function vCalendar() {
  const start = state.cal.start, N = 21, t = todayStr();
  const days = Array.from({ length: N }, (_, i) => addDays(start, i)); const end = days[N - 1];
  const rows = state.bookings.filter((b) => b.status !== 'cancelled' && b.pickup && b.returnDate && b.pickup <= end && bookingEnd(b) >= start)
    .sort((a, b) => a.pickup.localeCompare(b.pickup));
  const head = `<div class="tl-h" style="text-align:left;padding-left:10px">Booking</div>` + days.map((d) => { const dt = parseYmd(d); const wk = dt.getDay() === 0 || dt.getDay() === 6; return `<div class="tl-h ${wk ? 'wk' : ''} ${d === t ? 'today' : ''}">${dt.toLocaleDateString('en-US', { weekday: 'narrow' })}<b>${dt.getDate()}</b></div>`; }).join('');
  const body = rows.map((b) => {
    const e = bookingEnd(b); const s0 = b.shootStart || b.pickup; const s1 = addDays(s0, Math.max(0, num(b.shootDays) - 1));
    const tent = !FIRM.has(b.status) && HOLDS.has(b.status);
    const cells = days.map((d) => {
      const dt = parseYmd(d); const wk = dt.getDay() === 0 || dt.getDay() === 6;
      let bar = '';
      if (d >= b.pickup && d <= e) {
        const shoot = num(b.shootDays) > 0 && d >= s0 && d <= s1;
        const cls = [shoot ? 'shoot' : 'held', tent ? 'hold-tentative' : '', d === b.pickup ? 'first' : '', d === e ? 'last' : ''].join(' ');
        const mk = d === b.pickup ? 'OUT' : d === e ? (b.status === 'out' && b.returnDate < t ? 'LATE' : 'IN') : '';
        bar = `<div class="seg-bar ${cls}">${mk ? `<span class="mk">${mk}</span>` : ''}</div>`;
      }
      return `<div class="tl-c ${wk ? 'wk' : ''} ${d === t ? 'today' : ''}">${bar}</div>`;
    }).join('');
    return `<div class="tl-label" data-act="openBooking" data-id="${b.id}" tabindex="0"><span class="t">${esc(b.project || b.ref)}</span><span class="s">${pill(b.status)}<span>${esc(b.ref)}</span></span></div>${cells}`;
  }).join('');
  return `<section class="view">
    <div class="head"><div><div class="eyebrow">Three weeks from ${esc(fmtDay(start, { month: 'long', day: 'numeric' }))}</div><h1>Calendar</h1><p>Every job from pickup to return. Solid is a shoot day, striped is gear held but not shooting, which bills at the possession rate.</p></div>
      <div class="actions"><button class="btn" data-act="calMove" data-n="-7" aria-label="Previous week">←</button><button class="btn" data-act="calToday">This week</button><button class="btn" data-act="calMove" data-n="7" aria-label="Next week">→</button><button class="btn primary" data-act="newBooking">New booking</button></div></div>
    <div class="legend"><span><i style="background:var(--accent)"></i>Shoot day, confirmed</span><span><i style="background:var(--accent-soft);border:1px dashed var(--accent)"></i>Shoot day, tentative</span><span><i style="background:repeating-linear-gradient(135deg,var(--amber-soft) 0 5px,transparent 5px 9px);border-top:2px solid var(--amber);border-bottom:2px solid var(--amber)"></i>Held, possession rate</span><span class="mono small">OUT / IN pickup and return</span></div>
    ${state.dbState !== 'ready' ? dbGate('bookings') : `<div class="panel"><div class="tl" style="--days:${N}"><div class="tl-grid">${head}${body || `<div style="grid-column:1/-1" class="empty"><b>No jobs in these three weeks</b><span>Use the arrows to look further out, or start a new booking.</span></div>`}</div></div></div>`}
    <p class="faint small">Shoot days are drawn as consecutive from the first shoot day. Gear with a late return keeps its bar running to today.</p>
  </section>`;
}

/* ---------- Bookings list ---------- */
function vBookings() {
  const f = state.bk.filter; const t = todayStr();
  const sets = { active: (b) => HOLDS.has(b.status), request: (b) => b.status === 'request', quoted: (b) => b.status === 'quoted', confirmed: (b) => b.status === 'confirmed', out: (b) => b.status === 'out', done: (b) => ['returned', 'closed'].includes(b.status), cancelled: (b) => b.status === 'cancelled', all: () => true };
  const list = state.bookings.filter(sets[f] || sets.active).sort((a, b) => (a.pickup || '').localeCompare(b.pickup || ''));
  const chip = (k, l) => `<button class="chip" data-act="bkFilter" data-f="${k}" aria-pressed="${f === k}">${l} <span class="faint">${state.bookings.filter(sets[k]).length}</span></button>`;
  const pw = (b) => { const p = paperwork(b); return `<span class="pill ${p.contract === 'signed' ? 'good' : p.contract === 'sent' ? 'info' : 'plain'}">Agreement ${p.contract}</span> <span class="pill ${p.coiOk ? 'good' : p.coi === 'rejected' ? 'bad' : p.coi === 'none' ? 'plain' : 'info'}">COI ${COI_STATUS[p.coi].toLowerCase()}</span>`; };
  return `<section class="view">
    <div class="head"><div><div class="eyebrow">Quotes, holds and jobs</div><h1>Bookings</h1><p>Each booking carries its quote, Schedule A, agreement, insurance certificate and check-out sheet.</p></div>
      <div class="actions"><button class="btn primary" data-act="newBooking">New booking</button></div></div>
    <div class="chips">${chip('active', 'Active')}${chip('request', 'Requests')}${chip('quoted', 'Quoted')}${chip('confirmed', 'Confirmed')}${chip('out', 'Out')}${chip('done', 'Returned & closed')}${chip('cancelled', 'Cancelled')}${chip('all', 'All')}</div>
    ${state.dbState !== 'ready' ? dbGate('bookings') : `<div class="panel"><div class="tbl-wrap">${list.length ? `<table><thead><tr><th>Booking</th><th>Dates</th><th>Status</th><th>Paperwork</th><th class="n">Total</th></tr></thead><tbody>${list.map((b) => {
      const c = chosen(b); const late = b.status === 'out' && b.returnDate < t;
      return `<tr class="click" data-act="openBooking" data-id="${b.id}" tabindex="0"><td><b>${esc(b.project || 'Untitled job')}</b>${b.example ? ' <span class="pill amber plain">Example</span>' : ''}<span class="sub">${esc(b.ref)} · ${esc((b.client && (b.client.company || b.client.name)) || 'No client yet')}</span></td>
        <td class="num">${esc(fmtDay(b.pickup))} → ${esc(fmtDay(b.returnDate))}<span class="sub">${plural(num(b.shootDays), 'shoot day')}${num(b.possessionDays) ? ` · ${num(b.possessionDays)} held` : ''}${late ? ' · <b class="flag">late</b>' : ''}</span></td>
        <td>${pill(b.status)}</td><td>${pw(b)}</td><td class="n"><b>${money(c.total)}</b><span class="sub">Tier ${b.budget || 'A'}</span></td></tr>`;
    }).join('')}</tbody></table>` : `<div class="empty"><b>No bookings here</b><span>${f === 'active' ? 'Start one, or quote a package from the Packages page.' : 'Try another filter.'}</span></div>`}</div></div>`}
  </section>`;
}

/* ---------- Booking workspace ---------- */
function vBooking() {
  const b = state.draft;
  if (!b) { state.view = 'bookings'; return vBookings(); }
  const c = chosen(b); const pw = paperwork(b); const ro = state.readOnly;
  const idx = FLOW.indexOf(b.status);
  const steps = FLOW.map((s, i) => `<span class="step ${i < idx ? 'on' : ''} ${i === idx ? 'now' : ''}">${STATUS[s].label}</span>`).join('<span class="arrow">›</span>');
  const next = {
    request: ['quoted', 'Mark quote sent'], quoted: ['confirmed', 'Confirm booking'], confirmed: ['__checkout', 'Go to check-out'],
    out: ['__checkout', 'Check gear back in'], returned: ['closed', 'Close booking'],
  }[b.status];
  const tabDot = { agreement: pw.contract === 'signed', insurance: pw.coiOk };
  const tab = (k, l) => `<button role="tab" data-act="tab" data-t="${k}" aria-selected="${state.tab === k}">${l}${k in tabDot ? `<span class="dotw ${tabDot[k] ? 'good' : ''}"></span>` : ''}</button>`;
  const body = { quote: bQuote, agreement: bAgreement, insurance: bInsurance, checkout: bCheckout }[state.tab] || bQuote;
  return `<section class="view">
    <div class="head"><div style="min-width:0;flex:1"><button class="btn ghost sm" data-act="nav" data-v="bookings">← Bookings</button>
      <div class="eyebrow" style="margin-top:8px">${esc(b.ref)}${b.example ? ' · example, not a real job' : ''}${b.source === 'storefront' ? ' · from the storefront' : ''}</div>
      <h1>${esc(b.project || 'Untitled job')}</h1><p>${esc((b.client && [b.client.company, b.client.name].filter(Boolean).join(' · ')) || 'No client yet')} · ${esc(fmtDay(b.pickup))} → ${esc(fmtDay(b.returnDate))}</p></div>
      <div class="actions" style="align-items:end;flex-direction:column"><div class="bigrate" style="font-size:40px">${money(c.total)}</div><span class="muted small">Tier ${b.budget || 'A'} · ${TIER_NAME[b.budget || 'A']} · ${money(c.perDay)} per shoot day</span></div></div>
    <div class="statusbar"><div class="steps">${b.status === 'cancelled' ? pill('cancelled') : steps}</div>
      ${ro ? '<span class="pill plain">View only</span>' : `${next ? `<button class="btn primary sm" data-act="advance" data-to="${next[0]}">${next[1]}</button>` : ''}
      ${b.status === 'cancelled' ? '<button class="btn sm" data-act="advance" data-to="quoted">Reopen</button>' : !['closed'].includes(b.status) ? '<button class="btn ghost sm" data-act="advance" data-to="cancelled">Cancel booking</button>' : ''}
      ${state.confirmDelete ? '<span class="small">Delete for good?</span><button class="btn danger sm" data-act="deleteBooking">Delete</button><button class="btn ghost sm" data-act="confirmDelete" data-v="0">Keep</button>' : '<button class="btn ghost sm" data-act="confirmDelete" data-v="1">Delete</button>'}`}
    </div>
    <div class="tabs" role="tablist">${tab('quote', 'Quote')}${tab('agreement', 'Schedule A & agreement')}${tab('insurance', 'Insurance')}${tab('checkout', 'Check-out')}</div>
    ${body(b)}
  </section>`;
}
function bQuote(b) {
  const cat = state.cat; const cf = conflicts(b); const cfBy = Object.fromEntries(cf.map((x) => [x.id, x]));
  const sugg = suggestPossession(b); const fifa = fifaCrew(b);
  const lines = (b.lines || []).map((ln, i) => {
    const it = cat.byId[ln.id] || { name: 'Not on the inventory', own: '' }; const k = cfBy[ln.id];
    const openQ = OPEN_BY_ITEM[ln.id] || DATA_CHECKS.find((d) => d.id === ln.id);
    return `<tr><td style="min-width:200px">${tape(ln.id, it.own)} <span data-act="item" data-id="${esc(ln.id)}" style="cursor:pointer">${esc(it.name)}</span><span class="sub">${ln.pkg ? ` · ${esc(ln.pkg)}` : ''}${k ? ` · <b class="flag" style="color:var(--${k.kind === 'hold' ? 'warn' : 'bad'})">${k.kind === 'hold' ? `held elsewhere, ${k.have} free` : k.kind === 'missing' ? 'not on inventory' : `short: ${k.have} free`}</b>` : ''}${openQ ? ' · <span class="flag" style="color:var(--warn)">unverified</span>' : ''}</span></td>
      <td><input type="number" min="0" step="1" data-line="${i}" data-f="rate" value="${ln.rate == null ? '' : esc(ln.rate)}" placeholder="${it.rec == null ? 0 : it.rec}" aria-label="Rate per day for ${esc(ln.id)}"></td>
      <td><input type="number" min="0" step="1" data-line="${i}" data-f="qty" value="${esc(ln.qty)}" aria-label="Quantity"></td>
      <td><input type="number" min="0" step="1" data-line="${i}" data-f="days" value="${esc(ln.days)}" aria-label="Days"></td>
      <td><select data-line="${i}" data-f="tier" aria-label="Tier">${['C', 'B', 'A'].map((x) => `<option value="${x}" ${ln.tier === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
      <td><input type="checkbox" data-line="${i}" data-f="comp" ${ln.comp ? 'checked' : ''} aria-label="Comp ${esc(ln.id)}" class="cbx"></td>
      <td class="n" data-lt="${i}">${lineTotalCell(b, ln)}</td><td><button class="x" data-act="rmLine" data-i="${i}" aria-label="Remove ${esc(ln.id)}">×</button></td></tr>`;
  }).join('');
  const crew = (b.crew || []).map((cr, i) => `<tr><td style="min-width:170px"><b>${esc(cr.role)}</b>${num(cr.rate) * num(cr.days) >= 800 ? '<span class="sub"><span class="flag" style="color:var(--warn)">Needs a written contract</span></span>' : ''}</td>
      <td><input type="number" min="0" data-crew="${i}" data-f="rate" value="${esc(cr.rate)}" aria-label="Day rate"></td><td><input type="number" min="0" data-crew="${i}" data-f="people" value="${esc(cr.people)}" aria-label="People"></td>
      <td><input type="number" min="0" data-crew="${i}" data-f="days" value="${esc(cr.days)}" aria-label="Days"></td>
      <td><select data-crew="${i}" data-f="tier" aria-label="Tier">${['C', 'B', 'A'].map((x) => `<option ${cr.tier === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
      <td class="n" data-ct="${i}">${money(num(cr.rate) * num(cr.people) * num(cr.days))}</td><td><button class="x" data-act="rmCrew" data-i="${i}" aria-label="Remove ${esc(cr.role)}">×</button></td></tr>`).join('');
  return `<div class="split"><div class="stack">
    <div class="panel"><header><h2>Job and client</h2></header><div class="body grid-form">
      <label class="field wide"><span>Project</span><input type="text" id="b-project" data-b="project" value="${esc(b.project)}" placeholder="e.g. 2-day brand spot"></label>
      <label class="field"><span>Client contact</span><input type="text" id="b-cname" data-b="client.name" value="${esc(b.client && b.client.name)}"></label>
      <label class="field"><span>Company</span><input type="text" id="b-ccomp" data-b="client.company" value="${esc(b.client && b.client.company)}"></label>
      <label class="field"><span>Email</span><input type="email" id="b-cemail" data-b="client.email" value="${esc(b.client && b.client.email)}"></label>
      <label class="field"><span>Phone</span><input type="tel" id="b-cphone" data-b="client.phone" value="${esc(b.client && b.client.phone)}"></label>
    </div></div>
    <div class="panel"><header><h2>Dates</h2><span class="muted small">${plural(diffDays(b.pickup, b.returnDate), 'night')} out</span></header><div class="body grid-form">
      <label class="field"><span>Pickup</span><input type="date" id="b-pickup" data-b="pickup" value="${esc(b.pickup)}"></label>
      <label class="field"><span>Pickup time</span><input type="time" id="b-ptime" data-b="pickupTime" value="${esc(b.pickupTime)}"></label>
      <label class="field"><span>First shoot day</span><input type="date" id="b-shoot" data-b="shootStart" value="${esc(b.shootStart)}"></label>
      <label class="field"><span>Shoot days</span><input type="number" min="0" id="b-sdays" data-b="shootDays" data-type="num" value="${esc(b.shootDays)}"></label>
      <label class="field"><span>Return</span><input type="date" id="b-return" data-b="returnDate" value="${esc(b.returnDate)}"></label>
      <label class="field"><span>Return time</span><input type="time" id="b-rtime" data-b="returnTime" value="${esc(b.returnTime)}"></label>
      <label class="field"><span>Possession days</span><input type="number" min="0" id="b-poss" data-b="possessionDays" data-type="num" value="${esc(b.possessionDays)}"><small id="posshint">${sugg !== num(b.possessionDays) ? `Dates suggest ${sugg}. <a href="#" data-act="applyPoss">Use ${sugg}</a>` : 'Matches the dates.'}</small></label>
      <label class="field"><span>Multi-day pricing</span><select id="b-mode" data-b="rateMode"><option value="straight" ${b.rateMode !== 'week' ? 'selected' : ''}>Straight days (Quote Builder)</option><option value="week" ${b.rateMode === 'week' ? 'selected' : ''}>Film week (1 / 1.85 / 2.5 / 3x)</option></select></label>
      <label class="field"><span>Expendables at cost</span><input type="number" min="0" id="b-exp" data-b="expendables" data-type="num" value="${esc(b.expendables)}"></label>
      <label class="check wide"><input type="checkbox" id="b-favor" data-b="favor" data-type="bool" ${b.favor ? 'checked' : ''}> Favor mode: waive all equipment fees. Crew still bills, and the gift is tracked as comped value.</label>
    </div></div>
    <div class="panel"><header><h2>Equipment</h2><span class="muted small">Tier C is core and never cut. A is premium and cut first.</span></header>
      <div class="body" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <div class="picker" style="flex:1;min-width:220px"><input type="search" id="pickq" data-pick="1" value="${esc(state.picker.q)}" placeholder="Add gear by name or ID, e.g. C-stand or S-ELE" autocomplete="off" aria-label="Add gear"><div id="pickMenu">${pickerMenu()}</div></div>
        <select id="addPkg" data-addpkg="1" aria-label="Add a package" style="width:auto"><option value="">Add a package…</option>${cat.packages.map((p) => `<option value="${p.id}">${esc(p.name)} · ${money(p.day)}/day</option>`).join('')}</select>
      </div>
      <div class="tbl-wrap">${lines ? `<table class="lines"><thead><tr><th>Item</th><th>Rate/day</th><th>Qty</th><th>Days</th><th>Tier</th><th>Comp</th><th class="n">Line</th><th></th></tr></thead><tbody>${lines}</tbody></table>` : '<div class="empty"><b>No gear on this quote yet</b><span>Search above, or add one of the nine packages.</span></div>'}</div></div>
    <div class="panel"><header><h2>Crew</h2><span class="muted small">Labor is always its own line. Gear someone brings is billed as gear.</span></header>
      <div class="body" style="display:flex;gap:8px;flex-wrap:wrap"><select id="crewRole" data-crewrole="1" style="width:auto;flex:1;min-width:200px" aria-label="Role">${cat.labor.map((l) => `<option value="${esc(l.role)}" ${state.crewRole === l.role ? 'selected' : ''}>${esc(l.role)} · ${money(l.rec)}/day</option>`).join('')}</select><button class="btn" data-act="addCrew">Add crew</button></div>
      <div class="tbl-wrap">${crew ? `<table class="lines"><thead><tr><th>Role</th><th>Rate/day</th><th>People</th><th>Days</th><th>Tier</th><th class="n">Line</th><th></th></tr></thead><tbody>${crew}</tbody></table>` : ''}</div>
      ${fifa.length ? `<div class="body"><div class="note">New York's Freelance Isn't Free Act needs a written contract for any freelancer paid $800 or more within 120 days: ${fifa.map((x) => esc(x.role)).join(', ')}.</div></div>` : ''}</div>
    <div class="panel"><header><h2>Notes</h2></header><div class="body"><textarea id="b-notes" data-b="notes" rows="3" placeholder="Location power, haze permission, load-in details…">${esc(b.notes)}</textarea></div></div>
  </div>
  <aside class="summary stack" id="qsum">${quoteSummary(b)}</aside></div>`;
}
function lineTotalCell(b, ln) {
  const f = b.rateMode === 'week' ? weekFactor(ln.days) : num(ln.days); const t = lineRate(ln) * num(ln.qty) * f;
  return (ln.comp || b.favor) ? `<span class="faint" style="text-decoration:line-through">${money(t)}</span><span class="sub">comped</span>` : money(t);
}
function quoteSummary(b) {
  const all = calc(b); const T = b.budget || 'A'; const c = all[T]; const pctP = num(state.settings.possessionPct, 50);
  const cf = conflicts(b);
  const row = (label, key, sub) => `<tr><td>${label}${sub ? `<span class="sub">${sub}</span>` : ''}</td>${TIERS.map((x) => `<td class="n ${x === T ? 'sel' : ''}">${money(all[x][key])}</td>`).join('')}</tr>`;
  return `<div class="panel"><header><h2>Three budgets</h2><div class="seg" role="group" aria-label="Budget the client chose">${TIERS.map((x) => `<button data-act="budget" data-t="${x}" aria-pressed="${x === T}">${x}</button>`).join('')}</div></header>
    <div class="body flush tbl-wrap"><table class="tiers"><thead><tr><th></th>${TIERS.map((x) => `<th class="n ${x === T ? 'sel' : ''}">${x} · ${TIER_NAME[x]}</th>`).join('')}</tr></thead><tbody>
      ${row('Equipment', 'equip', b.rateMode === 'week' ? 'film week pricing' : 'straight days')}
      ${row('Possession', 'possession', `${plural(num(b.possessionDays), 'day')} held at ${pctP}%`)}
      ${row('Crew', 'crew')}${row('Expendables', 'exp', 'at cost')}${num(b.late && b.late.fee) ? row('Late return', 'late') : ''}
      <tr class="grand"><td>Total</td>${TIERS.map((x) => `<td class="n ${x === T ? 'sel' : ''}">${money(all[x].total)}</td>`).join('')}</tr>
      <tr><td class="muted">Per shoot day</td>${TIERS.map((x) => `<td class="n muted ${x === T ? 'sel' : ''}">${money(all[x].perDay)}</td>`).join('')}</tr>
    </tbody></table></div>
    <div class="body kv">
      <dt>Deposit (${num(state.settings.depositPct)}%)</dt><dd>${money(c.total * num(state.settings.depositPct) / 100)}</dd>
      <dt>Replacement value out</dt><dd>${money(c.repl)}</dd>
      <dt>Comped value</dt><dd>${money(c.comp)}</dd>
    </div></div>
  <div class="panel"><header><h2>Owner split</h2><span class="muted small">Tier ${T}, equipment only</span></header><div class="body stack">
    ${shareBar(Object.fromEntries(OWN.map((o) => [o, c.own[o].billed + c.own[o].poss])))}
    <div class="tbl-wrap"><table><thead><tr><th>Owner</th><th class="n">Billed</th><th class="n">Possession</th><th class="n">Comped</th></tr></thead><tbody>${OWN.map((o) => `<tr><td>${ownerTag(o)}</td><td class="n">${money(c.own[o].billed)}</td><td class="n">${money(c.own[o].poss)}</td><td class="n">${c.own[o].comped ? money(c.own[o].comped) : '—'}</td></tr>`).join('')}</tbody></table></div>
    <span class="faint small">Possession is split in proportion to each owner's billed day rate.</span></div></div>
  ${cf.length ? `<div class="panel"><header><h2>Availability</h2></header><div class="body checklist">${cf.map((x) => `<div class="no ${x.kind === 'hold' ? '' : 'bad'}"><span>${tape(x.id)} ${x.kind === 'missing' ? 'is not on the inventory.' : x.kind === 'hold' ? `needs ${x.need}; ${x.have} free once tentative holds are counted` : `needs ${x.need}; only ${x.have} free on these dates`}${x.who.length ? `<span class="sub">${x.who.map((w) => `${esc(w.b.ref)} (${w.q}, ${STATUS[w.b.status].label.toLowerCase()})`).join(', ')}</span>` : ''}</span></div>`).join('')}</div></div>` : ''}`;
}
function refreshQuote() {
  const b = state.draft; if (!b || state.view !== 'booking') return;
  const qs = $('#qsum'); if (qs) qs.innerHTML = quoteSummary(b);
  (b.lines || []).forEach((ln, i) => { const cell = $(`[data-lt="${i}"]`); if (cell) cell.innerHTML = lineTotalCell(b, ln); });
  (b.crew || []).forEach((cr, i) => { const cell = $(`[data-ct="${i}"]`); if (cell) cell.textContent = money(num(cr.rate) * num(cr.people) * num(cr.days)); });
  const act = document.activeElement;
  $$('[data-line][data-f="days"]').forEach((inp) => { const ln = b.lines[num(inp.dataset.line)]; if (ln && inp !== act) inp.value = ln.days; });
  $$('[data-crew][data-f="days"]').forEach((inp) => { const c = b.crew[num(inp.dataset.crew)]; if (c && inp !== act) inp.value = c.days; });
  const h = $('#posshint'); if (h) { const s = suggestPossession(b); h.innerHTML = s !== num(b.possessionDays) ? `Dates suggest ${s}. <a href="#" data-act="applyPoss">Use ${s}</a>` : 'Matches the dates.'; }
  const big = $('.head .bigrate'); if (big) big.textContent = money(chosen(b).total);
}
function pickerMenu() {
  const q = state.picker.q.trim().toLowerCase(); if (!state.picker.open || !q) return '';
  const hits = state.cat.items.filter((i) => i.qty > 0 && (i.id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q))).slice(0, 12);
  if (!hits.length) return `<div class="menu"><div class="opt muted">No gear matches “${esc(state.picker.q)}”.</div></div>`;
  return `<div class="menu">${hits.map((i) => `<button class="opt" data-act="addItem" data-id="${i.id}">${tape(i.id, i.own)}<span>${esc(i.name)}<span class="sub">${esc(i.cat)} · ${plural(i.qty, 'unit')}</span></span><span class="mono small">${i.rec == null ? 'kit' : money(i.rec)}</span></button>`).join('')}</div>`;
}

/* ---------- Schedule A & agreement ---------- */
function scheduleRows(b) {
  const pctP = num(state.settings.possessionPct, 50) / 100;
  return includedLines(b).map((ln) => {
    const it = state.cat.byId[ln.id] || { name: ln.id, own: '' }; const rate = lineRate(ln); const qty = num(ln.qty); const comped = ln.comp || b.favor;
    return { id: ln.id, name: it.name, own: it.own, qty, rate, day: comped ? 0 : rate * qty, poss: comped ? 0 : rate * qty * pctP, repl: (it.resale || 0) * qty, comped };
  });
}
function specialTerms(b) {
  const has = (id) => includedLines(b).some((l) => l.id === id); const t = [];
  if (has('S-GRP-138')) t.push('Haze. The hazer runs only where the location allows haze. Renter confirms this with the location before the shoot. Haze fluid is an expendable.');
  if (has('S-ELE-112')) t.push('Generator. Renter supplies fuel, runs the generator outdoors and clear of doors and windows, and keeps it attended. Fuel is an expendable.');
  if (has('S-ELE-111')) t.push('HMI. The 1.2K HMI goes out as a system with its ballast and head cable, and is run by a qualified electric.');
  if (has('M-PWR-062')) t.push('Battery power. The DJI Power 1000 has a continuous-draw ceiling. Renter checks the lighting plan against it before relying on it at a location without power.');
  if (has('S-ELE-109') || has('S-ELE-100')) t.push('House power. The large fixtures on this order can draw most of a 15A household circuit on their own. Renter checks location circuits before plugging in.');
  return t;
}
function agreementModel(b) {
  const S = state.settings; const c = chosen(b); const rows = scheduleRows(b);
  const owner = S.legalName || S.company || 'Owner';
  const renter = (b.client && (b.client.company || b.client.name)) || 'Renter';
  const tot = { day: sum(rows, (r) => r.day), poss: sum(rows, (r) => r.poss), repl: sum(rows, (r) => r.repl) };
  const clauses = [
    ['Equipment', `${owner} rents to ${renter} the equipment listed in Schedule A. Schedule A gives each item's day rate, possession rate and replacement value. Renter confirms at pickup that the equipment is complete and working, except as noted on the check-out sheet.`],
    ['Rental period', `The rental runs from pickup on ${fmtLong(b.pickup)}${b.pickupTime ? ' at ' + fmtTime(b.pickupTime) : ''} to return on ${fmtLong(b.returnDate)}${b.returnTime ? ' by ' + fmtTime(b.returnTime) : ''}, at ${S.pickup || 'the pickup location'}. It covers ${plural(num(b.shootDays), 'shoot day')} and ${plural(num(b.possessionDays), 'possession day')}. A possession day is a day Renter holds the equipment without shooting, and bills at ${num(S.possessionPct)}% of the day rate. The rental ends only when every item is back.`],
    ['Charges', `Charges are four separate lines: labor ${money(c.crew)}, equipment ${money(c.equip)}, possession ${money(c.possession)} and expendables at cost ${money(c.exp)}, for a total of ${money(c.total)}.${b.rateMode === 'week' ? ' Multi-day equipment rates follow the film week: 2 days bill 1.85 days, 3 days 2.5, 4 to 7 days 3, and each further week 2.5.' : ''}${c.comp ? ` Items marked comped on Schedule A (${money(c.comp)} at normal rates) are provided at no charge but are covered by every other term here.` : ''}${c.crew ? ' Crew are engaged under separate written crew agreements.' : ''}`],
    ['Deposit and payment', `${S.paymentTerms} The deposit is ${num(S.depositPct)}% of the total, ${money(c.total * num(S.depositPct) / 100)}.`],
    ['Insurance', `Before pickup, Renter delivers a certificate of insurance showing (a) coverage for rented or leased equipment of at least ${money(c.repl)}, the total replacement value on Schedule A; (b) commercial general liability of at least ${money(num(S.glOcc))} per occurrence and ${money(num(S.glAgg))} aggregate; and (c) ${owner} named as additional insured and loss payee, for a policy period covering the whole rental. Equipment is not released without an accepted certificate. Renter pays any deductible.`],
    ['Loss and damage', `From pickup until return, Renter is responsible for the equipment whatever the cause, except normal wear. Lost, stolen or unrepairable items are charged at the replacement value on Schedule A. Damaged items are charged at the cost of repair. Renter also pays the day rate for each day an item is out of service after the rental, up to ${num(S.lossOfUseCap)} days.`],
    ['Late return', S.lateRule],
    ['Cancellation', S.cancelRule],
    ['Use and care', 'Renter has the equipment run only by qualified people, does not sub-rent or lend it, and keeps it out of rain, sand and salt water unless protected. Renter reports any fault at once and does not attempt repairs.' + (specialTerms(b).length ? ' ' + specialTerms(b).join(' ') : '')],
    ['Expendables', 'Gels, tape, diffusion, clips, haze fluid and fuel are billed at cost and are not returned.'],
    ['Return and inspection', 'Equipment comes back clean, complete and in its cases. The owners inspect it within 48 hours of return and report any shortage or damage to Renter in writing.'],
    ['Governing law', `This agreement is governed by the laws of the State of ${S.governing || 'New York'}.`],
  ];
  return { S, c, rows, tot, owner, renter, clauses };
}
function agreementHTML(b) {
  const m = agreementModel(b);
  const sched = `<table><thead><tr><th>ID</th><th>Item</th><th>Owner</th><th class="n">Qty</th><th class="n">Day rate</th><th class="n">Possession / day</th><th class="n">Replacement value</th></tr></thead><tbody>${m.rows.map((r) => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.name)}${r.comped ? ' <em>(comped)</em>' : ''}</td><td>${esc(OWNERS[r.own] ? OWNERS[r.own].name : '')}</td><td class="n">${r.qty}</td><td class="n">${money(r.day)}</td><td class="n">${money(r.poss)}</td><td class="n">${money(r.repl)}</td></tr>`).join('')}<tr class="total"><td colspan="4">Totals: day_rate, possession_rate, replacement_value</td><td class="n">${money(m.tot.day)}</td><td class="n">${money(m.tot.poss)}</td><td class="n">${money(m.tot.repl)}</td></tr></tbody></table>`;
  return `<div class="draftmark">Draft for review by a New York attorney before first use</div>
    <h2>Equipment Rental Agreement</h2>
    <p>Agreement ${esc(b.ref)} · prepared ${esc(fmtLong(todayStr()))}<br>Between <b>${esc(m.owner)}</b>${m.S.address ? ', ' + esc(m.S.address) : ''}, for the equipment owners named in Schedule A (“Owner”), and <b>${esc(m.renter)}</b>${b.client && b.client.name && b.client.company ? `, attention ${esc(b.client.name)}` : ''} (“Renter”), for ${esc(b.project || 'the production named above')}.</p>
    ${m.clauses.map((cl, i) => `<h3>${i + 1}. ${esc(cl[0])}</h3><p>${esc(cl[1])}</p>`).join('')}
    <h3>Schedule A · Equipment</h3>${sched}
    <div class="sig"><div>For ${esc(m.owner)}<br><br>Name, title, date</div><div>For ${esc(m.renter)}<br><br>Name, title, date</div></div>`;
}
function agreementText(b) {
  const m = agreementModel(b);
  const lines = [`EQUIPMENT RENTAL AGREEMENT ${b.ref}`, `Draft for review by a New York attorney before first use.`, '', `Owner: ${m.owner}${m.S.address ? ', ' + m.S.address : ''}`, `Renter: ${m.renter}${b.client && b.client.name ? ' (' + b.client.name + ')' : ''}`, `Production: ${b.project || ''}`, ''];
  m.clauses.forEach((cl, i) => lines.push(`${i + 1}. ${cl[0].toUpperCase()}`, cl[1], ''));
  lines.push('SCHEDULE A', 'ID | Item | Owner | Qty | Day rate | Possession/day | Replacement value');
  m.rows.forEach((r) => lines.push(`${r.id} | ${r.name}${r.comped ? ' (comped)' : ''} | ${OWNERS[r.own] ? OWNERS[r.own].name : ''} | ${r.qty} | ${money(r.day)} | ${money(r.poss)} | ${money(r.repl)}`));
  lines.push(`TOTALS | | | | ${money(m.tot.day)} | ${money(m.tot.poss)} | ${money(m.tot.repl)}`, '', `For ${m.owner}: ____________________  Date: ________`, `For ${m.renter}: ____________________  Date: ________`);
  return lines.join('\n');
}
function standaloneDoc(title, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font:14px/1.55 Georgia,serif;color:#1b1d20;max-width:820px;margin:40px auto;padding:0 24px}h2{font:700 28px/1.1 Arial Narrow,Arial,sans-serif;text-transform:uppercase}h3{font:700 15px Arial,sans-serif;margin:18px 0 4px}table{width:100%;border-collapse:collapse;font:12.5px Arial,sans-serif}th,td{border-bottom:1px solid #ccc;padding:6px;text-align:left}.n{text-align:right}.total td{font-weight:700;border-top:2px solid #000}.mono{font-family:monospace}.draftmark{font:600 11px Arial;letter-spacing:.1em;text-transform:uppercase;color:#a05a14}.sig{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px}.sig div{border-top:1px solid #000;padding-top:6px;font:12px Arial}</style></head><body>${inner}</body></html>`;
}
function bAgreement(b) {
  const ct = b.contract || {}; const fifa = fifaCrew(b);
  return `<div class="split"><div class="paper" id="agreementDoc">${agreementHTML(b)}</div>
  <aside class="summary stack"><div class="panel"><header><h2>Agreement</h2><span class="pill ${ct.status === 'signed' ? 'good' : ct.status === 'sent' ? 'info' : 'plain'}">${{ draft: 'Draft', sent: 'Sent', signed: 'Signed' }[ct.status || 'draft']}</span></header><div class="body stack">
    <div class="seg" role="group" aria-label="Agreement status">${['draft', 'sent', 'signed'].map((s) => `<button data-act="contract" data-s="${s}" aria-pressed="${(ct.status || 'draft') === s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>
    ${ct.status === 'signed' ? `<label class="field"><span>Signed by</span><input type="text" id="ct-signer" data-b="contract.signer" value="${esc(ct.signer)}"></label><label class="field"><span>Date signed</span><input type="date" id="ct-date" data-b="contract.signedOn" value="${esc(ct.signedOn)}"></label>` : ''}
    ${ct.sentAt ? `<span class="muted small">Marked sent ${esc(fmtStamp(ct.sentAt))}</span>` : ''}
    <div class="actions"><button class="btn" data-act="copyAgreement">Copy as text</button>${state.canDownload ? '<button class="btn" data-act="dlAgreement">Download .html</button><button class="btn" data-act="dlSchedule">Schedule A .csv</button>' : ''}</div>
    <span class="faint small">The agreement rebuilds from the quote. Mark it sent once it has gone to the client, so later edits are easy to spot.</span></div></div>
    ${fifa.length ? `<div class="note">Crew agreements are separate. ${fifa.map((x) => esc(x.role)).join(', ')} ${fifa.length === 1 ? 'crosses' : 'cross'} $800 on this job, so New York needs a written contract for ${fifa.length === 1 ? 'that person' : 'each of them'}.</div>` : ''}
    <div class="note info">These terms are a working template built from the pool's rate rules. Have a New York attorney review them before the first outside rental.</div></aside></div>`;
}

/* ---------- Insurance (booking) ---------- */
function coiRequestText(b) {
  const S = state.settings; const c = chosen(b); const owner = S.legalName || S.company;
  return `Subject: Certificate of insurance for ${b.project || 'your rental'} (${b.ref})

Hi ${(b.client && b.client.name) || 'there'},

Before pickup on ${fmtLong(b.pickup)}, we need a certificate of insurance from your broker showing:

- Rented or leased equipment (inland marine) coverage of at least ${money(c.repl)}, the replacement value of the gear on this order
- Commercial general liability of ${money(num(S.glOcc))} per occurrence / ${money(num(S.glAgg))} aggregate
- ${owner}${S.address ? ', ' + S.address + ',' : ''} as certificate holder, additional insured and loss payee
- Policy dates covering ${fmtDay(b.pickup)} to ${fmtDay(b.returnDate)}

${S.email ? `Please have your broker send it to ${S.email}.` : 'Please have your broker send it to us by reply.'} We can't release the gear without it.

Thanks,
${S.company}${S.phone ? '\n' + S.phone : ''}`;
}
function bInsurance(b) {
  const c = chosen(b); const cs = coiState(b); const coi = b.coi || {}; const S = state.settings;
  const rec = Math.ceil(c.repl / 5000) * 5000;
  return `<div class="split"><div class="stack">
    <div class="panel"><header><h2>What the renter must show</h2><span class="muted small">Tier ${b.budget || 'A'}, comped gear included</span></header><div class="body stack">
      <div class="kpis"><div class="kpi"><span class="v">${money(c.repl)}</span><span class="l">equipment cover needed${rec > c.repl ? ` · ask for ${money(rec)}` : ''}</span></div><div class="kpi"><span class="v">${short(num(S.glOcc)) || money(num(S.glOcc))}</span><span class="l">general liability per occurrence · ${money(num(S.glAgg))} aggregate</span></div></div>
      <div class="kv"><dt>Additional insured and loss payee</dt><dd>${esc(S.legalName || S.company)}</dd><dt>Covering</dt><dd>${esc(fmtDay(b.pickup))} → ${esc(fmtDay(b.returnDate))}</dd></div>
      ${S.legalName ? '' : '<div class="note">There is no legal entity name in Settings yet. A certificate has to name a real insured party, so form the entity (the Growth Plan puts the operating agreement first) and enter it before sending requests.</div>'}
    </div></div>
    <div class="panel"><header><h2>Request to send</h2><div class="actions"><button class="btn sm" data-act="copyCoi">Copy</button>${coi.status === 'none' || !coi.status ? '<button class="btn sm primary" data-act="coiStatus" data-s="requested">Mark requested</button>' : ''}</div></header><div class="body"><pre class="letter" id="coiLetter">${esc(coiRequestText(b))}</pre></div></div>
  </div>
  <aside class="summary stack"><div class="panel"><header><h2>Certificate on file</h2><span class="pill ${cs.status === 'verified' ? 'good' : cs.status === 'rejected' ? 'bad' : cs.status === 'none' ? 'plain' : 'info'}">${COI_STATUS[cs.status]}</span></header><div class="body stack">
    <div class="grid-form" style="grid-template-columns:1fr 1fr">
      <label class="field"><span>Status</span><select id="coi-status" data-b="coi.status">${Object.keys(COI_STATUS).map((k) => `<option value="${k}" ${cs.status === k ? 'selected' : ''}>${COI_STATUS[k]}</option>`).join('')}</select></label>
      <label class="field"><span>Insurer</span><input type="text" id="coi-ins" data-b="coi.insurer" value="${esc(coi.insurer)}"></label>
      <label class="field"><span>Policy number</span><input type="text" id="coi-pol" data-b="coi.policy" value="${esc(coi.policy)}"></label>
      <label class="field"><span>Expires</span><input type="date" id="coi-exp" data-b="coi.expires" value="${esc(coi.expires)}"></label>
      <label class="field"><span>Equipment limit</span><input type="number" min="0" id="coi-eq" data-b="coi.equipLimit" data-type="num" value="${esc(coi.equipLimit)}"></label>
      <label class="field"><span>GL per occurrence</span><input type="number" min="0" id="coi-gl" data-b="coi.glOcc" data-type="num" value="${esc(coi.glOcc)}"></label>
      <label class="check"><input type="checkbox" id="coi-ai" data-b="coi.ai" data-type="bool" ${coi.ai ? 'checked' : ''}> Additional insured</label>
      <label class="check"><input type="checkbox" id="coi-lp" data-b="coi.lp" data-type="bool" ${coi.lp ? 'checked' : ''}> Loss payee</label>
    </div>
    <div class="checklist">${cs.checks.map((x) => `<div class="${x.ok ? 'ok' : 'no bad'}"><span>${esc(x.t)}<span class="sub">${esc(x.have)}</span></span></div>`).join('')}</div>
    ${cs.allOk && cs.status !== 'verified' ? '<button class="btn primary" data-act="coiStatus" data-s="verified">Everything checks out · mark verified</button>' : ''}
  </div></div></aside></div>`;
}

/* ---------- Check-out ---------- */
function bCheckout(b) {
  const co = b.checkout || { out: {}, back: {}, notes: {} }; const lines = includedLines(b); const cs = coiState(b); const pw = paperwork(b);
  const outAll = lines.every((l) => co.out && co.out[l.id]); const backAll = lines.every((l) => co.back && co.back[l.id]);
  const blockers = []; if (pw.contract !== 'signed') blockers.push('The agreement is not signed.'); if (cs.status !== 'verified') blockers.push('The insurance certificate is not verified.');
  const late = b.returnDate ? Math.max(0, diffDays(b.returnDate, todayStr())) : 0; const dayRate = chosen(b).dayRate;
  const canOut = ['quoted', 'confirmed'].includes(b.status); const canIn = b.status === 'out';
  return `<div class="split"><div class="panel"><header><h2>Check-out sheet</h2><span class="muted small">${plural(lines.length, 'line')} · tier ${b.budget || 'A'}</span></header>
    <div class="tbl-wrap">${lines.length ? `<table><thead><tr><th>Out</th><th>Back</th><th>Item</th><th class="n">Qty</th><th>Condition notes</th></tr></thead><tbody>${lines.map((l) => { const it = state.cat.byId[l.id] || { name: l.id }; return `<tr>
      <td><input type="checkbox" data-co="out" data-k="${esc(l.id)}" ${co.out && co.out[l.id] ? 'checked' : ''} aria-label="${esc(l.id)} out" ${state.readOnly ? 'disabled' : ''}></td>
      <td><input type="checkbox" data-co="back" data-k="${esc(l.id)}" ${co.back && co.back[l.id] ? 'checked' : ''} aria-label="${esc(l.id)} back" ${state.readOnly || b.status === 'quoted' || b.status === 'confirmed' ? 'disabled' : ''}></td>
      <td>${tape(l.id, it.own)} ${esc(it.name)}${it.kit ? `<span class="sub">${esc(it.kit)}</span>` : ''}</td><td class="n">${num(l.qty)}</td>
      <td><input type="text" data-conote="${esc(l.id)}" value="${esc(co.notes && co.notes[l.id])}" placeholder="Scratches, missing parts…" aria-label="Notes for ${esc(l.id)}"></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty"><b>Nothing to check out</b><span>Add gear on the Quote tab.</span></div>'}</div></div>
  <aside class="summary stack"><div class="panel"><header><h2>${canIn ? 'Check in' : 'Release'}</h2></header><div class="body stack">
    ${co.outAt ? `<span class="small">Went out ${esc(fmtStamp(co.outAt))} with ${who(co.outBy)}.</span>` : ''}
    ${co.inAt ? `<span class="small">Came back ${esc(fmtStamp(co.inAt))} with ${who(co.inBy)}.</span>` : ''}
    ${canOut ? `${blockers.length ? `<div class="note bad">${blockers.map(esc).join(' ')} The agreement says gear is not released without an accepted certificate.</div><label class="check"><input type="checkbox" id="co-override" data-b="checkout.override" data-type="bool" ${co.override ? 'checked' : ''}> Release anyway, and note why below</label>` : '<div class="checklist"><div class="ok">Agreement signed</div><div class="ok">Certificate verified</div></div>'}
      <button class="btn primary" data-act="checkOut" ${(blockers.length && !co.override) || !lines.length ? 'disabled' : ''}>Mark checked out${outAll ? '' : ` (${lines.filter((l) => !(co.out && co.out[l.id])).length} unticked)`}</button>` : ''}
    ${canIn ? `${late ? `<div class="note bad">${plural(late, 'day')} late. At the full day rate that is ${money(late * dayRate)}.</div>` : ''}<button class="btn primary" data-act="checkIn">Mark returned${backAll ? '' : ` (${lines.filter((l) => !(co.back && co.back[l.id])).length} not back)`}</button>` : ''}
    ${!canOut && !canIn ? `<span class="muted small">${b.status === 'request' ? 'Quote and confirm the job before release.' : 'This job is ' + STATUS[b.status].label.toLowerCase() + '.'}</span>` : ''}
    ${b.late && b.late.days ? `<div class="kv"><dt>Late return charge</dt><dd>${money(b.late.fee)}</dd></div>` : ''}
    <label class="field"><span>Deposit</span><select id="dep" data-b="deposit.status"><option value="none" ${pw.deposit !== 'received' ? 'selected' : ''}>Not received</option><option value="received" ${pw.deposit === 'received' ? 'selected' : ''}>Received</option></select></label>
    <label class="field"><span>Balance</span><select id="bal" data-b="payment"><option value="unpaid" ${b.payment !== 'paid' ? 'selected' : ''}>Unpaid</option><option value="paid" ${b.payment === 'paid' ? 'selected' : ''}>Paid</option></select></label>
  </div></div></aside></div>`;
}

/* ---------- Inventory ---------- */
function invFiltered() {
  const f = state.inv; const q = f.q.trim().toLowerCase();
  return state.cat.items.filter((i) => (f.cat === 'all' || i.cat === f.cat) && (f.own === 'all' || i.own === f.own) && (f.conf === 'all' || i.conf === f.conf || (f.conf === 'flag' && (OPEN_BY_ITEM[i.id] || DATA_CHECKS.some((d) => d.id === i.id))))
    && (!q || i.id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || (i.kit || '').toLowerCase().includes(q)));
}
function invTable() {
  const rows = invFiltered(); const f = state.inv; const range = f.from && f.to && f.from <= f.to;
  const tot = { n: rows.length, re: sum(rows, (i) => (i.resale || 0) * i.qty), day: sum(rows, (i) => (i.rec || 0) * i.qty) };
  return `<div class="body" style="padding-bottom:0"><span class="muted small">${plural(tot.n, 'item')} · ${money(tot.re)} resale · ${money(tot.day)} a day if every unit went out</span></div>
  <div class="tbl-wrap"><table><thead><tr><th>ID</th><th>Item</th><th class="n">Qty</th><th>Rate / day</th><th class="n">Resale</th><th class="n">Pays back</th><th>Goes out</th>${range ? '<th class="n">Free</th>' : ''}</tr></thead><tbody>${rows.map((i) => {
    const flag = OPEN_BY_ITEM[i.id] || DATA_CHECKS.some((d) => d.id === i.id); let av = '';
    if (range) { const u = usage(i.id, f.from, f.to); const free = i.qty - u.firm; av = `<td class="n"><b style="color:var(--${free <= 0 ? 'bad' : free < i.qty ? 'warn' : 'ink'})">${Math.max(0, free)}</b> / ${i.qty}${u.tent ? `<span class="sub">${u.tent} held</span>` : ''}</td>`; }
    return `<tr class="click" data-act="item" data-id="${i.id}" tabindex="0"><td>${tape(i.id, i.own)}</td><td style="min-width:220px">${esc(i.name)}<span class="sub">${ownerTag(i.own)} · ${esc(i.cat)}${i.kit ? ' · ' + esc(i.kit) : ''}${i.conf === 'Low' ? ' · <span class="flag">low confidence</span>' : ''}${flag ? ' · <span class="flag" style="color:var(--warn)">open question</span>' : ''}</span></td>
      <td class="n">${i.qty}</td><td>${rangeBar(i)}</td><td class="n">${i.resale == null ? '—' : money(i.resale * i.qty)}${i.qty > 1 && i.resale ? `<span class="sub">${money(i.resale)} each</span>` : ''}</td>
      <td class="n">${i.payback == null ? '—' : plural(i.payback, 'day')}</td><td>${esc(i.rent)}</td>${av}</tr>`;
  }).join('')}</tbody></table></div>`;
}
function vInventory() {
  const f = state.inv; const cats = CAT_ORDER.filter((c) => state.cat.items.some((i) => i.cat === c));
  return `<section class="view">
    <div class="head"><div><div class="eyebrow">One row per item across all three kits</div><h1>Inventory</h1><p>Rate bars run from the cheapest comparable ask to rental-house pricing. The mark is Rate Rec, the number to quote. Quote from Rec and discount on purpose, never from the floor.</p></div></div>
    <div class="panel"><div class="body stack">
      <div class="grid-form"><label class="field"><span>Search</span><input type="search" id="inv-q" data-inv="q" value="${esc(f.q)}" placeholder="Name, ID or kit"></label>
        <label class="field"><span>Free from</span><input type="date" id="inv-from" data-inv="from" value="${esc(f.from)}"></label><label class="field"><span>to</span><input type="date" id="inv-to" data-inv="to" value="${esc(f.to)}"></label>
        <label class="field"><span>Confidence</span><select id="inv-conf" data-inv="conf"><option value="all">All</option><option value="High" ${f.conf === 'High' ? 'selected' : ''}>High: observed NYC listings</option><option value="Medium" ${f.conf === 'Medium' ? 'selected' : ''}>Medium: class rate</option><option value="Low" ${f.conf === 'Low' ? 'selected' : ''}>Low: a real hole</option><option value="flag" ${f.conf === 'flag' ? 'selected' : ''}>Has an open question</option></select></label></div>
      <div class="chips"><button class="chip" data-act="invOwn" data-v="all" aria-pressed="${f.own === 'all'}">All owners</button>${OWN.map((o) => `<button class="chip" data-act="invOwn" data-v="${o}" aria-pressed="${f.own === o}"><span class="own ${o}">${OWNERS[o].name}</span></button>`).join('')}</div>
      <div class="chips"><button class="chip" data-act="invCat" data-v="all" aria-pressed="${f.cat === 'all'}">Everything</button>${cats.map((c) => `<button class="chip" data-act="invCat" data-v="${c}" aria-pressed="${f.cat === c}">${c}</button>`).join('')}</div>
    </div><div id="invTable">${invTable()}</div></div>
  </section>`;
}

/* ---------- Packages ---------- */
function vPackages() {
  const pctP = num(state.settings.possessionPct, 50) / 100;
  return `<section class="view">
    <div class="head"><div><div class="eyebrow">Priced live from the item IDs</div><h1>Packages</h1><p>Each package reprices itself when a member rate changes. Day rate, possession rate and replacement value are the three Schedule A numbers.</p></div></div>
    <div class="pkgs">${state.cat.packages.map((p) => `<article class="pkg">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><h3>${esc(p.name)}</h3><span class="tape">${esc(p.id)}</span></div>
      <div class="big">${money(p.day)}<small>/ day</small></div>
      <p class="muted small" style="margin:0">${esc(p.contents)}</p>
      ${shareBar(p.own)}
      <dl class="kv"><dt>Possession / day</dt><dd>${money(p.day * pctP)}</dd><dt>Replacement value</dt><dd>${money(p.repl)}</dd></dl>
      <div class="ladder">${[[1, '1 day'], [2, '2 days'], [3, '3 days'], [5, 'Week']].map(([d, l]) => `<div><span>${l}</span><b>${money(p.day * weekFactor(d))}</b></div>`).join('')}</div>
      <div class="chips">${p.ids.map((id) => `<button class="chip" data-act="item" data-id="${id}" style="padding:2px 4px;border:0;background:none">${tape(id)}</button>`).join('')}</div>
      ${p.missing.length ? `<div class="note bad">IDs not on Inventory: ${p.missing.map(esc).join(', ')}. They price at zero.</div>` : ''}
      ${DATA_CHECKS.filter((d) => p.ids.includes(d.id)).map((d) => `<div class="note">${esc(d.title)} affects this price. See Roadmap.</div>`).join('')}
      <div class="actions"><button class="btn primary sm" data-act="quotePkg" data-id="${p.id}">Quote this package</button></div></article>`).join('')}</div>
    <div class="panel"><header><h2>Multi-day convention</h2></header><div class="body kv" style="max-width:560px">
      <dt>1 day</dt><dd>1.0x the day rate</dd><dt>2 days</dt><dd>1.85x</dd><dt>3 days</dt><dd>2.5x</dd><dt>4 to 7 days</dt><dd>3.0x, the standard three-day week</dd><dt>Each extra week</dt><dd>plus 2.5x</dd><dt>Possession day</dt><dd>${num(state.settings.possessionPct)}% of the day rate, billed separately, always</dd>
    </div><div class="body" style="padding-top:0"><span class="faint small">The sheet's Quote Builder bills straight days. Each booking picks one or the other, and new bookings default to the choice in Settings.</span></div></div>
  </section>`;
}

/* ---------- Insurance (pool) ---------- */
function vInsurance() {
  const items = state.cat.items.filter((i) => i.qty > 0); const t = todayStr();
  const byOwn = {}; OWN.forEach((o) => (byOwn[o] = items.filter((i) => i.own === o)));
  const total = sum(items, (i) => (i.resale || 0) * i.qty);
  const insQ = OPEN.find((o) => o[1] === 'Insurance');
  const active = state.bookings.filter((b) => HOLDS.has(b.status) && b.returnDate >= addDays(t, -1)).sort((a, b) => a.pickup.localeCompare(b.pickup));
  return `<section class="view">
    <div class="head"><div><div class="eyebrow">Two sides of cover</div><h1>Insurance</h1><p>The pool's own equipment schedule for your insurer, and the certificate every renter owes you before gear leaves.</p></div>
      <div class="actions">${state.canDownload ? '<button class="btn primary" data-act="dlPoolSchedule">Download schedule .csv</button>' : ''}</div></div>
    ${total ? '' : '<div class="note">This copy of the rate card has no resale values, so the schedule shows $0. The full rate card fills it in.</div>'}
    ${insQ ? `<div class="note bad"><b>Open, and the expensive question:</b> ${esc(insQ[4])}. ${esc(insQ[5])}</div>` : ''}
    <div class="cols">
      <div class="panel"><header><h2>Pool equipment schedule</h2><span class="muted small">${money(total)} across ${items.length} lines</span></header><div class="body stack">
        ${shareBar(Object.fromEntries(OWN.map((o) => [o, sum(byOwn[o], (i) => (i.resale || 0) * i.qty)])))}
        <div class="tbl-wrap"><table><thead><tr><th>Owner</th><th class="n">Lines</th><th class="n">Scheduled value</th><th class="n">Largest item</th></tr></thead><tbody>${OWN.map((o) => { const top = byOwn[o].slice().sort((a, b) => (b.resale || 0) * b.qty - (a.resale || 0) * a.qty)[0]; return `<tr><td>${ownerTag(o, true)}</td><td class="n">${byOwn[o].length}</td><td class="n">${money(sum(byOwn[o], (i) => (i.resale || 0) * i.qty))}</td><td class="n small">${top ? esc(top.id) + ' · ' + money((top.resale || 0) * top.qty) : ''}</td></tr>`; }).join('')}<tr class="total"><td>Pool</td><td class="n">${items.length}</td><td class="n">${money(total)}</td><td></td></tr></tbody></table></div>
        <ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px"><li>Kit parts inside a combo carry zero value so the Ronin 4D is not insured twice.</li><li>The CSV has an empty serial-number column. Insurers ask for serials on anything over about $500.</li><li>Anything not yet itemized, with a Qty of 0, cannot be insured until it is.</li></ul>
      </div></div>
      <div class="panel"><header><h2>Renter certificates</h2><span class="muted small">Active jobs</span></header><div class="body flush">${state.dbState !== 'ready' ? dbGate('certificates') : active.length ? `<div class="tbl-wrap"><table><thead><tr><th>Job</th><th class="n">Cover needed</th><th>Certificate</th></tr></thead><tbody>${active.map((b) => { const cs = coiState(b); return `<tr class="click" data-act="openBooking" data-id="${b.id}" data-tab="insurance" tabindex="0"><td><b>${esc(b.project || b.ref)}</b><span class="sub">Pickup ${esc(fmtDay(b.pickup))}</span></td><td class="n">${money(chosen(b).repl)}</td><td><span class="pill ${cs.status === 'verified' ? 'good' : cs.status === 'rejected' ? 'bad' : cs.status === 'none' ? 'warn' : 'info'}">${COI_STATUS[cs.status]}</span>${cs.status !== 'verified' && cs.status !== 'none' ? `<span class="sub">${cs.checks.filter((x) => !x.ok).length} checks open</span>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><b>No active jobs</b><span>Certificates appear here once a job is quoted.</span></div>'}</div></div>
    </div>
    <div class="panel"><header><h2>What every renter is asked for</h2><button class="btn sm" data-act="nav" data-v="settings">Change in Settings</button></header><div class="body kv" style="max-width:720px">
      <dt>Equipment cover</dt><dd>At least the Schedule A replacement value</dd><dt>General liability</dt><dd>${money(num(state.settings.glOcc))} per occurrence / ${money(num(state.settings.glAgg))} aggregate</dd>
      <dt>Named as additional insured and loss payee</dt><dd>${esc(state.settings.legalName || 'Legal entity not set')}</dd><dt>Loss of use</dt><dd>Day rate for up to ${num(state.settings.lossOfUseCap)} days</dd></div></div>
  </section>`;
}

/* ---------- Owners ---------- */
function vOwners() {
  const earned = state.bookings.filter((b) => EARNED.has(b.status));
  const agg = {}; OWN.forEach((o) => (agg[o] = { billed: 0, poss: 0, comped: 0 }));
  earned.forEach((b) => { const c = chosen(b); OWN.forEach((o) => { agg[o].billed += c.own[o].billed; agg[o].poss += c.own[o].poss; agg[o].comped += c.own[o].comped; }); });
  const items = state.cat.items;
  return `<section class="view">
    <div class="head"><div><div class="eyebrow">Per-owner revenue split</div><h1>Owners</h1><p>Every piece of gear still belongs to whoever paid for it. Billed revenue and comped value sit side by side, because in a shared pool the second one causes the arguments.</p></div></div>
    <div class="cols">${OWN.map((o) => { const mine = items.filter((i) => i.own === o); const re = sum(mine, (i) => (i.resale || 0) * i.qty); const openN = mine.filter((i) => OPEN_BY_ITEM[i.id] || DATA_CHECKS.some((d) => d.id === i.id)).length; return `<div class="panel"><header><h2><span class="own ${o}">${OWNERS[o].name}</span></h2><span class="muted small">${mine.length} items</span></header><div class="body stack">
      <dl class="kv"><dt>Gear at resale</dt><dd>${money(re)}</dd><dt>Day rate if all of it went out</dt><dd>${money(sum(mine, (i) => (i.rec || 0) * i.qty))}</dd><dt>Items with open questions</dt><dd>${openN}</dd></dl>
      <dl class="kv" style="border-top:1px solid var(--line);padding-top:10px"><dt>Equipment billed</dt><dd>${money(agg[o].billed)}</dd><dt>Possession share</dt><dd>${money(agg[o].poss)}</dd><dt><b>Earned</b></dt><dd><b>${money(agg[o].billed + agg[o].poss)}</b></dd><dt>Comped away</dt><dd>${money(agg[o].comped)}</dd></dl></div></div>`; }).join('')}</div>
    <div class="panel"><header><h2>By booking</h2><span class="muted small">Confirmed, out, returned and closed jobs, at the tier the client chose</span></header><div class="body flush">${state.dbState !== 'ready' ? dbGate('bookings') : earned.length ? `<div class="tbl-wrap"><table><thead><tr><th>Job</th>${OWN.map((o) => `<th class="n">${OWNERS[o].short}</th>`).join('')}<th class="n">Comped</th></tr></thead><tbody>${earned.map((b) => { const c = chosen(b); return `<tr class="click" data-act="openBooking" data-id="${b.id}" tabindex="0"><td><b>${esc(b.project || b.ref)}</b><span class="sub">${esc(fmtDay(b.pickup))} · ${STATUS[b.status].label}</span></td>${OWN.map((o) => `<td class="n">${money(c.own[o].billed + c.own[o].poss)}</td>`).join('')}<td class="n">${money(c.comp)}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><b>No earned jobs yet</b><span>Owner revenue counts once a booking is confirmed.</span></div>'}</div></div>
    <div class="note info">Not decided yet: what share of each rental goes to a buyback fund for partner gear, and what share to a separate replacement fund. Both belong in the operating agreement before money moves, so this page reports gross owner revenue only.</div>
  </section>`;
}

/* ---------- Storefront ---------- */
function storeItems(group) {
  const g = STORE_GROUPS.find((x) => x.key === group);
  return state.cat.items.filter((i) => g && g.cats && g.cats.includes(i.cat) && i.rec != null && i.qty > 0 && i.kit !== 'Expendables' && !/^Transport/.test(i.notes) && i.id !== 'M-GRP-072');
}
function vStore() {
  const S = state.settings; const st = state.store; const f = st.form; const inCart = (k) => st.cart.some((x) => x.key === k);
  const cards = st.group === 'packages'
    ? state.cat.packages.map((p) => `<div class="card ${inCart(p.id) ? 'in' : ''}"><div><h3>${esc(p.name)}</h3><p class="muted small" style="margin:4px 0 0">${esc(p.contents)}</p></div><div class="foot"><span class="price">${money(p.day)}<small> / day</small></span><button class="btn sm ${inCart(p.id) ? '' : 'primary'}" data-act="cart" data-k="${p.id}">${inCart(p.id) ? 'Added' : 'Add'}</button></div></div>`).join('')
    : storeItems(st.group).map((i) => { const perLens = /RATE IS PER LENS/.test(i.notes); return `<div class="card ${inCart(i.id) ? 'in' : ''}"><div><h3>${esc(i.name)}</h3><p class="muted small" style="margin:4px 0 0">${esc(i.cat)}${i.qty > 1 ? ` · ${i.qty} available` : ''}</p></div><div class="foot"><span class="price">${money(i.rec)}<small> / day${perLens ? ' per lens' : i.qty > 1 ? ' each' : ''}</small></span><button class="btn sm ${inCart(i.id) ? '' : 'primary'}" data-act="cart" data-k="${i.id}">${inCart(i.id) ? 'Added' : 'Add'}</button></div></div>`; }).join('');
  const cartRows = st.cart.map((c, n) => { const p = state.cat.pkgById[c.key]; const it = state.cat.byId[c.key]; const name = p ? p.name : it ? it.name : c.key; const rate = p ? p.day : it ? it.rec : 0; return `<tr><td>${esc(name)}</td><td>${p ? '' : `<input type="number" min="1" max="${it ? it.qty : 1}" data-cartqty="${n}" value="${c.qty}" aria-label="Quantity" style="width:58px">`}</td><td class="n">${money(rate * (p ? 1 : c.qty))}</td><td><button class="x" data-act="uncart" data-i="${n}" aria-label="Remove">×</button></td></tr>`; }).join('');
  const est = sum(st.cart, (c) => { const p = state.cat.pkgById[c.key]; const it = state.cat.byId[c.key]; return p ? p.day : it ? (it.rec || 0) * c.qty : 0; });
  return `<section class="store">
    <div class="note info">Preview of the client-facing site. Internal numbers (owners, resale, confidence) never appear here. A request saves straight into Bookings with status Request${HOSTED ? '' : ', in this browser only'}.</div>
    <div class="store-hero"><div class="tapes"><span style="background:var(--tape-m)"></span><span style="background:var(--tape-c)"></span><span style="background:var(--tape-s)"></span></div>
      <h1>${esc(S.company)}</h1><p>Camera, lighting and grip from a working New York crew. Modern LED packages, cine glass, and the people who know how to run them.</p>
      <div class="meta"><span>${esc(S.pickup)}</span><span>${esc(S.hours)}</span>${S.email ? `<span>${esc(S.email)}</span>` : ''}</div></div>
    <div class="chips" role="tablist">${STORE_GROUPS.map((g) => `<button class="chip" data-act="storeGroup" data-g="${g.key}" aria-pressed="${st.group === g.key}">${g.label}</button>`).join('')}</div>
    <div class="store-grid"><div class="cards">${cards}</div>
      <aside class="cart panel"><header><h2>Your request</h2><span class="muted small">${st.cart.length ? money(est) + ' / day' : ''}</span></header>
        <div class="body stack">${st.sent ? `<div class="note info">${esc(st.sent)}</div>` : ''}
          ${st.cart.length ? `<div class="tbl-wrap"><table class="lines"><tbody>${cartRows}</tbody></table></div>` : '<span class="muted small">Add packages or single items. You will get a written quote with the multi-day rate and insurance requirements.</span>'}
          <div class="grid-form" style="grid-template-columns:1fr 1fr">
            <label class="field"><span>Pickup</span><input type="date" id="sf-pickup" data-sf="pickup" value="${esc(f.pickup)}"></label><label class="field"><span>Return</span><input type="date" id="sf-ret" data-sf="ret" value="${esc(f.ret)}"></label>
            <label class="field"><span>Shoot days</span><input type="number" min="1" id="sf-sd" data-sf="shootDays" value="${esc(f.shootDays)}"></label><label class="field"><span>Project</span><input type="text" id="sf-proj" data-sf="project" value="${esc(f.project)}"></label>
            <label class="field"><span>Name</span><input type="text" id="sf-name" data-sf="name" value="${esc(f.name)}"></label><label class="field"><span>Company</span><input type="text" id="sf-comp" data-sf="company" value="${esc(f.company)}"></label>
            <label class="field"><span>Email</span><input type="email" id="sf-email" data-sf="email" value="${esc(f.email)}"></label><label class="field"><span>Phone</span><input type="tel" id="sf-phone" data-sf="phone" value="${esc(f.phone)}"></label>
            <label class="field wide"><span>Insurance</span><select id="sf-coi" data-sf="coi"><option value="have" ${f.coi === 'have' ? 'selected' : ''}>We carry rented-equipment cover and can send a certificate</option><option value="need" ${f.coi === 'need' ? 'selected' : ''}>We need to arrange cover for this job</option><option value="unsure" ${f.coi === 'unsure' ? 'selected' : ''}>Not sure</option></select></label>
          </div>
          <button class="btn primary" data-act="sendRequest" ${st.cart.length && state.dbState === 'ready' ? '' : 'disabled'}>Send request</button>
          ${state.dbState !== 'ready' ? '<span class="faint small">Requests need the shared database, which is not available in this view.</span>' : ''}
        </div></aside></div>
  </section>`;
}

/* ---------- Roadmap ---------- */
function vRoadmap() {
  const r = state.road; const open = OPEN.filter((o) => r.showClosed || o[0] === 'Open');
  const MISSING = SNAPSHOT.missing || [], GROWTH = SNAPSHOT.growth || [], SEQ = SNAPSHOT.sequence || [];
  if (!OPEN.length && !DATA_CHECKS.length && !MISSING.length && !GROWTH.length) {
    return `<section class="view"><div class="head"><div><div class="eyebrow">From a shared storage unit to a rental house</div><h1>Roadmap</h1></div></div><div class="panel"><div class="empty"><b>No roadmap in this copy</b><span>Open questions, the buying list and the growth plan come with the full rate card.</span></div></div></section>`;
  }
  const miss = MISSING.filter((m) => m[5] === r.phase);
  const tally = (ph) => { const rows = MISSING.filter((m) => m[5] === ph && m[2] > 0); const ge = rows.filter((m) => GE.has(m[0])); return { n: rows.length, used: sum(rows, (m) => m[4]), retail: sum(rows, (m) => (m[3] || 0) * m[2]), ge: ge.length, agreed: ge.filter((m) => m[8] === 'Yes' && m[9] === 'Yes').length }; };
  return `<section class="view">
    <div class="head"><div><div class="eyebrow">From a shared storage unit to a rental house</div><h1>Roadmap</h1><p>The open questions that keep the rate card a draft, what the pool should buy next, and when each growth step is worth taking.</p></div></div>
    <div class="panel"><header><h2>Open questions</h2><div class="actions"><span class="muted small">${OPEN.filter((o) => o[0] === 'Open').length} open in the sheet, ${DATA_CHECKS.length} found here</span><label class="check small"><input type="checkbox" id="rd-closed" data-road="showClosed" ${r.showClosed ? 'checked' : ''}> Show closed</label></div></header><div class="body flush">
      ${DATA_CHECKS.map((d) => `<div class="q"><span class="pill bad">New</span><div><b>${esc(d.title)}</b> ${tape(d.id)}</div><div class="w">${esc(d.text)}</div></div>`).join('')}
      ${open.map((o) => `<div class="q"><span class="pill ${o[0] === 'Closed' ? 'good' : o[1] === 'Blocked' || o[1] === 'Insurance' ? 'bad' : 'warn'}">${esc(o[1])}</span><div><b>${esc(o[3])}</b> ${state.cat.byId[o[2]] ? `<button class="chip" data-act="item" data-id="${o[2]}" style="padding:0;border:0;background:none">${tape(o[2])}</button>` : ''}</div><div class="w">${esc(o[4])}. <b>Do:</b> ${esc(o[5])}</div></div>`).join('')}</div></div>
    ${GROWTH.length ? `<div class="cols">${GROWTH.map((g, i) => { const t = tally(i + 1); return `<div class="panel"><header><h2>${esc(g[0])}</h2><span class="muted small">${esc(g[1])}</span></header><div class="body phase">
      <div class="big">${money(g[3])}</div><span class="muted small">gear capital, used · ${money(g[2])}/month facility · ${money(g[4])} running total</span>
      <p style="margin:0">${esc(g[5])}</p><p class="small muted" style="margin:0"><b>When:</b> ${esc(g[6])}</p>
      <span class="small">${t.n} lines on the Missing Gear list${t.ge ? ` · ${t.agreed} of ${t.ge} G&E lines agreed by ${OWNERS.C.short} and ${OWNERS.S.short}` : ''}</span></div></div>`; }).join('')}</div>` : ''}
    ${MISSING.length ? `<div class="panel"><header><h2>Missing gear</h2><div class="seg" role="group" aria-label="Phase">${[1, 2, 3].map((p) => `<button data-act="phase" data-p="${p}" aria-pressed="${r.phase === p}">Phase ${p}</button>`).join('')}</div></header>
      <div class="tbl-wrap"><table><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Used total</th><th>Picked by</th><th>Sign-off</th></tr></thead><tbody>${miss.map((m) => `<tr><td style="min-width:240px"><b>${esc(m[1])}</b><span class="sub">${esc(m[0])} · ${esc(m[6])}</span></td><td class="n">${m[2]}</td><td class="n">${m[2] ? money(m[4]) : '—'}</td><td>${esc(m[7])}</td><td>${m[11] === 'Cut' ? '<span class="pill plain">Cut</span>' : GE.has(m[0]) ? `<span class="pill ${m[8] === 'Yes' && m[9] === 'Yes' ? 'good' : 'warn'}">${esc(m[11])}</span>` : '<span class="pill plain">Camera, no sign-off</span>'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${SEQ.length ? `<div class="panel"><header><h2>If you only read one list</h2></header><div class="body"><ol class="seq">${SEQ.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div></div>` : ''}
  </section>`;
}

/* ---------- Settings ---------- */
function vSettings() {
  const S = state.settings; const c = state.cat;
  const fld = (k, label, type, hint, wide) => `<label class="field ${wide ? 'wide' : ''}"><span>${label}</span>${type === 'area' ? `<textarea id="s-${k}" data-s="${k}" rows="2">${esc(S[k])}</textarea>` : `<input type="${type || 'text'}" id="s-${k}" data-s="${k}" value="${esc(S[k])}">`}${hint ? `<small>${hint}</small>` : ''}</label>`;
  return `<section class="view">
    <div class="head"><div><div class="eyebrow">Shared by everyone who uses this desk</div><h1>Settings</h1><p>Company details and the terms that flow into every quote, agreement and certificate request.</p></div></div>
    <div class="panel"><header><h2>Company</h2></header><div class="body grid-form">
      ${fld('company', 'Trading name')}${fld('legalName', 'Legal entity name', 'text', 'Appears on agreements and certificates. Leave blank until the entity exists.')}${fld('email', 'Bookings email', 'email')}${fld('phone', 'Phone', 'tel')}
      ${fld('address', 'Registered address', 'text', '', true)}${fld('pickup', 'Pickup location', 'text', '', true)}${fld('hours', 'Pickup and return hours', 'text', '', true)}
    </div></div>
    <div class="panel"><header><h2>Rates and terms</h2></header><div class="body grid-form">
      ${fld('possessionPct', 'Possession rate, % of day rate', 'number')}${fld('depositPct', 'Deposit, % of total', 'number')}
      <label class="field"><span>New bookings price multi-day as</span><select id="s-rateMode" data-s="rateMode"><option value="straight" ${S.rateMode !== 'week' ? 'selected' : ''}>Straight days</option><option value="week" ${S.rateMode === 'week' ? 'selected' : ''}>Film week</option></select></label>
      ${fld('glOcc', 'Renter GL, per occurrence', 'number')}${fld('glAgg', 'Renter GL, aggregate', 'number')}${fld('lossOfUseCap', 'Loss of use cap, days', 'number')}${fld('governing', 'Governing law (state)')}
      ${fld('paymentTerms', 'Payment terms', 'area', '', true)}${fld('lateRule', 'Late return', 'area', '', true)}${fld('cancelRule', 'Cancellation', 'area', '', true)}
    </div></div>
    <div class="panel"><header><h2>Rate card source</h2><span class="muted small">${c.source === 'sheet' ? `Synced from the sheet ${esc(fmtStamp(c.syncedAt))}` : `Built-in snapshot of ${esc(fmtLong(c.asOf))}`}</span></header><div class="body stack">
      <p style="margin:0" class="small">The Google Sheet stays the only place gear is typed in. Syncing reads its Inventory, Packages and Labor tabs with your Google Sheets connection and shares the result with everyone using this desk.</p>
      ${SNAPSHOT.sheetId ? `<div class="actions"><button class="btn primary" data-act="sync" ${state.syncing || state.dbState !== 'ready' || !state.mcpReady ? 'disabled' : ''}>${state.syncing ? 'Syncing…' : 'Sync from Google Sheet'}</button>${c.source === 'sheet' ? '<button class="btn" data-act="unsync">Go back to the built-in snapshot</button>' : ''}<a class="btn ghost" href="https://docs.google.com/spreadsheets/d/${esc(SNAPSHOT.sheetId)}/edit" target="_blank" rel="noopener">Open the sheet</a></div>` : '<span class="muted small">This copy of the rate card is not linked to a Google Sheet.</span>'}
      ${state.syncMsg ? `<div class="note ${/^Synced/.test(state.syncMsg) ? 'info' : 'bad'}">${esc(state.syncMsg)}</div>` : ''}
      ${SNAPSHOT.sheetId && !state.mcpReady ? `<span class="faint small">${HOSTED ? 'Syncing needs the Google Sheets connector, which this view cannot reach.' : 'Syncing works in the claude.ai version of the desk. This copy uses the snapshot built into src/data.js.'}</span>` : ''}
    </div></div>
  </section>`;
}

/* ---------- Drawer ---------- */
function renderDrawer() {
  const host = $('#drawerHost'); const d = state.drawer;
  if (!d) { host.innerHTML = ''; return; }
  const it = state.cat.byId[d.id]; if (!it) { state.drawer = null; host.innerHTML = ''; return; }
  const t = todayStr(); const u = usage(it.id, t, addDays(t, 60));
  const pk = state.cat.packages.filter((p) => p.ids.includes(it.id));
  const qs = (OPEN_BY_ITEM[it.id] || []).map((o) => ({ t: `${o[1]}: ${o[4]}`, d: o[5] })).concat(DATA_CHECKS.filter((x) => x.id === it.id).map((x) => ({ t: x.title, d: x.text })));
  const targets = state.bookings.filter((b) => ['request', 'quoted', 'confirmed'].includes(b.status));
  host.innerHTML = `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(it.name)}">
    <button class="btn ghost sm close" data-act="closeDrawer">Close</button>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${tape(it.id, it.own)}${ownerTag(it.own)}<span class="pill plain">${esc(it.cat)}</span>${it.kit ? `<span class="pill plain">${esc(it.kit)}</span>` : ''}${it.conf ? `<span class="pill ${it.conf === 'High' ? 'good' : it.conf === 'Low' ? 'bad' : 'plain'}">${esc(it.conf)} confidence</span>` : ''}</div>
    <h2>${esc(it.name)}</h2>
    ${it.rec != null ? `<div class="bigrate">${money(it.rec)}<small>/ day to quote${/RATE IS PER LENS/.test(it.notes) ? ', per lens' : ''}</small></div>${rangeBar(it)}` : `<div class="note">${esc(it.basis)}</div>`}
    <dl class="kv"><dt>Quantity</dt><dd>${it.qty}</dd><dt>Resale</dt><dd>${it.resale == null ? '—' : `${money(it.resale)} each · ${money(it.resale * it.qty)}`}</dd><dt>Rental days to pay back</dt><dd>${it.payback == null ? '—' : it.payback}</dd><dt>How often it goes out</dt><dd>${esc(it.rent) || '—'}</dd><dt>Out in the next 60 days</dt><dd>${u.who.length ? u.who.map((w) => esc(w.b.ref)).join(', ') : 'Not booked'}</dd></dl>
    ${qs.map((q) => `<div class="note bad"><b>${esc(q.t)}</b><br>${esc(q.d)}</div>`).join('')}
    ${it.notes ? `<div><div class="eyebrow">Notes</div><p style="margin:6px 0 0">${esc(it.notes)}</p></div>` : ''}
    ${it.basis ? `<div><div class="eyebrow">Where the rate came from</div><p style="margin:6px 0 0" class="muted">${esc(it.basis)}</p></div>` : ''}
    ${pk.length ? `<div><div class="eyebrow">In packages</div><div class="chips" style="margin-top:6px">${pk.map((p) => `<span class="pill plain">${esc(p.name)}</span>`).join('')}</div></div>` : ''}
    ${it.rec != null && it.qty > 0 && state.dbState === 'ready' && !state.readOnly ? `<div class="stack" style="gap:8px"><div class="eyebrow">Add to a booking</div><div style="display:flex;gap:8px"><select id="dr-target" style="flex:1" aria-label="Booking">${targets.map((b) => `<option value="${b.id}">${esc(b.project || b.ref)} · ${esc(fmtDay(b.pickup))}</option>`).join('')}<option value="__new">New booking</option></select><button class="btn primary" data-act="drawerAdd" data-id="${it.id}">Add</button></div></div>` : ''}
  </aside>`;
}

/* ================= actions ================= */
const ACT = {
  nav(el) { if (state.dirty) flushSave(); state.view = el.dataset.v; state.drawer = null; render(); window.scrollTo(0, 0); },
  openBooking(el) { if (el.dataset.tab) state.tab = el.dataset.tab; else if (state.view !== 'booking') state.tab = 'quote'; openBooking(el.dataset.id); },
  async newBooking() { const b = newBooking(); state.tab = 'quote'; await createBooking(b, true); },
  async quotePkg(el) { const b = newBooking({ project: '' }); addPackageTo(b, el.dataset.id); state.tab = 'quote'; await createBooking(b, true); },
  tab(el) { state.tab = el.dataset.t; render(); },
  bkFilter(el) { state.bk.filter = el.dataset.f; render(); },
  calMove(el) { state.cal.start = addDays(state.cal.start, num(el.dataset.n)); render(); },
  calToday() { state.cal.start = mondayOf(todayStr()); render(); },
  invOwn(el) { state.inv.own = el.dataset.v; render(); },
  invCat(el) { state.inv.cat = el.dataset.v; render(); },
  item(el) { state.drawer = { id: el.dataset.id }; renderDrawer(); const c = $('.drawer .close'); if (c) c.focus(); },
  closeDrawer() { state.drawer = null; renderDrawer(); },
  budget(el) { state.draft.budget = el.dataset.t; scheduleSave(0); render(); },
  applyPoss() { state.draft.possessionDays = suggestPossession(state.draft); scheduleSave(0); render(); },
  addItem(el) { addLineTo(state.draft, el.dataset.id, 1); state.picker = { q: '', open: false }; scheduleSave(0); render(); const p = $('#pickq'); if (p) p.focus(); },
  rmLine(el) { state.draft.lines.splice(num(el.dataset.i), 1); scheduleSave(0); render(); },
  addCrew() { const role = ($('#crewRole') || {}).value || state.cat.labor[0].role; state.crewRole = role; const l = state.cat.labor.find((x) => x.role === role); state.draft.crew = state.draft.crew || []; state.draft.crew.push({ role, rate: l ? l.rec : 0, people: 1, days: num(state.draft.shootDays) || 1, tier: 'C' }); scheduleSave(0); render(); },
  rmCrew(el) { state.draft.crew.splice(num(el.dataset.i), 1); scheduleSave(0); render(); },
  confirmDelete(el) { state.confirmDelete = el.dataset.v === '1'; render(); },
  async deleteBooking() { const id = state.draft.id; clearTimeout(saveTimer); state.dirty = false; try { await db.collection('bookings').doc(id).delete(); } catch (e) { writeError(e); return; } state.draft = null; state.view = 'bookings'; toast('Booking deleted.'); render(); },
  advance(el) {
    const to = el.dataset.to; const b = state.draft;
    if (to === '__checkout') { state.tab = 'checkout'; render(); return; }
    b.status = to; if (to === 'quoted' && !b.quotedAt) b.quotedAt = new Date().toISOString(); if (to === 'confirmed') b.confirmedAt = new Date().toISOString();
    scheduleSave(0); render(); toast(`${b.ref} is now ${STATUS[to].label.toLowerCase()}.`);
  },
  contract(el) { const b = state.draft; b.contract = b.contract || {}; b.contract.status = el.dataset.s; if (el.dataset.s === 'sent' && !b.contract.sentAt) b.contract.sentAt = new Date().toISOString(); if (el.dataset.s === 'signed' && !b.contract.signedOn) b.contract.signedOn = todayStr(); scheduleSave(0); render(); },
  coiStatus(el) { const b = state.draft; b.coi = b.coi || {}; b.coi.status = el.dataset.s; if (el.dataset.s === 'requested') b.coi.requestedAt = new Date().toISOString(); scheduleSave(0); render(); },
  checkOut() { const b = state.draft; b.checkout = b.checkout || { out: {}, back: {}, notes: {} }; b.checkout.outAt = new Date().toISOString(); b.checkout.outBy = state.uid || null; b.status = 'out'; scheduleSave(0); render(); toast(`${b.ref} is checked out.`); },
  checkIn() { const b = state.draft; const late = Math.max(0, diffDays(b.returnDate, todayStr())); b.checkout.inAt = new Date().toISOString(); b.checkout.inBy = state.uid || null; b.late = late ? { days: late, fee: late * chosen(b).dayRate } : null; b.status = 'returned'; scheduleSave(0); render(); toast(late ? `Returned ${plural(late, 'day')} late. Late charge added to the total.` : `${b.ref} is back.`); },
  copyAgreement() { copy(agreementText(state.draft), 'Agreement copied.'); },
  copyCoi() { copy(coiRequestText(state.draft), 'Certificate request copied.'); },
  dlAgreement() { const b = state.draft; saveFile(`${b.ref}-rental-agreement.html`, standaloneDoc(`Rental agreement ${b.ref}`, agreementHTML(b))); },
  dlSchedule() { const b = state.draft; const rows = scheduleRows(b); saveFile(`${b.ref}-schedule-a.csv`, toCsv([['Item ID', 'Item', 'Owner', 'Qty', 'day_rate', 'possession_rate', 'replacement_value', 'Comped'], ...rows.map((r) => [r.id, r.name, OWNERS[r.own] ? OWNERS[r.own].name : '', r.qty, r.day, r.poss, r.repl, r.comped ? 'yes' : ''])])); },
  dlPoolSchedule() { const rows = state.cat.items.filter((i) => i.qty > 0); saveFile(`equipment-schedule-${todayStr()}.csv`, toCsv([['Item ID', 'Item', 'Category', 'Owner', 'Qty', 'Value each', 'Value total', 'Kit group', 'Serial number', 'Notes'], ...rows.map((i) => [i.id, i.name, i.cat, OWNERS[i.own] ? OWNERS[i.own].name : '', i.qty, i.resale || 0, (i.resale || 0) * i.qty, i.kit, '', i.resale ? '' : 'Value carried by the kit line'])])); },
  storeGroup(el) { state.store.group = el.dataset.g; render(); },
  cart(el) { const k = el.dataset.k; const st = state.store; const i = st.cart.findIndex((c) => c.key === k); if (i >= 0) st.cart.splice(i, 1); else st.cart.push({ key: k, qty: 1 }); st.sent = ''; render(); },
  uncart(el) { state.store.cart.splice(num(el.dataset.i), 1); render(); },
  async sendRequest() {
    const st = state.store; const f = st.form;
    if (!f.pickup || !f.ret || f.ret < f.pickup) { toast('Pick a pickup date and a return date on or after it.'); return; }
    if (!f.name && !f.company) { toast('Add a name or company so we know who to quote.'); return; }
    const sd = Math.max(1, num(f.shootDays, 1));
    const b = newBooking({ status: 'request', source: 'storefront', project: f.project, client: { name: f.name, company: f.company, email: f.email, phone: f.phone }, pickup: f.pickup, returnDate: f.ret, shootStart: f.pickup < f.ret ? addDays(f.pickup, 1) : f.pickup, shootDays: sd, notes: { have: 'Client says they carry rented-equipment cover.', need: 'Client needs to arrange insurance for this job.', unsure: 'Client is not sure about insurance.' }[f.coi] });
    b.possessionDays = suggestPossession(b);
    st.cart.forEach((c) => { if (state.cat.pkgById[c.key]) addPackageTo(b, c.key); else addLineTo(b, c.key, num(c.qty, 1)); });
    b.lines.forEach((l) => (l.days = sd));
    const ok = await createBooking(b, false);
    if (ok) { st.cart = []; st.form = Object.assign({}, st.form, { project: '', notes: '' }); st.sent = `Request ${b.ref} saved. It is waiting in Bookings.`; render(); }
  },
  phase(el) { state.road.phase = num(el.dataset.p, 1); render(); },
  async drawerAdd(el) {
    const target = ($('#dr-target') || {}).value; const id = el.dataset.id; state.drawer = null;
    if (target === '__new' || !target) { const b = newBooking(); addLineTo(b, id, 1); state.tab = 'quote'; await createBooking(b, true); return; }
    if (state.view === 'booking' && state.draft && state.draft.id === target) { addLineTo(state.draft, id, 1); scheduleSave(0); render(); return; }
    const b = clone(state.bookings.find((x) => x.id === target)); addLineTo(b, id, 1);
    try { await db.collection('bookings').doc(b.id).set(b); toast(`Added to ${b.ref}.`); } catch (e) { writeError(e); }
    renderDrawer();
  },
  sync() { syncFromSheet(); },
  async unsync() { try { await db.doc('catalog/current').delete(); state.syncMsg = ''; toast('Back on the built-in snapshot.'); } catch (e) { writeError(e); } },
};
function copy(text, ok) {
  const done = () => toast(ok);
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let good = false; try { good = document.execCommand('copy'); } catch (_) { good = false; } ta.remove(); toast(good ? ok : 'Copy was blocked here. Select the text and copy it by hand.'); };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch (_) { fallback(); }
}
function toCsv(rows) { return rows.map((r) => r.map((v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n'); }
async function saveFile(filename, data) {
  if (!downloadsNs) { toast('Downloads are not available here. Use Copy instead.'); return; }
  try { await downloadsNs.save({ filename, data }); toast(`Saved ${filename}.`); }
  catch (e) { const c = e && e.code; if (c === 'declined') return; toast(c === 'rate_limited' ? 'A save prompt is already open.' : 'That file could not be saved here.'); }
}

/* ================= field input ================= */
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach((k) => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }
function fieldVal(el) { if (el.dataset.type === 'bool' || el.type === 'checkbox') return el.checked; if (el.dataset.type === 'num' || el.type === 'number') return el.value === '' ? '' : num(el.value); return el.value; }
const TEXTY = new Set(['text', 'email', 'tel', 'number', 'search', 'textarea']);
function onField(e) {
  const el = e.target; const texty = TEXTY.has(el.type) || el.tagName === 'TEXTAREA';
  if (e.type === 'change' && texty) return; // text inputs already applied on input
  const full = !texty;
  const d = state.draft;
  if (el.dataset.b != null && d) {
    const v = fieldVal(el); setPath(d, el.dataset.b, v);
    if (el.dataset.b === 'pickup' && d.pickup) { if (d.returnDate && d.returnDate < d.pickup) d.returnDate = d.pickup; if (d.shootStart && d.shootStart < d.pickup) d.shootStart = d.pickup; }
    if (el.dataset.b === 'shootDays') {
      const prev = num(el.dataset.prev != null ? el.dataset.prev : el.defaultValue); const nv = num(v);
      (d.lines || []).forEach((l) => { if (num(l.days) === prev) l.days = nv; });
      (d.crew || []).forEach((c) => { if (num(c.days) === prev) c.days = nv; });
      el.dataset.prev = String(nv);
    }
    scheduleSave(); full ? render() : refreshQuote(); return;
  }
  if (el.dataset.line != null && d) { const ln = d.lines[num(el.dataset.line)]; const f = el.dataset.f; if (!ln) return; ln[f] = f === 'comp' ? el.checked : f === 'tier' ? el.value : f === 'rate' ? (el.value === '' ? null : num(el.value)) : num(el.value); scheduleSave(); full ? render() : refreshQuote(); return; }
  if (el.dataset.crew != null && d) { const c = d.crew[num(el.dataset.crew)]; if (!c) return; c[el.dataset.f] = el.dataset.f === 'tier' ? el.value : num(el.value); scheduleSave(); full ? render() : refreshQuote(); return; }
  if (el.dataset.co != null && d) { d.checkout = d.checkout || { out: {}, back: {}, notes: {} }; d.checkout[el.dataset.co] = d.checkout[el.dataset.co] || {}; d.checkout[el.dataset.co][el.dataset.k] = el.checked; scheduleSave(); render(); return; }
  if (el.dataset.conote != null && d) { d.checkout = d.checkout || { out: {}, back: {}, notes: {} }; d.checkout.notes = d.checkout.notes || {}; d.checkout.notes[el.dataset.conote] = el.value; scheduleSave(); return; }
  if (el.dataset.addpkg != null && d && el.value) { addPackageTo(d, el.value); scheduleSave(0); render(); return; }
  if (el.dataset.crewrole != null) { state.crewRole = el.value; return; }
  if (el.dataset.pick != null) { state.picker.q = el.value; state.picker.open = true; const m = $('#pickMenu'); if (m) m.innerHTML = pickerMenu(); return; }
  if (el.dataset.s != null) { const k = el.dataset.s; state.settings[k] = el.type === 'number' ? num(el.value) : el.value; saveSettingsSoon(); if (full) render(); else renderRail(); return; }
  if (el.dataset.inv != null) { state.inv[el.dataset.inv] = el.value; if (full) render(); else { const t = $('#invTable'); if (t) t.innerHTML = invTable(); } return; }
  if (el.dataset.sf != null) { state.store.form[el.dataset.sf] = el.value; return; }
  if (el.dataset.cartqty != null) { const c = state.store.cart[num(el.dataset.cartqty)]; if (c) c.qty = Math.max(1, num(el.value, 1)); requestRender(); return; }
  if (el.dataset.road != null) { state.road[el.dataset.road] = el.checked; render(); }
}
let settingsTimer = null, settingsPending = false;
function saveSettingsSoon() {
  clearTimeout(settingsTimer); settingsPending = true;
  settingsTimer = setTimeout(async () => { if (!db) { settingsPending = false; return; } try { await db.doc('settings/company').set(Object.assign({}, state.settings, { updatedAt: new Date().toISOString() })); } catch (e) { writeError(e); } settingsPending = false; }, 800);
}

/* ================= sheet sync ================= */
function valuesOf(res) { let p = res && res.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } } return (p && (p.values || (p.valueRange && p.valueRange.values))) || []; }
function parseInventory(values) {
  const head = (values[0] || []).map((h) => String(h).toLowerCase());
  const col = (start) => head.findIndex((h) => h.startsWith(start));
  const C = { id: col('item id'), cat: col('category'), item: head.indexOf('item'), qty: col('qty'), own: col('owner code'), kit: col('kit group'), re: col('resale each'), lo: col('rate low'), rec: col('rate rec'), hi: col('rate high'), basis: col('rate basis'), conf: col('confidence'), notes: col('notes'), rent: col('rentability'), pay: col('rental days') };
  if (C.id < 0 || C.rec < 0 || C.item < 0) throw new Error('The Inventory tab headers have changed, so the columns could not be matched.');
  const g = (r, i) => (i >= 0 && r[i] != null ? r[i] : '');
  return values.slice(1).filter((r) => /^[A-Z?]-[A-Z]{3}-\d+$/.test(String(g(r, C.id)).trim())).map((r) => [
    String(g(r, C.id)).trim(), g(r, C.cat), g(r, C.item), num(g(r, C.qty)), g(r, C.own), g(r, C.kit), numOrNull(g(r, C.re)), numOrNull(g(r, C.lo)), numOrNull(g(r, C.rec)), numOrNull(g(r, C.hi)), g(r, C.basis), g(r, C.conf), g(r, C.notes), g(r, C.rent), numOrNull(g(r, C.pay)),
  ]);
}
async function syncFromSheet() {
  if (!mcpNs || !db || !SNAPSHOT.sheetId) return;
  state.syncing = true; state.syncMsg = ''; render();
  const get = (range) => mcpNs.callTool('Google Sheets', 'get_values', { spreadsheetId: SNAPSHOT.sheetId, range }, { cache: false });
  try {
    const [inv, pk, lb] = await Promise.all([get('Inventory!A1:Q500'), get('Packages!A1:H20'), get('Labor!A1:F20')]);
    const rows = parseInventory(valuesOf(inv));
    const packages = valuesOf(pk).filter((r) => /^PKG-/.test(String(r[0] || ''))).map((r) => [r[0], r[1], r[2], r[3] || '']);
    const labor = valuesOf(lb).slice(1).filter((r) => r[0] && numOrNull(r[3]) != null).map((r) => [r[0], r[1], num(r[2]), num(r[3]), num(r[4]), r[5] || '']);
    if (rows.length < 10 || !packages.length || !labor.length) throw new Error('The sheet came back with fewer rows than expected, so nothing was changed.');
    const doc = { rows, packages, labor, asOf: todayStr(), syncedAt: new Date().toISOString(), syncedBy: state.uid || null };
    await db.doc('catalog/current').set({ payload: JSON.stringify(doc), syncedAt: doc.syncedAt });
    state.syncMsg = `Synced ${rows.length} items, ${packages.length} packages and ${labor.length} crew rates.`;
  } catch (e) {
    const code = e && e.code;
    state.syncMsg = code === 'server_not_connected' ? 'Add Google Sheets in claude.ai Settings → Connectors, then sync again.'
      : code === 'needs_reauth' ? 'Reconnect Google Sheets in claude.ai Settings → Connectors, then sync again.'
      : code === 'not_in_manifest' ? 'Google Sheets is turned off for this page. Allow it from the page’s connector prompt to sync.'
      : code === 'selection_required' ? 'You have more than one Google Sheets connection. Choose one in the prompt, then sync again.'
      : code === 'blocked_by_policy' || code === 'approval_required' ? 'Your organization blocks this Google Sheets call from pages.'
      : code === 'tool_error' ? `Google Sheets refused the read: ${e.message}. Check that your account can open the sheet.`
      : code === 'server_unavailable' ? 'Google Sheets did not answer. Try again in a minute.'
      : (e && e.message) || 'The sync did not finish. Nothing was changed.';
  }
  state.syncing = false; render();
}

/* ================= boot ================= */
/* On claude.ai the viewer supplies window.claude. As a plain website, src/local-runtime.js supplies SGP_LOCAL instead. */
const HOSTED = !!(window.claude && typeof window.claude.use === 'function');
function use(name) { if (HOSTED) return window.claude.use(name).catch(() => null); const L = window.SGP_LOCAL; return Promise.resolve((L && L[name]) || null); }
function applyCatalog() {
  let src = SNAPSHOT;
  if (state.catalogDoc && state.catalogDoc.payload) { try { const p = JSON.parse(state.catalogDoc.payload); if (p.rows && p.rows.length) src = Object.assign({ source: 'sheet' }, p); } catch (_) { /* keep snapshot */ } }
  state.cat = buildCatalog(src);
}
function init() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!e.target.closest('.picker') && state.picker.open) { state.picker.open = false; const m = $('#pickMenu'); if (m) m.innerHTML = ''; }
    if (!el) return;
    const fn = ACT[el.dataset.act]; if (!fn) return;
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('tabindex') != null || el.classList.contains('scrim')) e.preventDefault();
    if (state.readOnly && ['newBooking', 'quotePkg', 'budget', 'addItem', 'rmLine', 'addCrew', 'rmCrew', 'deleteBooking', 'advance', 'contract', 'coiStatus', 'checkOut', 'checkIn', 'sendRequest', 'drawerAdd', 'sync', 'unsync', 'applyPoss'].includes(el.dataset.act)) { toast('You can view this desk but not change it.'); return; }
    fn(el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (state.drawer) { state.drawer = null; renderDrawer(); } if (state.picker.open) { state.picker.open = false; const m = $('#pickMenu'); if (m) m.innerHTML = ''; } }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act][tabindex]') && !/^(BUTTON|A|INPUT)$/.test(e.target.tagName)) { e.preventDefault(); e.target.click(); }
    if (e.key === 'Enter' && e.target.id === 'pickq') { const first = $('#pickMenu .opt[data-act]'); if (first) { e.preventDefault(); first.click(); } }
  });
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
  document.addEventListener('focusin', (e) => { if (e.target.id === 'pickq' && e.target.value) { state.picker.open = true; const m = $('#pickMenu'); if (m) m.innerHTML = pickerMenu(); } });
  document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !editing()) render(); }, 0));
  window.addEventListener('pagehide', () => { if (state.dirty) flushSave(); });
  render();

  use('downloads').then((d) => { downloadsNs = d; state.canDownload = !!d; if (d) requestRender(); });
  use('mcp').then((m) => { mcpNs = m; state.mcpReady = !!m; if (m) requestRender(); });
  use('user').then(async (u) => {
    userNs = u; if (!u) return;
    try { state.uid = await u.id(); } catch (_) { /* no id */ }
    try { const w = await u.can('data.write'); state.canWrite = w; if (w === false) state.readOnly = true; } catch (_) { /* unknown */ }
    requestRender();
  });
  use('db').then((d) => {
    db = d;
    if (!d) { state.dbState = 'off'; requestRender(); return; }
    d.collection('bookings').onSnapshot((snap) => {
      state.bookings = snap.docs.filter((x) => x.exists).map((x) => Object.assign({}, x.data(), { id: x.id }));
      state.dbState = 'ready';
      if (state.view === 'booking' && state.draft) {
        const fresh = state.bookings.find((b) => b.id === state.draft.id);
        if (!fresh && !state.dirty && !saving && !snap.metadata.hasPendingWrites && !snap.metadata.fromCache) { state.draft = null; state.view = 'bookings'; toast('That booking was deleted.'); }
        else if (fresh && !state.dirty && !saving && stable(fresh) !== stable(state.draft)) state.draft = clone(fresh);
      }
      requestRender();
    }, (err) => { state.dbState = 'error'; state.dbErr = err && err.code; requestRender(); });
    d.doc('settings/company').onSnapshot((s) => {
      if (s.exists && !settingsPending) state.settings = Object.assign({}, DEFAULTS, s.data());
      requestRender();
    }, () => {});
    d.doc('catalog/current').onSnapshot((s) => { state.catalogDoc = s.exists ? s.data() : null; applyCatalog(); requestRender(); }, () => {});
  });
}
init();
})();

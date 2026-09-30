(function () {
'use strict';

/* ================= helpers ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v, d = 0) => { const n = parseFloat(String(v == null ? '' : v).replace(/[$,]/g, '')); return Number.isFinite(n) ? n : d; };
const numOrNull = (v) => { if (v == null || String(v).trim() === '' || String(v).trim() === '-') return null; const n = num(v, NaN); return Number.isFinite(n) ? n : null; };
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
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = (n) => WORDS[n] || String(n);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
const stable = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((a, x) => (a[x] = v[x], a), {}) : v);
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
const pctTxt = (n) => `${+num(n).toFixed(3)}%`;

const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clap: '<path d="M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="m4 10 1.6-5.4 13.9 2.6L20 10M9.3 5.3 8 10M14.4 6.3 13.2 10"/>',
  light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.8 10.6c.6.5.8 1.2.8 1.9V16h6v-.5c0-.7.3-1.4.8-1.9A6 6 0 0 0 12 3z"/>',
  box: '<path d="m3 8 9-5 9 5v8l-9 5-9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  fund: '<circle cx="12" cy="12" r="8.5"/><path d="M12 16V8M8.8 11.2 12 8l3.2 3.2"/>',
  shield: '<path d="M12 3 20 6v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  store: '<path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  camera: '<path d="M3 8h3.5l2-2.5h7l2 2.5H21v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
  lens: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  grip: '<path d="M12 21V6M6 21l6-5 6 5M12 6h8M16 6v3"/>',
  sound: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  power: '<path d="M13 2 4.5 13.5h6.5l-1 8.5 8.5-11.5H12z"/>',
  support: '<path d="M9 3h6v4H9zM12 7v5M12 12l-6 9M12 12l6 9M12 12v9"/>',
  media: '<rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M9.5 3v4M12 3v4M14.5 3v4"/>',
  accessory: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
  tape: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
};
const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;
const CAT_ICON = { Camera: 'camera', Lens: 'lens', Support: 'support', Media: 'media', Accessory: 'accessory', Sound: 'sound', Electric: 'light', Power: 'power', Grip: 'grip', Consumable: 'tape', Kit: 'box' };
const tile = (cat, sm) => `<span class="icon-tile ${sm ? 'sm' : ''} t-${esc(cat)}">${icon(CAT_ICON[cat] || 'box', sm ? 17 : 21)}</span>`;

/* ================= constants ================= */
/* Owner names, internal notes and the sheet link come from the rate card file, not the code,
   so the public repo can ship a stripped rate card without touching the app. */
const OWNERS = SNAPSHOT.owners || { M: { name: 'Owner M', short: 'M' }, C: { name: 'Owner C', short: 'C' }, S: { name: 'Owner S', short: 'S' } };
const OWN = ['M', 'C', 'S'];
const CAT_ORDER = ['Camera', 'Lens', 'Support', 'Media', 'Accessory', 'Sound', 'Electric', 'Power', 'Grip', 'Consumable'];
const CAT_LABEL = { Camera: 'Cameras', Lens: 'Lenses', Support: 'Support', Media: 'Media', Accessory: 'Accessories', Sound: 'Sound', Electric: 'Lighting', Power: 'Power', Grip: 'Grip', Consumable: 'Expendables' };
const STATUS = {
  request: { label: 'New request', tone: 'warm' }, quoted: { label: 'Quoted', tone: 'info' }, confirmed: { label: 'Confirmed', tone: 'good' },
  out: { label: 'Out on a job', tone: 'live' }, returned: { label: 'Back', tone: '' }, closed: { label: 'Closed', tone: '' }, cancelled: { label: 'Cancelled', tone: 'bad' },
};
const FLOW = ['request', 'quoted', 'confirmed', 'out', 'returned', 'closed'];
const HOLDS = new Set(['request', 'quoted', 'confirmed', 'out']);
const FIRM = new Set(['confirmed', 'out']);
const EARNED = new Set(['confirmed', 'out', 'returned', 'closed']);
const TIERS = ['A', 'B', 'C'];
const BUDGET = { A: { name: 'Full kit', desc: 'Everything on the list' }, B: { name: 'Trimmed', desc: 'Leaves out the extras' }, C: { name: 'Essentials', desc: 'Only what the shoot needs' } };
const PRIORITY = { C: 'Essential', B: 'Nice to have', A: 'Extra' };
const COI_STATUS = { none: 'Not requested', requested: 'Requested', received: 'Received', verified: 'Verified', rejected: 'Rejected' };
const HANDOFF = { pickup: 'Pickup at the unit', delivery: 'We deliver', afterhours: 'After-hours handoff' };
const DISCOUNTS = { none: 'No discount', student: 'Student', returning: 'Returning client', referral: 'Referral', custom: 'Custom' };
const GE = new Set(['Electric', 'Power', 'Grip', 'Expendables', 'Safety']);
const STORE_GROUPS = [
  { key: 'packages', label: 'Kits' },
  { key: 'camera', label: 'Camera', cats: ['Camera', 'Media', 'Accessory', 'Support'] },
  { key: 'lens', label: 'Lenses', cats: ['Lens'] },
  { key: 'lighting', label: 'Lighting', cats: ['Electric'] },
  { key: 'grip', label: 'Grip & power', cats: ['Grip', 'Power'] },
  { key: 'sound', label: 'Sound', cats: ['Sound'] },
];
/* Who runs each kit when a client books it crewed. */
const OPERATOR_FOR = {
  'PKG-CAM-RONIN': 'Ronin 4D / Gimbal Operator', 'PKG-CAM-KOMODO': 'Director of Photography', 'PKG-CAM-FX3': 'Director of Photography', 'PKG-AC': '1st AC',
  'PKG-LIGHT-SM': 'Gaffer', 'PKG-LIGHT-MD': 'Gaffer', 'PKG-LIGHT-LG': 'Gaffer', 'PKG-AUDIO': 'Sound Mixer', 'PKG-PODCAST': 'Sound Mixer',
};
/* Nominal watts, read from each fixture's model name. Real draw runs somewhat higher at full output. */
const NOMINAL_WATTS = {
  'M-ELE-050': 300, 'M-ELE-051': 150, 'C-ELE-053': 720, 'C-ELE-054': 200, 'S-ELE-100': 1000, 'S-ELE-101': 675, 'S-ELE-102': 300,
  'S-ELE-103': 300, 'S-ELE-104': 600, 'S-ELE-106': 200, 'S-ELE-108': 1000, 'S-ELE-109': 2000, 'S-ELE-110': 1000, 'S-ELE-111': 1200,
};
/* A 15A household circuit carries about 1,440 W continuously (80% of 1,800 W). The DJI Power 1000 stores 1,024 Wh and puts out up to 2,200 W. */
const POWER = { circuit: 1440, djiWh: 1024, djiW: 2200, genny: 1800 };
const DEFAULTS = {
  company: 'Shared Gear Pool', legalName: '', address: '', email: '', phone: '', afterHoursPhone: '',
  pickup: 'Shared storage unit, New York (address on confirmation)', hours: 'Pickups from 3 pm, returns by 10 am',
  possessionPct: 50, rateMode: 'straight', depositPct: 25, weekendSpecial: true,
  fundPct: 15, salesTaxPct: 8.875,
  studentPct: 15, returningPct: 10, referralPct: 20,
  deliveryFee: 75, afterHoursFee: 75,
  glOcc: 1000000, glAgg: 2000000, lossOfUseCap: 30,
  holdMax: 10000, holdMaxDays: 3,
  waiverOn: false, waiverPct: 12, waiverCapPct: 10, waiverMax: 20000,
  paymentTerms: 'The deposit is due to confirm the booking. The balance is due on return.',
  lateRule: 'Equipment returned after the agreed return time bills the full day rate for each day or part day it is late.',
  cancelRule: 'Cancel 72 hours or more before pickup: no charge. Within 72 hours: 50% of the equipment total. After pickup: 100%.',
  governing: 'New York',
};
const VIEWS = [
  ['welcome', 'Start', 'play'], ['today', 'Today', 'sun'], ['calendar', 'Schedule', 'calendar'], ['bookings', 'Jobs', 'clap'], ['inventory', 'Gear', 'light'], ['packages', 'Kits', 'box'],
  ['fund', 'Gear fund', 'fund'], ['insurance', 'Insurance', 'shield'], ['storefront', 'Storefront', 'store'], ['roadmap', 'Roadmap', 'flag'], ['settings', 'Settings', 'cog'],
];

/* The public GitHub copy ships a stripped rate card marked preview: true. Everything works, but
   names, values, notes, research and the sheet link are left out, and the page says so where it shows. */
const PREVIEW = !!SNAPSHOT.preview;
const HOME_KEY = 'sgp.home';
function homePref() { try { return localStorage.getItem(HOME_KEY) === 'today' ? 'today' : 'welcome'; } catch (_) { return 'welcome'; } }
function setHomePref(v) { try { localStorage.setItem(HOME_KEY, v); } catch (_) { /* private window: stays on Start */ } }
const EXAMPLE_ID = 'example-brand-spot';
/* The tour on the Start page: one stop per page, in the order a job actually moves. */
const TOUR = [
  { view: 'today', icon: 'sun', title: 'Today', lead: 'Your morning check-in: the week ahead, and anything that would stop gear going out.',
    how: ['Each day shows what goes out, what shoots and what comes back.', '"Needs you" lists what is holding a job up: an unsigned agreement, gear not covered yet, a late return or a double booking.', 'Tap anything to jump straight to it.'] },
  { view: 'bookings', icon: 'clap', title: 'Jobs', lead: 'Every request, quote and booking in one list.', how: ['Press New job, or quote a ready-made kit from Kits.', 'Requests from the storefront land here too, marked New request.', 'Filter by stage: requests, quoted, confirmed, out and back.'] },
  { job: 'plan', icon: 'calendar', title: 'Inside a job: Plan', lead: 'Who it is for, when it happens, how the gear gets there, and what goes out.',
    how: ['Set the dates. Hold days and the weekend special work themselves out.', 'Add gear from the slide-out list, or drop in a whole kit, then add crew.', 'Mark each line Essential, Nice to have or Extra. That is what builds the three budgets.'] },
  { job: 'price', icon: 'fund', title: 'Inside a job: Price', lead: 'Three budgets from one gear list, with tax and discounts worked out for you.',
    how: ['Full kit, Trimmed or Essentials: pick the one the client went with.', 'Add a student, returning-client or referral discount.', 'Sales tax is added unless the client gives an ST-121. You also see what goes to the gear fund and to each owner.'] },
  { job: 'paperwork', icon: 'shield', title: 'Inside a job: Paperwork', lead: 'The rental agreement writes itself from the quote.',
    how: ['Choose how the gear is covered: an insurance certificate, a card hold or a damage waiver.', 'Mark the agreement sent, then signed. Copy it or download it.', 'Log the insurance certificate and the checks tick themselves off.'] },
  { job: 'handoff', icon: 'truck', title: 'Inside a job: Handoff', lead: 'Check-out and check-in, piece by piece.',
    how: ['Tick each piece as it goes out and as it comes back, with notes on its condition.', 'Gear is not released until it is covered and the agreement is signed.', 'A late return adds the late fee on its own.'] },
  { view: 'calendar', icon: 'calendar', title: 'Schedule', lead: 'Three weeks of jobs on one timeline.', how: ['Solid bars are shoot days. Striped bars are days the gear is out but not shooting.', 'Faded bars are jobs that are not confirmed yet.', 'Tap a job to open it.'] },
  { view: 'inventory', icon: 'light', title: 'Gear', lead: 'Everything the pool owns, with the day rate to quote.', how: ['Search, or filter by type and by owner.', 'Pick two dates to see what is free.', 'Tap any piece for its details, or to add it to a job.'] },
  { view: 'packages', icon: 'box', title: 'Kits', lead: 'Ready-made packages that price themselves.', how: ['Each kit shows its price for a day, two, three and a week.', 'Quote a kit on its own, or with the person who runs it.', 'If a piece inside changes price, the kit follows.'] },
  { view: 'fund', icon: 'fund', title: 'Gear fund', lead: 'A share of every job goes toward the next piece of gear.', how: ['Set the share once. Each job locks it in when it is confirmed.', 'The ring shows how close you are to the next buy.', 'Reorder the buying list, add to it, and mark things bought.'] },
  { view: 'insurance', icon: 'shield', title: 'Insurance', lead: 'Both sides of cover in one place.', how: ['See how every upcoming job is covered.', 'Download the gear schedule your own insurer asks for.', 'Card holds and the damage waiver are set up in Settings.'] },
  { view: 'storefront', icon: 'store', title: 'Storefront', lead: 'The page your clients see.', how: ['Clients pick dates, add kits or single pieces, and send a request.', 'Availability updates for the dates they choose.', 'Requests arrive in Jobs, ready to quote.'] },
  { view: 'settings', icon: 'cog', title: 'Settings', lead: 'Your details, prices and terms.', how: ['Company details flow into every agreement.', 'Change fees, discounts, sales tax and the gear fund share.', 'Sync the rate card from the Google Sheet.'] },
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
    let day = 0, repl = 0; const missing = [];
    ids.forEach((id) => { const it = byId[id]; if (!it) { missing.push(id); return; } day += (it.rec || 0) * it.qty; repl += (it.resale || 0) * it.qty; });
    return { id: p[0], name: p[1], ids, contents: p[3], day, repl, missing };
  });
  const labor = src.labor.map((l) => ({ role: l[0], band: l[1], lo: l[2], rec: l[3], hi: l[4], basis: l[5] }));
  return { items, byId, packages, pkgById: Object.fromEntries(packages.map((p) => [p.id, p])), labor, asOf: src.asOf, source: src.source || 'snapshot', syncedAt: src.syncedAt || null };
}
/* Checks the sheet does not make on itself, found while building the desk. */
const DATA_CHECKS = SNAPSHOT.dataChecks || [];
const OPEN = SNAPSHOT.open || [];
const OPEN_BY_ITEM = {};
OPEN.forEach((o) => { if (o[0] === 'Open' && /^[A-Z]-[A-Z]{3}-\d+$/.test(o[2])) (OPEN_BY_ITEM[o[2]] = OPEN_BY_ITEM[o[2]] || []).push(o); });
const hasQuestion = (id) => !!(OPEN_BY_ITEM[id] || DATA_CHECKS.some((d) => d.id === id));
const perLens = (it) => /RATE IS PER LENS/.test(it.notes || '');

/* ================= state ================= */
const state = {
  view: homePref(), tour: 0, touring: false, bookingId: null, tab: 'plan', draft: null, dirty: false, confirmDelete: false,
  bookings: [], dbState: 'wait', readOnly: false,
  settings: Object.assign({}, DEFAULTS), catalogDoc: null, cat: buildCatalog(SNAPSHOT),
  fundPlan: { order: [], bought: {}, extra: [] },
  inv: { q: '', cat: 'all', own: 'all', flag: false, from: '', to: '', view: 'grid' },
  bk: { filter: 'active' },
  cal: { start: mondayOf(todayStr()) },
  store: { group: 'packages', cart: [], form: { name: '', company: '', email: '', phone: '', project: '', pickup: '', ret: '', shootDays: 1, handoff: 'pickup', protection: 'coi', student: false, exempt: false }, sent: '' },
  road: { phase: 1, showClosed: false },
  drawer: null, pick: { q: '', cat: 'all' }, fundAdd: { name: '', cost: '' }, buyPrice: {}, crewRole: '',
  uid: null, canWrite: null, canDownload: false, mcpReady: false, syncing: false, syncMsg: '',
};
let db = null, userNs = null, downloadsNs = null, mcpNs = null;
const main = () => $('#main');

/* ================= pricing ================= */
function inTier(lineTier, budget) { return budget === 'A' || (budget === 'B' ? lineTier !== 'A' : lineTier === 'C'); }
function weekFactor(d) {
  d = Math.max(0, Math.round(num(d)));
  const t = [0, 1, 1.85, 2.5, 3, 3, 3, 3];
  if (d <= 7) return t[d];
  const extra = Math.floor((d - 1) / 7), rem = d - extra * 7;
  return 3 + (extra - 1) * 2.5 + Math.min(t[rem], 2.5);
}
function lineRate(ln) { const it = state.cat.byId[ln.id]; return ln.rate != null && ln.rate !== '' ? num(ln.rate) : (it && it.rec) || 0; }
/* Weekend special, as NYC houses run it: out Friday (or Thursday from 3 pm), back Monday by 10:30 am, billed as one day. */
function weekendEligible(b) {
  if (!b.pickup || !b.returnDate) return false;
  const pd = parseYmd(b.pickup).getDay(), rd = parseYmd(b.returnDate).getDay();
  const pickOk = pd === 5 || (pd === 4 && (b.pickupTime || '00:00') >= '15:00');
  const backOk = rd === 1 && (!b.returnTime || b.returnTime <= '10:30');
  return pickOk && backOk && diffDays(b.pickup, b.returnDate) <= 4;
}
function isWeekend(b) { return !!state.settings.weekendSpecial && !b.weekendOff && weekendEligible(b); }
function discountPct(b) { const d = b.discount || {}; return d.kind && d.kind !== 'none' ? Math.max(0, Math.min(100, num(d.pct))) : 0; }
function handoffFee(mode) { const S = state.settings; return mode === 'delivery' ? num(S.deliveryFee) : mode === 'afterhours' ? num(S.afterHoursFee) : 0; }
function calc(b) {
  const S = state.settings; const pctP = num(S.possessionPct, 50) / 100; const wk = isWeekend(b); const dp = discountPct(b) / 100;
  const fp = num(b.fundPct != null ? b.fundPct : S.fundPct) / 100;
  const h = b.handoff || {}; const handoff = handoffFee(h.out) + handoffFee(h.back);
  const res = {};
  TIERS.forEach((T) => {
    let equip = 0, dayRate = 0, comp = 0, repl = 0, billedDays = 0;
    const own = {}; OWN.forEach((o) => (own[o] = { billed: 0, comped: 0, day: 0, repl: 0, poss: 0, net: 0 }));
    (b.lines || []).forEach((ln) => {
      if (!inTier(ln.tier || 'C', T)) return;
      const it = state.cat.byId[ln.id]; const rate = lineRate(ln); const qty = num(ln.qty);
      const days = wk ? Math.min(1, num(ln.days)) : num(ln.days); billedDays = Math.max(billedDays, days);
      const factor = !wk && b.rateMode === 'week' ? weekFactor(days) : days;
      const total = rate * qty * factor; const o = it && own[it.own];
      const value = ((it && it.resale) || 0) * qty; repl += value; if (o) o.repl += value;
      if (ln.comp || b.favor) { comp += total; if (o) o.comped += total; }
      else { equip += total; dayRate += rate * qty; if (o) { o.billed += total; o.day += rate * qty; } }
    });
    const possession = wk ? 0 : dayRate * pctP * num(b.possessionDays);
    OWN.forEach((o) => (own[o].poss = dayRate ? possession * own[o].day / dayRate : 0));
    const discount = (equip + possession) * dp; const gear = equip + possession - discount;
    let crew = 0; (b.crew || []).forEach((c) => { if (inTier(c.tier || 'C', T)) crew += num(c.rate) * num(c.people) * num(c.days); });
    const exp = num(b.expendables); const late = num(b.late && b.late.fee);
    const waiver = b.protection === 'waiver' ? gear * num(S.waiverPct) / 100 : 0;
    const taxable = gear + exp + handoff + waiver + late;
    const tax = b.tax && b.tax.exempt ? 0 : taxable * num(S.salesTaxPct) / 100;
    const subtotal = gear + crew + exp + handoff + waiver + late;
    const total = subtotal + tax;
    const fund = gear * fp;
    OWN.forEach((o) => (own[o].net = (own[o].billed + own[o].poss) * (1 - dp) * (1 - fp)));
    res[T] = { equip, dayRate, possession, discount, gear, crew, exp, handoff, waiver, late, taxable, tax, subtotal, total, comp, repl, own, fund, fundPct: fp * 100, weekend: wk, billedDays, perDay: num(b.shootDays) ? total / num(b.shootDays) : total };
  });
  return res;
}
const chosen = (b) => calc(b)[b.budget || 'A'];
function includedLines(b) { return (b.lines || []).filter((ln) => inTier(ln.tier || 'C', b.budget || 'A')); }

/* ================= availability ================= */
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
    const u = usage(id, b.pickup, bookingEnd(b), b.id); const free = it.qty - u.firm;
    if (need[id] > free) out.push({ id, kind: 'over', need: need[id], have: Math.max(0, free), who: u.who });
    else if (need[id] > free - u.tent) out.push({ id, kind: 'hold', need: need[id], have: free - u.tent, who: u.who });
  });
  return out;
}
function freeOn(itemId, from, to, exceptId) { const it = state.cat.byId[itemId]; if (!it) return 0; return Math.max(0, it.qty - usage(itemId, from, to, exceptId).firm); }
function powerCheck(b) {
  let w = 0; const lights = [];
  includedLines(b).forEach((ln) => { const nw = NOMINAL_WATTS[ln.id]; if (nw) { w += nw * num(ln.qty); lights.push(ln.id); } });
  if (!lights.length) return null;
  const ids = includedLines(b).map((l) => l.id);
  return { w, circuits: Math.ceil(w / POWER.circuit), djiMin: w <= POWER.djiW ? Math.round(POWER.djiWh * 0.85 / w * 60) : 0, hasDji: ids.includes('M-PWR-062'), hasGen: ids.includes('S-ELE-112') };
}

/* ================= protection & paperwork ================= */
function coiChecks(b) {
  const c = chosen(b); const coi = b.coi || {}; const S = state.settings;
  return [
    { ok: num(coi.equipLimit) >= c.repl && c.repl > 0, t: `Covers gear worth ${money(c.repl)}`, have: coi.equipLimit ? `certificate says ${money(num(coi.equipLimit))}` : 'limit not entered' },
    { ok: num(coi.glOcc) >= num(S.glOcc), t: `${money(num(S.glOcc))} general liability`, have: coi.glOcc ? money(num(coi.glOcc)) : 'not entered' },
    { ok: !!coi.expires && !!b.returnDate && coi.expires >= b.returnDate, t: 'Policy runs past the return date', have: coi.expires ? 'expires ' + fmtDay(coi.expires) : 'no expiry entered' },
    { ok: !!coi.ai && !!coi.lp, t: 'Names you as additional insured and loss payee', have: coi.ai && coi.lp ? 'both' : coi.ai ? 'additional insured only' : coi.lp ? 'loss payee only' : 'not confirmed' },
  ];
}
function protectionState(b) {
  const S = state.settings; const c = chosen(b); const mode = b.protection || 'coi';
  if (mode === 'hold') {
    const underValue = c.repl <= num(S.holdMax), underDays = c.billedDays <= num(S.holdMaxDays), placed = !!(b.hold && b.hold.placed);
    return { mode, eligible: underValue && underDays, ok: underValue && underDays && placed, checks: [
      { ok: underValue, t: `Gear worth ${money(num(S.holdMax))} or less`, have: money(c.repl) },
      { ok: underDays, t: `${plural(num(S.holdMaxDays), 'billed day')} or fewer`, have: plural(c.billedDays, 'day') },
      { ok: placed, t: `Hold of ${money(c.repl)} placed on the card`, have: placed ? 'placed' : 'not yet' },
    ] };
  }
  if (mode === 'waiver') {
    const on = !!S.waiverOn, underValue = c.repl <= num(S.waiverMax), accepted = !!(b.waiver && b.waiver.accepted);
    return { mode, eligible: on && underValue, ok: on && underValue && accepted, checks: [
      { ok: on, t: 'Damage waiver offered', have: on ? 'switched on in Settings' : 'switched off in Settings' },
      { ok: underValue, t: `Gear worth ${money(num(S.waiverMax))} or less`, have: money(c.repl) },
      { ok: accepted, t: 'Client accepted the waiver terms', have: accepted ? 'accepted' : 'not yet' },
    ] };
  }
  const checks = coiChecks(b); const status = (b.coi && b.coi.status) || 'none';
  return { mode: 'coi', eligible: true, ok: status === 'verified', checks, status };
}
function paperwork(b) {
  const p = protectionState(b); const t = b.tax || {};
  return { contract: (b.contract && b.contract.status) || 'draft', protection: p, protectionOk: p.ok, taxOk: !t.exempt || !!t.cert, deposit: (b.deposit && b.deposit.status) || 'none' };
}
const isReady = (b) => { const p = paperwork(b); return p.contract === 'signed' && p.protectionOk && p.taxOk; };
function fifaCrew(b) { return (b.crew || []).filter((c) => num(c.rate) * num(c.days) >= 800); }
function pastJobs(b) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  const em = norm(b.client && b.client.email), co = norm(b.client && b.client.company);
  if (!em && !co) return 0;
  return state.bookings.filter((x) => x.id !== b.id && EARNED.has(x.status) && ((em && norm(x.client && x.client.email) === em) || (co && norm(x.client && x.client.company) === co))).length;
}

/* ================= gear fund ================= */
function fundQueue() {
  const plan = state.fundPlan || {}; const bought = plan.bought || {};
  const base = (SNAPSHOT.missing || []).map((m, i) => ({ key: slug(m[1]), name: m[1], cost: num(m[4]), phase: m[5], dept: m[0], why: m[6], i, cut: !(m[2] > 0) || m[11] === 'Cut' })).filter((x) => !x.cut);
  const extra = (plan.extra || []).map((x, i) => ({ key: x.key, name: x.name, cost: num(x.cost), phase: num(x.phase, 1), dept: 'Added here', why: '', i: 1000 + i, custom: true }));
  const order = plan.order || []; const rank = (k) => { const i = order.indexOf(k); return i < 0 ? 1e9 : i; };
  return [...base, ...extra].sort((a, b) => rank(a.key) - rank(b.key) || a.phase - b.phase || a.i - b.i).map((x) => Object.assign(x, { bought: bought[x.key] || null }));
}
function fundTotals() {
  let banked = 0, pledged = 0, jobs = 0;
  state.bookings.forEach((b) => {
    if (b.status === 'cancelled') return; const f = chosen(b).fund;
    if (['returned', 'closed'].includes(b.status) || b.payment === 'paid') { banked += f; jobs++; } else if (FIRM.has(b.status)) pledged += f;
  });
  const queue = fundQueue(); const spent = sum(queue.filter((x) => x.bought), (x) => num(x.bought.price));
  const balance = banked - spent; const next = queue.find((x) => !x.bought) || null;
  return { banked, pledged, spent, balance, next, queue, jobs, avg: jobs ? banked / jobs : 0 };
}
async function saveFundPlan() {
  if (!db) { toast('The gear fund needs the shared database, which is not available here.'); return; }
  try { await db.doc('fund/plan').set(clone(state.fundPlan)); } catch (e) { writeError(e); }
}

/* ================= bookings ================= */
function companyPrefix() { const w = String(state.settings.company || 'Rental').match(/[A-Za-z0-9]+/g) || ['R']; return w.slice(0, 3).map((x) => x[0].toUpperCase()).join(''); }
function newRef() { const d = new Date(); return `${companyPrefix()}-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${uid6().slice(0, 3).toUpperCase()}`; }
function newBooking(p) {
  const pickup = addDays(todayStr(), 7);
  return Object.assign({
    id: 'b' + Date.now().toString(36) + uid6(), ref: newRef(), status: 'quoted', project: '', client: { name: '', company: '', email: '', phone: '' },
    pickup, pickupTime: '15:00', shootStart: addDays(pickup, 1), shootDays: 1, possessionDays: 0, returnDate: addDays(pickup, 2), returnTime: '10:00', prepDate: '',
    rateMode: state.settings.rateMode || 'straight', favor: false, budget: 'A', expendables: 0, lines: [], crew: [], notes: '',
    handoff: { out: 'pickup', back: 'pickup', address: '' }, protection: 'coi', discount: { kind: 'none', pct: 0 }, tax: { exempt: false, cert: false },
    coi: { status: 'none' }, hold: { placed: false }, waiver: { accepted: false }, contract: { status: 'draft' }, deposit: { status: 'none' },
    checkout: { out: {}, back: {}, notes: {} }, createdAt: new Date().toISOString(), createdBy: state.uid || null,
  }, p || {});
}
function suggestPossession(b) { return Math.max(0, diffDays(b.pickup, b.returnDate) - num(b.shootDays)); }
function addLineTo(b, id, qty) {
  const it = state.cat.byId[id]; if (!it) return;
  b.lines = b.lines || [];
  const have = b.lines.find((l) => l.id === id);
  if (have) { have.qty = num(have.qty) + (qty || 1); return; }
  b.lines.push({ id, qty: qty || 1, days: num(b.shootDays) || 1, tier: 'C', comp: false, rate: null });
}
function addPackageTo(b, pid) {
  const p = state.cat.pkgById[pid]; if (!p) return;
  p.ids.forEach((id) => { const it = state.cat.byId[id]; if (it && !(b.lines || []).some((l) => l.id === id)) { addLineTo(b, id, Math.max(1, it.qty)); b.lines[b.lines.length - 1].pkg = pid; } });
}
function addCrewTo(b, role) {
  const l = state.cat.labor.find((x) => x.role === role); if (!l) return;
  b.crew = b.crew || []; b.crew.push({ role, rate: l.rec, people: 1, days: num(b.shootDays) || 1, tier: 'C' });
}
async function createBooking(b, openIt) {
  if (!db) { toast('Jobs need the shared database, which is not available in this view.'); return null; }
  try { await db.collection('bookings').doc(b.id).set(b); } catch (e) { writeError(e); return null; }
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
  try { await db.collection('bookings').doc(body.id).set(body); } catch (e) { writeError(e); }
  saving = false;
  if (saveAgain) { saveAgain = false; flushSave(); } else { state.dirty = false; }
}
function writeError(e) {
  const code = e && e.code;
  if (code === 'invalid_argument') { state.readOnly = true; toast('You can look around but not change anything here. Ask the owner for Contributor access.'); }
  else if (code === 'quota_exceeded') toast('The shared database is full. Delete old cancelled jobs to make room.');
  else if (code === 'resource_exhausted') toast('Too many saves at once. Give it a moment and try again.');
  else toast('That change did not save. Check your connection and try again.');
  requestRender();
}
function openBooking(id, fresh) {
  if (state.draft && state.dirty) flushSave();
  const b = fresh || state.bookings.find((x) => x.id === id); if (!b) return;
  state.view = 'booking'; state.bookingId = id; state.draft = clone(b); state.dirty = false; state.confirmDelete = false; state.drawer = null;
  if (!['plan', 'price', 'paperwork', 'handoff'].includes(state.tab)) state.tab = 'plan';
  render(); window.scrollTo(0, 0);
}

/* ================= rendering ================= */
let pendingRender = false;
function editing() { const a = document.activeElement; return a && main() && (main().contains(a) || ($('#drawerHost') && $('#drawerHost').contains(a))) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !['checkbox', 'radio'].includes(a.type); }
function requestRender() { if (editing()) { pendingRender = true; return; } render(); }
let lastScreen = '';
function render() {
  pendingRender = false;
  syncTour();
  renderChrome();
  const views = { welcome: vWelcome, today: vToday, calendar: vCalendar, bookings: vBookings, booking: vBooking, inventory: vInventory, packages: vPackages, fund: vFund, insurance: vInsurance, storefront: vStore, roadmap: vRoadmap, settings: vSettings };
  const touringHere = state.touring && state.view !== 'welcome';
  main().innerHTML = (PREVIEW && state.view !== 'welcome' ? previewBar() : '') + (touringHere ? tourBar() : '') + (views[state.view] || vWelcome)() + (touringHere ? tourDock() : '');
  const screen = state.view + (state.view === 'booking' ? ':' + state.bookingId + ':' + state.tab : '');
  if (screen !== lastScreen) { const v = $('.view', main()); if (v) v.classList.add('enter'); lastScreen = screen; }
  centerTourChip();
  renderDrawer();
  resolveNames();
}
function renderChrome() {
  const active = state.bookings.filter((b) => HOLDS.has(b.status)).length;
  const openQ = OPEN.filter((o) => o[0] === 'Open').length + DATA_CHECKS.length;
  $('#nav').innerHTML = VIEWS.map(([k, l, ic]) => {
    const cur = state.view === k || (k === 'bookings' && state.view === 'booking');
    const count = k === 'bookings' && active ? active : k === 'roadmap' && openQ ? openQ : '';
    return `<button type="button" data-act="nav" data-v="${k}" ${cur ? 'aria-current="page"' : ''}>${icon(ic, 16)}<span>${l}</span>${count !== '' ? `<span class="count">${count}</span>` : ''}</button>`;
  }).join('');
  const cur = $('#nav [aria-current]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('#brandName').textContent = state.settings.company || 'Shared Gear Pool';
  const live = { wait: ['', 'Connecting…'], off: ['bad', 'Jobs unavailable here'], error: ['bad', 'Jobs stopped updating'], ready: ['ok', HOSTED ? 'Jobs are shared live' : 'Jobs saved in this browser only'] }[state.dbState];
  const dot = $('#liveDot'); dot.className = 'live ' + live[0]; dot.title = live[1];
  const c = state.cat;
  $('#footStatus').innerHTML = `<span>${esc(live[1])}${state.readOnly ? ' · view only' : ''}</span><span>${c.source === 'sheet' ? `Rates synced from the sheet ${esc(fmtStamp(c.syncedAt))}` : `Rate card as of ${esc(fmtDay(c.asOf, { month: 'short', day: 'numeric', year: 'numeric' }))}`}</span>`;
}
function pill(status) { const s = STATUS[status] || { label: status, tone: '' }; return `<span class="pill ${s.tone}">${esc(s.label)}</span>`; }
function ownerTag(o, full) { return OWNERS[o] ? `<span class="who"><span class="dot ${o}"></span>${esc(full ? OWNERS[o].name : OWNERS[o].short)}</span>` : '<span class="who"><span class="dot"></span>Unassigned</span>'; }
function who(id) { return id ? `<span data-uid="${esc(id)}">a teammate</span>` : 'a teammate'; }
async function resolveNames() {
  const els = $$('[data-uid]'); if (!els.length || !userNs) return;
  const ids = [...new Set(els.map((e) => e.dataset.uid))];
  try { const ps = await userNs.profiles(ids); els.forEach((e) => { const p = ps[e.dataset.uid]; e.textContent = (p && p.name) || 'a teammate'; }); } catch (_) { /* names stay generic */ }
}
function clientName(b) { return (b.client && (b.client.company || b.client.name)) || ''; }
function dbGate(what) {
  if (state.dbState === 'ready') return '';
  return state.dbState === 'wait' ? `<div class="empty"><span class="muted">Loading ${what}…</span></div>`
    : `<div class="empty"><b>${what[0].toUpperCase() + what.slice(1)} aren't available here</b><span>Jobs, check-outs and paperwork live in this page's shared database. Open the page signed in to claude.ai to use them. Gear, kits and the storefront still work.</span></div>`;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3800); }
function previewBar() {
  return `<div class="pv"><div class="pvbar">${icon('lock', 15)}<span><b>Public preview.</b> Names, values, internal notes, research and the sheet link are hidden. Anything you create stays in this browser.</span><a href="#" data-act="nav" data-v="welcome">What's hidden?</a></div></div>`;
}
function previewNote(text) { return PREVIEW ? `<div class="note pvn">${icon('lock', 16)}<span>${text}</span></div>` : ''; }
function hero(eyebrow, title, sub, actions) { return `<div class="hero"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`; }

/* ---------- Tour ---------- */
function onStop(n) { const st = TOUR[n]; return !!st && (st.job ? state.view === 'booking' && state.tab === st.job : state.view === st.view); }
function syncTour() { if (!state.touring || onStop(state.tour)) return; const n = TOUR.findIndex((t, k) => onStop(k)); if (n >= 0) state.tour = n; }
/* Three equal buttons in a fixed row, then the progress bar, so nothing shifts from stop to stop. */
function tourControls(buttons, i) { return `<div class="tour-ctl">${buttons.join('')}</div><div class="bar" aria-hidden="true"><i style="width:${((i + 1) / TOUR.length * 100).toFixed(1)}%"></i></div>`; }
function goStop(n) {
  n = Math.max(0, Math.min(TOUR.length - 1, n));
  if (TOUR[n].job && !exampleJob()) { const dir = n >= state.tour ? 1 : -1; while (TOUR[n] && TOUR[n].job) n += dir; if (!TOUR[n]) { state.touring = false; state.view = 'welcome'; render(); return; } }
  const st = TOUR[n]; state.tour = n; state.touring = true; state.drawer = null;
  if (st.job) { state.tab = st.job; openBooking(exampleJob().id); return; }
  if (state.dirty) flushSave();
  state.view = st.view; render(); window.scrollTo(0, 0);
}
function tourBar() {
  const st = TOUR[state.tour];
  return `<div class="pv"><div class="pvbar tourbar">${icon('play', 15)}<span><b>Tour, stop ${state.tour + 1} of ${TOUR.length}:</b> ${esc(st.title)}. Look around, then carry on from the bottom of the page.</span><a href="#" data-act="tourJump">Continue ↓</a></div></div>`;
}
function tourDock() {
  const i = state.tour; const st = TOUR[i]; const here = onStop(i); const nx = TOUR[i + 1]; const last = i === TOUR.length - 1;
  return `<div class="dock-wrap"><div class="card tour-dock" id="tourDock">
    <div class="row between"><span class="eyebrow" style="margin:0">${icon('play', 14)} Tour · stop ${i + 1} of ${TOUR.length}</span><button class="btn ghost sm" data-act="tourEnd">End tour</button></div>
    ${here ? `<div class="stack" style="gap:6px"><h2 class="t">${esc(st.title)}</h2><p class="muted" style="margin:0">${esc(st.lead)}</p></div>
      <div class="nextup">${icon(nx ? 'arrow' : 'check', 16)}<span>${nx ? `Next up: <b>${esc(nx.title)}</b>. ${esc(nx.lead)}` : "That's every stop. Finish, and the desk opens on Today."}</span></div>`
      : `<div class="stack" style="gap:6px"><h2 class="t">You stepped off the tour</h2><p class="muted" style="margin:0">It's waiting at stop ${i + 1}: <b>${esc(st.title)}</b>.</p></div>`}
    ${tourControls([`<button class="btn" data-act="tourPrev">${icon('back', 14)} Back</button>`, '<button class="btn" data-act="tourStops">All stops</button>', `<button class="btn dark" data-act="tourNext">${here ? (last ? 'Finish' : 'Next') : 'Resume'} ${icon('arrow', 14)}</button>`], i)}
  </div></div>`;
}
function centerTourChip() {
  const list = $('.tour-list'); const cur = list && list.querySelector('[aria-current="step"]');
  if (list && cur && list.scrollWidth > list.clientWidth) list.scrollLeft = cur.offsetLeft - (list.clientWidth - cur.offsetWidth) / 2;
}

/* ---------- Start ---------- */
function exampleJob() { return state.bookings.find((b) => b.id === EXAMPLE_ID) || state.bookings.find((b) => HOLDS.has(b.status)) || null; }
function vWelcome() {
  const i = Math.max(0, Math.min(TOUR.length - 1, state.tour)); const st = TOUR[i]; const ex = exampleJob();
  const flow = [['New request', 'From the storefront, or you start one'], ['Quoted', 'Gear, crew and three budgets'], ['Confirmed', 'Deposit in, paperwork on its way'], ['Out on a job', 'Covered, signed, checked out'], ['Back', 'Checked in, late fees if any'], ['Closed', 'Paid, and the fund gets its share']];
  return `<section class="view">
    <div class="card glow welcome"><div class="eyebrow">${icon('play', 14)} Start here</div>
      <h1>Your rental desk, <em class="s">start to finish</em>.</h1>
      <p class="muted" style="max-width:62ch;font-size:17px;margin:14px 0 0">Quote a job, get the gear covered, hand it over and bring it back, and put part of every job toward new gear. This page walks through each part. It takes about two minutes.</p>
      <div class="actions" style="margin-top:22px"><button class="btn grad" data-act="tourStart">${icon('play', 16)} Take the tour</button>${ex ? `<button class="btn" data-act="tourJob" data-t="plan">Open the example job</button>` : ''}<button class="btn ghost" data-act="nav" data-v="today">Go to Today ${icon('arrow', 14)}</button></div></div>
    ${PREVIEW ? `<div class="card"><div class="hd"><h2 class="t">${icon('lock', 18)} About this preview</h2><span class="pill">Public copy</span></div><div class="bd grid2">
      <div><b>Hidden here</b><ul class="muted small" style="margin:8px 0 0;padding-left:18px;display:grid;gap:6px"><li>Owner names. They show as Owner M, Owner C and Owner S.</li><li>What each piece is worth, its market price range, and where each rate came from.</li><li>Internal notes and open questions about the gear.</li><li>The buying list and growth plan behind the gear fund.</li><li>The market research on the Roadmap.</li><li>The link to the Google Sheet, so syncing is off.</li></ul></div>
      <div><b>Works the same</b><p class="muted small" style="margin:8px 0 0">Everything else: jobs, quotes, the three budgets, tax, discounts, paperwork, check-out, the schedule, kits, the gear fund and the storefront. The difference is where it's kept: here, anything you create stays in this browser and nobody else sees it. The private version is shared between the three owners and has all of the hidden details.</p></div></div></div>` : ''}
    <div class="card"><div class="hd"><h2 class="t">How a job moves</h2><span class="muted small">Every job walks the same six steps</span></div><div class="bd flow">${flow.map((f, n) => `<div class="fs"><span class="k">${n + 1}</span><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div></div>
    <div class="card tour" id="tour"><nav class="tour-list" aria-label="Tour stops">${TOUR.map((t, n) => `<button data-act="tourGo" data-i="${n}" ${n === i ? 'aria-current="step"' : ''}><span class="n">${n + 1}</span>${esc(t.title)}</button>`).join('')}</nav>
      <div class="tour-body">
        <div class="tour-stage">${TOUR.map((t, n) => `<div class="stop ${n === i ? 'on' : ''}" ${n === i ? '' : 'aria-hidden="true"'}>
          <div class="row" style="gap:14px"><span class="icon-tile t-Kit" style="width:54px;height:54px;border-radius:16px">${icon(t.icon, 24)}</span><div><div class="eyebrow" style="margin:0">Stop ${n + 1} of ${TOUR.length}</div><h2>${esc(t.title)}</h2></div></div>
          <p style="margin:0;font-size:17px">${esc(t.lead)}</p>
          <ol>${t.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
          ${PREVIEW && t.view === 'fund' ? previewNote('In this preview the buying list starts empty. Add a few things to try it.') : ''}
          ${PREVIEW && t.view === 'settings' ? previewNote('In this preview, changes to Settings are saved in this browser only, and the sheet sync is off.') : ''}</div>`).join('')}</div>
        ${tourControls([`<button class="btn" data-act="tourGo" data-i="${i - 1}" ${i === 0 ? 'disabled' : ''}>${icon('back', 14)} Back</button>`, '<button class="btn dark" data-act="tourShow">Open page</button>', `<button class="btn" data-act="tourGo" data-i="${i + 1}" ${i === TOUR.length - 1 ? 'disabled' : ''}>Next ${icon('arrow', 14)}</button>`], i)}
      </div></div>
    <label class="check" style="justify-content:center"><input type="checkbox" id="home-today" data-home="1" ${homePref() === 'today' ? 'checked' : ''}><span>Start on Today next time. The tour stays one tap away under Start.</span></label>
  </section>`;
}

/* ---------- Today ---------- */
function collectIssues() {
  const t = todayStr(); const out = [];
  state.bookings.forEach((b) => {
    const name = b.project || b.ref;
    if (b.status === 'out' && b.returnDate < t) out.push({ tone: 'bad', b, t: `${name} is ${plural(diffDays(b.returnDate, t), 'day')} late`, d: `It was due back ${fmtDay(b.returnDate)}.`, tab: 'handoff' });
    if (b.status === 'request') out.push({ tone: 'info', b, t: `New request: ${name}`, d: `${clientName(b) || 'A client'} is waiting on a quote.`, tab: 'plan' });
    if (['quoted', 'confirmed'].includes(b.status) && b.pickup) {
      const days = diffDays(t, b.pickup); const pw = paperwork(b);
      if (days <= 10 && days >= -1) {
        const tone = days <= 2 ? 'bad' : 'warn';
        if (pw.contract !== 'signed') out.push({ tone, b, t: `${name}: agreement not signed`, d: `Goes out ${fmtDay(b.pickup)}.`, tab: 'paperwork' });
        if (!pw.protectionOk) out.push({ tone, b, t: `${name}: gear not covered yet`, d: pw.protection.mode === 'coi' ? `Insurance certificate ${COI_STATUS[pw.protection.status].toLowerCase()}. Needs ${money(chosen(b).repl)} of cover.` : pw.protection.mode === 'hold' ? 'The card hold is not placed yet.' : 'The client has not accepted the waiver yet.', tab: 'paperwork' });
        if (!pw.taxOk) out.push({ tone: 'warn', b, t: `${name}: tax certificate missing`, d: 'Marked tax-exempt, but no ST-121 on file.', tab: 'paperwork' });
        if (b.status === 'confirmed' && pw.deposit !== 'received') out.push({ tone: 'warn', b, t: `${name}: deposit not in`, d: `${money(chosen(b).total * num(state.settings.depositPct) / 100)} due.`, tab: 'handoff' });
      }
    }
    if (HOLDS.has(b.status)) {
      const cf = conflicts(b).filter((c) => c.kind !== 'hold');
      if (cf.length) out.push({ tone: 'bad', b, t: `${name}: short on ${plural(cf.length, 'item')}`, d: cf.slice(0, 2).map((c) => `${(state.cat.byId[c.id] || { name: c.id }).name}: needs ${c.need}, ${c.have} free`).join(' · '), tab: 'plan' });
    }
  });
  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
function agenda(from, days) {
  const map = {}; const end = addDays(from, days - 1);
  state.bookings.filter((b) => HOLDS.has(b.status) || b.status === 'returned').forEach((b) => {
    const tent = !FIRM.has(b.status);
    const push = (d, kind, txt) => { if (d >= from && d <= end) (map[d] = map[d] || []).push({ b, kind, txt, tent }); };
    if (b.status !== 'out' && b.status !== 'returned') push(b.pickup, 'out', `Goes out${b.pickupTime ? ' ' + fmtTime(b.pickupTime) : ''}`);
    for (let i = 0; i < num(b.shootDays); i++) push(addDays(b.shootStart || b.pickup, i), 'shoot', `Shoot day ${i + 1}`);
    if (b.status !== 'returned') push(b.returnDate, 'in', `Back${b.returnTime ? ' by ' + fmtTime(b.returnTime) : ''}`);
    if (b.prepDate) push(b.prepDate, 'out', 'Prep visit');
  });
  return map;
}
function fundCard(compact) {
  const f = fundTotals(); const S = state.settings;
  if (!f.next) return `<div class="card glow"><div class="hd"><h2 class="t">Gear fund</h2></div><div class="bd"><p class="muted" style="margin:0">${num(S.fundPct)}% of every job's gear rental goes toward new gear. ${f.queue.length ? 'Everything on the buying list is bought.' : 'Add what you want to buy next on the Gear fund page.'}</p></div></div>`;
  const p = Math.max(0, Math.min(100, f.next.cost ? f.balance / f.next.cost * 100 : 0));
  return `<div class="card glow"><div class="hd"><h2 class="t">Gear fund</h2><button class="btn ghost sm" data-act="nav" data-v="fund">Open ${icon('arrow', 14)}</button></div>
    <div class="bd row" style="gap:18px;align-items:center"><div class="ring" style="--p:${p.toFixed(1)}"><div><b>${Math.round(p)}%</b><span>of the next buy</span></div></div>
      <div class="grow stack" style="gap:6px"><span class="muted small">Next up</span><b style="font:650 18px/1.25 var(--display)">${esc(f.next.name)}</b><span class="small">${money(f.balance)} saved of ${money(f.next.cost)}${f.pledged ? ` · ${money(f.pledged)} more on the way` : ''}</span>${compact ? '' : `<span class="small muted">${num(S.fundPct)}% of every job's gear rental goes here.</span>`}</div></div></div>`;
}
function emptyWeek() {
  const t = todayStr();
  const next = state.bookings.filter((b) => HOLDS.has(b.status) && b.pickup >= t).sort((a, b) => a.pickup.localeCompare(b.pickup));
  if (!next.length) return `<div class="card glow"><div class="empty"><b>No jobs on the books yet</b><span>Start one with New job, quote a ready-made kit, or take the two-minute tour first.</span><div class="actions" style="justify-content:center"><button class="btn grad" data-act="newBooking">${icon('plus', 16)} New job</button><button class="btn" data-act="nav" data-v="packages">Browse kits</button><button class="btn ghost" data-act="nav" data-v="welcome">Take the tour</button></div></div></div>`;
  const n = next[0];
  return `<div class="card glow"><div class="bd row wrap between" style="gap:16px;padding:22px">
    <div class="row" style="gap:14px">${tile('Kit')}<div><div class="eyebrow" style="margin:0 0 6px">Nothing goes out this week · next up</div><div style="font:650 20px/1.2 var(--display)">${esc(n.project || n.ref)}</div><div class="muted small">${esc(clientName(n) || 'No client yet')} · goes out ${esc(fmtLong(n.pickup))}${next.length > 1 ? ` · ${plural(next.length - 1, 'more job')} after that` : ''}</div></div></div>
    <div class="actions"><button class="btn dark" data-act="openBooking" data-id="${n.id}">Open it</button><button class="btn ghost" data-act="nav" data-v="calendar">See the schedule</button></div></div></div>`;
}
function vToday() {
  const t = todayStr();
  const out = state.bookings.filter((b) => b.status === 'out');
  const soon = state.bookings.filter((b) => ['request', 'quoted', 'confirmed'].includes(b.status) && b.pickup >= t && b.pickup <= addDays(t, 6));
  const issues = state.dbState === 'ready' ? collectIssues() : [];
  const urgent = issues.filter((i) => i.tone !== 'info').length;
  const title = soon.length ? `${word(soon.length)} ${soon.length === 1 ? 'job goes' : 'jobs go'} out this <em class="s">week</em>.`
    : out.length ? `${word(out.length)} ${out.length === 1 ? 'job is' : 'jobs are'} on set <em class="s">right now</em>.`
    : `A quiet week on the <em class="s">calendar</em>.`;
  const sub = state.dbState !== 'ready' ? '' : urgent ? `${plural(urgent, 'thing')} to sort${soon.length ? ' before then' : ''}.` : issues.length ? 'Nothing is blocked. A request is waiting for a quote.' : 'Everything is lined up.';
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i)); const map = agenda(t, 7);
  const openQ = OPEN.filter((o) => o[0] === 'Open' && ['Blocked', 'Insurance', 'Model ambiguous'].includes(o[1]));
  const qs = [...DATA_CHECKS.map((d) => ({ tone: 'bad', t: d.title, d: d.text, id: d.id })), ...openQ.map((o) => ({ tone: o[1] === 'Model ambiguous' ? 'warn' : 'bad', t: o[3], d: o[5], id: o[2] }))];
  return `<section class="view">
    ${hero(esc(fmtLong(t)), title, sub, '<button class="btn" data-act="nav" data-v="calendar">' + icon('calendar', 16) + ' Schedule</button><button class="btn grad" data-act="newBooking">' + icon('plus', 16) + ' New job</button>')}
    ${state.dbState !== 'ready' ? `<div class="card">${dbGate('jobs')}</div>` : !days.some((d) => (map[d] || []).length) ? emptyWeek() : `<div class="week">${days.map((d) => { const dt = parseYmd(d); const evs = map[d] || []; return `<div class="day ${d === t ? 'today' : ''}"><div class="d"><span>${dt.toLocaleDateString('en-US', { weekday: 'short' })}</span><b>${dt.getDate()}</b></div>${evs.map((e) => `<div class="ev ${e.kind} ${e.tent ? 'tent' : ''}" data-act="openBooking" data-id="${e.b.id}" tabindex="0"><b>${esc(e.b.project || e.b.ref)}</b><span>${esc(e.txt)}${e.tent ? ' · tentative' : ''}</span></div>`).join('')}${evs.length ? '' : '<span class="none">Free</span>'}</div>`; }).join('')}</div>`}
    <div class="grid2">
      <div class="card"><div class="hd"><h2 class="t">Needs you</h2><span class="muted small">${issues.length ? plural(issues.length, 'thing') : ''}</span></div>
        <div class="bd flush">${state.dbState !== 'ready' ? dbGate('jobs') : issues.length ? issues.slice(0, 10).map((i) => `<div class="issue ${i.tone}" data-act="openBooking" data-id="${i.b.id}" data-tab="${i.tab || ''}" tabindex="0"><span class="mk"></span><div class="grow"><div class="ttl">${esc(i.t)}</div><div class="sub">${esc(i.d)}</div></div>${pill(i.b.status)}</div>`).join('')
          : '<div class="empty"><b>All clear</b><span>Every upcoming job has its agreement, cover and gear lined up.</span></div>'}</div></div>
      <div class="stack">${fundCard()}
        ${PREVIEW ? `<div class="card"><div class="hd"><h2 class="t">Still to confirm</h2></div><div class="bd">${previewNote('Open questions about the gear, such as models to check and prices to verify, are hidden in the public preview.')}</div></div>` : ''}
        ${qs.length ? `<div class="card"><div class="hd"><h2 class="t">Still to confirm</h2><button class="btn ghost sm" data-act="nav" data-v="roadmap">All ${OPEN.filter((o) => o[0] === 'Open').length + DATA_CHECKS.length} ${icon('arrow', 14)}</button></div><div class="bd flush">${qs.map((q) => `<div class="issue ${q.tone}" ${state.cat.byId[q.id] ? `data-act="item" data-id="${q.id}" tabindex="0"` : ''}><span class="mk"></span><div class="grow"><div class="ttl">${esc(q.t)}</div><div class="sub">${esc(q.d)}</div></div></div>`).join('')}</div></div>` : ''}</div>
    </div>
  </section>`;
}

/* ---------- Schedule ---------- */
function vCalendar() {
  const start = state.cal.start, N = 21, t = todayStr();
  const days = Array.from({ length: N }, (_, i) => addDays(start, i)); const end = days[N - 1];
  const rows = state.bookings.filter((b) => b.status !== 'cancelled' && b.pickup && b.returnDate && b.pickup <= end && bookingEnd(b) >= start).sort((a, b) => a.pickup.localeCompare(b.pickup));
  const head = '<div class="tl-h" style="text-align:left;padding-left:14px">Job</div>' + days.map((d) => { const dt = parseYmd(d); const wk = dt.getDay() === 0 || dt.getDay() === 6; return `<div class="tl-h ${wk ? 'wk' : ''} ${d === t ? 'today' : ''}">${dt.toLocaleDateString('en-US', { weekday: 'narrow' })}<b>${dt.getDate()}</b></div>`; }).join('');
  const body = rows.map((b) => {
    const e = bookingEnd(b); const s0 = b.shootStart || b.pickup; const s1 = addDays(s0, Math.max(0, num(b.shootDays) - 1)); const tent = !FIRM.has(b.status) && HOLDS.has(b.status);
    const cells = days.map((d) => {
      const dt = parseYmd(d); const wk = dt.getDay() === 0 || dt.getDay() === 6; let bar = '';
      if (d >= b.pickup && d <= e) { const shoot = num(b.shootDays) > 0 && d >= s0 && d <= s1; bar = `<div class="span ${shoot ? 'shoot' : 'held'} ${tent ? 'tent' : ''} ${d === b.pickup ? 'first' : ''} ${d === e ? 'last' : ''}"></div>`; }
      return `<div class="tl-c ${wk ? 'wk' : ''} ${d === t ? 'today' : ''}">${bar}</div>`;
    }).join('');
    return `<div class="tl-label" data-act="openBooking" data-id="${b.id}" tabindex="0"><span class="t">${esc(b.project || b.ref)}</span><span>${pill(b.status)}</span></div>${cells}`;
  }).join('');
  return `<section class="view">
    ${hero('Three weeks from ' + esc(fmtDay(start, { month: 'long', day: 'numeric' })), 'The <em class="s">schedule</em>', 'Every job from the moment gear goes out to the moment it comes back.', `<button class="btn icon" data-act="calMove" data-n="-7" aria-label="Previous week">${icon('back', 16)}</button><button class="btn" data-act="calToday">This week</button><button class="btn icon" data-act="calMove" data-n="7" aria-label="Next week">${icon('arrow', 16)}</button>`)}
    <div class="legend"><span><i style="background:var(--grad)"></i>Shoot day</span><span><i style="background:repeating-linear-gradient(135deg,var(--warm-soft) 0 6px,color-mix(in srgb,var(--tungsten) 35%,transparent) 6px 8px)"></i>Held, not shooting (half rate)</span><span><i style="background:var(--grad);opacity:.45"></i>Not confirmed yet</span></div>
    ${state.dbState !== 'ready' ? `<div class="card">${dbGate('jobs')}</div>` : `<div class="card"><div class="tl" style="--days:${N}"><div class="tl-grid">${head}${body || '<div style="grid-column:1/-1" class="empty"><b>Nothing booked in these three weeks</b><span>Look further out with the arrows, or start a new job.</span></div>'}</div></div></div>`}
  </section>`;
}

/* ---------- Jobs ---------- */
function vBookings() {
  const f = state.bk.filter;
  const sets = { active: (b) => HOLDS.has(b.status), request: (b) => b.status === 'request', quoted: (b) => b.status === 'quoted', confirmed: (b) => b.status === 'confirmed', out: (b) => b.status === 'out', done: (b) => ['returned', 'closed'].includes(b.status), cancelled: (b) => b.status === 'cancelled', all: () => true };
  const list = state.bookings.filter(sets[f] || sets.active).sort((a, b) => (a.pickup || '').localeCompare(b.pickup || ''));
  const chip = (k, l) => `<button class="chip" data-act="bkFilter" data-f="${k}" aria-pressed="${f === k}">${l} <span class="c">${state.bookings.filter(sets[k]).length}</span></button>`;
  return `<section class="view">
    ${hero('Quotes, holds and jobs', 'Every <em class="s">job</em>', 'Each one carries its quote, gear list, agreement, cover and check-out sheet.', '<button class="btn grad" data-act="newBooking">' + icon('plus', 16) + ' New job</button>')}
    <div class="chips">${chip('active', 'Active')}${chip('request', 'Requests')}${chip('quoted', 'Quoted')}${chip('confirmed', 'Confirmed')}${chip('out', 'Out')}${chip('done', 'Back')}${chip('cancelled', 'Cancelled')}${chip('all', 'All')}</div>
    <div class="card">${state.dbState !== 'ready' ? dbGate('jobs') : list.length ? `<div class="bd flush">${list.map((b) => { const c = chosen(b); const ready = isReady(b);
      return `<div class="li click job-li" data-act="openBooking" data-id="${b.id}" tabindex="0">${tile('Kit', true)}<div class="grow"><div class="ttl">${esc(b.project || 'Untitled job')}${b.example ? ' <span class="pill warm">Example</span>' : ''}</div><div class="sub">${esc(clientName(b) || 'No client yet')} · ${esc(fmtDay(b.pickup))} to ${esc(fmtDay(b.returnDate))}${c.weekend ? ' · weekend special' : ''}</div></div>
        <div class="meta">${pill(b.status)}${HOLDS.has(b.status) ? `<span class="pill ${ready ? 'good' : 'warn'}">${ready ? 'Paperwork done' : 'Paperwork open'}</span>` : ''}<b class="num tot">${money(c.total)}</b></div></div>`; }).join('')}</div>`
      : `<div class="empty"><b>No jobs here</b><span>${f === 'active' ? 'Start one, or quote a kit from the Kits page.' : 'Try another filter.'}</span></div>`}</div>
  </section>`;
}

/* ---------- Job workspace ---------- */
function vBooking() {
  const b = state.draft;
  if (!b) { state.view = 'bookings'; return vBookings(); }
  const c = chosen(b); const pw = paperwork(b); const ro = state.readOnly;
  const idx = FLOW.indexOf(b.status);
  const path = FLOW.map((s, i) => `<span class="st ${i < idx ? 'on' : ''} ${i === idx ? 'now' : ''}">${STATUS[s].label}</span>`).join('<span class="ln"></span>');
  const next = { request: ['quoted', 'Mark quote sent'], quoted: ['confirmed', 'Confirm job'], confirmed: ['__handoff', 'Hand off the gear'], out: ['__handoff', 'Check gear back in'], returned: ['closed', 'Close job'] }[b.status];
  const done = { paperwork: pw.contract === 'signed' && pw.protectionOk && pw.taxOk };
  const tab = (k, l) => `<button role="tab" data-act="tab" data-t="${k}" aria-selected="${state.tab === k}">${l}${k in done ? `<span class="ok ${done[k] ? 'y' : ''}"></span>` : ''}</button>`;
  const body = { plan: bPlan, price: bPrice, paperwork: bPaperwork, handoff: bHandoff }[state.tab] || bPlan;
  return `<section class="view">
    <div class="hero"><div style="min-width:0;flex:1"><button class="btn ghost sm" data-act="nav" data-v="bookings">${icon('back', 14)} All jobs</button>
      <div class="eyebrow" style="margin-top:12px">${esc(b.ref)}${b.example ? ' · example, not a real job' : ''}${b.source === 'storefront' ? ' · came in from the storefront' : ''}</div>
      <h1>${esc(b.project || 'Untitled job')}</h1><p>${esc(clientName(b) || 'No client yet')} · ${esc(fmtDay(b.pickup))} to ${esc(fmtDay(b.returnDate))}</p></div>
      <div style="text-align:right"><div class="big" id="headTotal">${money(c.total)}</div><div class="muted small">${BUDGET[b.budget || 'A'].name} · ${b.tax && b.tax.exempt ? 'tax exempt' : 'incl. sales tax'}</div></div></div>
    <div class="card statusbar"><div class="path grow">${b.status === 'cancelled' ? pill('cancelled') : path}</div>
      ${ro ? '<span class="pill">View only</span>' : `<div class="actions">${next ? `<button class="btn dark sm" data-act="advance" data-to="${next[0]}">${next[1]}</button>` : ''}
      ${b.status === 'cancelled' ? '<button class="btn sm" data-act="advance" data-to="quoted">Reopen</button>' : b.status !== 'closed' ? '<button class="btn ghost sm" data-act="advance" data-to="cancelled">Cancel job</button>' : ''}
      ${state.confirmDelete ? '<span class="small">Delete for good?</span><button class="btn danger sm" data-act="deleteBooking">Delete</button><button class="btn ghost sm" data-act="confirmDelete" data-v="0">Keep</button>' : '<button class="btn ghost sm" data-act="confirmDelete" data-v="1">Delete</button>'}</div>`}</div>
    <div class="tabs" role="tablist">${tab('plan', 'Plan')}${tab('price', 'Price')}${tab('paperwork', 'Paperwork')}${tab('handoff', 'Handoff')}</div>
    ${body(b)}
  </section>`;
}
function lineTotal(b, ln) { const wk = isWeekend(b); const days = wk ? Math.min(1, num(ln.days)) : num(ln.days); const f = !wk && b.rateMode === 'week' ? weekFactor(days) : days; return lineRate(ln) * num(ln.qty) * f; }
function lineTotalCell(b, ln) { const t = lineTotal(b, ln); return (ln.comp || b.favor) ? `<span class="faint" style="text-decoration:line-through">${money(t)}</span>` : money(t); }
function bPlan(b) {
  const cat = state.cat; const cfBy = Object.fromEntries(conflicts(b).map((x) => [x.id, x]));
  const sugg = suggestPossession(b); const fifa = fifaCrew(b); const past = pastJobs(b); const wkOk = weekendEligible(b) && state.settings.weekendSpecial;
  const h = b.handoff || {};
  const lines = (b.lines || []).map((ln, i) => {
    const it = cat.byId[ln.id] || { name: 'Not on the gear list', own: '', cat: 'Kit' }; const k = cfBy[ln.id];
    const flag = k ? `<span class="flag ${k.kind === 'hold' ? '' : 'bad'}">${k.kind === 'hold' ? `held on another job, ${k.have} free` : k.kind === 'missing' ? 'not on the gear list' : `only ${k.have} free these dates`}</span>` : hasQuestion(ln.id) ? '<span class="flag">details still to confirm</span>' : '';
    return `<div class="gear-row">${tile(it.cat, true)}<div class="grow"><div class="ttl" data-act="item" data-id="${esc(ln.id)}" style="cursor:pointer">${esc(it.name)}</div><div class="sub">${ownerTag(it.own)} · ${money(lineRate(ln))}/day${perLens(it) ? ' per lens' : ''}${flag ? ' · ' + flag : ''}</div></div>
      <div class="ctl"><div class="stepper" aria-label="Quantity"><button data-act="qty" data-i="${i}" data-d="-1" aria-label="One fewer">−</button><b>${esc(ln.qty)}</b><button data-act="qty" data-i="${i}" data-d="1" aria-label="One more">+</button></div>
        <label class="mini">Days<input type="number" min="0" step="1" data-line="${i}" data-f="days" value="${esc(ln.days)}"></label>
        <label class="mini">Rate<input type="number" min="0" step="1" data-line="${i}" data-f="rate" value="${ln.rate == null ? '' : esc(ln.rate)}" placeholder="${it.rec == null ? 0 : it.rec}"></label>
        <label class="mini">Priority<select data-line="${i}" data-f="tier">${['C', 'B', 'A'].map((x) => `<option value="${x}" ${ln.tier === x ? 'selected' : ''}>${PRIORITY[x]}</option>`).join('')}</select></label>
        <label class="check small" title="Leave it on the gear list but don't charge for it"><input type="checkbox" data-line="${i}" data-f="comp" ${ln.comp ? 'checked' : ''}> On the house</label>
        <span class="lt" data-lt="${i}">${lineTotalCell(b, ln)}</span><button class="x" data-act="rmLine" data-i="${i}" aria-label="Remove ${esc(it.name)}">×</button></div></div>`;
  }).join('');
  const crew = (b.crew || []).map((cr, i) => `<div class="gear-row"><span class="icon-tile sm t-Sound">${icon('people', 17)}</span><div class="grow"><div class="ttl">${esc(cr.role)}</div><div class="sub">${num(cr.rate) * num(cr.days) >= 800 ? '<span class="flag">Needs a written contract (NY)</span>' : 'Day rate from your crew list'}</div></div>
      <div class="ctl"><div class="stepper" aria-label="People"><button data-act="crewPeople" data-i="${i}" data-d="-1" aria-label="One fewer">−</button><b>${esc(cr.people)}</b><button data-act="crewPeople" data-i="${i}" data-d="1" aria-label="One more">+</button></div>
        <label class="mini">Days<input type="number" min="0" data-crew="${i}" data-f="days" value="${esc(cr.days)}"></label>
        <label class="mini">Rate<input type="number" min="0" data-crew="${i}" data-f="rate" value="${esc(cr.rate)}"></label>
        <label class="mini">Priority<select data-crew="${i}" data-f="tier">${['C', 'B', 'A'].map((x) => `<option value="${x}" ${cr.tier === x ? 'selected' : ''}>${PRIORITY[x]}</option>`).join('')}</select></label>
        <span class="lt" data-ct="${i}">${money(num(cr.rate) * num(cr.people) * num(cr.days))}</span><button class="x" data-act="rmCrew" data-i="${i}" aria-label="Remove ${esc(cr.role)}">×</button></div></div>`).join('');
  return `<div class="split"><div class="stack">
    <div class="card"><div class="hd"><h2 class="t">Who it's for</h2>${past ? `<span class="pill good">Returning client · ${plural(past, 'past job')}</span>` : ''}</div><div class="bd form">
      <label class="field wide"><span>Project</span><input type="text" id="b-project" data-b="project" value="${esc(b.project)}" placeholder="e.g. 2-day brand spot"></label>
      <label class="field"><span>Contact</span><input type="text" id="b-cname" data-b="client.name" value="${esc(b.client && b.client.name)}"></label>
      <label class="field"><span>Company</span><input type="text" id="b-ccomp" data-b="client.company" value="${esc(b.client && b.client.company)}"></label>
      <label class="field"><span>Email</span><input type="email" id="b-cemail" data-b="client.email" value="${esc(b.client && b.client.email)}"></label>
      <label class="field"><span>Phone</span><input type="tel" id="b-cphone" data-b="client.phone" value="${esc(b.client && b.client.phone)}"></label>
      ${past && (!b.discount || b.discount.kind === 'none') && num(state.settings.returningPct) ? `<div class="note good wide row between wrap"><span>They've booked before. Offer the ${num(state.settings.returningPct)}% returning-client discount?</span><button class="btn sm" data-act="applyReturning">Apply it</button></div>` : ''}
    </div></div>
    <div class="card"><div class="hd"><h2 class="t">When</h2><span class="muted small">${plural(diffDays(b.pickup, b.returnDate), 'night')} out</span></div><div class="bd form">
      <label class="field"><span>Goes out</span><input type="date" id="b-pickup" data-b="pickup" value="${esc(b.pickup)}"></label>
      <label class="field"><span>At</span><input type="time" id="b-ptime" data-b="pickupTime" value="${esc(b.pickupTime)}"></label>
      <label class="field"><span>First shoot day</span><input type="date" id="b-shoot" data-b="shootStart" value="${esc(b.shootStart)}"></label>
      <label class="field"><span>Shoot days</span><input type="number" min="0" id="b-sdays" data-b="shootDays" data-type="num" value="${esc(b.shootDays)}"></label>
      <label class="field"><span>Comes back</span><input type="date" id="b-return" data-b="returnDate" value="${esc(b.returnDate)}"></label>
      <label class="field"><span>By</span><input type="time" id="b-rtime" data-b="returnTime" value="${esc(b.returnTime)}"></label>
      <label class="field"><span>Hold days</span><input type="number" min="0" id="b-poss" data-b="possessionDays" data-type="num" value="${esc(b.possessionDays)}"><small id="posshint">${holdHint(b, sugg)}</small></label>
      <label class="field"><span>Prep and test visit</span><input type="date" id="b-prep" data-b="prepDate" value="${esc(b.prepDate)}"><small>Optional. A free check of the gear before pickup.</small></label>
      ${wkOk ? `<div class="note wide row between wrap"><span>${icon('spark', 16)} <b>Weekend special.</b> ${b.weekendOff ? 'Switched off for this job.' : 'Out Friday, back Monday morning: the whole rental bills as one day, no hold days.'}</span><button class="btn sm" data-act="weekendToggle">${b.weekendOff ? 'Apply it' : "Don't apply"}</button></div>` : ''}
    </div></div>
    <div class="card"><div class="hd"><h2 class="t">Handoff</h2><span class="muted small">${h.out === 'pickup' && h.back === 'pickup' ? 'Client collects and returns' : money(handoffFee(h.out) + handoffFee(h.back)) + ' in handoff fees'}</span></div><div class="bd form">
      <label class="field"><span>Going out</span><select id="b-hout" data-b="handoff.out">${Object.keys(HANDOFF).map((k) => `<option value="${k}" ${h.out === k ? 'selected' : ''}>${HANDOFF[k]}${handoffFee(k) ? ` (+${money(handoffFee(k))})` : ''}</option>`).join('')}</select></label>
      <label class="field"><span>Coming back</span><select id="b-hback" data-b="handoff.back">${Object.keys(HANDOFF).map((k) => `<option value="${k}" ${h.back === k ? 'selected' : ''}>${HANDOFF[k]}${handoffFee(k) ? ` (+${money(handoffFee(k))})` : ''}</option>`).join('')}</select></label>
      ${h.out === 'delivery' || h.back === 'delivery' ? `<label class="field wide"><span>Delivery address</span><input type="text" id="b-addr" data-b="handoff.address" value="${esc(h.address)}"></label>` : ''}
    </div></div>
    <div class="card"><div class="hd"><h2 class="t">Gear</h2><div class="actions"><select id="addPkg" data-addpkg="1" aria-label="Add a kit" style="width:auto;padding:8px 12px;border-radius:999px"><option value="">Add a kit…</option>${cat.packages.map((p) => `<option value="${p.id}">${esc(p.name)} · ${money(p.day)}/day</option>`).join('')}</select><button class="btn dark sm" data-act="openPick">${icon('plus', 14)} Add gear</button></div></div>
      <div class="bd flush">${lines || '<div class="empty"><b>No gear yet</b><span>Add single pieces, or drop in one of the ready-made kits.</span></div>'}</div></div>
    <div class="card"><div class="hd"><h2 class="t">Crew</h2><div class="actions"><select id="crewRole" data-crewrole="1" aria-label="Role" style="width:auto;padding:8px 12px;border-radius:999px">${cat.labor.map((l) => `<option value="${esc(l.role)}" ${state.crewRole === l.role ? 'selected' : ''}>${esc(l.role)} · ${money(l.rec)}/day</option>`).join('')}</select><button class="btn sm" data-act="addCrew">${icon('plus', 14)} Add</button></div></div>
      <div class="bd flush">${crew || '<div class="empty" style="padding:18px"><span>Gear only. Add crew if the job needs people too.</span></div>'}</div>
      ${fifa.length ? `<div class="bd" style="padding-top:0"><div class="note">New York's Freelance Isn't Free Act needs a written contract for any freelancer paid $800 or more within 120 days: ${fifa.map((x) => esc(x.role)).join(', ')}.</div></div>` : ''}</div>
    <div class="card"><div class="hd"><h2 class="t">Notes</h2></div><div class="bd"><textarea id="b-notes" data-b="notes" rows="3" placeholder="Location power, haze permission, load-in details…">${esc(b.notes)}</textarea></div></div>
  </div>
  <aside class="stack sticky" id="qsum">${planSide(b)}</aside></div>`;
}
function holdHint(b, sugg) { return sugg !== num(b.possessionDays) ? `The dates suggest ${sugg}. <a href="#" data-act="applyPoss">Use ${sugg}</a>` : 'Days the gear is out but not shooting, at half rate.'; }
function planSide(b) {
  const all = calc(b); const T = b.budget || 'A'; const c = all[T]; const cf = conflicts(b); const pw = powerCheck(b);
  return `<div class="card glow"><div class="hd"><h2 class="t">This job</h2><div class="seg" role="group" aria-label="Budget">${TIERS.map((x) => `<button data-act="budget" data-t="${x}" aria-pressed="${x === T}" title="${BUDGET[x].desc}">${BUDGET[x].name}</button>`).join('')}</div></div>
    <div class="bd stack" style="gap:12px"><div class="big">${money(c.total)}</div>
      <dl class="kv"><dt>Gear rental</dt><dd>${money(c.gear)}</dd><dt>Crew</dt><dd>${money(c.crew)}</dd><dt>Everything else</dt><dd>${money(c.exp + c.handoff + c.waiver + c.late)}</dd><dt>Sales tax</dt><dd>${b.tax && b.tax.exempt ? 'Exempt' : money(c.tax)}</dd></dl>
      <div class="note info small">${icon('fund', 15)} ${money(c.fund)} of this goes to the gear fund.</div>
      <button class="btn" data-act="tab" data-t="price">See the full price ${icon('arrow', 14)}</button></div></div>
  ${cf.length ? `<div class="card"><div class="hd"><h2 class="t">Availability</h2></div><div class="bd checklist">${cf.map((x) => `<div class="${x.kind === 'hold' ? '' : 'bad'}"><span>${esc((state.cat.byId[x.id] || { name: x.id }).name)}: ${x.kind === 'missing' ? 'not on the gear list.' : x.kind === 'hold' ? `needs ${x.need}, ${x.have} free once tentative holds count` : `needs ${x.need}, only ${x.have} free`}${x.who.length ? `<span class="sub">${x.who.map((w) => `${esc(w.b.project || w.b.ref)} (${w.q})`).join(', ')}</span>` : ''}</span></div>`).join('')}</div></div>` : ''}
  ${pw ? `<div class="card"><div class="hd"><h2 class="t">Power check</h2><span class="pill ${pw.circuits > 1 ? 'warn' : 'good'}">${pw.w.toLocaleString('en-US')} W</span></div><div class="bd stack" style="gap:8px;font-size:14px">
      <span>${pw.circuits > 1 ? `That's more than one 15A household circuit can carry. Spread the lights over at least ${pw.circuits} separate circuits.` : 'Fits on one 15A household circuit.'}</span>
      <span class="muted">${pw.djiMin ? `On the DJI Power 1000 alone: about ${pw.djiMin >= 90 ? (pw.djiMin / 60).toFixed(1) + ' hours' : pw.djiMin + ' minutes'} at full output.` : 'Too much for the DJI Power 1000 at full output.'}${pw.hasGen ? ` The generator ${pw.w <= POWER.genny ? 'can carry it' : 'is not enough on its own'}.` : ''}</span>
      <span class="faint small">Nominal watts from the fixture names. Dimmed lights draw less; full output can run higher.</span></div></div>` : ''}`;
}
function bPrice(b) {
  const all = calc(b); const T = b.budget || 'A'; const c = all[T]; const S = state.settings; const d = b.discount || { kind: 'none', pct: 0 };
  return `<div class="stack"><div class="budgets" id="budgets">${budgetCards(b, all)}</div>
    <div class="split"><div class="stack">
      <div class="card receipt"><div class="hd"><h2 class="t">${BUDGET[T].name}</h2><span class="muted small">What the client pays</span></div><div class="bd" id="receipt">${receipt(b, c)}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Adjust</h2></div><div class="bd form">
        <label class="field"><span>Discount</span><select id="p-disc" data-b="discount.kind">${Object.keys(DISCOUNTS).map((k) => `<option value="${k}" ${d.kind === k ? 'selected' : ''}>${DISCOUNTS[k]}</option>`).join('')}</select></label>
        ${d.kind && d.kind !== 'none' ? `<label class="field"><span>Discount %</span><input type="number" min="0" max="100" id="p-dpct" data-b="discount.pct" data-type="num" value="${esc(d.pct)}"></label>` : ''}
        <label class="field"><span>Multi-day pricing</span><select id="b-mode" data-b="rateMode"><option value="straight" ${b.rateMode !== 'week' ? 'selected' : ''}>Every day at the day rate</option><option value="week" ${b.rateMode === 'week' ? 'selected' : ''}>Film week (1, 1.85, 2.5, 3 days)</option></select></label>
        <label class="field"><span>Expendables at cost</span><input type="number" min="0" id="b-exp" data-b="expendables" data-type="num" value="${esc(b.expendables)}"></label>
        <label class="check wide"><input type="checkbox" id="b-exempt" data-b="tax.exempt" data-type="bool" ${b.tax && b.tax.exempt ? 'checked' : ''}><span>No sales tax: the client is giving an ST-121 exempt-use certificate (gear used to make a film for sale)</span></label>
        <label class="check wide"><input type="checkbox" id="b-favor" data-b="favor" data-type="bool" ${b.favor ? 'checked' : ''}><span>Favor mode: waive all gear fees. Crew still bills, and the gift is tracked.</span></label>
      </div></div></div>
      <aside class="stack sticky"><div class="card"><div class="hd"><h2 class="t">Where the gear money goes</h2></div><div class="bd stack" id="payouts">${payouts(b, c)}</div></div></aside></div></div>`;
}
function budgetCards(b, all) { const T = b.budget || 'A'; return TIERS.map((x) => `<button class="budget" data-act="budget" data-t="${x}" aria-pressed="${x === T}"><span class="nm">${BUDGET[x].name}</span><span class="pr">${money(all[x].total)}</span><span class="ds">${BUDGET[x].desc} · ${money(all[x].perDay)} per shoot day</span></button>`).join(''); }
function receipt(b, c) {
  const S = state.settings; const row = (l, v, cls) => `<dt${cls ? ` class="${cls}"` : ''}>${l}</dt><dd${cls ? ` class="${cls}"` : ''}>${v}</dd>`;
  return `<dl class="kv">
    ${row(`Gear rental${c.weekend ? ' · weekend special, one day' : b.rateMode === 'week' ? ' · film-week pricing' : ''}`, money(c.equip))}
    ${c.possession ? row(`Hold days · ${plural(num(b.possessionDays), 'day')} at ${num(S.possessionPct)}%`, money(c.possession)) : ''}
    ${c.discount ? row(`${DISCOUNTS[b.discount.kind]} discount · ${discountPct(b)}%`, '−' + money(c.discount)) : ''}
    ${row('Crew', money(c.crew))}
    ${c.exp ? row('Expendables, at cost', money(c.exp)) : ''}
    ${c.handoff ? row('Delivery and handoff', money(c.handoff)) : ''}
    ${c.waiver ? row(`Damage waiver · ${num(S.waiverPct)}%`, money(c.waiver)) : ''}
    ${c.late ? row('Late return', money(c.late)) : ''}
    ${row('Subtotal', money(c.subtotal), 'tot')}
    ${row(b.tax && b.tax.exempt ? 'Sales tax · exempt with ST-121' : `NY sales tax · ${pctTxt(S.salesTaxPct)} on ${money(c.taxable)}`, money(c.tax))}
    ${row('<b>Total</b>', `<b>${money(c.total)}</b>`, 'tot')}
    ${row(`Deposit to confirm · ${num(S.depositPct)}%`, money(c.total * num(S.depositPct) / 100))}
    ${c.comp ? row('Given on the house', money(c.comp)) : ''}
  </dl>`;
}
function payouts(b, c) {
  const f = fundTotals();
  return `<div class="row" style="gap:14px"><span class="icon-tile t-Kit">${icon('fund', 21)}</span><div class="grow"><div class="mid">${money(c.fund)}</div><div class="muted small">${pctTxt(c.fundPct)} of ${money(c.gear)} gear rental, toward ${f.next ? esc(f.next.name) : 'the buying list'}</div></div></div>
    <div class="tbl"><table class="plain"><thead><tr><th>Owner</th><th class="n">Gets</th><th class="n">On the house</th></tr></thead><tbody>${OWN.map((o) => `<tr><td>${ownerTag(o)}</td><td class="n">${money(c.own[o].net)}</td><td class="n">${c.own[o].comped ? money(c.own[o].comped) : '—'}</td></tr>`).join('')}</tbody></table></div>
    <span class="faint small">Each owner's gear rental, after any discount and the fund share. Crew is paid separately.</span>${previewNote('Owner names are hidden in the public preview.')}`;
}
function refreshDerived() {
  const b = state.draft; if (!b || state.view !== 'booking') return;
  const all = calc(b); const c = all[b.budget || 'A'];
  const qs = $('#qsum'); if (qs) qs.innerHTML = planSide(b);
  const bc = $('#budgets'); if (bc) bc.innerHTML = budgetCards(b, all);
  const rc = $('#receipt'); if (rc) rc.innerHTML = receipt(b, c);
  const po = $('#payouts'); if (po) po.innerHTML = payouts(b, c);
  (b.lines || []).forEach((ln, i) => { const cell = $(`[data-lt="${i}"]`); if (cell) cell.innerHTML = lineTotalCell(b, ln); });
  (b.crew || []).forEach((cr, i) => { const cell = $(`[data-ct="${i}"]`); if (cell) cell.textContent = money(num(cr.rate) * num(cr.people) * num(cr.days)); });
  const act = document.activeElement;
  $$('[data-line][data-f="days"]').forEach((inp) => { const ln = b.lines[num(inp.dataset.line)]; if (ln && inp !== act) inp.value = ln.days; });
  $$('[data-crew][data-f="days"]').forEach((inp) => { const cr = b.crew[num(inp.dataset.crew)]; if (cr && inp !== act) inp.value = cr.days; });
  const h = $('#posshint'); if (h) h.innerHTML = holdHint(b, suggestPossession(b));
  const big = $('#headTotal'); if (big) big.textContent = money(c.total);
}

/* ---------- Paperwork ---------- */
function bPaperwork(b) {
  const ct = b.contract || {}; const fifa = fifaCrew(b); const p = protectionState(b); const S = state.settings; const c = chosen(b); const coi = b.coi || {}; const t = b.tax || {};
  const opt = (k, title, desc, ok) => `<label class="option" ${ok ? '' : 'aria-disabled="true"'}><input type="radio" name="prot" data-b="protection" value="${k}" ${(b.protection || 'coi') === k ? 'checked' : ''} ${ok ? '' : 'disabled'}><b>${title}</b><span>${desc}</span></label>`;
  return `<div class="split"><div class="paper" id="agreementDoc">${agreementHTML(b)}</div>
  <aside class="stack">
    <div class="card"><div class="hd"><h2 class="t">Agreement</h2><span class="pill ${ct.status === 'signed' ? 'good' : ct.status === 'sent' ? 'info' : ''}">${{ draft: 'Draft', sent: 'Sent', signed: 'Signed' }[ct.status || 'draft']}</span></div><div class="bd stack">
      <div class="seg" role="group" aria-label="Agreement status">${['draft', 'sent', 'signed'].map((s) => `<button data-act="contract" data-s="${s}" aria-pressed="${(ct.status || 'draft') === s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>
      ${ct.status === 'signed' ? `<div class="form" style="grid-template-columns:1fr 1fr"><label class="field"><span>Signed by</span><input type="text" id="ct-signer" data-b="contract.signer" value="${esc(ct.signer)}"></label><label class="field"><span>On</span><input type="date" id="ct-date" data-b="contract.signedOn" value="${esc(ct.signedOn)}"></label></div>` : ''}
      <div class="actions"><button class="btn sm" data-act="copyAgreement">Copy text</button>${state.canDownload ? '<button class="btn sm" data-act="dlAgreement">Download</button><button class="btn sm" data-act="dlSchedule">Gear list .csv</button>' : ''}</div>
      <span class="faint small">The agreement rebuilds itself from the quote. Have a New York attorney review the template before the first outside rental.</span></div></div>
    <div class="card"><div class="hd"><h2 class="t">How the gear is covered</h2><span class="pill ${p.ok ? 'good' : 'warn'}">${p.ok ? 'Covered' : 'Not yet'}</span></div><div class="bd stack">
      ${opt('coi', 'Insurance certificate', `The client's policy covers ${money(c.repl)} of rented gear and names you.`, true)}
      ${opt('hold', 'Card hold', `For gear worth up to ${money(num(S.holdMax))} and up to ${plural(num(S.holdMaxDays), 'billed day')}. The replacement value is held on their card.`, c.repl <= num(S.holdMax) && c.billedDays <= num(S.holdMaxDays) || b.protection === 'hold')}
      ${opt('waiver', 'Damage waiver', S.waiverOn ? `${num(S.waiverPct)}% of the gear rental. Caps their liability for accidental damage at ${num(S.waiverCapPct)}% of replacement value.` : 'Switched off in Settings until your own policy backs it.', S.waiverOn || b.protection === 'waiver')}
      <div class="checklist">${p.checks.map((x) => `<div class="${x.ok ? 'ok' : 'bad'}"><span>${esc(x.t)}<span class="sub">${esc(x.have)}</span></span></div>`).join('')}</div>
      ${p.mode === 'coi' ? `<div class="form" style="grid-template-columns:1fr 1fr">
        <label class="field"><span>Status</span><select id="coi-status" data-b="coi.status">${Object.keys(COI_STATUS).map((k) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${COI_STATUS[k]}</option>`).join('')}</select></label>
        <label class="field"><span>Insurer</span><input type="text" id="coi-ins" data-b="coi.insurer" value="${esc(coi.insurer)}"></label>
        <label class="field"><span>Gear limit</span><input type="number" min="0" id="coi-eq" data-b="coi.equipLimit" data-type="num" value="${esc(coi.equipLimit)}"></label>
        <label class="field"><span>Liability per claim</span><input type="number" min="0" id="coi-gl" data-b="coi.glOcc" data-type="num" value="${esc(coi.glOcc)}"></label>
        <label class="field"><span>Expires</span><input type="date" id="coi-exp" data-b="coi.expires" value="${esc(coi.expires)}"></label>
        <label class="field"><span>Policy number</span><input type="text" id="coi-pol" data-b="coi.policy" value="${esc(coi.policy)}"></label>
        <label class="check"><input type="checkbox" id="coi-ai" data-b="coi.ai" data-type="bool" ${coi.ai ? 'checked' : ''}> Additional insured</label>
        <label class="check"><input type="checkbox" id="coi-lp" data-b="coi.lp" data-type="bool" ${coi.lp ? 'checked' : ''}> Loss payee</label></div>
        ${p.checks.every((x) => x.ok) && p.status !== 'verified' ? '<button class="btn dark" data-act="coiStatus" data-s="verified">Everything checks out · mark verified</button>' : ''}
        <details><summary class="small" style="cursor:pointer;font-weight:600">The request to send their broker</summary><div class="stack" style="margin-top:10px"><pre class="letter">${esc(coiRequestText(b))}</pre><div class="actions"><button class="btn sm" data-act="copyCoi">Copy</button>${p.status === 'none' ? '<button class="btn sm dark" data-act="coiStatus" data-s="requested">Mark requested</button>' : ''}</div></div></details>`
        : p.mode === 'hold' ? `<label class="check"><input type="checkbox" id="hold-placed" data-b="hold.placed" data-type="bool" ${b.hold && b.hold.placed ? 'checked' : ''}> Hold of ${money(c.repl)} placed on the client's card</label>`
        : `<label class="check"><input type="checkbox" id="waiver-ok" data-b="waiver.accepted" data-type="bool" ${b.waiver && b.waiver.accepted ? 'checked' : ''}> Client accepted the waiver terms in the agreement</label>`}
    </div></div>
    <div class="card"><div class="hd"><h2 class="t">Sales tax</h2><span class="pill ${!t.exempt ? '' : t.cert ? 'good' : 'warn'}">${!t.exempt ? `Charging ${pctTxt(S.salesTaxPct)}` : t.cert ? 'Exempt · certificate on file' : 'Exempt · certificate missing'}</span></div><div class="bd stack">
      <label class="check"><input type="checkbox" id="tax-ex" data-b="tax.exempt" data-type="bool" ${t.exempt ? 'checked' : ''}><span>The client is making a film for sale and claims the exemption</span></label>
      ${t.exempt ? `<label class="check"><input type="checkbox" id="tax-cert" data-b="tax.cert" data-type="bool" ${t.cert ? 'checked' : ''}><span>Their Form ST-121 is on file</span></label>` : ''}
      <span class="faint small">New York lets productions rent gear tax-free when it is used directly and mostly to make a film for sale. Keep their ST-121 on file.</span></div></div>
    ${fifa.length ? `<div class="note">Crew agreements are separate. ${fifa.map((x) => esc(x.role)).join(', ')} ${fifa.length === 1 ? 'crosses' : 'cross'} $800 on this job, so New York needs a written contract.</div>` : ''}
  </aside></div>`;
}

/* ---------- Handoff ---------- */
function bHandoff(b) {
  const co = b.checkout || { out: {}, back: {}, notes: {} }; const lines = includedLines(b); const pw = paperwork(b);
  const outAll = lines.every((l) => co.out && co.out[l.id]); const backAll = lines.every((l) => co.back && co.back[l.id]);
  const blockers = []; if (pw.contract !== 'signed') blockers.push('The agreement is not signed.'); if (!pw.protectionOk) blockers.push('The gear is not covered yet.'); if (!pw.taxOk) blockers.push('The tax certificate is missing.');
  const late = b.returnDate ? Math.max(0, diffDays(b.returnDate, todayStr())) : 0; const dayRate = chosen(b).dayRate;
  const canOut = ['quoted', 'confirmed'].includes(b.status); const canIn = b.status === 'out'; const h = b.handoff || {};
  return `<div class="split"><div class="card"><div class="hd"><h2 class="t">Check-out sheet</h2><span class="muted small">${plural(lines.length, 'item')} · ${BUDGET[b.budget || 'A'].name}</span></div>
    <div class="bd flush">${lines.length ? lines.map((l) => { const it = state.cat.byId[l.id] || { name: l.id, cat: 'Kit' }; return `<div class="gear-row">${tile(it.cat, true)}<div class="grow"><div class="ttl">${esc(it.name)}${num(l.qty) > 1 ? ` <span class="muted">× ${num(l.qty)}</span>` : ''}</div><div class="sub">${esc(it.kit || it.cat)}</div></div>
      <div class="ctl"><label class="check small"><input type="checkbox" data-co="out" data-k="${esc(l.id)}" ${co.out && co.out[l.id] ? 'checked' : ''} ${state.readOnly ? 'disabled' : ''}> Out</label>
        <label class="check small"><input type="checkbox" data-co="back" data-k="${esc(l.id)}" ${co.back && co.back[l.id] ? 'checked' : ''} ${state.readOnly || !['out', 'returned', 'closed'].includes(b.status) ? 'disabled' : ''}> Back</label>
        <input type="text" data-conote="${esc(l.id)}" value="${esc(co.notes && co.notes[l.id])}" placeholder="Condition notes" aria-label="Notes for ${esc(it.name)}" style="width:200px"></div></div>`; }).join('')
      : '<div class="empty"><b>Nothing to hand over</b><span>Add gear on the Plan tab.</span></div>'}</div></div>
  <aside class="stack sticky"><div class="card"><div class="hd"><h2 class="t">${canIn ? 'Coming back' : 'Going out'}</h2></div><div class="bd stack">
    <span class="small">${icon(h.out === 'delivery' ? 'truck' : h.out === 'afterhours' ? 'moon' : 'store', 15)} Out: ${HANDOFF[h.out || 'pickup']} · ${esc(fmtDay(b.pickup))} ${esc(fmtTime(b.pickupTime))}<br>${icon(h.back === 'delivery' ? 'truck' : h.back === 'afterhours' ? 'moon' : 'store', 15)} Back: ${HANDOFF[h.back || 'pickup']} · ${esc(fmtDay(b.returnDate))} ${esc(fmtTime(b.returnTime))}</span>
    ${b.prepDate ? `<span class="small">Prep visit ${esc(fmtDay(b.prepDate))}</span>` : ''}
    ${co.outAt ? `<span class="small muted">Went out ${esc(fmtStamp(co.outAt))} with ${who(co.outBy)}.</span>` : ''}
    ${co.inAt ? `<span class="small muted">Came back ${esc(fmtStamp(co.inAt))} with ${who(co.inBy)}.</span>` : ''}
    ${canOut ? `${blockers.length ? `<div class="note bad">${blockers.map(esc).join(' ')} Gear doesn't leave until it's covered.</div><label class="check small"><input type="checkbox" id="co-override" data-b="checkout.override" data-type="bool" ${co.override ? 'checked' : ''}> Release anyway, and say why in the notes</label>` : '<div class="checklist"><div class="ok">Agreement signed</div><div class="ok">Gear covered</div></div>'}
      <button class="btn grad" data-act="checkOut" ${(blockers.length && !co.override) || !lines.length ? 'disabled' : ''}>Mark as out${outAll ? '' : ` (${lines.filter((l) => !(co.out && co.out[l.id])).length} unticked)`}</button>` : ''}
    ${canIn ? `${late ? `<div class="note bad">${plural(late, 'day')} late. At the full day rate that's ${money(late * dayRate)}.</div>` : ''}<button class="btn grad" data-act="checkIn">Mark as back${backAll ? '' : ` (${lines.filter((l) => !(co.back && co.back[l.id])).length} not ticked)`}</button>` : ''}
    ${!canOut && !canIn ? `<span class="muted small">${b.status === 'request' ? 'Quote and confirm the job first.' : 'This job is ' + STATUS[b.status].label.toLowerCase() + '.'}</span>` : ''}
    ${b.late && b.late.days ? `<dl class="kv"><dt>Late return charge</dt><dd>${money(b.late.fee)}</dd></dl>` : ''}
    <div class="form" style="grid-template-columns:1fr 1fr"><label class="field"><span>Deposit</span><select id="dep" data-b="deposit.status"><option value="none" ${pw.deposit !== 'received' ? 'selected' : ''}>Not in</option><option value="received" ${pw.deposit === 'received' ? 'selected' : ''}>Received</option></select></label>
    <label class="field"><span>Balance</span><select id="bal" data-b="payment"><option value="unpaid" ${b.payment !== 'paid' ? 'selected' : ''}>Unpaid</option><option value="paid" ${b.payment === 'paid' ? 'selected' : ''}>Paid</option></select></label></div>
  </div></div></aside></div>`;
}

/* ---------- Gear ---------- */
function invFiltered() {
  const f = state.inv; const q = f.q.trim().toLowerCase();
  return state.cat.items.filter((i) => (f.cat === 'all' || i.cat === f.cat) && (f.own === 'all' || i.own === f.own) && (!f.flag || hasQuestion(i.id))
    && (!q || i.id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || (i.kit || '').toLowerCase().includes(q)));
}
function availPill(it, from, to) {
  if (!from || !to || from > to || !it.qty) return '';
  const u = usage(it.id, from, to); const free = it.qty - u.firm;
  return free <= 0 ? '<span class="pill bad">Booked</span>' : free < it.qty ? `<span class="pill warn">${free} of ${it.qty} free</span>` : `<span class="pill good">Free${u.tent ? ', on hold' : ''}</span>`;
}
function gcard(i) {
  const f = state.inv;
  return `<button class="gcard" data-act="item" data-id="${i.id}"><div class="row between">${tile(i.cat)}${availPill(i, f.from, f.to) || (hasQuestion(i.id) ? '<span class="pill warn">To confirm</span>' : '')}</div>
    <div><h3>${esc(i.name)}</h3><div class="muted small">${i.qty > 1 ? `${i.qty} in the pool` : i.qty === 0 ? 'Not itemized yet' : 'One in the pool'}${i.kit ? ' · ' + esc(i.kit) : ''}</div></div>
    <div class="foot2">${i.rec != null ? `<span class="price">${money(i.rec)}<small> /day${perLens(i) ? ' per lens' : ''}</small></span>` : `<span class="muted small">${i.cat === 'Consumable' ? 'Billed at cost' : 'Included in the kit rate'}</span>`}${ownerTag(i.own)}</div></button>`;
}
function vInventory() {
  const f = state.inv; const rows = invFiltered(); const cats = CAT_ORDER.filter((c) => state.cat.items.some((i) => i.cat === c));
  const groups = CAT_ORDER.map((c) => [c, rows.filter((i) => i.cat === c)]).filter(([, l]) => l.length);
  return `<section class="view">
    ${hero(`${state.cat.items.length} pieces across three kits`, 'The <em class="s">gear</em>', 'Everything the pool owns, with the day rate to quote. Tap anything for the details.')}
    <div class="card"><div class="bd stack">
      <div class="form"><label class="field"><span>Search</span><input type="search" id="inv-q" data-inv="q" value="${esc(f.q)}" placeholder="Try “C-stand” or “Ronin”"></label>
        <label class="field"><span>Free from</span><input type="date" id="inv-from" data-inv="from" value="${esc(f.from)}"></label><label class="field"><span>Until</span><input type="date" id="inv-to" data-inv="to" value="${esc(f.to)}"></label></div>
      <div class="chips"><button class="chip" data-act="invCat" data-v="all" aria-pressed="${f.cat === 'all'}">Everything</button>${cats.map((c) => `<button class="chip" data-act="invCat" data-v="${c}" aria-pressed="${f.cat === c}">${icon(CAT_ICON[c], 14)} ${CAT_LABEL[c]}</button>`).join('')}</div>
      <div class="row between wrap"><div class="chips"><button class="chip" data-act="invOwn" data-v="all" aria-pressed="${f.own === 'all'}">All owners</button>${OWN.map((o) => `<button class="chip" data-act="invOwn" data-v="${o}" aria-pressed="${f.own === o}"><span class="dot ${o}"></span>${esc(OWNERS[o].name)}</button>`).join('')}${OPEN.length || DATA_CHECKS.length ? `<button class="chip" data-act="invFlag" aria-pressed="${f.flag}">Details to confirm</button>` : ''}</div>
        <div class="seg" role="group" aria-label="View"><button data-act="invView" data-v="grid" aria-pressed="${f.view !== 'list'}">Cards</button><button data-act="invView" data-v="list" aria-pressed="${f.view === 'list'}">List</button></div></div>
    </div></div>
    ${previewNote('Owner names, what each piece is worth, its market price range and the notes behind each rate are hidden in the public preview. Day rates and quantities are real.')}
    <div id="invBody">${invBody(rows, groups)}</div>
  </section>`;
}
function invBody(rows, groups) {
  const f = state.inv;
  if (!rows.length) return '<div class="card"><div class="empty"><b>Nothing matches</b><span>Try another word or clear the filters.</span></div></div>';
  if (f.view === 'list') return `<div class="card tbl"><table class="plain"><thead><tr><th>Item</th><th>Owner</th><th class="n">Qty</th><th class="n">Day rate</th>${f.from && f.to ? '<th>These dates</th>' : ''}</tr></thead><tbody>${rows.map((i) => `<tr class="click" data-act="item" data-id="${i.id}" tabindex="0"><td><div class="row">${tile(i.cat, true)}<span>${esc(i.name)}</span></div></td><td>${ownerTag(i.own)}</td><td class="n">${i.qty}</td><td class="n">${i.rec == null ? '—' : money(i.rec)}</td>${f.from && f.to ? `<td>${availPill(i, f.from, f.to)}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  return groups.map(([c, list]) => `<div class="sec-h">${tile(c, true)}<h2>${CAT_LABEL[c]}</h2><span class="muted small">${list.length}</span></div><div class="gear-grid">${list.map(gcard).join('')}</div>`).join('');
}

/* ---------- Kits ---------- */
function crewFor(pid) { const role = OPERATOR_FOR[pid]; const l = role && state.cat.labor.find((x) => x.role === role); return l ? { role, rate: l.rec } : null; }
function vPackages() {
  const pctP = num(state.settings.possessionPct, 50) / 100;
  return `<section class="view">
    ${hero('Ready to go', 'Kits that <em class="s">work together</em>', 'Each kit reprices itself when a piece inside it changes. Quote one as-is, or add the person who runs it.')}
    <div class="grid3">${state.cat.packages.map((p) => { const op = crewFor(p.id); return `<article class="card kit"><div class="row between">${tile('Kit')}<span class="pill">${plural(p.ids.length, 'piece')}</span></div>
      <div><h3>${esc(p.name)}</h3><p class="muted small" style="margin:6px 0 0">${esc(p.contents)}</p></div>
      <div class="mid">${money(p.day)}<span class="muted small" style="font-family:var(--body);font-weight:500"> /day</span></div>
      <div class="ladder">${[[1, '1 day'], [2, '2 days'], [3, '3 days'], [5, 'A week']].map(([d, l]) => `<div><span>${l}</span><b>${money(p.day * weekFactor(d))}</b></div>`).join('')}</div>
      <dl class="kv"><dt>Held, not shooting</dt><dd>${money(p.day * pctP)}/day</dd>${op ? `<dt>With a ${esc(op.role)}</dt><dd>+${money(op.rate)}/day</dd>` : ''}</dl>
      ${p.missing.length ? `<div class="note bad">Not on the gear list: ${p.missing.map(esc).join(', ')}. Priced at zero.</div>` : ''}
      ${DATA_CHECKS.filter((d) => p.ids.includes(d.id)).map((d) => `<div class="note">${esc(d.title)} affects this price. See Roadmap.</div>`).join('')}
      <div class="actions"><button class="btn dark sm" data-act="quotePkg" data-id="${p.id}">Quote this kit</button>${op ? `<button class="btn sm" data-act="quotePkg" data-id="${p.id}" data-crew="1">With a ${esc(op.role.split(' /')[0])}</button>` : ''}</div></article>`; }).join('')}</div>
    <div class="card"><div class="hd"><h2 class="t">How longer rentals are priced</h2></div><div class="bd grid3">
      <div><b>Film week</b><p class="muted small" style="margin:4px 0 0">2 days bill as 1.85, 3 days as 2.5, and 4 to 7 days as 3. Each extra week adds 2.5.</p></div>
      <div><b>Weekend special</b><p class="muted small" style="margin:4px 0 0">${state.settings.weekendSpecial ? 'Out Friday (or Thursday from 3 pm), back Monday by 10:30 am: billed as one day.' : 'Switched off in Settings.'}</p></div>
      <div><b>Hold days</b><p class="muted small" style="margin:4px 0 0">Days the gear is out but not shooting bill at ${num(state.settings.possessionPct)}%, always as their own line.</p></div></div></div>
  </section>`;
}

/* ---------- Gear fund ---------- */
function vFund() {
  const f = fundTotals(); const S = state.settings; const nx = f.next;
  const p = nx && nx.cost ? Math.max(0, Math.min(100, f.balance / nx.cost * 100)) : 0;
  const togo = nx ? Math.max(0, nx.cost - f.balance) : 0;
  const jobsLeft = nx && f.avg ? Math.ceil(togo / f.avg) : 0;
  const earned = state.bookings.filter((b) => EARNED.has(b.status));
  let n = 0; const LIMIT = 8;
  const open = f.queue.filter((x) => !x.bought); const shown = state.fundShowAll ? f.queue : f.queue.filter((x) => !x.bought).slice(0, LIMIT);
  return `<section class="view">
    ${hero('Growing the pool', 'The gear <em class="s">fund</em>', `${num(S.fundPct)}% of every job's gear rental is set aside to buy the next thing on the list. Crew pay, tax and expendables are never touched.`)}
    <div class="fund-hero">
      <div class="card glow"><div class="bd row wrap" style="gap:24px;align-items:center;padding:24px">
        <div class="ring" style="--p:${p.toFixed(1)}"><div><b>${Math.round(p)}%</b><span>of the next buy</span></div></div>
        <div class="grow stack" style="gap:6px">${nx ? `<span class="eyebrow" style="margin:0">Next up</span><h2 style="font-size:26px">${esc(nx.name)}</h2><span class="muted">${money(nx.cost)} used${togo ? ` · ${money(togo)} to go${jobsLeft ? `, about ${plural(jobsLeft, 'more job')} like the ones so far` : ''}` : ' · ready to buy'}</span>${togo === 0 ? `<div class="actions"><button class="btn grad sm" data-act="fundBuy" data-k="${esc(nx.key)}">Mark it bought</button></div>` : ''}`
          : `<h2 style="font-size:24px">${f.queue.length ? 'Everything on the list is bought' : 'Nothing on the list yet'}</h2><span class="muted">Add the next thing you want below.</span>`}</div></div></div>
      <div class="card"><div class="bd stack">
        <dl class="kv" style="font-size:15px"><dt>In the fund now</dt><dd><b>${money(f.balance)}</b></dd><dt>From jobs that are back or paid</dt><dd>${money(f.banked)}</dd><dt>On the way from confirmed jobs</dt><dd>${money(f.pledged)}</dd><dt>Spent on gear</dt><dd>${money(f.spent)}</dd></dl>
        <label class="field"><span>Share of each job's gear rental</span><div class="row"><input type="range" min="0" max="40" step="1" id="fund-pct" data-s="fundPct" value="${num(S.fundPct)}" style="flex:1;accent-color:var(--accent)"><b class="num" style="min-width:44px;text-align:right">${num(S.fundPct)}%</b></div><small>Locked into each job when it's confirmed, so changing it never rewrites old jobs.</small></label>
      </div></div>
    </div>
    <div class="card"><div class="hd"><h2 class="t">The buying list</h2><span class="muted small">Bought in this order. Move anything up.</span></div><div class="bd flush">
      ${f.queue.length ? shown.map((x) => { const isNext = nx && x.key === nx.key; if (!x.bought) n++; return `<div class="q-item ${isNext ? 'next' : ''} ${x.bought ? 'done' : ''}"><span class="q-no">${x.bought ? icon('check', 15) : n}</span>
        <div class="grow"><div class="ttl" style="font-weight:600">${esc(x.name)}</div><div class="sub muted small">${x.custom ? 'Added here' : `Phase ${x.phase} · ${esc(x.dept)}`}${x.why ? ' · ' + esc(x.why) : ''}${x.bought ? ` · bought for ${money(num(x.bought.price))} on ${esc(fmtDay(x.bought.date))}` : ''}</div></div>
        <div class="ctl"><b class="num">${money(x.cost)}</b>${x.bought ? `<button class="btn ghost sm" data-act="fundUnbuy" data-k="${esc(x.key)}">Undo</button>` : `<button class="btn icon" data-act="fundUp" data-k="${esc(x.key)}" aria-label="Move up">${icon('up', 15)}</button><input type="number" min="0" data-buyprice="${esc(x.key)}" value="${esc(state.buyPrice[x.key] != null ? state.buyPrice[x.key] : x.cost)}" aria-label="Price paid"><button class="btn sm" data-act="fundBuy" data-k="${esc(x.key)}">Bought</button>`}${x.custom && !x.bought ? `<button class="x" data-act="fundRemove" data-k="${esc(x.key)}" aria-label="Remove">×</button>` : ''}</div></div>`; }).join('')
        : PREVIEW ? `<div class="bd">${previewNote('The pool\u2019s buying list, its Missing Gear plan with prices, is hidden in the public preview. Add a few things below to see how the fund works.')}</div>` : '<div class="empty"><b>The buying list is empty</b><span>It comes from the Missing Gear tab of the full rate card. You can also add things here.</span></div>'}
      ${f.queue.length > shown.length || state.fundShowAll ? `<div class="bd" style="padding-top:8px;padding-bottom:8px"><button class="btn ghost sm" data-act="fundAll">${state.fundShowAll ? 'Show just what\u2019s next' : `Show all ${f.queue.length}${f.queue.length - open.length ? `, including ${f.queue.length - open.length} bought` : ''}`}</button></div>` : ''}
    </div><div class="bd" style="border-top:1px solid var(--line)"><div class="row wrap" style="gap:10px"><input type="text" id="fund-name" data-fund="name" value="${esc(state.fundAdd.name)}" placeholder="Add something to buy" style="flex:2;min-width:180px"><input type="number" min="0" id="fund-cost" data-fund="cost" value="${esc(state.fundAdd.cost)}" placeholder="Cost" style="flex:1;min-width:100px"><button class="btn dark" data-act="fundAdd">${icon('plus', 14)} Add</button></div></div></div>
    <div class="card"><div class="hd"><h2 class="t">Payouts</h2><span class="muted small">Confirmed jobs onward, after the fund's share</span></div><div class="bd flush">${state.dbState !== 'ready' ? dbGate('jobs') : earned.length ? `<div class="tbl"><table class="plain"><thead><tr><th>Job</th>${OWN.map((o) => `<th class="n">${esc(OWNERS[o].short)}</th>`).join('')}<th class="n">Gear fund</th></tr></thead><tbody>${earned.map((b) => { const c = chosen(b); return `<tr class="click" data-act="openBooking" data-id="${b.id}" tabindex="0"><td><b>${esc(b.project || b.ref)}</b><div class="muted small">${esc(fmtDay(b.pickup))} · ${STATUS[b.status].label}</div></td>${OWN.map((o) => `<td class="n">${money(c.own[o].net)}</td>`).join('')}<td class="n">${money(c.fund)}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><b>No confirmed jobs yet</b><span>Payouts appear once a job is confirmed.</span></div>'}</div></div>
  </section>`;
}

/* ---------- Insurance ---------- */
function vInsurance() {
  const S = state.settings; const items = state.cat.items.filter((i) => i.qty > 0); const t = todayStr();
  const total = sum(items, (i) => (i.resale || 0) * i.qty);
  const insQ = OPEN.find((o) => o[1] === 'Insurance');
  const active = state.bookings.filter((b) => HOLDS.has(b.status) && b.returnDate >= addDays(t, -1)).sort((a, b) => a.pickup.localeCompare(b.pickup));
  return `<section class="view">
    ${hero('Two sides of cover', 'Keeping the gear <em class="s">safe</em>', 'How renters cover what they borrow, and the list your own insurer needs.', state.canDownload ? '<button class="btn dark" data-act="dlPoolSchedule">Download the gear schedule</button>' : '')}
    ${insQ ? `<div class="note bad"><b>Still open:</b> ${esc(insQ[4])}. ${esc(insQ[5])}</div>` : ''}
    <div class="grid3">
      <div class="card"><div class="bd stack">${tile('Kit')}<h3 class="t">Insurance certificate</h3><p class="muted small" style="margin:0">The standard. Their policy covers rented gear for its full replacement value, plus ${money(num(S.glOcc))} general liability, and names you as additional insured and loss payee.</p></div></div>
      <div class="card"><div class="bd stack">${tile('Power')}<h3 class="t">Card hold</h3><p class="muted small" style="margin:0">For smaller jobs: gear worth up to ${money(num(S.holdMax))}, up to ${plural(num(S.holdMaxDays), 'billed day')}. The replacement value is held on their card and released when everything is back.</p></div></div>
      <div class="card"><div class="bd stack">${tile('Electric')}<h3 class="t">Damage waiver ${S.waiverOn ? '<span class="pill good">On</span>' : '<span class="pill">Off</span>'}</h3><p class="muted small" style="margin:0">${num(S.waiverPct)}% of the gear rental caps their liability for accidental damage at ${num(S.waiverCapPct)}% of replacement value. Theft and loss aren't covered. Leave it off until your own policy backs the rest.</p></div></div>
    </div>
    <div class="grid2">
      <div class="card"><div class="hd"><h2 class="t">Your gear schedule</h2><span class="muted small">${total ? money(total) + ' · ' : ''}${items.length} lines</span></div><div class="bd stack">
        ${total ? `<div class="tbl"><table class="plain"><thead><tr><th>Owner</th><th class="n">Lines</th><th class="n">Value</th></tr></thead><tbody>${OWN.map((o) => { const mine = items.filter((i) => i.own === o); return `<tr><td>${ownerTag(o, true)}</td><td class="n">${mine.length}</td><td class="n">${money(sum(mine, (i) => (i.resale || 0) * i.qty))}</td></tr>`; }).join('')}<tr class="total"><td>Everything</td><td class="n">${items.length}</td><td class="n">${money(total)}</td></tr></tbody></table></div>` : (PREVIEW ? previewNote('What each piece is worth is hidden in the public preview, so the schedule has no values here. The download lists every piece without them.') : '<div class="note">This copy of the rate card has no resale values. The full rate card fills in the schedule.</div>')}
        <span class="muted small">The download has an empty serial-number column. Insurers ask for serials on anything over about $500. Kit parts carry no value of their own so nothing is insured twice.</span></div></div>
      <div class="card"><div class="hd"><h2 class="t">Renters right now</h2></div><div class="bd flush">${state.dbState !== 'ready' ? dbGate('jobs') : active.length ? active.map((b) => { const p = protectionState(b); return `<div class="li click" data-act="openBooking" data-id="${b.id}" data-tab="paperwork" tabindex="0"><div class="grow"><div class="ttl">${esc(b.project || b.ref)}</div><div class="sub">Goes out ${esc(fmtDay(b.pickup))} · ${money(chosen(b).repl)} of gear · ${{ coi: 'certificate', hold: 'card hold', waiver: 'waiver' }[p.mode]}</div></div><span class="pill ${p.ok ? 'good' : 'warn'}">${p.ok ? 'Covered' : 'Not yet'}</span></div>`; }).join('') : '<div class="empty"><b>No active jobs</b></div>'}</div></div>
    </div>
  </section>`;
}

/* ---------- Storefront ---------- */
function storeItems(group) {
  const g = STORE_GROUPS.find((x) => x.key === group);
  return state.cat.items.filter((i) => g && g.cats && g.cats.includes(i.cat) && i.rec != null && i.qty > 0 && i.kit !== 'Expendables' && !/^Transport/.test(i.notes) && i.id !== 'M-GRP-072');
}
function storeDatesOk() { const f = state.store.form; return f.pickup && f.ret && f.pickup <= f.ret; }
function kitFree(p) { const f = state.store.form; if (!storeDatesOk()) return null; return p.ids.every((id) => { const it = state.cat.byId[id]; return !it || freeOn(id, f.pickup, f.ret) >= Math.max(1, it.qty); }); }
function vStore() {
  const S = state.settings; const st = state.store; const f = st.form; const inCart = (k) => st.cart.some((x) => x.key === k); const dOk = storeDatesOk();
  const wk = dOk && S.weekendSpecial && weekendEligible({ pickup: f.pickup, returnDate: f.ret });
  const cards = st.group === 'packages'
    ? state.cat.packages.map((p) => { const op = crewFor(p.id); const c = st.cart.find((x) => x.key === p.id); const free = kitFree(p); return `<div class="gcard ${c ? 'in' : ''}" style="cursor:default"><div class="row between">${tile('Kit')}${free == null ? '' : free ? '<span class="pill good">Free those dates</span>' : '<span class="pill warn">Partly booked</span>'}</div>
        <div><h3>${esc(p.name)}</h3><div class="muted small">${esc(p.contents)}</div></div>
        ${op ? `<label class="check small"><input type="checkbox" data-storecrew="${p.id}" ${c && c.crew ? 'checked' : ''} ${c ? '' : 'disabled'}> Add a ${esc(op.role)} · +${money(op.rate)}/day</label>` : ''}
        <div class="foot2"><span class="price">${money(p.day)}<small> /day</small></span><button class="btn sm ${c ? '' : 'dark'}" data-act="cart" data-k="${p.id}">${c ? 'Added' : 'Add'}</button></div></div>`; }).join('')
    : storeItems(st.group).map((i) => `<div class="gcard ${inCart(i.id) ? 'in' : ''}" style="cursor:default"><div class="row between">${tile(i.cat)}${dOk ? availPill(i, f.pickup, f.ret) : ''}</div><div><h3>${esc(i.name)}</h3><div class="muted small">${i.qty > 1 ? `${i.qty} available` : ''}</div></div><div class="foot2"><span class="price">${money(i.rec)}<small> /day${perLens(i) ? ' per lens' : i.qty > 1 ? ' each' : ''}</small></span><button class="btn sm ${inCart(i.id) ? '' : 'dark'}" data-act="cart" data-k="${i.id}">${inCart(i.id) ? 'Added' : 'Add'}</button></div></div>`).join('');
  const est = sum(st.cart, (c) => { const p = state.cat.pkgById[c.key]; const it = state.cat.byId[c.key]; const op = p && c.crew ? crewFor(p.id) : null; return p ? p.day + (op ? op.rate : 0) : it ? (it.rec || 0) * c.qty : 0; });
  const cartRows = st.cart.map((c, n) => { const p = state.cat.pkgById[c.key]; const it = state.cat.byId[c.key]; return `<div class="pick"><span class="muted small">${p ? 'Kit' : ''}</span><span>${esc(p ? p.name : it ? it.name : c.key)}${p && c.crew ? ' <span class="pill info">crewed</span>' : ''}</span><span class="row" style="gap:6px">${p ? '' : `<input type="number" min="1" max="${it ? it.qty : 1}" data-cartqty="${n}" value="${c.qty}" aria-label="Quantity" style="width:60px;padding:6px 8px">`}<button class="x" data-act="uncart" data-i="${n}" aria-label="Remove">×</button></span></div>`; }).join('');
  const repl = sum(st.cart, (c) => { const p = state.cat.pkgById[c.key]; const it = state.cat.byId[c.key]; return p ? p.repl : it ? (it.resale || 0) * c.qty : 0; });
  const holdOk = !repl || repl <= num(S.holdMax);
  const faqs = [
    ['Is there a weekend deal?', S.weekendSpecial ? 'Yes. Pick up Friday (or Thursday from 3 pm) and bring it back Monday by 10:30 am, and you pay for one day.' : 'Not right now. Ask about multi-day rates.'],
    ['Do I need insurance?', `Yes, the gear has to be covered. Send a certificate of insurance for rented equipment naming us, or for orders under ${money(num(S.holdMax))} and ${plural(num(S.holdMaxDays), 'day')} or less, we can hold the value on a card instead.${S.waiverOn ? ` A damage waiver (${num(S.waiverPct)}% of the rental) is also available.` : ''} Short-term production policies can often be bound the same day through a broker.`],
    ['Do you charge sales tax?', `New York sales tax (${pctTxt(S.salesTaxPct)}) applies unless you're making a film for sale and give us a signed Form ST-121. Then it's tax-free.`],
    ['Can you deliver?', `Yes. Delivery is ${money(num(S.deliveryFee))} each way, and after-hours handoffs are ${money(num(S.afterHoursFee))} each way. ${esc(S.hours)}.`],
    ['Can I test the gear first?', 'Yes. Book a free prep visit before pickup to check everything over.'],
    ['Do you have student rates?', num(S.studentPct) ? `Yes, ${num(S.studentPct)}% off gear for students with a current school ID.` : 'Ask us.'],
    ['What if I cancel or run late?', `${S.cancelRule} ${S.lateRule}`],
  ];
  return `<section class="view">
    <div class="note info">A preview of the site clients see. Owners, values and internal notes never show here. Requests land in Jobs.</div>
    <div class="store-hero"><span class="eyebrow" style="color:rgba(243,244,248,.7)">Camera · Lighting · Grip · New York</span><h1>${esc(S.company)}</h1><p>Modern LED lighting, cinema cameras and the crew who run them. Battery-powered kits for places generators can't go.</p>
      <div class="meta"><span>${esc(S.pickup)}</span><span>${esc(S.hours)}</span>${S.email ? `<span>${esc(S.email)}</span>` : ''}${S.afterHoursPhone ? `<span>After hours ${esc(S.afterHoursPhone)}</span>` : ''}</div></div>
    ${S.weekendSpecial ? `<div class="banner">${icon('spark', 18)} <b>Weekend special</b><span>${wk ? 'Your dates qualify: the whole rental bills as one day.' : 'Out Friday, back Monday morning, pay for one day.'}</span></div>` : ''}
    <div class="card"><div class="bd form"><label class="field"><span>Pick up</span><input type="date" id="sf-pickup" data-sf="pickup" value="${esc(f.pickup)}"></label><label class="field"><span>Bring back</span><input type="date" id="sf-ret" data-sf="ret" value="${esc(f.ret)}"></label><label class="field"><span>Shoot days</span><input type="number" min="1" id="sf-sd" data-sf="shootDays" value="${esc(f.shootDays)}"></label></div></div>
    <div class="chips">${STORE_GROUPS.map((g) => `<button class="chip" data-act="storeGroup" data-g="${g.key}" aria-pressed="${st.group === g.key}">${g.label}</button>`).join('')}</div>
    <div class="store-grid"><div class="gear-grid">${cards}</div>
      <aside class="card sticky"><div class="hd"><h2 class="t">Your request</h2><span class="muted small">${st.cart.length ? money(est) + ' /day before tax' : ''}</span></div>
        <div class="bd stack">${st.sent ? `<div class="note good">${esc(st.sent)}</div>` : ''}
          ${st.cart.length ? `<div>${cartRows}</div>` : '<span class="muted small">Add kits or single pieces. You get a written quote with the multi-day rate, cover options and tax worked out.</span>'}
          <div class="form" style="grid-template-columns:1fr 1fr">
            <label class="field"><span>Name</span><input type="text" id="sf-name" data-sf="name" value="${esc(f.name)}"></label><label class="field"><span>Company</span><input type="text" id="sf-comp" data-sf="company" value="${esc(f.company)}"></label>
            <label class="field"><span>Email</span><input type="email" id="sf-email" data-sf="email" value="${esc(f.email)}"></label><label class="field"><span>Phone</span><input type="tel" id="sf-phone" data-sf="phone" value="${esc(f.phone)}"></label>
            <label class="field wide"><span>Project</span><input type="text" id="sf-proj" data-sf="project" value="${esc(f.project)}"></label>
            <label class="field wide"><span>Getting the gear</span><select id="sf-hand" data-sf="handoff">${Object.keys(HANDOFF).map((k) => `<option value="${k}" ${f.handoff === k ? 'selected' : ''}>${k === 'pickup' ? 'I’ll pick it up' : k === 'delivery' ? `Deliver it (${money(num(S.deliveryFee))} each way)` : `After-hours handoff (${money(num(S.afterHoursFee))} each way)`}</option>`).join('')}</select></label>
            <label class="field wide"><span>Covering the gear</span><select id="sf-prot" data-sf="protection"><option value="coi" ${f.protection === 'coi' ? 'selected' : ''}>I'll send an insurance certificate</option>${holdOk ? `<option value="hold" ${f.protection === 'hold' ? 'selected' : ''}>Hold the value on my card</option>` : ''}${S.waiverOn ? `<option value="waiver" ${f.protection === 'waiver' ? 'selected' : ''}>Add the damage waiver</option>` : ''}</select></label>
            ${num(S.studentPct) ? `<label class="check wide small"><input type="checkbox" id="sf-student" data-sf="student" ${f.student ? 'checked' : ''}> I'm a student (${num(S.studentPct)}% off gear)</label>` : ''}
            <label class="check wide small"><input type="checkbox" id="sf-exempt" data-sf="exempt" ${f.exempt ? 'checked' : ''}> We're making a film for sale and will send Form ST-121 (no sales tax)</label>
          </div>
          <button class="btn grad" data-act="sendRequest" ${st.cart.length && state.dbState === 'ready' ? '' : 'disabled'}>Send request</button>
          ${state.dbState !== 'ready' ? '<span class="faint small">Requests need the shared database, which is not available here.</span>' : ''}
        </div></aside></div>
    <div class="card"><div class="hd"><h2 class="t">Good to know</h2></div><div class="bd flush">${faqs.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div>
  </section>`;
}

/* ---------- Roadmap ---------- */
function vRoadmap() {
  const r = state.road; const open = OPEN.filter((o) => r.showClosed || o[0] === 'Open');
  const MISSING = SNAPSHOT.missing || [], GROWTH = SNAPSHOT.growth || [], SEQ = SNAPSHOT.sequence || [], MARKET = SNAPSHOT.market || [];
  if (!OPEN.length && !DATA_CHECKS.length && !MISSING.length && !GROWTH.length && !MARKET.length) {
    return `<section class="view">${hero('Where this goes next', 'The <em class="s">roadmap</em>')}<div class="card"><div class="bd">${PREVIEW ? previewNote('The roadmap is hidden in the public preview: market research, open questions about the gear, the buying list and the three-phase growth plan. It is all in the private version.') : '<div class="empty"><b>No roadmap in this copy</b><span>Open questions, market notes, the buying list and the growth plan come with the full rate card.</span></div>'}</div></div></section>`;
  }
  const bought = (state.fundPlan && state.fundPlan.bought) || {};
  const miss = MISSING.filter((m) => m[5] === r.phase);
  const tally = (ph) => { const rows = MISSING.filter((m) => m[5] === ph && m[2] > 0); const ge = rows.filter((m) => GE.has(m[0])); return { n: rows.length, ge: ge.length, agreed: ge.filter((m) => m[8] === 'Yes' && m[9] === 'Yes').length }; };
  return `<section class="view">
    ${hero('Where this goes next', 'The <em class="s">roadmap</em>', 'Where the market has room, what still needs confirming, what to buy, and when to grow.')}
    ${MARKET.length ? `<div class="card"><div class="hd"><h2 class="t">Room in the market</h2><span class="muted small">From research on NYC rental houses and platforms</span></div><div class="bd flush">${MARKET.map((m) => `<div class="opp"><h3>${esc(m.title)}</h3><p>${esc(m.why)}</p><p class="mv"><b>Move:</b> ${esc(m.move)}</p>${m.sources && m.sources.length ? `<span class="src">${m.sources.map((s) => `<a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(' · ')}</span>` : ''}</div>`).join('')}</div></div>` : ''}
    ${OPEN.length || DATA_CHECKS.length ? `<div class="card"><div class="hd"><h2 class="t">Still to confirm</h2><label class="check small"><input type="checkbox" id="rd-closed" data-road="showClosed" ${r.showClosed ? 'checked' : ''}> Show answered</label></div><div class="bd flush">
      ${DATA_CHECKS.map((d) => `<div class="q"><span class="pill bad">Found here</span><div><b>${esc(d.title)}</b></div><div class="w">${esc(d.text)}</div></div>`).join('')}
      ${open.map((o) => `<div class="q"><span class="pill ${o[0] === 'Closed' ? 'good' : o[1] === 'Blocked' || o[1] === 'Insurance' ? 'bad' : 'warn'}">${esc(o[1])}</span><div><b ${state.cat.byId[o[2]] ? `data-act="item" data-id="${o[2]}" style="cursor:pointer"` : ''}>${esc(o[3])}</b></div><div class="w">${esc(o[4])}. <b>Next:</b> ${esc(o[5])}</div></div>`).join('')}</div></div>` : ''}
    ${GROWTH.length ? `<div class="grid3">${GROWTH.map((g, i) => { const t = tally(i + 1); return `<div class="card"><div class="bd stack" style="gap:8px"><span class="eyebrow" style="margin:0">${esc(g[0])}</span><h3 class="t">${esc(g[1])}</h3><div class="mid">${money(g[3])}</div><span class="muted small">of used gear · ${money(g[2])}/month facility</span><p style="margin:0" class="small">${esc(g[5])}</p><p class="small muted" style="margin:0"><b>When:</b> ${esc(g[6])}</p><span class="small">${t.n} items to buy${t.ge ? ` · ${t.agreed} of ${t.ge} lighting and grip items agreed by ${esc(OWNERS.C.short)} and ${esc(OWNERS.S.short)}` : ''}</span></div></div>`; }).join('')}</div>` : ''}
    ${MISSING.length ? `<div class="card"><div class="hd"><h2 class="t">What to buy</h2><div class="seg" role="group" aria-label="Phase">${[1, 2, 3].map((p) => `<button data-act="phase" data-p="${p}" aria-pressed="${r.phase === p}">Phase ${p}</button>`).join('')}</div></div>
      <div class="tbl"><table class="plain"><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Used</th><th>Picked by</th><th>Status</th></tr></thead><tbody>${miss.map((m) => `<tr><td style="min-width:240px"><b>${esc(m[1])}</b><div class="muted small">${esc(m[6])}</div></td><td class="n">${m[2]}</td><td class="n">${m[2] ? money(m[4]) : '—'}</td><td>${esc(m[7])}</td><td>${bought[slug(m[1])] ? '<span class="pill good">Bought</span>' : m[11] === 'Cut' ? '<span class="pill">Cut</span>' : GE.has(m[0]) ? `<span class="pill ${m[8] === 'Yes' && m[9] === 'Yes' ? 'good' : 'warn'}">${esc(m[11])}</span>` : '<span class="pill">Camera, no sign-off</span>'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${SEQ.length ? `<div class="card"><div class="hd"><h2 class="t">If you only read one list</h2></div><div class="bd"><ol class="seq">${SEQ.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div></div>` : ''}
  </section>`;
}

/* ---------- Settings ---------- */
function vSettings() {
  const S = state.settings; const c = state.cat;
  const fld = (k, label, type, hint, wide) => `<label class="field ${wide ? 'wide' : ''}"><span>${label}</span>${type === 'area' ? `<textarea id="s-${k}" data-s="${k}" rows="2">${esc(S[k])}</textarea>` : `<input type="${type || 'text'}" id="s-${k}" data-s="${k}" value="${esc(S[k])}">`}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const tog = (k, label, hint) => `<label class="check wide"><input type="checkbox" id="s-${k}" data-s="${k}" ${S[k] ? 'checked' : ''}><span>${label}${hint ? `<br><small class="faint">${hint}</small>` : ''}</span></label>`;
  return `<section class="view">
    ${hero(PREVIEW ? 'Saved in this browser only' : 'Shared by everyone who uses the desk', '<em class="s">Settings</em>', 'The details and terms that flow into every quote, agreement and storefront page.')}
    <div class="grid2">
      <div class="card"><div class="hd"><h2 class="t">Company</h2></div><div class="bd form">
        ${fld('company', 'Name clients see')}${fld('legalName', 'Legal entity', 'text', 'Goes on agreements and certificates. Leave blank until the entity exists.')}${fld('email', 'Bookings email', 'email')}${fld('phone', 'Phone', 'tel')}${fld('afterHoursPhone', 'After-hours phone', 'tel')}
        ${fld('address', 'Registered address', 'text', '', true)}${fld('pickup', 'Pickup location', 'text', '', true)}${fld('hours', 'Pickup and return hours', 'text', '', true)}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Pricing</h2></div><div class="bd form">
        ${fld('possessionPct', 'Hold days, % of day rate', 'number')}${fld('depositPct', 'Deposit, % of total', 'number')}${fld('salesTaxPct', 'Sales tax %', 'number', 'NYC combined rate is 8.875%.')}${fld('fundPct', 'Gear fund, % of gear rental', 'number')}
        <label class="field"><span>New jobs price multi-day as</span><select id="s-rateMode" data-s="rateMode"><option value="straight" ${S.rateMode !== 'week' ? 'selected' : ''}>Every day at the day rate</option><option value="week" ${S.rateMode === 'week' ? 'selected' : ''}>Film week</option></select></label>
        ${tog('weekendSpecial', 'Weekend special', 'Out Friday, back Monday by 10:30 am, billed as one day. Most NYC houses offer this.')}
        ${fld('studentPct', 'Student discount %', 'number')}${fld('returningPct', 'Returning-client discount %', 'number')}${fld('referralPct', 'Referral discount %', 'number')}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Handoff</h2></div><div class="bd form">
        ${fld('deliveryFee', 'Delivery, each way', 'number')}${fld('afterHoursFee', 'After-hours handoff, each way', 'number', 'Starting points from NYC houses. Set your own.')}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Covering the gear</h2></div><div class="bd form">
        ${fld('glOcc', 'Renter liability, per claim', 'number')}${fld('glAgg', 'Renter liability, total', 'number')}${fld('holdMax', 'Card hold: gear worth up to', 'number')}${fld('holdMaxDays', 'Card hold: billed days up to', 'number')}
        ${tog('waiverOn', 'Offer a damage waiver', 'You carry the risk above the cap, so switch this on only once your own policy covers it.')}
        ${fld('waiverPct', 'Waiver price, % of gear rental', 'number')}${fld('waiverCapPct', 'Renter pays at most, % of value', 'number')}${fld('waiverMax', 'Waiver: gear worth up to', 'number')}${fld('lossOfUseCap', 'Loss of use cap, days', 'number')}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Terms</h2></div><div class="bd form">
        ${fld('governing', 'Governing law (state)')}${fld('paymentTerms', 'Payment terms', 'area', '', true)}${fld('lateRule', 'Late returns', 'area', '', true)}${fld('cancelRule', 'Cancellations', 'area', '', true)}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Rate card</h2><span class="muted small">${c.source === 'sheet' ? `Synced ${esc(fmtStamp(c.syncedAt))}` : `As of ${esc(fmtLong(c.asOf))}`}</span></div><div class="bd stack">
        <p style="margin:0" class="small">The Google Sheet stays the one place gear is typed in. Syncing reads it with your Google Sheets connection and shares the result with everyone.</p>
        ${SNAPSHOT.sheetId ? `<div class="actions"><button class="btn dark" data-act="sync" ${state.syncing || state.dbState !== 'ready' || !state.mcpReady ? 'disabled' : ''}>${state.syncing ? 'Syncing…' : 'Sync from Google Sheet'}</button>${c.source === 'sheet' ? '<button class="btn" data-act="unsync">Use the built-in copy</button>' : ''}<a class="btn ghost" href="https://docs.google.com/spreadsheets/d/${esc(SNAPSHOT.sheetId)}/edit" target="_blank" rel="noopener">Open the sheet</a></div>` : (PREVIEW ? previewNote('The link to the Google Sheet is hidden in the public preview, so syncing is off. The rate card here is a copy with names, values and notes removed.') : '<span class="muted small">This copy of the rate card is not linked to a Google Sheet.</span>')}
        ${state.syncMsg ? `<div class="note ${/^Synced/.test(state.syncMsg) ? 'good' : 'bad'}">${esc(state.syncMsg)}</div>` : ''}
        ${SNAPSHOT.sheetId && !state.mcpReady ? `<span class="faint small">${HOSTED ? 'Syncing needs the Google Sheets connector, which this view cannot reach.' : 'Syncing works in the claude.ai version of the desk.'}</span>` : ''}</div></div>
    </div>
  </section>`;
}

/* ---------- Drawers ---------- */
function renderDrawer() {
  const host = $('#drawerHost'); const d = state.drawer;
  if (!d) { host.innerHTML = ''; return; }
  if (d.kind === 'pick') { host.innerHTML = pickDrawer(); return; }
  const it = state.cat.byId[d.id]; if (!it) { state.drawer = null; host.innerHTML = ''; return; }
  const t = todayStr(); const u = usage(it.id, t, addDays(t, 60));
  const pk = state.cat.packages.filter((p) => p.ids.includes(it.id));
  const qs = (OPEN_BY_ITEM[it.id] || []).map((o) => ({ t: `${o[1]}: ${o[4]}`, d: o[5] })).concat(DATA_CHECKS.filter((x) => x.id === it.id).map((x) => ({ t: x.title, d: x.text })));
  const targets = state.bookings.filter((b) => ['request', 'quoted', 'confirmed'].includes(b.status));
  host.innerHTML = `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(it.name)}">
    <button class="btn ghost sm close" data-act="closeDrawer">Close</button>
    <div class="row">${tile(it.cat)}<div class="grow"><div class="muted small">${esc(CAT_LABEL[it.cat] || it.cat)}${it.kit ? ' · ' + esc(it.kit) : ''}</div>${ownerTag(it.own, true)}</div></div>
    <h2>${esc(it.name)}</h2>
    ${it.rec != null ? `<div><span class="big">${money(it.rec)}</span><span class="muted"> /day${perLens(it) ? ' per lens' : ''}</span>${it.lo != null && it.hi != null ? `<div class="muted small" style="margin-top:6px">Market runs ${money(it.lo)} to ${money(it.hi)} a day. Quote from this rate and discount on purpose.</div>` : ''}</div>` : `<div class="note">${esc(it.basis || 'Included in the kit rate.')}</div>`}
    <dl class="kv"><dt>In the pool</dt><dd>${it.qty}</dd>${it.resale != null ? `<dt>Worth</dt><dd>${money(it.resale)}${it.qty > 1 ? ` each · ${money(it.resale * it.qty)}` : ''}</dd>` : ''}${it.payback != null ? `<dt>Pays for itself in</dt><dd>${plural(it.payback, 'rental day')}</dd>` : ''}${it.rent ? `<dt>How often it goes out</dt><dd>${esc(it.rent)}</dd>` : ''}${NOMINAL_WATTS[it.id] ? `<dt>Power</dt><dd>${NOMINAL_WATTS[it.id].toLocaleString('en-US')} W nominal</dd>` : ''}<dt>Next 60 days</dt><dd>${u.who.length ? u.who.map((w) => esc(w.b.project || w.b.ref)).join(', ') : 'Free'}</dd><dt>ID</dt><dd class="faint">${esc(it.id)}</dd></dl>
    ${previewNote('Its value, market price range, notes and where the rate came from are hidden in the public preview.')}
    ${qs.map((q) => `<div class="note bad"><b>${esc(q.t)}</b><br>${esc(q.d)}</div>`).join('')}
    ${it.notes && !/^(RATE IS PER LENS\.|Transport, not billed\.)$/.test(it.notes) ? `<div><div class="eyebrow">Notes</div><p style="margin:0">${esc(it.notes)}</p></div>` : ''}
    ${it.basis && it.rec != null ? `<div><div class="eyebrow">Where the rate came from</div><p style="margin:0" class="muted">${esc(it.basis)}</p></div>` : ''}
    ${pk.length ? `<div><div class="eyebrow">In these kits</div><div class="chips">${pk.map((p) => `<span class="pill">${esc(p.name)}</span>`).join('')}</div></div>` : ''}
    ${it.rec != null && it.qty > 0 && state.dbState === 'ready' && !state.readOnly ? `<div class="stack" style="gap:8px"><div class="eyebrow" style="margin:0">Add to a job</div><div class="row"><select id="dr-target" class="grow" aria-label="Job">${targets.map((b) => `<option value="${b.id}">${esc(b.project || b.ref)} · ${esc(fmtDay(b.pickup))}</option>`).join('')}<option value="__new">A new job</option></select><button class="btn dark" data-act="drawerAdd" data-id="${it.id}">Add</button></div></div>` : ''}
  </aside>`;
}
function pickDrawer() {
  const b = state.draft; const p = state.pick; const q = p.q.trim().toLowerCase();
  const cats = CAT_ORDER.filter((c) => c !== 'Consumable' && state.cat.items.some((i) => i.cat === c));
  const list = state.cat.items.filter((i) => i.qty > 0 && i.rec != null && (p.cat === 'all' || i.cat === p.cat) && (!q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || (i.kit || '').toLowerCase().includes(q)));
  const onJob = new Set(((b && b.lines) || []).map((l) => l.id));
  return `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Add gear">
    <button class="btn ghost sm close" data-act="closeDrawer">Done</button>
    <h2>Add gear</h2>
    <input type="search" id="pick-q" data-pickq="1" value="${esc(p.q)}" placeholder="Search the pool" autocomplete="off">
    <div class="chips"><button class="chip" data-act="pickCat" data-v="all" aria-pressed="${p.cat === 'all'}">Everything</button>${cats.map((c) => `<button class="chip" data-act="pickCat" data-v="${c}" aria-pressed="${p.cat === c}">${CAT_LABEL[c]}</button>`).join('')}</div>
    <div id="pickList">${pickList(list, onJob, b)}</div>
  </aside>`;
}
function pickList(list, onJob, b) {
  if (!list.length) return '<div class="empty"><b>Nothing matches</b></div>';
  return list.map((i) => { const free = b ? freeOn(i.id, b.pickup, b.returnDate, b.id) : i.qty; return `<div class="pick">${tile(i.cat, true)}<div class="grow"><div style="font-weight:600">${esc(i.name)}</div><div class="muted small">${money(i.rec)}/day${perLens(i) ? ' per lens' : ''} · ${free <= 0 ? '<span class="flag bad">booked those dates</span>' : `${free} of ${i.qty} free`}</div></div><button class="btn sm ${onJob.has(i.id) ? '' : 'dark'}" data-act="pickAdd" data-id="${i.id}">${onJob.has(i.id) ? '+1' : 'Add'}</button></div>`; }).join('');
}

/* ================= documents ================= */
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
  const S = state.settings; const c = chosen(b); const rows = scheduleRows(b); const h = b.handoff || {};
  const owner = S.legalName || S.company || 'Owner'; const renter = clientName(b) || 'Renter';
  const tot = { day: sum(rows, (r) => r.day), poss: sum(rows, (r) => r.poss), repl: sum(rows, (r) => r.repl) };
  const where = (m) => m === 'delivery' ? `delivered to ${h.address || 'the address Renter gives'}` : m === 'afterhours' ? 'handed over after hours by arrangement' : `at ${S.pickup || 'the pickup location'}`;
  const prot = protectionState(b);
  const protClause = prot.mode === 'hold'
    ? ['Card hold', `Instead of a certificate of insurance, Renter authorizes a hold of ${money(c.repl)}, the total replacement value on Schedule A, on Renter's credit card before pickup. The hold is released when every item is back complete and undamaged. Renter stays responsible for loss and damage under the next clause, and any amount owed may be charged to the card.`]
    : prot.mode === 'waiver'
    ? ['Damage waiver', `Renter has bought the damage waiver for ${money(c.waiver)} (${num(S.waiverPct)}% of the gear charges). For accidental damage while the gear is in Renter's care, Renter's liability is capped at ${num(S.waiverCapPct)}% of the replacement value of the damaged items. The waiver does not cover theft, loss, items not returned, water or sand damage, sun damage to sensors, or damage from misuse or negligence; for those, the next clause applies in full.`]
    : ['Insurance', `Before pickup, Renter delivers a certificate of insurance showing (a) coverage for rented or leased equipment of at least ${money(c.repl)}, the total replacement value on Schedule A; (b) commercial general liability of at least ${money(num(S.glOcc))} per occurrence and ${money(num(S.glAgg))} aggregate; and (c) ${owner} named as additional insured and loss payee, for a policy period covering the whole rental. Equipment is not released without an accepted certificate. Renter pays any deductible.`];
  const charges = [`gear rental ${money(c.equip)}`, `hold days ${money(c.possession)}`];
  if (c.discount) charges.push(`less a ${discountPct(b)}% ${DISCOUNTS[(b.discount || {}).kind].toLowerCase()} discount of ${money(c.discount)}`);
  charges.push(`crew ${money(c.crew)}`, `expendables at cost ${money(c.exp)}`);
  if (c.handoff) charges.push(`delivery and handoff ${money(c.handoff)}`);
  if (c.waiver) charges.push(`damage waiver ${money(c.waiver)}`);
  charges.push(`sales tax ${money(c.tax)}`);
  const clauses = [
    ['Equipment', `${owner} rents to ${renter} the equipment listed in Schedule A. Schedule A gives each item's day rate, hold-day rate and replacement value. Renter confirms at pickup that the equipment is complete and working, except as noted on the check-out sheet.`],
    ['Rental period', `The rental runs from ${fmtLong(b.pickup)}${b.pickupTime ? ' at ' + fmtTime(b.pickupTime) : ''} (${where(h.out)}) to ${fmtLong(b.returnDate)}${b.returnTime ? ' by ' + fmtTime(b.returnTime) : ''} (${where(h.back)}). It covers ${plural(num(b.shootDays), 'shoot day')} and ${plural(c.weekend ? 0 : num(b.possessionDays), 'hold day')}. A hold day is a day Renter keeps the equipment without shooting, billed at ${num(S.possessionPct)}% of the day rate.${c.weekend ? ' The rental goes out Friday and comes back Monday morning, so the weekend special applies: it bills as one day with no hold days.' : ''}${b.prepDate ? ` Renter may check the equipment at ${S.pickup} on ${fmtLong(b.prepDate)} at no charge.` : ''} The rental ends only when every item is back.`],
    ['Charges', `Charges are itemized, never blended: ${charges.join(', ')}. The total is ${money(c.total)}.${b.rateMode === 'week' && !c.weekend ? ' Multi-day equipment rates follow the film week: 2 days bill 1.85 days, 3 days 2.5, 4 to 7 days 3, and each further week 2.5.' : ''}${c.comp ? ` Items marked on the house on Schedule A (${money(c.comp)} at normal rates) cost nothing but are covered by every other term here.` : ''}${c.crew ? ' Crew are engaged under separate written crew agreements.' : ''}`],
    ['Deposit and payment', `${S.paymentTerms} The deposit is ${num(S.depositPct)}% of the total, ${money(c.total * num(S.depositPct) / 100)}.`],
    protClause,
    ['Sales tax', `New York sales tax (${pctTxt(S.salesTaxPct)}) applies to the rental, hold-day, delivery, waiver, late and expendables charges. ${b.tax && b.tax.exempt ? 'Renter has given, or will give before pickup, an Exempt Use Certificate (Form ST-121) because the equipment is used directly and predominantly in producing a film for sale, so no sales tax is charged. If the certificate is not provided, the tax is due.' : 'Renter may instead give an Exempt Use Certificate (Form ST-121) before pickup if the equipment is used directly and predominantly in producing a film for sale.'}`],
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
  const sched = `<div class="tbl"><table><thead><tr><th>Item</th><th>Owner</th><th class="n">Qty</th><th class="n">Day rate</th><th class="n">Hold day</th><th class="n">Replacement value</th></tr></thead><tbody>${m.rows.map((r) => `<tr><td>${esc(r.name)}${r.comped ? ' <em>(on the house)</em>' : ''}<br><small>${esc(r.id)}</small></td><td>${esc(OWNERS[r.own] ? OWNERS[r.own].name : '')}</td><td class="n">${r.qty}</td><td class="n">${money(r.day)}</td><td class="n">${money(r.poss)}</td><td class="n">${money(r.repl)}</td></tr>`).join('')}<tr class="total"><td colspan="3">Totals</td><td class="n">${money(m.tot.day)}</td><td class="n">${money(m.tot.poss)}</td><td class="n">${money(m.tot.repl)}</td></tr></tbody></table></div>`;
  return `<div class="draft">Draft for review by a New York attorney before first use</div>
    <h2>Equipment Rental Agreement</h2>
    <p>Agreement ${esc(b.ref)} · prepared ${esc(fmtLong(todayStr()))}<br>Between <b>${esc(m.owner)}</b>${m.S.address ? ', ' + esc(m.S.address) : ''}, for the equipment owners named in Schedule A (“Owner”), and <b>${esc(m.renter)}</b>${b.client && b.client.name && b.client.company ? `, attention ${esc(b.client.name)}` : ''} (“Renter”), for ${esc(b.project || 'the production named above')}.</p>
    ${m.clauses.map((cl, i) => `<h3>${i + 1}. ${esc(cl[0])}</h3><p>${esc(cl[1])}</p>`).join('')}
    <h3>Schedule A · Equipment</h3>${sched}
    <div class="sig"><div>For ${esc(m.owner)}<br><br>Name, title, date</div><div>For ${esc(m.renter)}<br><br>Name, title, date</div></div>`;
}
function agreementText(b) {
  const m = agreementModel(b);
  const lines = [`EQUIPMENT RENTAL AGREEMENT ${b.ref}`, 'Draft for review by a New York attorney before first use.', '', `Owner: ${m.owner}${m.S.address ? ', ' + m.S.address : ''}`, `Renter: ${m.renter}${b.client && b.client.name ? ' (' + b.client.name + ')' : ''}`, `Production: ${b.project || ''}`, ''];
  m.clauses.forEach((cl, i) => lines.push(`${i + 1}. ${cl[0].toUpperCase()}`, cl[1], ''));
  lines.push('SCHEDULE A', 'Item | ID | Owner | Qty | Day rate | Hold day | Replacement value');
  m.rows.forEach((r) => lines.push(`${r.name}${r.comped ? ' (on the house)' : ''} | ${r.id} | ${OWNERS[r.own] ? OWNERS[r.own].name : ''} | ${r.qty} | ${money(r.day)} | ${money(r.poss)} | ${money(r.repl)}`));
  lines.push(`TOTALS | | | | ${money(m.tot.day)} | ${money(m.tot.poss)} | ${money(m.tot.repl)}`, '', `For ${m.owner}: ____________________  Date: ________`, `For ${m.renter}: ____________________  Date: ________`);
  return lines.join('\n');
}
function standaloneDoc(title, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font:14px/1.55 Georgia,serif;color:#1b1d20;max-width:820px;margin:40px auto;padding:0 24px}h2{font:700 28px/1.1 Arial,sans-serif}h3{font:700 15px Arial,sans-serif;margin:18px 0 4px}table{width:100%;border-collapse:collapse;font:12.5px Arial,sans-serif}th,td{border-bottom:1px solid #ccc;padding:6px;text-align:left}.n{text-align:right}.total td{font-weight:700;border-top:2px solid #000}.draft{font:600 11px Arial;letter-spacing:.1em;text-transform:uppercase;color:#a05a14}.sig{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px}.sig div{border-top:1px solid #000;padding-top:6px;font:12px Arial}</style></head><body>${inner}</body></html>`;
}
function coiRequestText(b) {
  const S = state.settings; const c = chosen(b); const owner = S.legalName || S.company;
  return `Subject: Certificate of insurance for ${b.project || 'your rental'} (${b.ref})

Hi ${(b.client && b.client.name) || 'there'},

Before pickup on ${fmtLong(b.pickup)}, we need a certificate of insurance from your broker showing:

- Rented or leased equipment (inland marine) coverage of at least ${money(c.repl)}, the replacement value of the gear on this order
- Commercial general liability of ${money(num(S.glOcc))} per occurrence / ${money(num(S.glAgg))} aggregate
- ${owner}${S.address ? ', ' + S.address + ',' : ''} as certificate holder, additional insured and loss payee
- Policy dates covering ${fmtDay(b.pickup)} to ${fmtDay(b.returnDate)}

${S.email ? `Please have your broker send it to ${S.email}.` : 'Please have your broker send it to us by reply.'} If you don't carry a policy, short-term production cover can often be bound the same day through a broker.

Thanks,
${S.company}${S.phone ? '\n' + S.phone : ''}`;
}

/* ================= actions ================= */
const WRITES = new Set(['newBooking', 'quotePkg', 'budget', 'pickAdd', 'qty', 'rmLine', 'addCrew', 'crewPeople', 'rmCrew', 'deleteBooking', 'advance', 'contract', 'coiStatus', 'checkOut', 'checkIn', 'sendRequest', 'drawerAdd', 'sync', 'unsync', 'applyPoss', 'weekendToggle', 'applyReturning', 'fundUp', 'fundBuy', 'fundUnbuy', 'fundAdd', 'fundRemove']);
const ACT = {
  nav(el) { if (state.dirty) flushSave(); state.view = el.dataset.v; state.drawer = null; render(); window.scrollTo(0, 0); },
  openBooking(el) { state.tab = el.dataset.tab || (state.view === 'booking' ? state.tab : 'plan'); openBooking(el.dataset.id); },
  async newBooking() { const b = newBooking(); state.tab = 'plan'; await createBooking(b, true); },
  async quotePkg(el) { const b = newBooking(); addPackageTo(b, el.dataset.id); if (el.dataset.crew) { const op = crewFor(el.dataset.id); if (op) addCrewTo(b, op.role); } state.tab = 'plan'; await createBooking(b, true); },
  tab(el) { state.tab = el.dataset.t; render(); window.scrollTo(0, 0); },
  bkFilter(el) { state.bk.filter = el.dataset.f; render(); },
  calMove(el) { state.cal.start = addDays(state.cal.start, num(el.dataset.n)); render(); },
  calToday() { state.cal.start = mondayOf(todayStr()); render(); },
  invOwn(el) { state.inv.own = el.dataset.v; render(); },
  invCat(el) { state.inv.cat = el.dataset.v; render(); },
  invFlag() { state.inv.flag = !state.inv.flag; render(); },
  invView(el) { state.inv.view = el.dataset.v; render(); },
  item(el) { state.drawer = { kind: 'item', id: el.dataset.id }; renderDrawer(); const c = $('.drawer .close'); if (c) c.focus(); },
  closeDrawer() { const wasPick = state.drawer && state.drawer.kind === 'pick'; state.drawer = null; if (wasPick) render(); else renderDrawer(); },
  openPick() { state.pick = { q: '', cat: 'all' }; state.drawer = { kind: 'pick' }; renderDrawer(); const q = $('#pick-q'); if (q) q.focus(); },
  pickCat(el) { state.pick.cat = el.dataset.v; renderDrawer(); },
  pickAdd(el) { addLineTo(state.draft, el.dataset.id, 1); scheduleSave(0); toast(`Added ${(state.cat.byId[el.dataset.id] || {}).name}.`); const l = $('#pickList'); if (l) { renderDrawer(); } },
  budget(el) { state.draft.budget = el.dataset.t; scheduleSave(0); render(); },
  applyPoss() { state.draft.possessionDays = suggestPossession(state.draft); scheduleSave(0); render(); },
  weekendToggle() { state.draft.weekendOff = !state.draft.weekendOff; scheduleSave(0); render(); },
  applyReturning() { state.draft.discount = { kind: 'returning', pct: num(state.settings.returningPct) }; scheduleSave(0); render(); toast('Returning-client discount applied.'); },
  qty(el) { const ln = state.draft.lines[num(el.dataset.i)]; if (!ln) return; ln.qty = Math.max(1, num(ln.qty) + num(el.dataset.d)); scheduleSave(); render(); },
  rmLine(el) { state.draft.lines.splice(num(el.dataset.i), 1); scheduleSave(0); render(); },
  addCrew() { const role = ($('#crewRole') || {}).value || state.cat.labor[0].role; state.crewRole = role; addCrewTo(state.draft, role); scheduleSave(0); render(); },
  crewPeople(el) { const c = state.draft.crew[num(el.dataset.i)]; if (!c) return; c.people = Math.max(1, num(c.people) + num(el.dataset.d)); scheduleSave(); render(); },
  rmCrew(el) { state.draft.crew.splice(num(el.dataset.i), 1); scheduleSave(0); render(); },
  confirmDelete(el) { state.confirmDelete = el.dataset.v === '1'; render(); },
  async deleteBooking() { const id = state.draft.id; clearTimeout(saveTimer); state.dirty = false; try { await db.collection('bookings').doc(id).delete(); } catch (e) { writeError(e); return; } state.draft = null; state.view = 'bookings'; toast('Job deleted.'); render(); },
  advance(el) {
    const to = el.dataset.to; const b = state.draft;
    if (to === '__handoff') { state.tab = 'handoff'; render(); return; }
    b.status = to; if (to === 'quoted' && !b.quotedAt) b.quotedAt = new Date().toISOString();
    if (to === 'confirmed') { b.confirmedAt = new Date().toISOString(); if (b.fundPct == null) b.fundPct = num(state.settings.fundPct); }
    scheduleSave(0); render(); toast(`${b.project || b.ref} is now ${STATUS[to].label.toLowerCase()}.`);
  },
  contract(el) { const b = state.draft; b.contract = b.contract || {}; b.contract.status = el.dataset.s; if (el.dataset.s === 'sent' && !b.contract.sentAt) b.contract.sentAt = new Date().toISOString(); if (el.dataset.s === 'signed' && !b.contract.signedOn) b.contract.signedOn = todayStr(); scheduleSave(0); render(); },
  coiStatus(el) { const b = state.draft; b.coi = b.coi || {}; b.coi.status = el.dataset.s; if (el.dataset.s === 'requested') b.coi.requestedAt = new Date().toISOString(); scheduleSave(0); render(); },
  checkOut() { const b = state.draft; b.checkout = b.checkout || { out: {}, back: {}, notes: {} }; b.checkout.outAt = new Date().toISOString(); b.checkout.outBy = state.uid || null; if (b.fundPct == null) b.fundPct = num(state.settings.fundPct); b.status = 'out'; scheduleSave(0); render(); toast(`${b.project || b.ref} is out.`); },
  checkIn() { const b = state.draft; const late = Math.max(0, diffDays(b.returnDate, todayStr())); b.checkout.inAt = new Date().toISOString(); b.checkout.inBy = state.uid || null; b.late = late ? { days: late, fee: late * chosen(b).dayRate } : null; b.status = 'returned'; scheduleSave(0); render(); toast(late ? `Back ${plural(late, 'day')} late. The late charge is on the bill.` : `${b.project || b.ref} is back.`); },
  copyAgreement() { copy(agreementText(state.draft), 'Agreement copied.'); },
  copyCoi() { copy(coiRequestText(state.draft), 'Request copied.'); },
  dlAgreement() { const b = state.draft; saveFile(`${b.ref}-rental-agreement.html`, standaloneDoc(`Rental agreement ${b.ref}`, agreementHTML(b))); },
  dlSchedule() { const b = state.draft; const rows = scheduleRows(b); saveFile(`${b.ref}-gear-list.csv`, toCsv([['Item ID', 'Item', 'Owner', 'Qty', 'day_rate', 'possession_rate', 'replacement_value', 'On the house'], ...rows.map((r) => [r.id, r.name, OWNERS[r.own] ? OWNERS[r.own].name : '', r.qty, r.day, r.poss, r.repl, r.comped ? 'yes' : ''])])); },
  dlPoolSchedule() { const rows = state.cat.items.filter((i) => i.qty > 0); saveFile(`equipment-schedule-${todayStr()}.csv`, toCsv([['Item ID', 'Item', 'Category', 'Owner', 'Qty', 'Value each', 'Value total', 'Kit group', 'Serial number', 'Notes'], ...rows.map((i) => [i.id, i.name, i.cat, OWNERS[i.own] ? OWNERS[i.own].name : '', i.qty, i.resale || 0, (i.resale || 0) * i.qty, i.kit, '', i.resale ? '' : 'Value carried by the kit line'])])); },
  storeGroup(el) { state.store.group = el.dataset.g; render(); },
  cart(el) { const k = el.dataset.k; const st = state.store; const i = st.cart.findIndex((c) => c.key === k); if (i >= 0) st.cart.splice(i, 1); else st.cart.push({ key: k, qty: 1, crew: false }); st.sent = ''; render(); },
  uncart(el) { state.store.cart.splice(num(el.dataset.i), 1); render(); },
  async sendRequest() {
    const st = state.store; const f = st.form; const S = state.settings;
    if (!storeDatesOk()) { toast('Pick a pickup date and a return date on or after it.'); return; }
    if (!f.name && !f.company) { toast('Add a name or company so we know who to quote.'); return; }
    const sd = Math.max(1, num(f.shootDays, 1));
    const b = newBooking({ status: 'request', source: 'storefront', project: f.project, client: { name: f.name, company: f.company, email: f.email, phone: f.phone }, pickup: f.pickup, returnDate: f.ret, shootStart: f.pickup < f.ret ? addDays(f.pickup, 1) : f.pickup, shootDays: sd,
      handoff: { out: f.handoff, back: f.handoff, address: '' }, protection: f.protection, discount: f.student ? { kind: 'student', pct: num(S.studentPct) } : { kind: 'none', pct: 0 }, tax: { exempt: !!f.exempt, cert: false } });
    b.possessionDays = suggestPossession(b);
    st.cart.forEach((c) => { const p = state.cat.pkgById[c.key]; if (p) { addPackageTo(b, c.key); if (c.crew) { const op = crewFor(c.key); if (op) addCrewTo(b, op.role); } } else addLineTo(b, c.key, num(c.qty, 1)); });
    b.lines.forEach((l) => (l.days = sd)); (b.crew || []).forEach((c) => (c.days = sd));
    const ok = await createBooking(b, false);
    if (ok) { st.cart = []; st.form = Object.assign({}, st.form, { project: '' }); st.sent = `Thanks. Request ${b.ref} is in, and a quote will follow.`; render(); }
  },
  phase(el) { state.road.phase = num(el.dataset.p, 1); render(); },
  async drawerAdd(el) {
    const target = ($('#dr-target') || {}).value; const id = el.dataset.id; state.drawer = null;
    if (target === '__new' || !target) { const b = newBooking(); addLineTo(b, id, 1); state.tab = 'plan'; await createBooking(b, true); return; }
    if (state.view === 'booking' && state.draft && state.draft.id === target) { addLineTo(state.draft, id, 1); scheduleSave(0); render(); return; }
    const b = clone(state.bookings.find((x) => x.id === target)); addLineTo(b, id, 1);
    try { await db.collection('bookings').doc(b.id).set(b); toast(`Added to ${b.project || b.ref}.`); } catch (e) { writeError(e); }
    renderDrawer();
  },
  fundUp(el) {
    const keys = fundQueue().filter((x) => !x.bought).map((x) => x.key); const i = keys.indexOf(el.dataset.k); if (i <= 0) return;
    [keys[i - 1], keys[i]] = [keys[i], keys[i - 1]]; state.fundPlan.order = keys; saveFundPlan(); render();
  },
  fundBuy(el) {
    const k = el.dataset.k; const x = fundQueue().find((q) => q.key === k); if (!x) return;
    const price = state.buyPrice[k] != null && state.buyPrice[k] !== '' ? num(state.buyPrice[k]) : x.cost;
    state.fundPlan.bought = Object.assign({}, state.fundPlan.bought, { [k]: { price, date: todayStr(), by: state.uid || null } }); saveFundPlan(); render(); toast(`${x.name} marked bought.`);
  },
  fundUnbuy(el) { const b = Object.assign({}, state.fundPlan.bought); delete b[el.dataset.k]; state.fundPlan.bought = b; saveFundPlan(); render(); },
  fundAdd() {
    const n = state.fundAdd.name.trim(); const c = num(state.fundAdd.cost); if (!n || !c) { toast('Give it a name and a cost.'); return; }
    let key = 'x-' + slug(n); if (fundQueue().some((q) => q.key === key)) key += '-' + uid6().slice(0, 3);
    state.fundPlan.extra = (state.fundPlan.extra || []).concat([{ key, name: n, cost: c, phase: 1 }]); state.fundAdd = { name: '', cost: '' }; state.fundShowAll = true; saveFundPlan(); render();
    const pos = fundQueue().filter((q) => !q.bought).findIndex((q) => q.key === key) + 1; toast(`${n} is number ${pos} on the list. Move it up if it should come sooner.`);
  },
  tourGo(el) { state.tour = Math.max(0, Math.min(TOUR.length - 1, num(el.dataset.i))); render(); },
  tourStart() { goStop(0); },
  tourShow() { goStop(state.tour); },
  tourNext() {
    if (!onStop(state.tour)) { goStop(state.tour); return; }
    if (state.tour >= TOUR.length - 1) { state.touring = false; state.view = 'today'; render(); window.scrollTo(0, 0); toast('That is the whole tour. It is on the Start page any time.'); return; }
    goStop(state.tour + 1);
  },
  tourPrev() { if (state.tour === 0) { state.view = 'welcome'; render(); window.scrollTo(0, 0); return; } goStop(state.tour - 1); },
  tourStops() { state.view = 'welcome'; render(); const t = $('#tour'); if (t) t.scrollIntoView({ block: 'start' }); },
  tourEnd() { state.touring = false; render(); toast('Tour ended. Pick it up again from Start.'); },
  tourJump() { const d = $('#tourDock'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  tourJob(el) { const ex = exampleJob(); if (!ex) { toast('There are no jobs yet. Start one with New job.'); state.view = 'bookings'; render(); return; } state.tab = el.dataset.t || 'plan'; openBooking(ex.id); },
  fundAll() { state.fundShowAll = !state.fundShowAll; render(); },
  fundRemove(el) { state.fundPlan.extra = (state.fundPlan.extra || []).filter((x) => x.key !== el.dataset.k); saveFundPlan(); render(); },
  sync() { syncFromSheet(); },
  async unsync() { try { await db.doc('catalog/current').delete(); state.syncMsg = ''; toast('Back on the built-in rate card.'); } catch (e) { writeError(e); } },
};
function copy(text, ok) {
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); let good = false; try { good = document.execCommand('copy'); } catch (_) { good = false; } ta.remove(); toast(good ? ok : 'Copying was blocked here. Select the text and copy it by hand.'); };
  try { navigator.clipboard.writeText(text).then(() => toast(ok), fallback); } catch (_) { fallback(); }
}
function toCsv(rows) { return rows.map((r) => r.map((v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n'); }
async function saveFile(filename, data) {
  if (!downloadsNs) { toast('Downloads are not available here. Use Copy instead.'); return; }
  try { await downloadsNs.save({ filename, data }); toast(`Saved ${filename}.`); }
  catch (e) { const c = e && e.code; if (c === 'declined') return; toast(c === 'rate_limited' ? 'A save prompt is already open.' : 'That file could not be saved here.'); }
}

/* ================= field input ================= */
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach((k) => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }
function fieldVal(el) { if (el.type === 'radio') return el.value; if (el.dataset.type === 'bool' || el.type === 'checkbox') return el.checked; if (el.dataset.type === 'num' || el.type === 'number') return el.value === '' ? '' : num(el.value); return el.value; }
const TEXTY = new Set(['text', 'email', 'tel', 'number', 'search', 'url', 'textarea']);
function onField(e) {
  const el = e.target; const texty = TEXTY.has(el.type) || el.tagName === 'TEXTAREA';
  if (e.type === 'change' && texty) return;
  if (el.type === 'range' && e.type === 'input') { const lbl = el.parentElement && el.parentElement.querySelector('b'); if (lbl) lbl.textContent = el.value + '%'; if (el.dataset.s) { state.settings[el.dataset.s] = num(el.value); saveSettingsSoon(); } return; }
  const full = !texty; const d = state.draft;
  if (el.dataset.b != null && d) {
    if (state.readOnly) { toast('You can look around but not change anything here.'); render(); return; }
    const path = el.dataset.b; const v = fieldVal(el); setPath(d, path, v);
    if (path === 'pickup' && d.pickup) { if (d.returnDate && d.returnDate < d.pickup) d.returnDate = d.pickup; if (d.shootStart && d.shootStart < d.pickup) d.shootStart = d.pickup; }
    if (path === 'shootDays') {
      const prev = num(el.dataset.prev != null ? el.dataset.prev : el.defaultValue); const nv = num(v);
      (d.lines || []).forEach((l) => { if (num(l.days) === prev) l.days = nv; }); (d.crew || []).forEach((c) => { if (num(c.days) === prev) c.days = nv; });
      el.dataset.prev = String(nv);
    }
    if (path === 'discount.kind') { const S = state.settings; const p = { student: S.studentPct, returning: S.returningPct, referral: S.referralPct }[v]; d.discount.pct = p != null ? num(p) : v === 'none' ? 0 : num(d.discount.pct); }
    scheduleSave(); full ? render() : refreshDerived(); return;
  }
  if (el.dataset.line != null && d) { const ln = d.lines[num(el.dataset.line)]; const f = el.dataset.f; if (!ln) return; ln[f] = f === 'comp' ? el.checked : f === 'tier' ? el.value : f === 'rate' ? (el.value === '' ? null : num(el.value)) : num(el.value); scheduleSave(); full ? render() : refreshDerived(); return; }
  if (el.dataset.crew != null && d) { const c = d.crew[num(el.dataset.crew)]; if (!c) return; c[el.dataset.f] = el.dataset.f === 'tier' ? el.value : num(el.value); scheduleSave(); full ? render() : refreshDerived(); return; }
  if (el.dataset.co != null && d) { d.checkout = d.checkout || { out: {}, back: {}, notes: {} }; d.checkout[el.dataset.co] = d.checkout[el.dataset.co] || {}; d.checkout[el.dataset.co][el.dataset.k] = el.checked; scheduleSave(); render(); return; }
  if (el.dataset.conote != null && d) { d.checkout = d.checkout || { out: {}, back: {}, notes: {} }; d.checkout.notes = d.checkout.notes || {}; d.checkout.notes[el.dataset.conote] = el.value; scheduleSave(); return; }
  if (el.dataset.addpkg != null && d && el.value) { addPackageTo(d, el.value); scheduleSave(0); render(); return; }
  if (el.dataset.crewrole != null) { state.crewRole = el.value; return; }
  if (el.dataset.pickq != null) { state.pick.q = el.value; const l = $('#pickList'); if (l) { const b = state.draft; const q = el.value.trim().toLowerCase(); const list = state.cat.items.filter((i) => i.qty > 0 && i.rec != null && (state.pick.cat === 'all' || i.cat === state.pick.cat) && (!q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || (i.kit || '').toLowerCase().includes(q))); l.innerHTML = pickList(list, new Set(((b && b.lines) || []).map((x) => x.id)), b); } return; }
  if (el.dataset.s != null) { const k = el.dataset.s; state.settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' ? num(el.value) : el.value; saveSettingsSoon(); if (full) render(); else renderChrome(); return; }
  if (el.dataset.inv != null) { state.inv[el.dataset.inv] = el.value; if (full) render(); else { const rows = invFiltered(); const groups = CAT_ORDER.map((c) => [c, rows.filter((i) => i.cat === c)]).filter(([, l]) => l.length); const t = $('#invBody'); if (t) t.innerHTML = invBody(rows, groups); } return; }
  if (el.dataset.sf != null) { state.store.form[el.dataset.sf] = el.type === 'checkbox' ? el.checked : el.value; if (full) render(); return; }
  if (el.dataset.storecrew != null) { const c = state.store.cart.find((x) => x.key === el.dataset.storecrew); if (c) c.crew = el.checked; render(); return; }
  if (el.dataset.cartqty != null) { const c = state.store.cart[num(el.dataset.cartqty)]; if (c) c.qty = Math.max(1, num(el.value, 1)); requestRender(); return; }
  if (el.dataset.road != null) { state.road[el.dataset.road] = el.checked; render(); return; }
  if (el.dataset.home != null) { setHomePref(el.checked ? 'today' : 'welcome'); toast(el.checked ? 'The desk will open on Today.' : 'The desk will open on Start.'); return; }
  if (el.dataset.fund != null) { state.fundAdd[el.dataset.fund] = el.value; return; }
  if (el.dataset.buyprice != null) { state.buyPrice[el.dataset.buyprice] = el.value; }
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
    state.syncMsg = `Synced ${rows.length} items, ${packages.length} kits and ${labor.length} crew rates.`;
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
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = ACT[el.dataset.act]; if (!fn) return;
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('tabindex') != null || el.classList.contains('scrim')) e.preventDefault();
    if (state.readOnly && WRITES.has(el.dataset.act)) { toast('You can look around but not change anything here.'); return; }
    fn(el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.drawer) ACT.closeDrawer();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act][tabindex]') && !/^(BUTTON|A|INPUT)$/.test(e.target.tagName)) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
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
        if (!fresh && !state.dirty && !saving && !snap.metadata.hasPendingWrites && !snap.metadata.fromCache) { state.draft = null; state.view = 'bookings'; toast('That job was deleted.'); }
        else if (fresh && !state.dirty && !saving && stable(fresh) !== stable(state.draft)) state.draft = clone(fresh);
      }
      requestRender();
    }, () => { state.dbState = 'error'; requestRender(); });
    d.doc('settings/company').onSnapshot((s) => { if (s.exists && !settingsPending) state.settings = Object.assign({}, DEFAULTS, s.data()); requestRender(); }, () => {});
    d.doc('catalog/current').onSnapshot((s) => { state.catalogDoc = s.exists ? s.data() : null; applyCatalog(); requestRender(); }, () => {});
    d.doc('fund/plan').onSnapshot((s) => { state.fundPlan = Object.assign({ order: [], bought: {}, extra: [] }, s.exists ? s.data() : {}); requestRender(); }, () => {});
  });
}
init();
})();

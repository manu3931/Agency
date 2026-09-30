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
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3M20.5 14v.01M14 20.5h3M20.5 17.5v3h-3"/>',
  doc: '<path d="M6 2.5h8l4 4v15H6z"/><path d="M14 2.5v4h4M9 12h6M9 16h6"/>',
  pen: '<path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14 7l3 3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  logout: '<path d="M15 4h4v16h-4M10 16l4-4-4-4M14 12H4"/>',
};
const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;
const CAT_ICON = { Camera: 'camera', Lens: 'lens', Support: 'support', Media: 'media', Accessory: 'accessory', Sound: 'sound', Electric: 'light', Power: 'power', Grip: 'grip', Consumable: 'tape', Kit: 'box' };
const tile = (cat, sm) => `<span class="icon-tile ${sm ? 'sm' : ''} t-${esc(cat)}">${icon(CAT_ICON[cat] || 'box', sm ? 17 : 21)}</span>`;

/* ================= where the desk is running ================= */
/* claude.ai: the private team copy, shared through the viewer's database. live: the public site with
   Supabase set up in src/config.js, real accounts and payments. preview: the public site without it,
   everything kept in the visitor's own browser, with a switch to look around as an owner or a client. */
const HOSTED = !!(window.claude && typeof window.claude.use === 'function');
const MODE = HOSTED ? 'claude' : window.SGP_LIVE ? 'live' : 'preview';
const LOCAL = !HOSTED && window.SGP_LOCAL && window.SGP_LOCAL.db ? window.SGP_LOCAL : null;
const BE = { mode: MODE, db: null, auth: null, files: null, rpc: null, fn: null, feedUrl: null, siteUrl: '' };
/* Drawers beyond the item and pick lists register themselves here by kind. */
const EXTRA_DRAWERS = {};
const docKey = (id) => String(id).replace(/[^A-Za-z0-9_.@+-]/g, '_').slice(0, 120);

/* ================= constants ================= */
/* Owner names, internal notes and the sheet link come from the rate card file, not the code,
   so the public repo can ship a stripped rate card without touching the app. */
let SNAP = SNAPSHOT;
const ANON_OWNERS = { M: { name: 'Owner M', short: 'M' }, C: { name: 'Owner C', short: 'C' }, S: { name: 'Owner S', short: 'S' } };
let OWNERS = SNAPSHOT.owners || ANON_OWNERS;
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
  payVenmo: '', payZelle: '', payZelleName: '', payCard: MODE === 'preview', payNote: '', autoReturning: true, siteUrl: '',
  lateRule: 'Equipment returned after the agreed return time bills the full day rate for each day or part day it is late.',
  cancelRule: 'Cancel 72 hours or more before pickup: no charge. Within 72 hours: 50% of the equipment total. After pickup: 100%.',
  governing: 'New York',
};
const VIEWS = [
  ['welcome', 'Start', 'play'], ['today', 'Today', 'sun'], ['calendar', 'Schedule', 'calendar'], ['bookings', 'Jobs', 'clap'], ['clients', 'Clients', 'people'], ['inventory', 'Gear', 'light'], ['packages', 'Kits', 'box'],
  ['fund', 'Gear fund', 'fund'], ['money', 'Money', 'chart'], ['insurance', 'Insurance', 'shield'], ['storefront', 'Storefront', 'store'], ['roadmap', 'Roadmap', 'flag'], ['settings', 'Settings', 'cog'],
];
/* What each kind of visitor gets. The team sees the whole desk; clients and visitors see the storefront
   and, once signed in, their own bookings. */
const ROLE_VIEWS = {
  client: [['storefront', 'Rent gear', 'store'], ['mine', 'My bookings', 'clap'], ['account', 'Account', 'user']],
  guest: [['storefront', 'Rent gear', 'store']],
};
const navViews = () => (state.role === 'admin' ? VIEWS : ROLE_VIEWS[state.role] || ROLE_VIEWS.guest);
const allowedView = (v, role) => { role = role || state.role; return role === 'admin' ? v !== 'mine' && v !== 'account' : v === 'storefront' || (role === 'client' && (v === 'mine' || v === 'account')); };
const homeFor = (role) => (role === 'admin' ? homePref() : role === 'client' ? 'mine' : 'storefront');

/* The public GitHub copy ships a stripped rate card marked preview: true. Everything works, but
   names, values, notes, research and the sheet link are left out, and the page says so where it shows. */
/* The public copy ships a stripped rate card. In the preview the page says what is hidden; on the live site the
   team loads the full rate card into the database (Settings), and visitors never see the difference. */
let PREVIEW = !!SNAPSHOT.preview && MODE !== 'live';
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
    how: ['Choose how the gear is covered: an insurance certificate, a card hold or a damage waiver.', 'Send the agreement and the client reads and signs it on their phone. Or copy it and mark it signed yourself.', 'Certificates the client uploads, or keeps on file, tick the checks off.'] },
  { job: 'handoff', icon: 'truck', title: 'Inside a job: Handoff', lead: 'Check-out and check-in, piece by piece.',
    how: ['Scan each label as it goes out and comes back, or tick it by hand, with notes on its condition.', 'Gear is not released until it is covered and the agreement is signed.', 'Payments by card, Venmo and Zelle land here. A late return adds the late fee on its own.'] },
  { view: 'clients', icon: 'people', title: 'Clients', lead: 'Everyone you rent to, with their paperwork on file.', how: ['Returning clients get their discount on their own.', 'Keep each client\u2019s insurance certificate and ST-121 with its expiry date, and use it on any job.', 'Tap a client for their jobs, documents and notes.'] },
  { view: 'calendar', icon: 'calendar', title: 'Schedule', lead: 'Three weeks of jobs on one timeline.', how: ['Solid bars are shoot days. Striped bars are days the gear is out but not shooting.', 'Faded bars are jobs that are not confirmed yet.', 'Put pickups and returns on your own calendar, with a reminder the day before each return.'] },
  { view: 'inventory', icon: 'light', title: 'Gear', lead: 'Everything the pool owns, with the day rate to quote.', how: ['Each type of gear is a section. Open one to see everything in it, or search across all of them.', 'Tap any piece to add photos, serial numbers and what you paid.', 'Print a sheet of QR labels for the whole pool, a section or one piece.'] },
  { view: 'packages', icon: 'box', title: 'Kits', lead: 'Ready-made packages that price themselves.', how: ['Open a kit to see every piece inside it and its price for a day, two, three and a week.', 'Quote a kit on its own, or with the person who runs it.', 'If a piece inside changes price, the kit follows.'] },
  { view: 'fund', icon: 'fund', title: 'Gear fund', lead: 'A share of every job goes toward the next piece of gear.', how: ['Set the share once. Each job locks it in when it is confirmed.', 'The ring shows how close you are to the next buy.', 'Reorder the buying list, add to it, and mark things bought.'] },
  { view: 'money', icon: 'chart', title: 'Money', lead: 'What each piece earns, how often it goes out, and when it pays for itself.', how: ['The last twelve months at a glance, month by month.', 'Each piece shows what it earned against what it cost.', 'It points out what deserves a second one and what sits idle.'] },
  { view: 'insurance', icon: 'shield', title: 'Insurance', lead: 'Both sides of cover in one place.', how: ['See how every upcoming job is covered.', 'Download the gear schedule your own insurer asks for.', 'Card holds and the damage waiver are set up in Settings.'] },
  { view: 'storefront', icon: 'store', title: 'Storefront', lead: 'The page your clients see.', how: ['Clients pick dates, add kits or single pieces with photos, and send a request from their own account.', 'They read the quote, sign the agreement and pay under My bookings.', 'Requests arrive in Jobs, ready to quote.'] },
  { view: 'settings', icon: 'cog', title: 'Settings', lead: 'Your details, prices and terms.', how: ['Company details flow into every agreement.', 'Change fees, discounts, sales tax, the gear fund share and how clients pay.', 'Who is on the team, the calendar link and the rate card sync.'] },
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
let DATA_CHECKS = [], OPEN = [], OPEN_BY_ITEM = {};
function applySnapshotMeta(src) {
  SNAP = src; OWNERS = src.owners || ANON_OWNERS; DATA_CHECKS = src.dataChecks || []; OPEN = src.open || []; OPEN_BY_ITEM = {};
  OPEN.forEach((o) => { if (o[0] === 'Open' && /^[A-Z]-[A-Z]{3}-\d+$/.test(o[2])) (OPEN_BY_ITEM[o[2]] = OPEN_BY_ITEM[o[2]] || []).push(o); });
}
applySnapshotMeta(SNAPSHOT);
const hasQuestion = (id) => !!(OPEN_BY_ITEM[id] || DATA_CHECKS.some((d) => d.id === id));
const perLens = (it) => /RATE IS PER LENS/.test(it.notes || '');

/* ================= state ================= */
function initialRole() { return MODE === 'claude' ? 'admin' : MODE === 'preview' && LOCAL && LOCAL.auth ? LOCAL.auth.role() : 'guest'; }
const state = {
  role: initialRole(), user: null, auth: { mode: 'in', email: '', password: '', name: '', msg: '', tone: '', busy: false, then: null },
  view: homeFor(initialRole()), tour: 0, touring: false, bookingId: null, tab: 'plan', draft: null, dirty: false, confirmDelete: false,
  bookings: [], dbState: 'wait', readOnly: false,
  settings: Object.assign({}, DEFAULTS), catalogDoc: null, cat: buildCatalog(SNAPSHOT),
  fundPlan: { order: [], bought: {}, extra: [] },
  inv: { q: '', own: 'all', flag: false, from: '', to: '', open: {} },
  kitOpen: {},
  bk: { filter: 'active' },
  cal: { start: mondayOf(todayStr()) },
  store: { group: 'packages', cart: [], form: { name: '', company: '', email: '', phone: '', project: '', pickup: '', ret: '', shootDays: 1, handoff: 'pickup', protection: 'coi', student: false, exempt: false }, sent: '' },
  road: { phase: 1, showClosed: false },
  drawer: null, pick: { q: '', cat: 'all' }, fundAdd: { name: '', cost: '' }, buyPrice: {}, crewRole: '',
  uid: null, canWrite: null, canDownload: false, mcpReady: false, syncing: false, syncMsg: '',
  payments: [], photos: {}, gear: {}, clientRecs: {}, team: [], teamAdd: { email: '', name: '' }, privateDoc: null, catalogPublic: null, secrets: {}, holdsPublic: [],
  portal: { id: null }, sign: { name: '', consent: false, drawn: false, busy: false, dataUrl: '' }, upload: {}, profile: null, afterAuth: null, confirmResend: false, pay: { method: '', amount: '', note: '', busy: false, sim: null },
  money: { period: 365 }, payRec: { method: 'venmo', kind: 'deposit', amount: '', note: '' }, holdAmt: '', clientsQ: '', label: { scope: 'all', size: '5160', perUnit: true }, scan: null, pendingRoute: '', photoBusy: '', liveError: '',
};
let db = null, userNs = null, downloadsNs = null, mcpNs = null, assetsNs = null;
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
/* The team sees every job. Clients and visitors only see their own, so availability comes from
   busy_holds instead: dates and gear with no names attached. */
function holdsList() { return state.role === 'admin' || MODE === 'claude' ? state.bookings : state.holdsPublic; }
function usage(itemId, from, to, exceptId) {
  let firm = 0, tent = 0; const who = [];
  holdsList().forEach((b) => {
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

/* ================= payments ================= */
const PAID = new Set(['paid', 'received', 'captured']);
const round2 = (n) => Math.round(num(n) * 100) / 100;
const BILLED = new Set(['quoted', 'confirmed', 'out', 'returned', 'closed']);
function paymentsFor(b) { return state.payments.filter((p) => p.bookingId === b.id).sort((a, c) => String(a.at || '').localeCompare(String(c.at || ''))); }
function paidOn(b) { return round2(sum(paymentsFor(b).filter((p) => PAID.has(p.status) && p.kind !== 'hold'), (p) => (p.kind === 'refund' ? -1 : 1) * num(p.amount))); }
function pendingOn(b) { return round2(sum(paymentsFor(b).filter((p) => p.status === 'reported'), (p) => num(p.amount))); }
/* What the client owes now: the deposit until it is in, then the balance. A deposit or a payment the team
   marked by hand counts even when no payment was recorded against it. */
function amountDue(b) {
  const bill = b.bill || (state.role === 'admin' && BILLED.has(b.status) ? billOf(b) : null); if (!bill || !num(bill.total)) return { kind: 'none', amount: 0, total: 0, paid: 0, pending: 0 };
  let paid = paidOn(b); const deposit = num(bill.deposit); const total = num(bill.total); const pending = pendingOn(b);
  if (b.payment === 'paid') paid = Math.max(paid, total);
  const depIn = (b.deposit && b.deposit.status === 'received') || paid + 0.5 >= deposit;
  if (depIn) paid = Math.max(paid, deposit);
  if (!depIn && ['quoted', 'confirmed'].includes(b.status)) return { kind: 'deposit', amount: round2(deposit - paid), total, paid, pending };
  return { kind: 'balance', amount: Math.max(0, round2(total - paid)), total, paid, pending };
}
const PAY_METHOD = { card: 'card', venmo: 'Venmo', zelle: 'Zelle', cash: 'cash', check: 'check', other: 'other' };
const PAY_METHOD_LABEL = { card: 'Card', venmo: 'Venmo', zelle: 'Zelle', cash: 'Cash', check: 'Check', other: 'Other' };
const PAY_STATUS = { reported: ['Sent, not confirmed yet', 'warn'], received: ['Received', 'good'], paid: ['Paid', 'good'], authorized: ['Hold placed', 'info'], captured: ['Charged from the hold', 'good'], released: ['Hold released', ''], void: ['Not received', 'bad'] };
const PAY_KIND = { deposit: 'Deposit', balance: 'Balance', hold: 'Card hold', refund: 'Refund' };
function payOptions() { const S = state.settings; return { card: !!S.payCard && (MODE === 'live' || MODE === 'preview'), venmo: !!String(S.payVenmo || '').trim(), zelle: !!String(S.payZelle || '').trim() }; }
function payRow(p, admin) {
  const st = PAY_STATUS[p.status] || [p.status, ''];
  const acts = !admin || state.readOnly ? '' : p.status === 'reported' ? `<button class="btn sm dark" data-act="payConfirm" data-p="${esc(p.id)}">It arrived</button><button class="btn ghost sm" data-act="payReject" data-p="${esc(p.id)}">Not received</button>`
    : p.status === 'authorized' && p.kind === 'hold' ? `<button class="btn sm" data-act="holdAct" data-p="${esc(p.id)}" data-a="release">Release</button><label class="mini">Charge<input type="number" min="1" step="0.01" data-ext="holdamt" value="${esc(state.holdAmt)}" placeholder="0"></label><button class="btn ghost sm" data-act="holdAct" data-p="${esc(p.id)}" data-a="capture">Charge it</button>` : '';
  return `<div class="pay-row"><span class="pm">${icon(p.method === 'card' ? 'card' : 'fund', 15)}</span><div class="grow"><b>${money(num(p.amount))}</b> <span class="muted small">${esc(PAY_KIND[p.kind] || p.kind)} · ${esc(PAY_METHOD[p.method] || p.method)} · ${esc(fmtStamp(p.at))}</span>${p.note ? `<div class="faint small">${esc(p.note)}</div>` : ''}</div><span class="pill ${st[1]}">${esc(st[0])}</span>${acts ? `<div class="actions pay-acts">${acts}</div>` : ''}</div>`;
}
function reportForm(b, method, amt) {
  return `<details class="report"><summary class="small">I've sent it</summary><div class="row wrap" style="margin-top:8px;gap:8px"><label class="mini">Amount<input type="number" min="1" step="0.01" data-ext="pay" data-k="amount" data-for="${esc(b.id)}" value="${esc(amt)}"></label><input type="text" data-ext="pay" data-k="note" value="${esc(state.pay.note)}" placeholder="Sent from which account? (optional)" aria-label="Note" style="flex:1;min-width:160px"><button class="btn sm dark" data-act="payReport" data-id="${esc(b.id)}" data-m="${method}" ${state.pay.busy ? 'disabled' : ''}>Let us know</button></div></details>`;
}
function portalPay(b) {
  const S = state.settings; const bill = b.bill; const due = amountDue(b); const opts = payOptions(); const pays = paymentsFor(b);
  const badge = !bill ? '' : due.amount <= 0.5 ? '<span class="pill good">Paid in full</span>' : `<span class="pill ${due.kind === 'deposit' ? 'warn' : ''}">${money(due.amount)} ${due.kind === 'deposit' ? 'deposit due' : 'to pay'}</span>`;
  const head = `<div class="card" id="p-pay"><div class="hd"><h2 class="t">Payments</h2>${badge}</div><div class="bd stack">`;
  if (!bill || b.status === 'request') return head + '<span class="muted small">Payment comes after the quote.</span></div></div>';
  if (b.status === 'cancelled') return head + '<span class="muted small">This booking was cancelled.</span></div></div>';
  const toPay = Math.max(0, round2(due.amount - due.pending));
  const methods = Object.keys(opts).filter((k) => opts[k]);
  const m = methods.includes(state.pay.method) ? state.pay.method : methods[0];
  const amt = state.pay.amount !== '' && state.pay.for === b.id ? state.pay.amount : toPay.toFixed(2);
  let tabs = '', how = '';
  if (toPay > 0.5 && methods.length) {
    if (methods.length > 1) tabs = `<div class="seg" role="group" aria-label="How to pay">${methods.map((k) => `<button data-act="payMethod" data-m="${k}" aria-pressed="${k === m}">${PAY_METHOD_LABEL[k]}</button>`).join('')}</div>`;
    if (m === 'card') how = `<button class="btn grad" data-act="payCard" data-id="${esc(b.id)}" data-kind="${due.kind}" ${state.pay.busy ? 'disabled' : ''}>${icon('card', 16)} ${state.pay.busy ? 'Opening checkout…' : `Pay ${money(toPay)} by card`}</button><span class="faint small">Secure checkout by Stripe.${MODE === 'preview' ? ' Simulated in the preview: no money moves.' : ''}</span>`;
    else if (m === 'venmo') { const h = String(S.payVenmo).replace(/^@/, '').trim(); const url = `https://venmo.com/${encodeURIComponent(h)}?txn=pay&amount=${toPay.toFixed(2)}&note=${encodeURIComponent(b.ref)}`; how = `<a class="btn dark" href="${esc(url)}" target="_blank" rel="noopener">Open Venmo · @${esc(h)}</a><span class="small muted">Send ${money(toPay)} to <b>@${esc(h)}</b> with <b>${esc(b.ref)}</b> in the note.</span>${reportForm(b, 'venmo', amt)}`; }
    else if (m === 'zelle') how = `<div class="stack" style="gap:6px"><span class="small">Send <b>${money(toPay)}</b> with Zelle to</span><div class="copyrow"><b>${esc(S.payZelle)}</b><button class="btn ghost sm" data-act="copyText" data-t="${esc(S.payZelle)}">Copy</button></div>${S.payZelleName ? `<span class="small muted">It shows up as ${esc(S.payZelleName)}.</span>` : ''}<div class="copyrow small">Memo <b>${esc(b.ref)}</b><button class="btn ghost sm" data-act="copyText" data-t="${esc(b.ref)}">Copy</button></div></div>${reportForm(b, 'zelle', amt)}`;
  } else if (toPay > 0.5) how = `<span class="small muted">${S.email ? `Email <a href="mailto:${esc(S.email)}?subject=${encodeURIComponent(b.ref)}">${esc(S.email)}</a> to arrange payment.` : 'We will be in touch about payment.'}</span>`;
  const hold = b.protection === 'hold' && !(b.hold && b.hold.placed) && ['quoted', 'confirmed'].includes(b.status);
  const holdHtml = hold ? `<div class="note info">${icon('card', 15)} <b>Card hold</b>: ${money(num(bill.repl))} held on your card while the gear is out, then released. Holds last about a week, so place it in the days before pickup.${opts.card ? `<div class="actions" style="margin-top:8px"><button class="btn dark sm" data-act="payCard" data-id="${esc(b.id)}" data-kind="hold">Place the hold</button></div>` : ' We place it at pickup.'}</div>` : '';
  return head + `<dl class="kv"><dt>Total</dt><dd>${money(due.total)}</dd><dt>Paid</dt><dd>${money(due.paid)}</dd>${due.pending ? `<dt>Sent, waiting for us to confirm</dt><dd>${money(due.pending)}</dd>` : ''}<dt class="tot"><b>${due.kind === 'deposit' ? `Deposit due now · ${num(bill.depositPct)}%` : 'Left to pay'}</b></dt><dd class="tot"><b>${money(toPay)}</b></dd></dl>
    ${due.kind === 'deposit' ? '<span class="faint small">The deposit confirms the booking. The rest is due when the gear comes back.</span>' : ''}
    ${tabs}${how}${holdHtml}${S.payNote ? `<span class="faint small">${esc(S.payNote)}</span>` : ''}
    ${pays.length ? `<div class="pay-list">${pays.map((x) => payRow(x, false)).join('')}</div>` : ''}</div></div>`;
}
function adminPayCard(b) {
  const due = amountDue(b); const pays = paymentsFor(b); const r = state.payRec; const bill = b.bill || (BILLED.has(b.status) ? billOf(b) : null);
  const badge = !bill ? '' : due.amount <= 0.5 ? '<span class="pill good">Paid in full</span>' : `<span class="pill ${due.kind === 'deposit' ? 'warn' : ''}">${money(due.amount)} ${due.kind} due</span>`;
  return `<div class="card"><div class="hd"><h2 class="t">Payments</h2>${badge}</div><div class="bd stack">
    ${bill ? `<dl class="kv"><dt>Quoted total</dt><dd>${money(num(bill.total))}</dd><dt>Deposit · ${num(bill.depositPct)}%</dt><dd>${money(num(bill.deposit))}</dd><dt>Paid so far</dt><dd>${money(due.paid)}</dd>${due.pending ? `<dt>Sent by the client, to confirm</dt><dd>${money(due.pending)}</dd>` : ''}</dl>` : '<span class="muted small">Quote the job to set what is owed.</span>'}
    ${pays.length ? `<div class="pay-list">${pays.map((x) => payRow(x, true)).join('')}</div>` : ''}
    ${state.readOnly ? '' : `<details ${pays.length ? '' : 'open'}><summary class="small" style="cursor:pointer;font-weight:600">Record a payment</summary><div class="form" style="grid-template-columns:1fr 1fr;margin-top:10px">
      <label class="field"><span>How</span><select data-ext="payrec" data-k="method">${['venmo', 'zelle', 'cash', 'check', 'card', 'other'].map((k) => `<option value="${k}" ${r.method === k ? 'selected' : ''}>${PAY_METHOD_LABEL[k]}</option>`).join('')}</select></label>
      <label class="field"><span>For</span><select data-ext="payrec" data-k="kind">${[['deposit', 'Deposit'], ['balance', 'Balance'], ['refund', 'Refund to the client']].map(([k, l]) => `<option value="${k}" ${r.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Amount</span><input type="number" min="0" step="0.01" data-ext="payrec" data-k="amount" value="${esc(r.amount !== '' ? r.amount : Math.max(0, due.amount).toFixed(2))}"></label>
      <label class="field"><span>Note</span><input type="text" data-ext="payrec" data-k="note" value="${esc(r.note)}"></label>
      <button class="btn dark wide" data-act="payRecord">Record it</button></div></details>`}
  </div></div>`;
}
/* Keep the job's own deposit and paid flags in step with its payments, so Today, the fund and the client all agree. */
function syncPayFlags(b, list) {
  const bill = b.bill || billOf(b); const paid = round2(sum(list.filter((p) => PAID.has(p.status) && p.kind !== 'hold'), (p) => (p.kind === 'refund' ? -1 : 1) * num(p.amount)));
  const dep = paid + 0.5 >= num(bill.deposit) && paid > 0;
  b.deposit = Object.assign({}, b.deposit, { status: dep || (b.deposit && b.deposit.status === 'received' && paid > 0) ? 'received' : 'none' });
  b.payment = num(bill.total) && paid + 0.5 >= num(bill.total) ? 'paid' : 'unpaid';
  const hold = list.find((p) => p.kind === 'hold' && p.status === 'authorized');
  b.hold = Object.assign({}, b.hold, { placed: !!hold || (b.hold && b.hold.placed && !list.some((p) => p.kind === 'hold')) || false });
}
async function writePayment(pay) {
  if (!db) return false;
  try { await db.collection('payments').doc(pay.id).set(pay); } catch (e) { writeError(e); return false; }
  const b = state.draft && state.draft.id === pay.bookingId ? state.draft : null;
  if (b) { const list = paymentsFor(b).filter((x) => x.id !== pay.id).concat([pay]); syncPayFlags(b, list); scheduleSave(0); }
  return true;
}
function billOf(b) {
  const c = chosen(b); const S = state.settings;
  return { total: round2(c.total), subtotal: round2(c.subtotal), tax: round2(c.tax), gear: round2(c.gear), crew: round2(c.crew), deposit: round2(c.total * num(S.depositPct) / 100), depositPct: num(S.depositPct), repl: round2(c.repl), budget: b.budget || 'A', rows: receiptRows(b, c).filter((r) => !r.x), at: new Date().toISOString() };
}
/* Quotes carry a copy of the bill, so a client (who can't see values or recompute them) reads exactly what the team quoted. */
function stampBill(b) {
  if (!BILLED.has(b.status)) return;
  const nb = billOf(b); const same = (x) => stable(Object.assign({}, x, { at: 0 }));
  if (!b.bill || same(b.bill) !== same(nb)) b.bill = nb;
}
function clientTodo(b) {
  if (!b || state.role !== 'client') return [];
  const out = []; const ct = b.contract || {};
  if (['quoted', 'confirmed'].includes(b.status)) {
    if (ct.status === 'sent') out.push({ k: 'sign', t: 'Sign the rental agreement' });
    if ((b.protection || 'coi') === 'coi' && !['received', 'verified'].includes((b.coi || {}).status)) out.push({ k: 'coi', t: 'Send your insurance certificate' });
    if (b.protection === 'hold' && !(b.hold && b.hold.placed)) out.push({ k: 'pay', t: 'Place the card hold' });
    if (b.tax && b.tax.exempt && !b.tax.cert && !b.tax.certFile) out.push({ k: 'tax', t: 'Send your ST-121' });
  }
  if (BILLED.has(b.status) && b.status !== 'closed') { const due = amountDue(b); if (due.amount - due.pending > 0.5 && (due.kind === 'deposit' || ['out', 'returned'].includes(b.status))) out.push({ k: 'pay', t: `Pay the ${money(due.amount - due.pending)} ${due.kind}` }); }
  return out;
}

/* ================= gear fund ================= */
function fundQueue() {
  const plan = state.fundPlan || {}; const bought = plan.bought || {};
  const base = (SNAP.missing || []).map((m, i) => ({ key: slug(m[1]), name: m[1], cost: num(m[4]), phase: m[5], dept: m[0], why: m[6], i, cut: !(m[2] > 0) || m[11] === 'Cut' })).filter((x) => !x.cut);
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
/* A returning client's discount goes on by itself once, when the job is first looked at. Taking it off sticks. */
function autoReturning(b) {
  const S = state.settings;
  if (state.role !== 'admin' || !S.autoReturning || !num(S.returningPct) || b.returningChecked || !['request', 'quoted'].includes(b.status)) return false;
  if (b.discount && b.discount.kind && b.discount.kind !== 'none') return false;
  if (!pastJobs(b)) return false;
  b.discount = { kind: 'returning', pct: num(S.returningPct) }; b.returningChecked = true; return true;
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
  stampBill(b);
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
  keepClientFields(state.draft);
  stampBill(state.draft);
  const body = clone(state.draft);
  try { await db.collection('bookings').doc(body.id).set(body); } catch (e) { writeError(e); }
  saving = false;
  if (saveAgain) { saveAgain = false; flushSave(); } else { state.dirty = false; }
}
/* Clients sign, upload paperwork and pay while the team may have the same job open. Before saving the team's copy,
   carry over what only the client (or Stripe) changes, so an open job never undoes a signature or a payment. */
function keepClientFields(d) {
  const fresh = state.bookings.find((x) => x.id === d.id); if (!fresh) return;
  const fc = fresh.contract || {}; const dc = d.contract || {};
  if (fc.signature && fc.signedAt && (!dc.signature || String(fc.signedAt) > String(dc.signedAt || '')) && !(dc.status === 'sent' && String(dc.sentAt || '') > String(fc.signedAt))) {
    d.contract = fc; if (fresh.waiver && fresh.waiver.accepted) d.waiver = fresh.waiver;
  }
  if (fresh.coi && fresh.coi.file && fresh.coi.file !== (d.coi && d.coi.file)) d.coi = Object.assign({}, d.coi, { file: fresh.coi.file, docId: fresh.coi.docId, expires: (d.coi && d.coi.expires) || fresh.coi.expires, status: ['none', 'requested', 'rejected', undefined].includes(d.coi && d.coi.status) ? fresh.coi.status : d.coi.status });
  if (fresh.tax && fresh.tax.certFile && !(d.tax && d.tax.certFile)) d.tax = Object.assign({}, d.tax, { exempt: true, certFile: fresh.tax.certFile, certDocId: fresh.tax.certDocId });
  const pays = paymentsFor(d); if (pays.length) syncPayFlags(d, pays);
}
function writeError(e) {
  const code = e && e.code;
  if (code === 'invalid_argument' || code === 'permission_denied') { state.readOnly = MODE === 'claude'; toast(MODE === 'claude' ? 'You can look around but not change anything here. Ask the owner for Contributor access.' : 'Only the team can change that.'); }
  else if (code === 'quota_exceeded') toast('The shared database is full. Delete old cancelled jobs to make room.');
  else if (code === 'resource_exhausted') toast('Too many saves at once. Give it a moment and try again.');
  else toast('That change did not save. Check your connection and try again.');
  requestRender();
}
function openBooking(id, fresh) {
  if (state.draft && state.dirty) flushSave();
  const b = fresh || state.bookings.find((x) => x.id === id); if (!b) return;
  state.view = 'booking'; state.bookingId = id; state.draft = clone(b); state.dirty = false; state.confirmDelete = false; state.drawer = null; state.confirmResend = false;
  state.payRec = { method: 'venmo', kind: amountDue(state.draft).kind === 'deposit' ? 'deposit' : 'balance', amount: '', note: '' };
  if (!['plan', 'price', 'paperwork', 'handoff'].includes(state.tab)) state.tab = 'plan';
  const disc = autoReturning(state.draft);
  render(); window.scrollTo(0, 0);
  if (disc) { scheduleSave(0); toast(`Returning client: ${num(state.settings.returningPct)}% off applied. Change it on the Price tab.`); }
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
  const views = { welcome: vWelcome, today: vToday, calendar: vCalendar, bookings: vBookings, booking: vBooking, clients: vClients, inventory: vInventory, packages: vPackages, fund: vFund, money: vMoney, insurance: vInsurance, storefront: vStore, roadmap: vRoadmap, settings: vSettings, mine: vMine, account: vAccount };
  if (!allowedView(state.view) && state.view !== 'booking') state.view = homeFor(state.role);
  if (state.view === 'booking' && state.role !== 'admin') state.view = homeFor(state.role);
  const touringHere = state.touring && state.view !== 'welcome' && state.role === 'admin';
  main().innerHTML = (MODE === 'preview' && state.view !== 'welcome' ? previewBar() : '') + (touringHere ? tourBar() : '') + (views[state.view] || vWelcome)() + (touringHere ? tourDock() : '');
  const screen = state.view + (state.view === 'booking' ? ':' + state.bookingId : state.view === 'mine' ? ':' + (state.portal.id || '') : '');
  if (screen !== lastScreen) { const v = $('.view', main()); if (v) v.classList.add('enter'); lastScreen = screen; }
  centerTourChip();
  renderDrawer();
  resolveNames();
  mountSignPad();
}
function mountSignPad() {
  const c = $('#sigPad'); if (!c || c.dataset.ready) return; c.dataset.ready = '1';
  const dpr = window.devicePixelRatio || 1; const w = c.clientWidth || 480; const h = c.clientHeight || 160;
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#15161b';
  if (state.sign.dataUrl) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, w, h); img.src = state.sign.dataUrl; }
  let drawing = false, last = null;
  const pt = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const save = () => { const out = document.createElement('canvas'); const k = Math.min(1, 600 / w); out.width = Math.round(w * k); out.height = Math.round(h * k); const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height); o.drawImage(c, 0, 0, out.width, out.height); state.sign.dataUrl = out.toDataURL('image/png'); state.sign.drawn = true; };
  c.addEventListener('pointerdown', (e) => { drawing = true; last = pt(e); c.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last[0], last[1], 1, 0, Math.PI * 2); ctx.fillStyle = '#15161b'; ctx.fill(); e.preventDefault(); });
  c.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; e.preventDefault(); });
  const end = () => { if (!drawing) return; drawing = false; save(); };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end); c.addEventListener('pointerleave', end);
}
function renderChrome() {
  const admin = state.role === 'admin';
  const active = state.bookings.filter((b) => HOLDS.has(b.status)).length;
  const openQ = OPEN.filter((o) => o[0] === 'Open').length + DATA_CHECKS.length;
  const mineOpen = state.bookings.filter((b) => clientTodo(b).length).length;
  document.body.dataset.role = state.role;
  $('#nav').innerHTML = navViews().map(([k, l, ic]) => {
    const cur = state.view === k || (k === 'bookings' && state.view === 'booking');
    const count = !admin ? (k === 'mine' && mineOpen ? mineOpen : '') : k === 'bookings' && active ? active : k === 'roadmap' && openQ ? openQ : '';
    return `<button type="button" data-act="nav" data-v="${k}" ${cur ? 'aria-current="page"' : ''}>${icon(ic, 16)}<span>${l}</span>${count !== '' ? `<span class="count">${count}</span>` : ''}</button>`;
  }).join('');
  const cur = $('#nav [aria-current]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('#brandName').textContent = state.settings.company || 'Shared Gear Pool';
  const brand = $('.brand'); if (brand) brand.dataset.v = admin ? 'welcome' : 'storefront';
  const live = { wait: ['', 'Connecting…'], off: ['bad', MODE === 'live' ? 'Not connected' : 'Jobs unavailable here'], error: ['bad', 'Stopped updating'], ready: ['ok', MODE === 'preview' ? 'Saved in this browser only' : 'Live'] }[state.dbState];
  const dot = $('#liveDot'); dot.className = 'live ' + live[0]; dot.title = live[1]; dot.setAttribute('aria-label', live[1]);
  const btns = $('#topBtns'); if (btns) btns.innerHTML = topButtons();
  const c = state.cat;
  $('#footStatus').innerHTML = admin ? `<span>${esc(live[1])}${state.readOnly ? ' · view only' : ''}</span><span>${c.source === 'sheet' ? `Rates synced from the sheet ${esc(fmtStamp(c.syncedAt))}` : `Rate card as of ${esc(fmtDay(c.asOf, { month: 'short', day: 'numeric', year: 'numeric' }))}`}</span>`
    : `<span>${esc(state.settings.company || 'Shared Gear Pool')}${state.settings.email ? ` · <a href="mailto:${esc(state.settings.email)}">${esc(state.settings.email)}</a>` : ''}${state.settings.phone ? ` · ${esc(state.settings.phone)}` : ''}</span><span>Rates as of ${esc(fmtDay(c.asOf, { month: 'short', day: 'numeric', year: 'numeric' }))}</span>`;
}
const initials = (s) => (String(s || '').trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?');
function topButtons() {
  const u = state.user || {};
  const chip = () => `<button class="acct" type="button" data-act="acctMenu" aria-label="Account${u.email ? ': ' + esc(u.email) : ''}"><span class="av" aria-hidden="true">${esc(initials(u.name || u.email))}</span><span class="nm">${esc(u.name || u.email || 'Account')}</span></button>`;
  if (state.role === 'admin') return `<button class="btn grad sm" data-act="newBooking" type="button">New job</button>${MODE !== 'claude' && state.user ? chip() : ''}`;
  if (state.role === 'client') return chip();
  return `<button class="btn dark sm" type="button" data-act="authOpen" data-m="in">Sign in</button>`;
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
  const r = state.role; const who = (k, l) => `<button type="button" class="chip" data-act="demoRole" data-r="${k}" aria-pressed="${r === k}">${l}</button>`;
  const say = r === 'admin' ? 'Names, values, internal notes, research and the sheet link are hidden.' : r === 'client' ? 'You are looking around as a client: request gear, sign the agreement and pay. Card payments are simulated.' : 'You are looking around as a visitor who hasn’t signed in.';
  return `<div class="pv"><div class="pvbar">${icon('lock', 15)}<span><b>Public preview.</b> ${say} Anything you do stays in this browser.</span><span class="pv-who" role="group" aria-label="Look around as">${who('admin', 'Owner')}${who('client', 'Client')}${who('guest', 'Visitor')}</span>${r === 'admin' ? '<a href="#" data-act="nav" data-v="welcome">What’s hidden?</a>' : ''}</div></div>`;
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
      <div><b>Works the same</b><p class="muted small" style="margin:8px 0 0">Everything else: jobs, quotes, the three budgets, tax, discounts, paperwork, check-out, the schedule, kits, the gear fund and the storefront. The difference is where it's kept: here, anything you create stays in this browser and nobody else sees it. The private version is shared between the three owners and has all of the hidden details.</p></div></div>
      <div class="bd" style="border-top:1px solid var(--line)"><div class="row wrap between" style="gap:10px"><span class="small"><b>See the client side too.</b> Request gear, sign the agreement and pay (simulated) the way a client does.</span><span class="pv-who" role="group" aria-label="Look around as"><button type="button" class="chip" data-act="demoRole" data-r="admin" aria-pressed="true">Owner</button><button type="button" class="chip" data-act="demoRole" data-r="client" aria-pressed="false">Client</button><button type="button" class="chip" data-act="demoRole" data-r="guest" aria-pressed="false">Visitor</button></span></div></div></div>` : ''}
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
    if (['quoted', 'confirmed'].includes(b.status) && contractStale(b)) out.push({ tone: 'warn', b, t: `${name}: agreement out of date`, d: 'The job changed after the agreement was sent. Send the updated version.', tab: 'paperwork' });
    if (b.coi && b.coi.file && b.coi.status === 'received' && HOLDS.has(b.status)) out.push({ tone: 'info', b, t: `${name}: certificate uploaded`, d: 'The client sent their insurance certificate. Check it and mark it verified.', tab: 'paperwork' });
    if (b.tax && b.tax.certFile && !b.tax.cert && HOLDS.has(b.status)) out.push({ tone: 'info', b, t: `${name}: ST-121 uploaded`, d: 'Check the exemption certificate and mark it on file.', tab: 'paperwork' });
    if (b.status === 'out' && b.returnDate === addDays(t, 1)) out.push({ tone: 'info', b, t: `${name} is due back tomorrow`, d: `By ${fmtTime(b.returnTime) || 'the agreed time'}${clientName(b) ? ' · ' + clientName(b) : ''}.`, tab: 'handoff' });
    paymentsFor(b).filter((p) => p.status === 'reported').forEach((p) => out.push({ tone: 'warn', b, t: `${name}: ${money(num(p.amount))} by ${PAY_METHOD[p.method] || p.method} to confirm`, d: `The client says they sent it${p.note ? ': ' + p.note : ''}. Check it arrived, then confirm it.`, tab: 'handoff' }));
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
    ${hero('Three weeks from ' + esc(fmtDay(start, { month: 'long', day: 'numeric' })), 'The <em class="s">schedule</em>', 'Every job from the moment gear goes out to the moment it comes back.', `<button class="btn icon" data-act="calMove" data-n="-7" aria-label="Previous week">${icon('back', 16)}</button><button class="btn" data-act="calToday">This week</button><button class="btn icon" data-act="calMove" data-n="7" aria-label="Next week">${icon('arrow', 16)}</button><button class="btn ghost" data-act="icsAll">${icon('calendar', 16)} Add to my calendar</button>`)}
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
  const compact = b.status === 'cancelled' ? '' : `<div class="path-compact"><div class="segs" aria-hidden="true">${FLOW.map((s, i) => `<i class="${i < idx ? 'on' : ''} ${i === idx ? 'now' : ''}"></i>`).join('')}</div><div class="small"><b>${STATUS[b.status].label}</b> · step ${idx + 1} of ${FLOW.length}${FLOW[idx + 1] ? ` · next: ${STATUS[FLOW[idx + 1]].label.toLowerCase()}` : ''}</div></div>`;
  const next = { request: ['quoted', 'Mark quote sent'], quoted: ['confirmed', 'Confirm job'], confirmed: ['__handoff', 'Hand off the gear'], out: ['__handoff', 'Check gear back in'], returned: ['closed', 'Close job'] }[b.status];
  const done = { paperwork: pw.contract === 'signed' && pw.protectionOk && pw.taxOk };
  const tab = (k, l) => `<button role="tab" data-act="tab" data-t="${k}" aria-selected="${state.tab === k}">${l}${k in done ? `<span class="ok ${done[k] ? 'y' : ''}"></span>` : ''}</button>`;
  const body = { plan: bPlan, price: bPrice, paperwork: bPaperwork, handoff: bHandoff }[state.tab] || bPlan;
  return `<section class="view">
    <div class="hero"><div style="min-width:0;flex:1 1 340px"><button class="btn ghost sm" data-act="nav" data-v="bookings">${icon('back', 14)} All jobs</button>
      <div class="eyebrow" style="margin-top:12px">${esc(b.ref)}${b.example ? ' · example, not a real job' : ''}${b.source === 'storefront' ? ' · came in from the storefront' : ''}</div>
      <h1>${esc(b.project || 'Untitled job')}</h1><p>${esc(clientName(b) || 'No client yet')} · ${esc(fmtDay(b.pickup))} to ${esc(fmtDay(b.returnDate))}</p></div>
      <div class="head-total"><div class="big" id="headTotal">${money(c.total)}</div><div class="muted small">${BUDGET[b.budget || 'A'].name} · ${b.tax && b.tax.exempt ? 'tax exempt' : 'incl. sales tax'}</div></div></div>
    <div class="card statusbar"><div class="path">${b.status === 'cancelled' ? pill('cancelled') : path}</div>${compact}
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
    return `<div class="gear-row">${thumb(Object.assign({ id: ln.id }, it), true)}<div class="grow"><div class="ttl" data-act="item" data-id="${esc(ln.id)}" style="cursor:pointer">${esc(it.name)}</div><div class="sub">${ownerTag(it.own)} · ${money(lineRate(ln))}/day${perLens(it) ? ' per lens' : ''}${flag ? ' · ' + flag : ''}</div></div>
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
      <div class="wide">${calButtons(b)}</div>
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
function receiptRows(b, c) {
  const S = state.settings; const r = [];
  r.push({ l: `Gear rental${c.weekend ? ' · weekend special, one day' : b.rateMode === 'week' ? ' · film-week pricing' : ''}`, v: c.equip });
  if (c.possession) r.push({ l: `Hold days · ${plural(num(b.possessionDays), 'day')} at ${num(S.possessionPct)}%`, v: c.possession });
  if (c.discount) r.push({ l: `${DISCOUNTS[b.discount.kind]} discount · ${discountPct(b)}%`, v: -c.discount });
  r.push({ l: 'Crew', v: c.crew });
  if (c.exp) r.push({ l: 'Expendables, at cost', v: c.exp });
  if (c.handoff) r.push({ l: 'Delivery and handoff', v: c.handoff });
  if (c.waiver) r.push({ l: `Damage waiver · ${num(S.waiverPct)}%`, v: c.waiver });
  if (c.late) r.push({ l: 'Late return', v: c.late });
  r.push({ l: 'Subtotal', v: c.subtotal, c: 'tot' });
  r.push({ l: b.tax && b.tax.exempt ? 'Sales tax · exempt with ST-121' : `NY sales tax · ${pctTxt(S.salesTaxPct)} on ${money(c.taxable)}`, v: c.tax });
  r.push({ l: 'Total', v: c.total, c: 'tot', b: true });
  r.push({ l: `Deposit to confirm · ${num(S.depositPct)}%`, v: c.total * num(S.depositPct) / 100 });
  if (c.comp) r.push({ l: 'Given on the house', v: c.comp, x: true });
  return r.map((x) => Object.assign(x, { v: round2(x.v) }));
}
function rowsHtml(rows) { return `<dl class="kv">${rows.map((r) => `<dt${r.c ? ` class="${r.c}"` : ''}>${r.b ? `<b>${esc(r.l)}</b>` : esc(r.l)}</dt><dd${r.c ? ` class="${r.c}"` : ''}>${r.b ? `<b>${money(r.v)}</b>` : money(r.v)}</dd>`).join('')}</dl>`; }
function receipt(b, c) { return rowsHtml(receiptRows(b, c)); }
function payouts(b, c) {
  const f = fundTotals();
  return `<div class="row" style="gap:14px"><span class="icon-tile t-Kit">${icon('fund', 21)}</span><div class="grow"><div class="mid">${money(c.fund)}</div><div class="muted small">${pctTxt(c.fundPct)} of ${money(c.gear)} gear rental, toward ${f.next ? esc(f.next.name) : 'the buying list'}</div></div></div>
    <div class="tbl" tabindex="0"><table class="plain"><thead><tr><th>Owner</th><th class="n">Gets</th><th class="n">On the house</th></tr></thead><tbody>${OWN.map((o) => `<tr><td>${ownerTag(o)}</td><td class="n">${money(c.own[o].net)}</td><td class="n">${c.own[o].comped ? money(c.own[o].comped) : '—'}</td></tr>`).join('')}</tbody></table></div>
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
      ${state.confirmResend ? `<div class="note bad">They signed this electronically. Sending it again clears their signature so they can sign the new version. <div class="actions" style="margin-top:8px"><button class="btn danger sm" data-act="resendAgreement">Send the new version</button><button class="btn ghost sm" data-act="keepSigned">Keep the signed one</button></div></div>` : ''}
      ${ct.signature ? sigBlock(ct) : ct.status === 'signed' ? `<div class="form" style="grid-template-columns:1fr 1fr"><label class="field"><span>Signed by</span><input type="text" id="ct-signer" data-b="contract.signer" value="${esc(ct.signer)}"></label><label class="field"><span>On</span><input type="date" id="ct-date" data-b="contract.signedOn" value="${esc(ct.signedOn)}"></label></div>` : ''}
      ${ct.status === 'sent' ? `<span class="small muted">Sent ${esc(fmtStamp(ct.sentAt))}. ${MODE === 'claude' ? 'Copy or download it to send.' : 'If the client has an account, they sign it under My bookings. Otherwise copy or download it to send.'}</span>` : ''}
      ${contractStale(b) && !state.confirmResend ? `<div class="note warn">The job changed after this agreement went out.<div class="actions" style="margin-top:8px"><button class="btn sm dark" data-act="${ct.signature ? 'contract' : 'resendAgreement'}" data-s="sent">Send the updated agreement</button></div></div>` : ''}
      <div class="actions"><button class="btn sm" data-act="copyAgreement">Copy text</button>${state.canDownload ? `<button class="btn sm" data-act="dlAgreement">Download</button>${ct.signature ? `<button class="btn sm" data-act="dlSigned" data-id="${esc(b.id)}">Signed copy</button>` : ''}<button class="btn sm" data-act="dlSchedule">Gear list .csv</button>` : ''}</div>
      <span class="faint small">The agreement rebuilds itself from the quote. Have a New York attorney review the template before the first outside rental.</span></div></div>
    <div class="card"><div class="hd"><h2 class="t">How the gear is covered</h2><span class="pill ${p.ok ? 'good' : 'warn'}">${p.ok ? 'Covered' : 'Not yet'}</span></div><div class="bd stack">
      ${opt('coi', 'Insurance certificate', `The client's policy covers ${money(c.repl)} of rented gear and names you.`, true)}
      ${opt('hold', 'Card hold', `For gear worth up to ${money(num(S.holdMax))} and up to ${plural(num(S.holdMaxDays), 'billed day')}. The replacement value is held on their card.`, c.repl <= num(S.holdMax) && c.billedDays <= num(S.holdMaxDays) || b.protection === 'hold')}
      ${opt('waiver', 'Damage waiver', S.waiverOn ? `${num(S.waiverPct)}% of the gear rental. Caps their liability for accidental damage at ${num(S.waiverCapPct)}% of replacement value.` : 'Switched off in Settings until your own policy backs it.', S.waiverOn || b.protection === 'waiver')}
      <div class="checklist">${p.checks.map((x) => `<div class="${x.ok ? 'ok' : 'bad'}"><span>${esc(x.t)}<span class="sub">${esc(x.have)}</span></span></div>`).join('')}</div>
      ${p.mode === 'coi' && coi.file ? `<div class="doc-row">${icon('doc', 16)}<span class="grow small">The client uploaded their certificate${coi.expires ? `, expiring ${esc(fmtDay(coi.expires))}` : ''}. Check it against the list above.</span><button class="btn sm" data-act="openDoc" data-path="${esc(coi.file)}">Open</button></div>` : ''}
      ${p.mode === 'coi' ? onFileCoi(b) : ''}
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
      ${t.certFile ? `<div class="doc-row">${icon('doc', 16)}<span class="grow small">The client uploaded an ST-121${t.cert ? '' : '. Check it, then tick the box above'}.</span><button class="btn sm" data-act="openDoc" data-path="${esc(t.certFile)}">Open</button></div>` : !t.cert ? onFileSt121(b) : ''}
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
  return `<div class="split"><div class="card"><div class="hd"><h2 class="t">Check-out sheet</h2><div class="actions"><span class="muted small">${plural(lines.length, 'item')} · ${BUDGET[b.budget || 'A'].name}</span>${(canOut || canIn) && lines.length && !state.readOnly ? `<button class="btn dark sm" data-act="scanStart">${icon('qr', 14)} Scan labels</button>` : ''}</div></div>
    <div class="bd flush">${lines.length ? lines.map((l) => { const it = state.cat.byId[l.id] || { id: l.id, name: l.id, cat: 'Kit' }; const sn = serialsOf(l.id); const got = unitsDone(co, l); return `<div class="gear-row">${thumb(it, true)}<div class="grow"><div class="ttl">${esc(it.name)}${num(l.qty) > 1 ? ` <span class="muted">× ${num(l.qty)}</span>` : ''}</div><div class="sub">${esc(it.kit || it.cat)}${sn ? ` · S/N ${esc(sn)}` : ''}${got ? ` · <b>${esc(got)}</b>` : ''}</div></div>
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
  </div></div>${adminPayCard(b)}</aside></div>`;
}

/* ---------- Gear ---------- */
function invFiltered() {
  const f = state.inv; const q = f.q.trim().toLowerCase();
  return state.cat.items.filter((i) => (f.own === 'all' || i.own === f.own) && (!f.flag || hasQuestion(i.id))
    && (!q || i.id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || (i.kit || '').toLowerCase().includes(q)));
}
function availPill(it, from, to) {
  if (!from || !to || from > to || !it.qty) return '';
  const u = usage(it.id, from, to); const free = it.qty - u.firm;
  return free <= 0 ? '<span class="pill bad">Booked</span>' : free < it.qty ? `<span class="pill warn">${free} of ${it.qty} free</span>` : `<span class="pill good">Free${u.tent ? ', on hold' : ''}</span>`;
}
function gearRow(i) {
  const f = state.inv; const av = availPill(i, f.from, f.to);
  return `<button class="g-row" data-act="item" data-id="${i.id}">${thumb(i, true)}<div class="grow"><div class="ttl">${esc(i.name)}</div><div class="muted small">${i.qty > 1 ? `${i.qty} in the pool` : i.qty === 0 ? 'Not itemized yet' : 'One in the pool'}${i.kit ? ' · ' + esc(i.kit) : ''}</div>${av || (hasQuestion(i.id) ? '<span class="pill warn">To confirm</span>' : '')}</div>
    <div class="g-side">${i.rec != null ? `<span class="g-price">${money(i.rec)}<small>/day${perLens(i) ? ' per lens' : ''}</small></span>` : `<span class="muted small">${i.cat === 'Consumable' ? 'At cost' : 'In kit rate'}</span>`}${ownerTag(i.own)}</div></button>`;
}
function vInventory() {
  const f = state.inv; const rows = invFiltered(); const cats = CAT_ORDER.filter((c) => state.cat.items.some((i) => i.cat === c));
  const allOpen = cats.every((c) => f.open[c]);
  return `<section class="view">
    ${hero(`${state.cat.items.length} pieces across three kits`, 'The <em class="s">gear</em>', 'Everything the pool owns, with the day rate to quote. Open a section to see what is in it, or search.', `<button class="btn" data-act="labelsOpen">${icon('qr', 16)} Print labels</button>`)}
    <div class="card"><div class="bd stack">
      <div class="form"><label class="field"><span>Search</span><input type="search" id="inv-q" data-inv="q" value="${esc(f.q)}" placeholder="Try “C-stand” or “Ronin”"></label>
        <label class="field"><span>Free from</span><input type="date" id="inv-from" data-inv="from" value="${esc(f.from)}"></label><label class="field"><span>Until</span><input type="date" id="inv-to" data-inv="to" value="${esc(f.to)}"></label></div>
      <div class="row between wrap"><div class="chips"><button class="chip" data-act="invOwn" data-v="all" aria-pressed="${f.own === 'all'}">All owners</button>${OWN.map((o) => `<button class="chip" data-act="invOwn" data-v="${o}" aria-pressed="${f.own === o}"><span class="dot ${o}"></span>${esc(OWNERS[o].name)}</button>`).join('')}${OPEN.length || DATA_CHECKS.length ? `<button class="chip" data-act="invFlag" aria-pressed="${f.flag}">Details to confirm</button>` : ''}</div>
        <button class="btn ghost sm" data-act="invAll" data-v="${allOpen ? '0' : '1'}">${allOpen ? 'Close all' : 'Open all'}</button></div>
    </div></div>
    ${previewNote('Owner names, what each piece is worth, its market price range and the notes behind each rate are hidden in the public preview. Day rates and quantities are real.')}
    <div id="invBody">${invBody(rows)}</div>
  </section>`;
}
function invBody(rows) {
  const f = state.inv; const searching = !!f.q.trim();
  if (!rows.length) return '<div class="card"><div class="empty"><b>Nothing matches</b><span>Try another word or clear the filters.</span></div></div>';
  const groups = CAT_ORDER.map((c) => [c, rows.filter((i) => i.cat === c)]).filter(([, l]) => l.length);
  return `<div class="stack" style="gap:12px">${groups.map(([c, list]) => {
    const open = searching || !!f.open[c]; const rates = list.map((i) => i.rec).filter((x) => x != null);
    const busy = f.from && f.to && f.from <= f.to ? list.filter((i) => i.qty && freeOn(i.id, f.from, f.to) <= 0).length : 0;
    return `<div class="card sec ${open ? 'open' : ''}"><button class="sec-btn" data-act="invSec" data-c="${c}" aria-expanded="${open}">${tile(c)}<div class="grow"><div class="sec-t">${CAT_LABEL[c]}</div><div class="muted small">${plural(list.length, 'piece')}${rates.length ? ` · from ${money(Math.min(...rates))}/day` : ''}${busy ? ` · <span class="flag bad">${busy} booked those dates</span>` : ''}</div></div><span class="chev">${icon('down', 18)}</span></button>
      ${open ? `<div class="sec-list">${list.map(gearRow).join('')}</div>` : ''}</div>`;
  }).join('')}</div>`;
}

/* ---------- Kits ---------- */
function crewFor(pid) { const role = OPERATOR_FOR[pid]; const l = role && state.cat.labor.find((x) => x.role === role); return l ? { role, rate: l.rec } : null; }
function vPackages() {
  const pctP = num(state.settings.possessionPct, 50) / 100;
  return `<section class="view">
    ${hero('Ready to go', 'Kits that <em class="s">work together</em>', 'Open a kit to see what is inside and what it costs for longer. Each kit reprices itself when a piece inside it changes.')}
    <div class="stack" style="gap:12px">${state.cat.packages.map((p) => { const op = crewFor(p.id); const open = !!state.kitOpen[p.id];
      return `<div class="card sec ${open ? 'open' : ''}"><button class="sec-btn" data-act="kitSec" data-id="${p.id}" aria-expanded="${open}">${kitThumb(p)}<div class="grow"><div class="sec-t">${esc(p.name)}</div><div class="muted small clamp">${plural(p.ids.length, 'piece')} · ${esc(p.contents)}</div></div><span class="sec-price">${money(p.day)}<small>/day</small></span><span class="chev">${icon('down', 18)}</span></button>
      ${open ? `<div class="sec-body">
        ${state.role === 'admin' ? photoGallery(p.id, true, p.name) : ''}
        <div class="kit-items">${p.ids.map((id) => { const it = state.cat.byId[id]; if (!it) return ''; return `<button class="g-row" data-act="item" data-id="${id}">${thumb(it, true)}<div class="grow"><div class="ttl">${esc(it.name)}</div><div class="muted small">${it.qty > 1 ? `× ${it.qty}` : 'One'}</div></div><div class="g-side">${it.rec != null ? `<span class="g-price">${money(it.rec * it.qty)}<small>/day</small></span>` : '<span class="muted small">In kit rate</span>'}</div></button>`; }).join('')}</div>
        <div class="ladder">${[[1, '1 day'], [2, '2 days'], [3, '3 days'], [5, 'A week']].map(([d, l]) => `<div><span>${l}</span><b>${money(p.day * weekFactor(d))}</b></div>`).join('')}</div>
        <dl class="kv"><dt>Held, not shooting</dt><dd>${money(p.day * pctP)}/day</dd>${op ? `<dt>With a ${esc(op.role)}</dt><dd>+${money(op.rate)}/day</dd>` : ''}</dl>
        ${p.missing.length ? `<div class="note bad">Not on the gear list: ${p.missing.map(esc).join(', ')}. Priced at zero.</div>` : ''}
        ${DATA_CHECKS.filter((d) => p.ids.includes(d.id)).map((d) => `<div class="note">${esc(d.title)} affects this price. See Roadmap.</div>`).join('')}
        <div class="actions"><button class="btn dark" data-act="quotePkg" data-id="${p.id}">Quote this kit</button>${op ? `<button class="btn" data-act="quotePkg" data-id="${p.id}" data-crew="1">With a ${esc(op.role.split(' /')[0])}</button>` : ''}</div>
      </div>` : ''}</div>`; }).join('')}</div>
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
    <div class="card"><div class="hd"><h2 class="t">Payouts</h2><span class="muted small">Confirmed jobs onward, after the fund's share</span></div><div class="bd flush">${state.dbState !== 'ready' ? dbGate('jobs') : earned.length ? `<div class="tbl" tabindex="0"><table class="plain"><thead><tr><th>Job</th>${OWN.map((o) => `<th class="n">${esc(OWNERS[o].short)}</th>`).join('')}<th class="n">Gear fund</th></tr></thead><tbody>${earned.map((b) => { const c = chosen(b); return `<tr class="click" data-act="openBooking" data-id="${b.id}" tabindex="0"><td><b>${esc(b.project || b.ref)}</b><div class="muted small">${esc(fmtDay(b.pickup))} · ${STATUS[b.status].label}</div></td>${OWN.map((o) => `<td class="n">${money(c.own[o].net)}</td>`).join('')}<td class="n">${money(c.fund)}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><b>No confirmed jobs yet</b><span>Payouts appear once a job is confirmed.</span></div>'}</div></div>
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
        ${total ? `<div class="tbl" tabindex="0"><table class="plain"><thead><tr><th>Owner</th><th class="n">Lines</th><th class="n">Value</th></tr></thead><tbody>${OWN.map((o) => { const mine = items.filter((i) => i.own === o); return `<tr><td>${ownerTag(o, true)}</td><td class="n">${mine.length}</td><td class="n">${money(sum(mine, (i) => (i.resale || 0) * i.qty))}</td></tr>`; }).join('')}<tr class="total"><td>Everything</td><td class="n">${items.length}</td><td class="n">${money(total)}</td></tr></tbody></table></div>` : (PREVIEW ? previewNote('What each piece is worth is hidden in the public preview, so the schedule has no values here. The download lists every piece without them.') : '<div class="note">This copy of the rate card has no resale values. The full rate card fills in the schedule.</div>')}
        <span class="muted small">${(() => { const need = items.filter((i) => (i.resale || 0) >= 500 && !serialsOf(i.id)).length; return need ? `${plural(need, 'piece')} worth $500 or more ${need === 1 ? 'has' : 'have'} no serial number yet. Insurers ask for them; add them from each piece's details on the Gear page.` : 'Serial numbers come from each piece\u2019s details on the Gear page.'; })()} Kit parts carry no value of their own so nothing is insured twice.</span></div></div>
      <div class="card"><div class="hd"><h2 class="t">Renters right now</h2></div><div class="bd flush">${state.dbState !== 'ready' ? dbGate('jobs') : active.length ? active.map((b) => { const p = protectionState(b); return `<div class="li click" data-act="openBooking" data-id="${b.id}" data-tab="paperwork" tabindex="0"><div class="grow"><div class="ttl">${esc(b.project || b.ref)}</div><div class="sub">Goes out ${esc(fmtDay(b.pickup))} · ${money(chosen(b).repl)} of gear · ${{ coi: 'certificate', hold: 'card hold', waiver: 'waiver' }[p.mode]}</div></div><span class="pill ${p.ok ? 'good' : 'warn'}">${p.ok ? 'Covered' : 'Not yet'}</span></div>`; }).join('') : '<div class="empty"><b>No active jobs</b></div>'}</div></div>
    </div>
  </section>`;
}

/* ---------- Storefront ---------- */
const storeSellable = (i) => i.rec != null && i.qty > 0 && i.kit !== 'Expendables' && !/^Transport/.test(i.notes) && i.id !== 'M-GRP-072';
function storeItems(group) {
  const g = STORE_GROUPS.find((x) => x.key === group);
  return state.cat.items.filter((i) => g && g.cats && g.cats.includes(i.cat) && storeSellable(i));
}
function itemPhoto(i) { const ph = photosOf(i.id)[0]; return ph ? `<button class="gphoto" data-act="item" data-id="${esc(i.id)}" aria-label="Photos of ${esc(i.name)}"><img src="${esc(ph.url)}" alt="" loading="lazy"></button>` : ''; }
function kitCover(p) { return photosOf(p.id)[0] || (p.ids.map((id) => photosOf(id)[0]).find(Boolean)) || null; }
function kitPhoto(p) { const ph = kitCover(p); return ph ? `<div class="gphoto"><img src="${esc(ph.url)}" alt="" loading="lazy"></div>` : ''; }
function kitThumb(p) { const ph = kitCover(p); return ph ? `<span class="icon-tile photo"><img src="${esc(ph.thumb || ph.url)}" alt="" loading="lazy"></span>` : tile('Kit'); }
function storeDatesOk() { const f = state.store.form; return f.pickup && f.ret && f.pickup <= f.ret; }
function kitFree(p) { const f = state.store.form; if (!storeDatesOk()) return null; return p.ids.every((id) => { const it = state.cat.byId[id]; return !it || freeOn(id, f.pickup, f.ret) >= Math.max(1, it.qty); }); }
function vStore() {
  const S = state.settings; const st = state.store; const f = st.form; const inCart = (k) => st.cart.some((x) => x.key === k); const dOk = storeDatesOk();
  const wk = dOk && S.weekendSpecial && weekendEligible({ pickup: f.pickup, returnDate: f.ret });
  const cards = st.group === 'packages'
    ? state.cat.packages.map((p) => { const op = crewFor(p.id); const c = st.cart.find((x) => x.key === p.id); const free = kitFree(p); return `<div class="gcard ${c ? 'in' : ''}" style="cursor:default"><div class="row between">${tile('Kit')}${free == null ? '' : free ? '<span class="pill good">Free those dates</span>' : '<span class="pill warn">Partly booked</span>'}</div>
        ${kitPhoto(p)}<div><h3>${esc(p.name)}</h3><div class="muted small">${esc(p.contents)}</div></div>
        ${op ? `<label class="check small"><input type="checkbox" data-storecrew="${p.id}" ${c && c.crew ? 'checked' : ''} ${c ? '' : 'disabled'}> Add a ${esc(op.role)} · +${money(op.rate)}/day</label>` : ''}
        <div class="foot2"><span class="price">${money(p.day)}<small> /day</small></span><button class="btn sm ${c ? '' : 'dark'}" data-act="cart" data-k="${p.id}">${c ? 'Added' : 'Add'}</button></div></div>`; }).join('')
    : storeItems(st.group).map((i) => `<div class="gcard ${inCart(i.id) ? 'in' : ''}" style="cursor:default">${itemPhoto(i)}<div class="row between">${photosOf(i.id).length ? '<span></span>' : tile(i.cat)}${dOk ? availPill(i, f.pickup, f.ret) : ''}</div><div><h3><button class="linkish" data-act="item" data-id="${esc(i.id)}">${esc(i.name)}</button></h3><div class="muted small">${i.qty > 1 ? `${i.qty} available` : ''}</div></div><div class="foot2"><span class="price">${money(i.rec)}<small> /day${perLens(i) ? ' per lens' : i.qty > 1 ? ' each' : ''}</small></span><button class="btn sm ${inCart(i.id) ? '' : 'dark'}" data-act="cart" data-k="${i.id}">${inCart(i.id) ? 'Added' : 'Add'}</button></div></div>`).join('');
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
  const client = state.role === 'client'; const u = state.user || {};
  if (client && !st.filled) { const rec = state.clientRecs[u.id] || {}; f.name = f.name || rec.name || u.name || ''; f.company = f.company || rec.company || ''; f.phone = f.phone || rec.phone || ''; st.filled = true; }
  return `<section class="view">
    ${state.role === 'admin' ? '<div class="note info">The page your clients see. Owners, values and internal notes never show here. Requests land in Jobs.</div>' : ''}
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
            ${client ? `<label class="field"><span>Email</span><input type="email" id="sf-email" value="${esc(u.email)}" disabled></label>` : state.role === 'admin' ? `<label class="field"><span>Email</span><input type="email" id="sf-email" data-sf="email" value="${esc(f.email)}"></label>` : ''}<label class="field"><span>Phone</span><input type="tel" id="sf-phone" data-sf="phone" value="${esc(f.phone)}"></label>
            <label class="field wide"><span>Project</span><input type="text" id="sf-proj" data-sf="project" value="${esc(f.project)}"></label>
            <label class="field wide"><span>Getting the gear</span><select id="sf-hand" data-sf="handoff">${Object.keys(HANDOFF).map((k) => `<option value="${k}" ${f.handoff === k ? 'selected' : ''}>${k === 'pickup' ? 'I’ll pick it up' : k === 'delivery' ? `Deliver it (${money(num(S.deliveryFee))} each way)` : `After-hours handoff (${money(num(S.afterHoursFee))} each way)`}</option>`).join('')}</select></label>
            <label class="field wide"><span>Covering the gear</span><select id="sf-prot" data-sf="protection"><option value="coi" ${f.protection === 'coi' ? 'selected' : ''}>I'll send an insurance certificate</option>${holdOk ? `<option value="hold" ${f.protection === 'hold' ? 'selected' : ''}>Hold the value on my card</option>` : ''}${S.waiverOn ? `<option value="waiver" ${f.protection === 'waiver' ? 'selected' : ''}>Add the damage waiver</option>` : ''}</select></label>
            ${num(S.studentPct) ? `<label class="check wide small"><input type="checkbox" id="sf-student" data-sf="student" ${f.student ? 'checked' : ''}> I'm a student (${num(S.studentPct)}% off gear)</label>` : ''}
            <label class="check wide small"><input type="checkbox" id="sf-exempt" data-sf="exempt" ${f.exempt ? 'checked' : ''}> We're making a film for sale and will send Form ST-121 (no sales tax)</label>
          </div>
          <button class="btn grad" data-act="sendRequest" ${st.cart.length && state.dbState === 'ready' ? '' : 'disabled'}>${state.role === 'guest' && MODE !== 'claude' ? 'Sign in and send request' : 'Send request'}</button>
          ${st.sentId && client ? `<button class="btn ghost sm" data-act="portal" data-id="${esc(st.sentId)}">See it in My bookings ${icon('arrow', 14)}</button>` : ''}
          ${state.dbState === 'off' ? `<span class="faint small">${MODE === 'live' ? 'The booking system is not reachable right now. Try again in a minute, or email us.' : 'Requests need the shared database, which is not available here.'}</span>` : state.role === 'guest' && MODE !== 'claude' ? '<span class="faint small">You get an account so you can follow the quote, sign and pay online.</span>' : ''}
        </div></aside></div>
    <div class="card"><div class="hd"><h2 class="t">Good to know</h2></div><div class="bd flush">${faqs.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></div>
  </section>`;
}

/* ---------- Roadmap ---------- */
function vRoadmap() {
  const r = state.road; const open = OPEN.filter((o) => r.showClosed || o[0] === 'Open');
  const MISSING = SNAP.missing || [], GROWTH = SNAP.growth || [], SEQ = SNAP.sequence || [], MARKET = SNAP.market || [];
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
      <div class="tbl" tabindex="0"><table class="plain"><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Used</th><th>Picked by</th><th>Status</th></tr></thead><tbody>${miss.map((m) => `<tr><td style="min-width:240px"><b>${esc(m[1])}</b><div class="muted small">${esc(m[6])}</div></td><td class="n">${m[2]}</td><td class="n">${m[2] ? money(m[4]) : '—'}</td><td>${esc(m[7])}</td><td>${bought[slug(m[1])] ? '<span class="pill good">Bought</span>' : m[11] === 'Cut' ? '<span class="pill">Cut</span>' : GE.has(m[0]) ? `<span class="pill ${m[8] === 'Yes' && m[9] === 'Yes' ? 'good' : 'warn'}">${esc(m[11])}</span>` : '<span class="pill">Camera, no sign-off</span>'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
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
        ${fld('studentPct', 'Student discount %', 'number')}${fld('returningPct', 'Returning-client discount %', 'number')}${fld('referralPct', 'Referral discount %', 'number')}
        ${tog('autoReturning', 'Give returning clients their discount automatically', 'Applied once when you open their next job. Take it off and it stays off.')}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Handoff</h2></div><div class="bd form">
        ${fld('deliveryFee', 'Delivery, each way', 'number')}${fld('afterHoursFee', 'After-hours handoff, each way', 'number', 'Starting points from NYC houses. Set your own.')}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Covering the gear</h2></div><div class="bd form">
        ${fld('glOcc', 'Renter liability, per claim', 'number')}${fld('glAgg', 'Renter liability, total', 'number')}${fld('holdMax', 'Card hold: gear worth up to', 'number')}${fld('holdMaxDays', 'Card hold: billed days up to', 'number')}
        ${tog('waiverOn', 'Offer a damage waiver', 'You carry the risk above the cap, so switch this on only once your own policy covers it.')}
        ${fld('waiverPct', 'Waiver price, % of gear rental', 'number')}${fld('waiverCapPct', 'Renter pays at most, % of value', 'number')}${fld('waiverMax', 'Waiver: gear worth up to', 'number')}${fld('lossOfUseCap', 'Loss of use cap, days', 'number')}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Getting paid</h2></div><div class="bd form">
        ${fld('payVenmo', 'Venmo username', 'text', 'Without the @. A Venmo business profile keeps rentals off your personal feed.')}${fld('payZelle', 'Zelle email or phone')}${fld('payZelleName', 'Name Zelle shows', 'text', 'So clients know they have the right account.')}
        ${MODE === 'claude' ? '<span class="faint small wide">Clients pay by card on the website version, once Stripe is set up.</span>' : tog('payCard', MODE === 'preview' ? 'Take cards (simulated in the preview)' : 'Take cards through Stripe', MODE === 'preview' ? 'On the live site this switches on Stripe checkout for deposits, balances and card holds.' : 'Switch this on once the Stripe step in SETUP.md is done. Clients pay deposits and balances by card, and card holds are placed and released from the job.')}
        ${fld('payNote', 'Anything else about paying', 'area', 'Shown to clients next to the payment options.', true)}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Terms</h2></div><div class="bd form">
        ${fld('governing', 'Governing law (state)')}${fld('paymentTerms', 'Payment terms', 'area', '', true)}${fld('lateRule', 'Late returns', 'area', '', true)}${fld('cancelRule', 'Cancellations', 'area', '', true)}</div></div>
      ${teamCard()}
      ${feedCard()}
      <div class="card"><div class="hd"><h2 class="t">Your website</h2></div><div class="bd form">
        ${fld('siteUrl', 'Where the site lives', 'url', `QR labels and links point here. Leave blank to use ${esc(MODE === 'claude' ? PUBLIC_SITE : (BE.siteUrl || PUBLIC_SITE))}.`, true)}</div></div>
      ${privateCard()}
      <div class="card"><div class="hd"><h2 class="t">Rate card</h2><span class="muted small">${c.source === 'sheet' ? `Synced ${esc(fmtStamp(c.syncedAt))}` : `As of ${esc(fmtLong(c.asOf))}`}</span></div><div class="bd stack">
        <p style="margin:0" class="small">The Google Sheet stays the one place gear is typed in. Syncing reads it with your Google Sheets connection and shares the result with everyone.</p>
        ${MODE === 'live' && state.privateDoc ? `<label class="field"><span>Sheet link, from the Apps Script (SETUP.md)</span><input type="url" data-ext="sheetlink" value="${esc((state.secrets.sheet && state.secrets.sheet.url) || '')}" placeholder="https://script.google.com/macros/s/…/exec?key=…"><small>Only the team can see this.</small></label>` : ''}
        ${SNAP.sheetId ? `<div class="actions"><button class="btn dark" data-act="sync" ${state.syncing || state.dbState !== 'ready' || !(state.mcpReady || MODE === 'live' && state.secrets.sheet && state.secrets.sheet.url) ? 'disabled' : ''}>${state.syncing ? 'Syncing…' : 'Sync from Google Sheet'}</button>${c.source === 'sheet' ? '<button class="btn" data-act="unsync">Use the built-in copy</button>' : ''}<a class="btn ghost" href="https://docs.google.com/spreadsheets/d/${esc(SNAP.sheetId)}/edit" target="_blank" rel="noopener">Open the sheet</a></div>` : (PREVIEW ? previewNote('The link to the Google Sheet is hidden in the public preview, so syncing is off. The rate card here is a copy with names, values and notes removed.') : '<span class="muted small">This copy of the rate card is not linked to a Google Sheet.</span>')}
        ${state.syncMsg ? `<div class="note ${/^Synced/.test(state.syncMsg) ? 'good' : 'bad'}">${esc(state.syncMsg)}</div>` : ''}
        ${SNAP.sheetId && !state.mcpReady && MODE !== 'live' ? `<span class="faint small">${HOSTED ? 'Syncing needs the Google Sheets connector, which this view cannot reach.' : 'Syncing works in the claude.ai version of the desk.'}</span>` : ''}</div></div>
    </div>
  </section>`;
}

/* ---------- Client portal ---------- */
const CLIENT_STATUS = { request: ['Request sent', 'warm'], quoted: ['Quote ready', 'info'], confirmed: ['Confirmed', 'good'], out: ['Out with you', 'live'], returned: ['Returned', ''], closed: ['All done', ''], cancelled: ['Cancelled', 'bad'] };
function cpill(st) { const x = CLIENT_STATUS[st] || [st, '']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; }
function photosOf(id) { return state.photos[id] || []; }
function thumb(it, sm) { const ph = it && photosOf(it.id)[0]; return ph ? `<span class="icon-tile photo ${sm ? 'sm' : ''}"><img src="${esc(ph.thumb || ph.url)}" alt="" loading="lazy"></span>` : tile((it && it.cat) || 'Kit', sm); }
function vMine() {
  if (state.dbState === 'wait') return `<section class="view">${hero('Your rentals', 'My <em class="s">bookings</em>')}<div class="card"><div class="empty"><span class="muted">Loading your bookings…</span></div></div></section>`;
  const one = state.portal.id && state.bookings.find((x) => x.id === state.portal.id);
  if (one) return portalJob(one);
  const list = state.bookings.slice().sort((a, b) => String(b.pickup || '').localeCompare(String(a.pickup || '')));
  return `<section class="view">
    ${hero('Your rentals', 'My <em class="s">bookings</em>', 'Quotes, agreements, payments and paperwork for everything you rent from us.', `<button class="btn grad" data-act="nav" data-v="storefront">${icon('plus', 16)} Rent gear</button>`)}
    <div class="card">${list.length ? `<div class="bd flush">${list.map((x) => { const todo = clientTodo(x); const bill = x.bill || {};
      return `<div class="li click job-li" data-act="portal" data-id="${esc(x.id)}" tabindex="0" role="button">${tile('Kit', true)}<div class="grow"><div class="ttl">${esc(x.project || 'Gear rental')}</div><div class="sub">${esc(x.ref)} · ${esc(fmtDay(x.pickup))} to ${esc(fmtDay(x.returnDate))}${todo.length ? ` · <b class="todo">${esc(todo[0].t)}${todo.length > 1 ? ` and ${todo.length - 1} more` : ''}</b>` : ''}</div></div><div class="meta">${cpill(x.status)}<b class="num tot">${bill.total ? money(bill.total) : '—'}</b></div></div>`; }).join('')}</div>`
      : `<div class="empty"><b>No bookings yet</b><span>Pick your dates and gear on the storefront and send a request. We reply with a written quote.</span><div class="actions" style="justify-content:center"><button class="btn grad" data-act="nav" data-v="storefront">Browse gear</button></div></div>`}</div>
  </section>`;
}
function portalJob(b) {
  const bill = b.bill || null; const todo = clientTodo(b); const S = state.settings;
  const lines = includedLines(b).map((ln) => { const it = state.cat.byId[ln.id] || { id: ln.id, name: ln.id, cat: 'Kit' }; return `<div class="gear-row">${thumb(it, true)}<div class="grow"><div class="ttl">${esc(it.name)}</div><div class="sub">${num(ln.qty) > 1 ? '× ' + num(ln.qty) : 'One'}</div></div></div>`; }).join('');
  const crew = (b.crew || []).filter((c) => inTier(c.tier || 'C', b.budget || 'A')).map((c) => `<div class="gear-row"><span class="icon-tile sm t-Sound">${icon('people', 17)}</span><div class="grow"><div class="ttl">${esc(c.role)}</div><div class="sub">${plural(num(c.people), 'person', 'people')} · ${plural(num(c.days), 'day')}</div></div></div>`).join('');
  const h = b.handoff || {};
  return `<section class="view portal">
    <div class="hero"><div style="min-width:0;flex:1 1 340px"><button class="btn ghost sm" data-act="portal" data-id="">${icon('back', 14)} All bookings</button>
      <div class="eyebrow" style="margin-top:12px">${esc(b.ref)}</div><h1>${esc(b.project || 'Gear rental')}</h1><p>${esc(fmtDay(b.pickup))} to ${esc(fmtDay(b.returnDate))} · ${cpill(b.status)}</p></div>
      ${bill ? `<div class="head-total"><div class="big">${money(bill.total)}</div><div class="muted small">${b.tax && b.tax.exempt ? 'no sales tax' : 'incl. sales tax'}</div></div>` : ''}</div>
    ${todo.length ? `<div class="card glow"><div class="hd"><h2 class="t">To do</h2><span class="muted small">${plural(todo.length, 'thing')}</span></div><div class="bd checklist todo-list">${todo.map((x) => `<div><span>${esc(x.t)}</span><a href="#p-${x.k}" data-act="jump" data-to="p-${x.k}">Go ${icon('arrow', 13)}</a></div>`).join('')}</div></div>` : b.status === 'confirmed' ? '<div class="note good">You are all set. See you at pickup.</div>' : ''}
    <div class="split"><div class="stack">
      <div class="card" id="p-quote"><div class="hd"><h2 class="t">${b.status === 'request' ? 'Your request' : 'Your quote'}</h2>${bill ? `<span class="muted small">${esc(BUDGET[bill.budget || 'A'].name)}</span>` : ''}</div>
        <div class="bd flush">${lines || '<div class="empty"><span>No gear on this one yet.</span></div>'}${crew}</div>
        <div class="bd">${bill && bill.rows ? rowsHtml(bill.rows) : `<div class="note">We will send a written quote with the multi-day rate, cover options and tax worked out, usually within a day.</div>`}
        ${b.status === 'request' ? `<div class="actions" style="margin-top:10px"><button class="btn ghost sm" data-act="clientCancel" data-id="${esc(b.id)}">Cancel this request</button></div>` : ''}</div></div>
      ${portalAgreement(b)}
      ${portalCover(b)}
      ${b.tax && b.tax.exempt ? portalTax(b) : ''}
    </div>
    <aside class="stack sticky">
      ${portalPay(b)}
      <div class="card"><div class="hd"><h2 class="t">When and where</h2></div><div class="bd stack" style="gap:8px">
        <span class="small">${icon(h.out === 'delivery' ? 'truck' : h.out === 'afterhours' ? 'moon' : 'store', 15)} <b>Out</b> ${esc(fmtLong(b.pickup))}${b.pickupTime ? ' · ' + esc(fmtTime(b.pickupTime)) : ''}<br><span class="muted">${esc(h.out === 'delivery' ? 'We deliver' + (h.address ? ' to ' + h.address : '') : h.out === 'afterhours' ? 'After-hours handoff, by arrangement' : S.pickup)}</span></span>
        <span class="small">${icon(h.back === 'delivery' ? 'truck' : h.back === 'afterhours' ? 'moon' : 'store', 15)} <b>Back</b> ${esc(fmtLong(b.returnDate))}${b.returnTime ? ' · by ' + esc(fmtTime(b.returnTime)) : ''}</span>
        ${b.prepDate ? `<span class="small">Prep visit ${esc(fmtLong(b.prepDate))}</span>` : ''}
        ${calButtons(b)}</div></div>
      <div class="card"><div class="hd"><h2 class="t">Questions?</h2></div><div class="bd small stack" style="gap:6px">${S.email ? `<a href="mailto:${esc(S.email)}?subject=${encodeURIComponent(b.ref)}">${esc(S.email)}</a>` : ''}${S.phone ? `<span>${esc(S.phone)}</span>` : ''}${S.afterHoursPhone ? `<span class="muted">After hours ${esc(S.afterHoursPhone)}</span>` : ''}<span class="muted">Quote ${esc(b.ref)} when you get in touch.</span></div></div>
    </aside></div>
  </section>`;
}
function portalAgreement(b) {
  const ct = b.contract || {};
  if (!['sent', 'signed'].includes(ct.status) || !ct.html) return `<div class="card" id="p-sign"><div class="hd"><h2 class="t">Rental agreement</h2><span class="pill">${b.status === 'request' ? 'Comes with the quote' : 'Being prepared'}</span></div><div class="bd"><span class="muted small">You read and sign it right here.</span></div></div>`;
  const signed = ct.status === 'signed';
  return `<div class="card" id="p-sign"><div class="hd"><h2 class="t">Rental agreement</h2><span class="pill ${signed ? 'good' : 'info'}">${signed ? 'Signed' : 'Ready to sign'}</span></div>
    <div class="bd stack"><div class="paper portal-paper" tabindex="0" aria-label="The rental agreement">${ct.html}${signed && ct.signature ? sigBlock(ct) : ''}</div>
    ${signed ? `<div class="note good">${icon('check', 16)} Signed by ${esc(ct.signer)} on ${esc(fmtLong(ct.signedOn))}.</div><div class="actions"><button class="btn sm" data-act="dlSigned" data-id="${esc(b.id)}">Download a copy</button></div>` : signForm(b)}</div></div>`;
}
function signForm(b) {
  const sg = state.sign;
  return `<div class="sign-form stack"><label class="field"><span>Your full name</span><input type="text" id="sg-name" data-sign="name" value="${esc(sg.name)}" autocomplete="name"></label>
    <div class="field"><span id="sigLabel">Sign in the box</span><div class="sigpad-wrap"><canvas id="sigPad" class="sigpad" role="img" aria-labelledby="sigLabel"></canvas><button type="button" class="btn ghost sm sig-clear" data-act="sigClear">Clear</button></div><small>With a finger, a stylus or the mouse.</small></div>
    <label class="check small"><input type="checkbox" id="sg-consent" data-sign="consent" ${sg.consent ? 'checked' : ''}><span>I have read the agreement. I agree to sign it electronically, and that my electronic signature counts the same as one on paper.</span></label>
    <button class="btn grad" data-act="clientSign" data-id="${esc(b.id)}" ${sg.busy ? 'disabled' : ''}>${sg.busy ? 'Signing…' : `${icon('pen', 16)} Sign the agreement`}</button></div>`;
}
function uploadForm(kind, bookingId) {
  const u = state.upload; const f = u[kind]; const busy = u.busy === kind;
  return `<div class="upl"><label class="field"><span>${kind === 'coi' ? 'Your certificate, as a PDF or photo' : 'Your signed ST-121, as a PDF or photo'}</span><input type="file" accept="application/pdf,image/*" data-upfile="${kind}">${f ? `<small>Chosen: ${esc(f.name)}</small>` : ''}</label>
    ${kind === 'coi' ? `<label class="field"><span>Policy expires</span><input type="date" data-upexp="${kind}" value="${esc(u[kind + 'Exp'] || '')}"></label>` : ''}
    <button class="btn dark sm" data-act="uploadDoc" data-kind="${kind}" data-id="${esc(bookingId || '')}" ${busy ? 'disabled' : ''}>${busy ? 'Sending…' : 'Send it'}</button></div>`;
}
const COI_CLIENT = { none: ['Needed', 'warn'], requested: ['Needed', 'warn'], received: ['Received, checking', 'info'], verified: ['Accepted', 'good'], rejected: ['Needs another look', 'bad'] };
function portalCover(b) {
  const mode = b.protection || 'coi'; const S = state.settings; const bill = b.bill || {}; const coi = b.coi || {};
  if (mode === 'waiver') return `<div class="card" id="p-coi"><div class="hd"><h2 class="t">Damage waiver</h2><span class="pill ${b.waiver && b.waiver.accepted ? 'good' : 'info'}">${b.waiver && b.waiver.accepted ? 'Accepted' : 'Accepted when you sign'}</span></div><div class="bd small">The waiver caps what you pay for accidental damage at ${num(S.waiverCapPct)}% of the gear's value. It does not cover theft or loss. The details are in the agreement.</div></div>`;
  if (mode === 'hold') return `<div class="card" id="p-coi"><div class="hd"><h2 class="t">Card hold</h2><span class="pill ${b.hold && b.hold.placed ? 'good' : 'warn'}">${b.hold && b.hold.placed ? 'Placed' : 'Needed before pickup'}</span></div><div class="bd small">Instead of an insurance certificate, we hold ${bill.repl ? money(bill.repl) : 'the gear’s value'} on your card while the gear is out, and release it when everything is back. Place it under Payments${b.hold && b.hold.placed ? '' : ' in the week before pickup'}.</div></div>`;
  const st = COI_CLIENT[coi.status || 'none'] || COI_CLIENT.none;
  return `<div class="card" id="p-coi"><div class="hd"><h2 class="t">Insurance certificate</h2><span class="pill ${st[1]}">${st[0]}</span></div>
    <div class="bd stack"><span class="small">Your policy needs to cover rented equipment worth at least <b>${bill.repl ? money(bill.repl) : 'the value on your quote'}</b>, carry ${money(num(S.glOcc))} of general liability, name ${esc(S.legalName || S.company)} as additional insured and loss payee, and run through ${esc(fmtLong(b.returnDate))}. No policy? A broker can usually bind short-term production cover the same day.</span>
    ${coi.file ? `<div class="doc-row">${icon('doc', 16)}<span class="grow small">Your certificate${coi.expires ? ` · expires ${esc(fmtDay(coi.expires))}` : ''}</span><button class="btn ghost sm" data-act="openDoc" data-path="${esc(coi.file)}">Open</button></div>` : ''}
    ${coi.status !== 'verified' && b.status !== 'request' ? uploadForm('coi', b.id) : ''}</div></div>`;
}
function portalTax(b) {
  const t = b.tax || {};
  return `<div class="card" id="p-tax"><div class="hd"><h2 class="t">No sales tax: ST-121</h2><span class="pill ${t.cert ? 'good' : t.certFile ? 'info' : 'warn'}">${t.cert ? 'On file' : t.certFile ? 'Received, checking' : 'Needed'}</span></div>
    <div class="bd stack"><span class="small">New York lets productions rent gear tax-free when it's used to make a film for sale. Fill in and sign Form ST-121 (<a href="https://www.tax.ny.gov/pdf/current_forms/st/st121_fill_in.pdf" target="_blank" rel="noopener">get the form</a>) and send it here before pickup, or sales tax applies.</span>
    ${t.certFile ? `<div class="doc-row">${icon('doc', 16)}<span class="grow small">Your ST-121</span><button class="btn ghost sm" data-act="openDoc" data-path="${esc(t.certFile)}">Open</button></div>` : ''}
    ${!t.cert && !t.certFile ? uploadForm('st121', b.id) : ''}</div></div>`;
}
const DOC_KIND = { coi: 'Insurance certificate', st121: 'ST-121 exempt use certificate' };
function docExpiry(d) { if (!d.expires) return ''; const left = diffDays(todayStr(), d.expires); return left < 0 ? `<span class="pill bad">Expired ${esc(fmtDay(d.expires))}</span>` : left <= 30 ? `<span class="pill warn">Expires ${esc(fmtDay(d.expires))}</span>` : `<span class="pill">Expires ${esc(fmtDay(d.expires))}</span>`; }
function vAccount() {
  const u = state.user || {}; const rec = state.clientRecs[u.id] || {};
  const f = state.profile || (state.profile = { name: rec.name || u.name || '', company: rec.company || '', phone: rec.phone || '' });
  const docs = (rec.docs || []).slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  return `<section class="view">
    ${hero('Your account', 'Details and <em class="s">documents</em>', 'Keep an insurance certificate and ST-121 on file and we can use them for every rental.')}
    <div class="grid2">
      <div class="card"><div class="hd"><h2 class="t">You</h2></div><div class="bd form">
        <label class="field"><span>Name</span><input type="text" id="pf-name" data-profile="name" value="${esc(f.name)}" autocomplete="name"></label>
        <label class="field"><span>Company</span><input type="text" id="pf-company" data-profile="company" value="${esc(f.company)}" autocomplete="organization"></label>
        <label class="field"><span>Phone</span><input type="tel" id="pf-phone" data-profile="phone" value="${esc(f.phone)}" autocomplete="tel"></label>
        <label class="field"><span>Email</span><input type="email" value="${esc(u.email)}" disabled></label>
        <div class="actions wide"><button class="btn dark" data-act="saveProfile">Save</button><button class="btn ghost" data-act="signOut">${icon('logout', 15)} Sign out</button></div></div></div>
      <div class="card"><div class="hd"><h2 class="t">On file</h2><span class="muted small">${plural(docs.length, 'document')}</span></div><div class="bd stack">
        ${docs.length ? docs.map((d) => `<div class="doc-row">${icon('doc', 16)}<span class="grow small"><b>${esc(DOC_KIND[d.kind] || d.kind)}</b><br><span class="muted">${esc(d.name || '')} · ${esc(fmtDay(String(d.at || '').slice(0, 10)))}</span></span>${docExpiry(d)}<span class="pill ${d.status === 'ok' ? 'good' : d.status === 'rejected' ? 'bad' : ''}">${d.status === 'ok' ? 'Accepted' : d.status === 'rejected' ? 'Not accepted' : 'Checking'}</span>${d.file ? `<button class="btn ghost sm" data-act="openDoc" data-path="${esc(d.file)}">Open</button>` : ''}</div>`).join('') : '<span class="muted small">Nothing yet.</span>'}
        <details><summary class="small" style="cursor:pointer;font-weight:600">Add an insurance certificate</summary><div style="margin-top:10px">${uploadForm('coi', '')}</div></details>
        <details><summary class="small" style="cursor:pointer;font-weight:600">Add an ST-121</summary><div style="margin-top:10px">${uploadForm('st121', '')}</div></details>
      </div></div>
    </div>
  </section>`;
}

function teamCard() {
  if (MODE === 'claude') return '';
  const me = normKey(state.user && state.user.email); const a = state.teamAdd;
  return `<div class="card"><div class="hd"><h2 class="t">Team</h2><span class="muted small">${plural(state.team.length, 'person', 'people')}</span></div><div class="bd stack">
    <p class="small muted" style="margin:0">Everyone listed here sees the whole desk once they sign up with this email and confirm it. Everyone else who signs up is a client.${MODE === 'preview' ? ' In the preview this list is only an example.' : ''}</p>
    ${state.team.length ? `<div>${state.team.map((x) => `<div class="pick"><span class="av sm" aria-hidden="true">${esc(initials(x.name || x.email))}</span><span class="grow">${esc(x.name || x.email)}${x.name ? `<br><span class="muted small">${esc(x.email)}</span>` : ''}${normKey(x.email) === me ? ' <span class="pill">you</span>' : ''}</span>${state.team.length > 1 ? `<button class="x" data-act="teamRemove" data-e="${esc(x.email)}" aria-label="Remove ${esc(x.email)}">×</button>` : ''}</div>`).join('')}</div>` : ''}
    <div class="row wrap" style="gap:8px"><input type="email" data-ext="teamadd" data-k="email" value="${esc(a.email)}" placeholder="partner@example.com" aria-label="Email" style="flex:2;min-width:180px"><input type="text" data-ext="teamadd" data-k="name" value="${esc(a.name)}" placeholder="Name" aria-label="Name" style="flex:1;min-width:120px"><button class="btn dark" data-act="teamAdd">Add</button></div></div></div>`;
}
function feedCard() {
  if (MODE === 'claude') return '';
  const tok = state.secrets.calendar && state.secrets.calendar.token;
  const url = tok && BE.feedUrl ? BE.feedUrl(tok) : '';
  return `<div class="card"><div class="hd"><h2 class="t">Calendar link</h2></div><div class="bd stack">
    <p class="small muted" style="margin:0">Every pickup and return on your own calendar, kept up to date, with a reminder the day before each return. Anyone with the link can see the jobs, so keep it to the team.</p>
    ${MODE === 'preview' ? '<span class="faint small">The live site makes the link. Here, download the schedule instead.</span>' : url ? `<div class="copyrow"><input type="text" value="${esc(url)}" readonly aria-label="Calendar link" style="flex:1;min-width:0"><button class="btn sm" data-act="copyText" data-t="${esc(url)}">Copy</button></div>
      <span class="faint small">Google Calendar: Other calendars, +, From URL. Apple Calendar: File, New Calendar Subscription. Google refreshes it every few hours.</span><div class="actions"><button class="btn ghost sm" data-act="feedMake">Make a new link</button></div>` : '<div class="actions"><button class="btn dark sm" data-act="feedMake">Make the link</button></div>'}
    <div class="actions"><button class="btn ghost sm" data-act="icsAll">${icon('calendar', 14)} Download every job (.ics)</button></div></div></div>`;
}
function privateCard() {
  if (MODE !== 'live') return '';
  const p = state.privateDoc; let meta = null; try { meta = p && JSON.parse(p.payload); } catch (_) { meta = null; }
  return `<div class="card"><div class="hd"><h2 class="t">Full rate card</h2><span class="pill ${p ? 'good' : 'warn'}">${p ? 'Loaded' : 'Not loaded'}</span></div><div class="bd stack">
    <p class="small muted" style="margin:0">Owner names, what each piece is worth, notes, the buying list and research. Only the team can read it; the storefront shows names, quantities and day rates.</p>
    ${p ? `<span class="small">As of ${esc(fmtLong(meta && meta.asOf))} · ${meta && meta.rows ? plural(meta.rows.length, 'item') : ''}${p.loadedAt ? ' · loaded ' + esc(fmtStamp(p.loadedAt)) : ''}</span>` : '<span class="small">Load <b>rate-card.private.json</b> (made by tools/export-private.js, see SETUP.md).</span>'}
    <label class="btn sm ${p ? '' : 'dark'}" style="position:relative;overflow:hidden">${p ? 'Load a newer copy' : 'Load it'}<input type="file" accept="application/json,.json" data-ext="privatefile" style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="Full rate card file"></label></div></div>`;
}

/* ---------- Drawers ---------- */
function focusFirst() { setTimeout(() => { const el = $('#drawerHost input:not([disabled]), #drawerHost button.option-btn'); if (el) el.focus(); }, 30); }
function authMsg(e) {
  const m = (e && e.message) || '';
  if (/invalid login/i.test(m)) return 'That email and password don’t match. Try again, or reset your password.';
  if (/not confirmed/i.test(m)) return 'Confirm your email first: open the link we sent you.';
  if (/already registered|already exists/i.test(m)) return 'There’s already an account with that email. Sign in instead.';
  if (/rate limit|too many|security purposes/i.test(m)) return 'Too many tries for now. Wait a minute, then try again.';
  return m || 'That didn’t work. Try again.';
}
function authDrawer() {
  const a = state.auth;
  const head = `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer auth" role="dialog" aria-modal="true" aria-labelledby="authTitle"><button class="btn ghost sm close" data-act="closeDrawer">Close</button>`;
  const keep = a.then === 'sendRequest' ? '<div class="note info">Your picks stay in the basket.</div>' : '';
  if (MODE === 'preview') return head + `<h2 id="authTitle">Look around as someone else</h2><p class="muted" style="margin:0">The preview has no real accounts. On the live site, clients sign up with their email and the team signs in to the whole desk. Pick who to be:</p>${keep}
    <div class="stack">${[['client', 'A client', 'Request gear, read and sign the quote, pay, and send insurance.'], ['admin', 'An owner', 'The whole desk: jobs, gear, money, clients and settings.'], ['guest', 'A visitor', 'Someone browsing the storefront without signing in.']].map(([k, t, d]) => `<button class="option-btn" data-act="demoRole" data-r="${k}" aria-pressed="${state.role === k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div></aside>`;
  const titles = { in: 'Sign in', up: 'Create your account', reset: 'Reset your password', newpw: 'Choose a new password', check: 'Check your email' };
  const body = a.mode === 'check' ? `<p style="margin:0">We sent a link to <b>${esc(a.email)}</b>. Open it on this device to carry on.</p><button class="btn" data-act="authMode" data-m="in">Back to sign in</button>`
    : `<form class="stack" novalidate>
      ${a.mode === 'up' ? `<label class="field"><span>Your name</span><input type="text" id="au-name" data-auth="name" value="${esc(a.name)}" autocomplete="name"></label>` : ''}
      ${a.mode !== 'newpw' ? `<label class="field"><span>Email</span><input type="email" id="au-email" data-auth="email" value="${esc(a.email)}" autocomplete="email" required></label>` : ''}
      ${a.mode !== 'reset' ? `<label class="field"><span>${a.mode === 'newpw' ? 'New password' : 'Password'}</span><input type="password" id="au-pw" data-auth="password" value="${esc(a.password)}" autocomplete="${a.mode === 'in' ? 'current-password' : 'new-password'}" required>${a.mode !== 'in' ? '<small>At least 8 characters.</small>' : ''}</label>` : ''}
      ${a.msg ? `<div class="note ${a.tone || 'bad'}" role="alert">${esc(a.msg)}</div>` : ''}
      <button class="btn grad" type="submit" data-act="authSubmit" ${a.busy ? 'disabled' : ''}>${a.busy ? 'One moment…' : { in: 'Sign in', up: 'Create account', reset: 'Send the reset link', newpw: 'Save the new password' }[a.mode]}</button></form>
    <div class="auth-alt small">${a.mode === 'in' ? '<a href="#" data-act="authMode" data-m="up">New here? Create an account</a><a href="#" data-act="authMode" data-m="reset">Forgot your password?</a><a href="#" data-act="authMagic">Email me a sign-in link instead</a>' : a.mode === 'up' ? '<a href="#" data-act="authMode" data-m="in">Already have an account? Sign in</a>' : '<a href="#" data-act="authMode" data-m="in">Back to sign in</a>'}</div>
    ${a.mode === 'up' ? '<p class="faint small" style="margin:0">We use your email for quotes, agreements and receipts. Nothing else.</p>' : ''}`;
  return head + `<h2 id="authTitle">${titles[a.mode] || 'Sign in'}</h2>${keep}${body}</aside>`;
}
function acctDrawer() {
  const u = state.user || {};
  return `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Account"><button class="btn ghost sm close" data-act="closeDrawer">Close</button>
    <div class="row"><span class="av lg" aria-hidden="true">${esc(initials(u.name || u.email))}</span><div><h2>${esc(u.name || 'Your account')}</h2><div class="muted small">${esc(u.email || '')}</div></div></div>
    <div><span class="pill ${state.role === 'admin' ? 'good' : ''}">${state.role === 'admin' ? 'On the team: the whole desk' : 'Client account'}</span></div>
    <div class="stack">${state.role === 'client' ? '<button class="btn" data-act="nav" data-v="mine">My bookings</button><button class="btn" data-act="nav" data-v="account">Details and documents</button>' : '<button class="btn" data-act="nav" data-v="settings">Settings</button>'}
      <button class="btn ghost" data-act="signOut">${icon('logout', 15)} Sign out</button>
      ${MODE === 'preview' ? '<button class="btn ghost sm" data-act="authOpen">Look around as someone else</button>' : ''}</div></aside>`;
}
function renderDrawer() {
  const host = $('#drawerHost'); const d = state.drawer;
  if (!d) { host.innerHTML = ''; return; }
  if (d.kind === 'pick') { host.innerHTML = pickDrawer(); return; }
  if (d.kind === 'auth') { host.innerHTML = authDrawer(); return; }
  if (d.kind === 'acct') { host.innerHTML = acctDrawer(); return; }
  if (d.kind === 'scan' && $('#scanVideo')) { const l = $('#scanList'); if (l) l.innerHTML = scanList(); return; }
  if (d.kind in EXTRA_DRAWERS) { host.innerHTML = EXTRA_DRAWERS[d.kind](d); return; }
  const it = state.cat.byId[d.id]; if (!it) { state.drawer = null; host.innerHTML = ''; return; }
  if (state.role !== 'admin') { host.innerHTML = publicItemDrawer(it); return; }
  const t = todayStr(); const u = usage(it.id, t, addDays(t, 60));
  const pk = state.cat.packages.filter((p) => p.ids.includes(it.id));
  const qs = (OPEN_BY_ITEM[it.id] || []).map((o) => ({ t: `${o[1]}: ${o[4]}`, d: o[5] })).concat(DATA_CHECKS.filter((x) => x.id === it.id).map((x) => ({ t: x.title, d: x.text })));
  const targets = state.bookings.filter((b) => ['request', 'quoted', 'confirmed'].includes(b.status));
  host.innerHTML = `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(it.name)}">
    <button class="btn ghost sm close" data-act="closeDrawer">Close</button>
    <div class="row">${tile(it.cat)}<div class="grow"><div class="muted small">${esc(CAT_LABEL[it.cat] || it.cat)}${it.kit ? ' · ' + esc(it.kit) : ''}</div>${ownerTag(it.own, true)}</div></div>
    <h2>${esc(it.name)}</h2>
    ${photoGallery(it.id, true, it.name)}
    ${it.rec != null ? `<div><span class="big">${money(it.rec)}</span><span class="muted"> /day${perLens(it) ? ' per lens' : ''}</span>${it.lo != null && it.hi != null ? `<div class="muted small" style="margin-top:6px">Market runs ${money(it.lo)} to ${money(it.hi)} a day. Quote from this rate and discount on purpose.</div>` : ''}</div>` : `<div class="note">${esc(it.basis || 'Included in the kit rate.')}</div>`}
    <dl class="kv"><dt>In the pool</dt><dd>${it.qty}</dd>${it.resale != null ? `<dt>Worth</dt><dd>${money(it.resale)}${it.qty > 1 ? ` each · ${money(it.resale * it.qty)}` : ''}</dd>` : ''}${it.payback != null ? `<dt>Pays for itself in</dt><dd>${plural(it.payback, 'rental day')}</dd>` : ''}${it.rent ? `<dt>How often it goes out</dt><dd>${esc(it.rent)}</dd>` : ''}${NOMINAL_WATTS[it.id] ? `<dt>Power</dt><dd>${NOMINAL_WATTS[it.id].toLocaleString('en-US')} W nominal</dd>` : ''}<dt>Next 60 days</dt><dd>${u.who.length ? u.who.map((w) => esc(w.b.project || w.b.ref)).join(', ') : 'Free'}</dd><dt>ID</dt><dd class="faint">${esc(it.id)}</dd></dl>
    ${previewNote('Its value, market price range, notes and where the rate came from are hidden in the public preview.')}
    ${qs.map((q) => `<div class="note bad"><b>${esc(q.t)}</b><br>${esc(q.d)}</div>`).join('')}
    ${it.notes && !/^(RATE IS PER LENS\.|Transport, not billed\.)$/.test(it.notes) ? `<div><div class="eyebrow">Notes</div><p style="margin:0">${esc(it.notes)}</p></div>` : ''}
    ${it.basis && it.rec != null ? `<div><div class="eyebrow">Where the rate came from</div><p style="margin:0" class="muted">${esc(it.basis)}</p></div>` : ''}
    ${pk.length ? `<div><div class="eyebrow">In these kits</div><div class="chips">${pk.map((p) => `<span class="pill">${esc(p.name)}</span>`).join('')}</div></div>` : ''}
    ${it.qty > 0 ? gearInfo(it) : ''}
    ${it.rec != null && it.qty > 0 && state.dbState === 'ready' && !state.readOnly ? `<div class="stack" style="gap:8px"><div class="eyebrow" style="margin:0">Add to a job</div><div class="row"><select id="dr-target" class="grow" aria-label="Job">${targets.map((b) => `<option value="${b.id}">${esc(b.project || b.ref)} · ${esc(fmtDay(b.pickup))}</option>`).join('')}<option value="__new">A new job</option></select><button class="btn dark" data-act="drawerAdd" data-id="${it.id}">Add</button></div></div>` : ''}
  </aside>`;
}
function publicItemDrawer(it) {
  const pk = state.cat.packages.filter((p) => p.ids.includes(it.id)); const inCart = state.store.cart.some((c) => c.key === it.id);
  return `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(it.name)}">
    <button class="btn ghost sm close" data-act="closeDrawer">Close</button>
    <div class="row">${thumb(it)}<div class="grow"><div class="muted small">${esc(CAT_LABEL[it.cat] || it.cat)}</div></div></div>
    <h2>${esc(it.name)}</h2>
    ${photoGallery(it.id, false, it.name)}
    ${it.rec != null ? `<div><span class="big">${money(it.rec)}</span><span class="muted"> /day${perLens(it) ? ' per lens' : ''}</span></div>` : '<div class="note">Rented as part of a kit.</div>'}
    <dl class="kv"><dt>How many we have</dt><dd>${it.qty}</dd>${NOMINAL_WATTS[it.id] ? `<dt>Power</dt><dd>${NOMINAL_WATTS[it.id].toLocaleString('en-US')} W</dd>` : ''}</dl>
    ${pk.length ? `<div><div class="eyebrow">Also in these kits</div><div class="chips">${pk.map((p) => `<span class="pill">${esc(p.name)}</span>`).join('')}</div></div>` : ''}
    ${storeSellable(it) ? `<button class="btn ${inCart ? '' : 'dark'}" data-act="cart" data-k="${esc(it.id)}">${inCart ? 'In your request' : 'Add to your request'}</button>` : ''}
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

/* ================= photos ================= */
function photoStore() { return MODE === 'claude' ? !!assetsNs : !!BE.files; }
function photoGallery(id, admin, name) {
  const list = photosOf(id); const canAdd = admin && state.role === 'admin' && !state.readOnly && photoStore(); const busy = state.photoBusy === id;
  if (!list.length && !canAdd) return '';
  return `<div class="gallery">${list.length ? `<a class="g-main" href="${esc(list[0].url)}" target="_blank" rel="noopener"><img src="${esc(list[0].url)}" alt="${esc(name || 'Photo')}"></a>` : ''}
    <div class="g-thumbs">${list.map((ph, i) => `<div class="g-th"><a href="${esc(ph.url)}" target="_blank" rel="noopener" aria-label="Photo ${i + 1}"><img src="${esc(ph.thumb || ph.url)}" alt="" loading="lazy"></a>${canAdd ? `<div class="g-acts">${i ? `<button class="x" data-act="photoCover" data-id="${esc(id)}" data-i="${i}" aria-label="Make photo ${i + 1} the cover" title="Make it the cover">★</button>` : ''}<button class="x" data-act="photoRemove" data-id="${esc(id)}" data-i="${i}" aria-label="Remove photo ${i + 1}">×</button></div>` : ''}</div>`).join('')}
      ${canAdd ? `<label class="g-add ${busy ? 'busy' : ''}">${icon('image', 18)}<span>${busy ? 'Adding…' : list.length ? 'Add' : 'Add photos'}</span><input type="file" accept="image/*" multiple data-ext="photos" data-id="${esc(id)}" ${busy ? 'disabled' : ''}></label>` : ''}</div></div>`;
}
function loadImg(file) { return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error(`${file.name} is not an image this browser can read.`)); img.src = URL.createObjectURL(file); }); }
async function shrinkImage(file, max, q) {
  let src = null; try { src = await createImageBitmap(file); } catch (_) { src = await loadImg(file); }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight; const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('That image could not be read.'))), 'image/jpeg', q));
}
async function storePhoto(id, full, small) {
  if (MODE === 'claude') { const a = await assetsNs.upload(full); const t = await assetsNs.upload(small); return { url: a.url, thumb: t.url, ref: `asset:${a.id},${t.id}` }; }
  return BE.files.photo(id, full, small);
}
async function dropPhoto(ref) {
  if (!ref) return;
  if (ref.startsWith('asset:')) { if (assetsNs) for (const x of ref.slice(6).split(',')) { try { await assetsNs.delete(x); } catch (_) { /* already gone */ } } return; }
  if (BE.files) { try { await BE.files.removePhoto(ref); } catch (_) { /* the listing is what matters */ } }
}
async function savePhotos(id, list) { await db.doc('photos/' + docKey(id)).set({ itemId: id, list, updatedAt: new Date().toISOString() }); state.photos = Object.assign({}, state.photos, { [id]: list }); }
async function addPhotos(id, files) {
  files = files.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name)).slice(0, 12); if (!files.length || !db) return;
  state.photoBusy = id; render();
  const list = photosOf(id).slice(); let added = 0;
  for (const f of files) {
    try { const [full, small] = await Promise.all([shrinkImage(f, 1600, 0.82), shrinkImage(f, 480, 0.78)]); const up = await storePhoto(id, full, small); list.push({ url: up.url, thumb: up.thumb, ref: up.ref || '', at: new Date().toISOString() }); added++; }
    catch (e) { toast((e && e.message) || `${f.name} could not be added.`); }
  }
  if (added) { try { await savePhotos(id, list); toast(`${plural(added, 'photo')} added.`); } catch (e) { writeError(e); } }
  state.photoBusy = ''; render();
}

/* ================= serial numbers ================= */
const serialsList = (id) => ((state.gear[id] && state.gear[id].serials) || []);
const serialsOf = (id) => serialsList(id).filter(Boolean).join(', ');
function gearInfo(it) {
  const g = state.gear[it.id] || {}; const serials = g.serials || []; const n = Math.max(1, it.qty); const ro = state.readOnly;
  const fields = n <= 12 ? Array.from({ length: n }, (_, k) => `<label class="mini"><span>${n > 1 ? 'No. ' + (k + 1) : 'Serial'}</span><input type="text" data-ext="gear" data-id="${esc(it.id)}" data-k="serial" data-n="${k}" value="${esc(serials[k] || '')}" ${ro ? 'disabled' : ''} autocomplete="off" spellcheck="false" aria-label="Serial number ${k + 1}"></label>`).join('')
    : `<label class="field wide"><span>Serials, one per line</span><textarea rows="4" data-ext="gear" data-id="${esc(it.id)}" data-k="serials" ${ro ? 'disabled' : ''}>${esc(serials.join('\n'))}</textarea></label>`;
  return `<div class="stack" style="gap:10px"><div class="eyebrow" style="margin:0">Serial numbers</div><div class="serials">${fields}</div>
    <div class="form" style="grid-template-columns:1fr 1fr"><label class="field"><span>Paid, each</span><input type="number" min="0" step="1" data-ext="gear" data-id="${esc(it.id)}" data-k="paid" value="${esc(g.paid != null ? g.paid : '')}" placeholder="${it.resale != null ? esc(it.resale) : ''}" ${ro ? 'disabled' : ''}></label><label class="field"><span>Bought on</span><input type="date" data-ext="gear" data-id="${esc(it.id)}" data-k="boughtOn" value="${esc(g.boughtOn || '')}" ${ro ? 'disabled' : ''}></label></div>
    <span class="faint small">Serials go on the insurance schedule and the check-out sheet. What you paid feeds the Money page.</span>
    <div class="actions"><button class="btn sm" data-act="labelsOpen" data-id="${esc(it.id)}">${icon('qr', 14)} Print ${it.qty > 1 ? 'its labels' : 'its label'}</button></div></div>`;
}
const gearTimers = {};
function saveGearSoon(id) {
  clearTimeout(gearTimers[id]);
  gearTimers[id] = setTimeout(async () => {
    if (!db) return; const g = Object.assign({}, state.gear[id], { itemId: id, updatedAt: new Date().toISOString() });
    Object.keys(g).forEach((k) => { if (k[0] === '_') delete g[k]; });
    while (g.serials && g.serials.length && !g.serials[g.serials.length - 1]) g.serials.pop();
    try { await db.doc('gear/' + docKey(id)).set(g); } catch (e) { writeError(e); }
  }, 700);
}

/* ================= labels ================= */
const PUBLIC_SITE = 'https://manu3931.github.io/Agency/';
function siteBase() { const u = String(state.settings.siteUrl || BE.siteUrl || (MODE === 'claude' ? PUBLIC_SITE : location.origin + location.pathname)).split('#')[0]; return /^https?:/.test(u) ? u : PUBLIC_SITE; }
const scanUrl = (id, unit) => `${siteBase()}#scan/${id}${unit ? '/' + unit : ''}`;
function qrSvg(text) { if (typeof qrcode !== 'function') return ''; const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true }); }
function labelItems() {
  const L = state.label; const pool = state.cat.items.filter((i) => i.qty > 0 && i.cat !== 'Consumable');
  const list = L.scope === 'all' ? pool : L.scope.startsWith('item:') ? pool.filter((i) => i.id === L.scope.slice(5)) : pool.filter((i) => i.cat === L.scope);
  return list.map((it) => ({ it, units: L.perUnit && it.qty > 1 ? Array.from({ length: it.qty }, (_, k) => k + 1) : [0] }));
}
function labelSheetHtml(list, size) {
  const S = state.settings; const cells = [];
  list.forEach((x) => x.units.forEach((u) => {
    const it = x.it; const sn = u ? (serialsList(it.id)[u - 1] || '') : serialsOf(it.id);
    cells.push(`<div class="lb"><div class="qr">${qrSvg(scanUrl(it.id, u))}</div><div class="tx"><b>${esc(it.name)}</b><span>${esc(it.id)}${u ? ` · ${u} of ${it.qty}` : ''}</span>${sn ? `<span>S/N ${esc(sn)}</span>` : ''}<i>${esc(S.company || '')}</i></div></div>`);
  }));
  const per = size === '5160' ? 30 : 12; const pages = [];
  for (let i = 0; i < cells.length; i += per) pages.push(`<div class="page">${cells.slice(i, i + per).join('')}</div>`);
  const css = size === '5160'
    ? '@page{size:letter;margin:0}body{margin:0}.page{box-sizing:border-box;width:8.5in;height:11in;padding:.5in .1875in 0;display:grid;grid-template-columns:repeat(3,2.625in);column-gap:.125in;grid-auto-rows:1in;align-content:start;break-after:page}.lb{box-sizing:border-box;height:1in;padding:.08in .12in;display:flex;gap:.08in;align-items:center;overflow:hidden}.qr{width:.8in;height:.8in;flex:none}.tx{font:6.5pt/1.25 Arial,sans-serif;display:flex;flex-direction:column;min-width:0}.tx b{font-size:7.5pt;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
    : '@page{size:letter;margin:0}body{margin:0}.page{box-sizing:border-box;width:8.5in;height:11in;padding:.6in 1in;display:grid;grid-template-columns:repeat(3,2in);gap:.25in;grid-auto-rows:2in;align-content:start;break-after:page}.lb{box-sizing:border-box;border:1px dashed #bbb;padding:.12in;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden}.qr{width:1.15in;height:1.15in}.tx{font:7pt/1.25 Arial,sans-serif;display:flex;flex-direction:column;margin-top:5px;max-width:100%}.tx b{font-size:8pt}';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Gear labels</title><style>${css}.qr svg{width:100%;height:100%;display:block}.tx i{font-style:normal;color:#666}@media screen{body{background:#e9eaee}.page{background:#fff;margin:16px auto;box-shadow:0 2px 12px rgba(0,0,0,.15)}}</style></head><body>${pages.join('')}<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>`;
}
EXTRA_DRAWERS.labels = () => {
  const L = state.label; const cats = CAT_ORDER.filter((c) => c !== 'Consumable' && state.cat.items.some((i) => i.cat === c && i.qty > 0));
  const list = labelItems(); const count = sum(list, (x) => x.units.length); const per = L.size === '5160' ? 30 : 12;
  const item = L.scope.startsWith('item:') ? state.cat.byId[L.scope.slice(5)] : null;
  const opts = [['all', 'Everything in the pool'], ...cats.map((c) => [c, CAT_LABEL[c]])].concat(item ? [[L.scope, item.name]] : []);
  return `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="lbTitle"><button class="btn ghost sm close" data-act="closeDrawer">Close</button>
    <div class="eyebrow" style="margin:0">${icon('qr', 14)} Labels</div><h2 id="lbTitle">A QR code on every piece</h2>
    <p class="muted" style="margin:0">Scan them at check-out and check-in. Any phone camera also opens the piece's page from one.</p>
    <label class="field"><span>Which gear</span><select data-ext="label" data-k="scope">${opts.map(([k, l]) => `<option value="${esc(k)}" ${L.scope === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" data-ext="label" data-k="perUnit" ${L.perUnit ? 'checked' : ''}><span>A numbered label for each piece, not one per item</span></label>
    <label class="field"><span>Paper</span><select data-ext="label" data-k="size"><option value="5160" ${L.size === '5160' ? 'selected' : ''}>Avery 5160 or 8160 · 30 per sheet, 1 × 2⅝ in</option><option value="square" ${L.size !== '5160' ? 'selected' : ''}>Plain paper · 2 in squares to cut out</option></select></label>
    <div class="note">${plural(count, 'label')} on ${plural(Math.max(1, Math.ceil(count / per)), 'sheet')}.</div>
    <button class="btn grad" data-act="labelsPrint" ${count ? '' : 'disabled'}>${icon('qr', 16)} ${MODE === 'claude' ? 'Download the sheet' : 'Open the sheet to print'}</button>
    <span class="faint small">Print at 100%, not "fit to page". The codes point to ${esc(siteBase())}; change that in Settings if the site moves.</span></aside>`;
};

/* ================= scanning ================= */
const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) { /* no vibration */ } };
function parseScan(txt) { const m = String(txt || '').match(/([A-Z?]-[A-Z]{3}-\d{1,4})(?:\/(\d+))?/i); return m ? { id: m[1].toUpperCase(), unit: num(m[2]) } : null; }
function unitsDone(co, l) {
  const qty = Math.max(1, num(l.qty)); if (qty < 2 || !co || !co.units) return '';
  const o = (co.units['out:' + l.id] || []).length, bk = (co.units['back:' + l.id] || []).length;
  return bk ? `${Math.min(bk, qty)} of ${qty} scanned back` : o ? `${Math.min(o, qty)} of ${qty} scanned out` : '';
}
function tickUnit(id, unit) {
  const b = state.draft; if (!b) return false;
  const dir = state.scan ? state.scan.dir : b.status === 'out' ? 'back' : 'out';
  const ln = includedLines(b).find((l) => l.id === id); const it = state.cat.byId[id] || { name: id };
  if (!ln) { toast(`${it.name} is not on this job.`); buzz(250); return false; }
  const co = b.checkout = b.checkout || { out: {}, back: {}, notes: {} }; co[dir] = co[dir] || {}; co.units = co.units || {};
  const key = dir + ':' + id; const units = new Set(co.units[key] || []); const qty = Math.max(1, num(ln.qty));
  if (unit) units.add(unit); else { let k = 1; while (units.has(k)) k++; units.add(k); }
  co.units[key] = [...units].sort((a, c) => a - c);
  if (units.size >= qty) co[dir][id] = true;
  scheduleSave(); buzz(40);
  toast(`${it.name}${qty > 1 ? ` · ${Math.min(units.size, qty)} of ${qty}` : ''} ${dir === 'back' ? 'checked back in' : 'checked out'}.`);
  render();
  return true;
}
function scanList() {
  const b = state.draft; if (!b || !state.scan) return '';
  const dir = state.scan.dir; const co = b.checkout || {};
  return `<div class="scan-list">${includedLines(b).map((l) => { const it = state.cat.byId[l.id] || { name: l.id }; const qty = Math.max(1, num(l.qty)); const got = Math.min(qty, ((co.units || {})[dir + ':' + l.id] || []).length || (co[dir] && co[dir][l.id] ? qty : 0));
    return `<div class="${got >= qty ? 'ok' : ''}"><span>${esc(it.name)}</span><b>${got} / ${qty}</b></div>`; }).join('')}</div>`;
}
EXTRA_DRAWERS.scan = () => `<div class="scrim" data-act="scanStop"></div><aside class="drawer scan" role="dialog" aria-modal="true" aria-labelledby="scanTitle"><button class="btn ghost sm close" data-act="scanStop">Done</button>
  <h2 id="scanTitle">${state.scan && state.scan.dir === 'back' ? 'Check gear back in' : 'Check gear out'}</h2>
  <p class="muted small" id="scanMsg" role="status" style="margin:0">Point the camera at each label.</p>
  <div class="scan-view"><video id="scanVideo" playsinline muted></video><div class="scan-frame" aria-hidden="true"></div></div>
  <div class="row"><input type="text" id="scanManual" data-ext="scanid" placeholder="Or type the ID on the label" aria-label="Item ID" autocomplete="off" spellcheck="false" style="flex:1"><button class="btn sm" data-act="scanManual">Tick</button></div>
  <div id="scanList">${scanList()}</div></aside>`;
EXTRA_DRAWERS.scanpick = (d) => `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="spTitle"><button class="btn ghost sm close" data-act="closeDrawer">Close</button>
  <h2 id="spTitle">${esc((state.cat.byId[d.id] || { name: d.id }).name)}</h2><p class="muted" style="margin:0">It's on more than one job going out or out now. Which one is this?</p>
  <div class="stack">${d.ids.map((id) => { const b = state.bookings.find((x) => x.id === id); return b ? `<button class="option-btn" data-act="scanPick" data-id="${esc(id)}" data-item="${esc(d.id)}" data-u="${d.unit || 0}"><b>${esc(b.project || b.ref)}</b><span>${pill(b.status)} · ${esc(fmtDay(b.pickup))} to ${esc(fmtDay(b.returnDate))}</span></button>` : ''; }).join('')}</div></aside>`;
const scanMsg = (t) => { const m = $('#scanMsg'); if (m) m.textContent = t; };
function loadScript(src) { return new Promise((res) => { const el = document.createElement('script'); el.src = src; el.onload = () => res(true); el.onerror = () => res(false); document.head.appendChild(el); }); }
async function startCamera() {
  const v = $('#scanVideo'); if (!v || !state.scan) return;
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { scanMsg('This browser cannot use the camera here. Type the IDs instead.'); return; }
  try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); if (!state.scan) { stream.getTracks().forEach((t) => t.stop()); return; } state.scan.stream = stream; v.srcObject = stream; await v.play(); }
  catch (_) { scanMsg('The camera is not available. Allow camera access, or type the IDs instead.'); return; }
  let detect = null;
  if ('BarcodeDetector' in window) { try { const bd = new window.BarcodeDetector({ formats: ['qr_code'] }); detect = async () => { const r = await bd.detect(v); return r[0] && r[0].rawValue; }; } catch (_) { detect = null; } }
  if (!detect && !window.jsQR && MODE !== 'claude') await loadScript('src/vendor/jsQR.js');
  if (!detect && window.jsQR) {
    const c = document.createElement('canvas'); const ctx = c.getContext('2d', { willReadFrequently: true });
    detect = async () => { const w = v.videoWidth, h = v.videoHeight; if (!w) return null; const k = Math.min(1, 720 / w); c.width = Math.round(w * k); c.height = Math.round(h * k); ctx.drawImage(v, 0, 0, c.width, c.height); const img = ctx.getImageData(0, 0, c.width, c.height); const r = window.jsQR(img.data, c.width, c.height, { inversionAttempts: 'dontInvert' }); return r && r.data; };
  }
  if (!detect) { scanMsg('This browser cannot read QR codes. Type the IDs instead.'); return; }
  const loop = async () => { if (!state.scan || !state.scan.stream) return; try { const txt = await detect(); if (txt) onScan(txt); } catch (_) { /* next frame */ } if (state.scan) state.scan.timer = setTimeout(loop, 200); };
  loop();
}
function stopCamera() { const sc = state.scan; if (!sc) return; clearTimeout(sc.timer); if (sc.stream) sc.stream.getTracks().forEach((t) => t.stop()); sc.stream = null; }
function onScan(txt) {
  const sc = state.scan; const now = Date.now(); if (!sc || (txt === sc.last && now - sc.lastAt < 2500)) return;
  sc.last = txt; sc.lastAt = now; const hit = parseScan(txt);
  if (!hit) { toast('That code is not one of our labels.'); return; }
  tickUnit(hit.id, hit.unit);
}
/* A label scanned with a phone's own camera opens the site at #scan/<item>/<unit>. For the team, that ticks it on
   the job going out or coming back; for anyone else, it opens the piece's page. */
function scanRoute(id, unit) {
  const it = state.cat.byId[id];
  if (state.role !== 'admin') { if (it) { state.drawer = { kind: 'item', id }; render(); } return; }
  const t = todayStr();
  const cand = state.bookings.filter((b) => (b.status === 'out' || (['quoted', 'confirmed'].includes(b.status) && b.pickup >= addDays(t, -1) && b.pickup <= addDays(t, 2))) && includedLines(b).some((l) => l.id === id));
  if (cand.length === 1) { state.tab = 'handoff'; openBooking(cand[0].id); tickUnit(id, unit); return; }
  if (cand.length > 1) { state.drawer = { kind: 'scanpick', id, unit, ids: cand.map((b) => b.id) }; render(); return; }
  if (it) { state.drawer = { kind: 'item', id }; render(); toast(`${it.name} is not on a job going out or out now.`); } else toast('That label is not on the gear list.');
}

/* ================= calendar ================= */
const icsText = (x) => String(x || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const icsWhen = (date, time) => String(date).replace(/-/g, '') + 'T' + String(time || '09:00').replace(':', '') + '00';
const addMins = (date, time, m) => { const [h, mi] = String(time || '09:00').split(':').map(Number); const d = parseYmd(date); d.setHours(h, mi + m); return icsWhen(ymd(d), `${pad(d.getHours())}:${pad(d.getMinutes())}`); };
function calEvents(b, forClient) {
  const S = state.settings; const h = b.handoff || {}; const title = b.project || b.ref; const who = forClient ? S.company : clientName(b);
  const place = (m) => (m === 'delivery' ? (h.address || 'Delivery') : m === 'afterhours' ? 'After-hours handoff' : S.pickup);
  const note = `${b.ref}${who ? ' · ' + who : ''}${S.phone ? ' · ' + S.phone : ''}`;
  const ev = [];
  if (b.pickup) ev.push({ uid: `${b.id}-out`, date: b.pickup, time: b.pickupTime || '15:00', mins: 30, title: `${forClient ? 'Pick up gear' : 'Gear goes out'}: ${title}`, where: place(h.out), note });
  if (b.returnDate) ev.push({ uid: `${b.id}-back`, date: b.returnDate, time: b.returnTime || '10:00', mins: 30, title: `${forClient ? 'Return the gear' : 'Gear comes back'}: ${title}`, where: place(h.back), note, remind: true });
  if (num(b.shootDays) > 0) { const st = b.shootStart || b.pickup; ev.push({ uid: `${b.id}-shoot`, allDay: true, date: st, end: addDays(st, num(b.shootDays)), title: `On set: ${title}`, note }); }
  return ev;
}
const NY_TZ = ['BEGIN:VTIMEZONE', 'TZID:America/New_York', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT', 'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500', 'TZNAME:EST', 'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD', 'END:VTIMEZONE'];
function icsDoc(events, name) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shared Gear Pool//Rental desk//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsText(name || state.settings.company)}`, 'X-WR-TIMEZONE:America/New_York', ...NY_TZ];
  events.forEach((e) => {
    L.push('BEGIN:VEVENT', `UID:${e.uid}@sharedgearpool`, `DTSTAMP:${stamp}`);
    if (e.allDay) L.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${e.end.replace(/-/g, '')}`);
    else L.push(`DTSTART;TZID=America/New_York:${icsWhen(e.date, e.time)}`, `DURATION:PT${e.mins}M`);
    L.push(`SUMMARY:${icsText(e.title)}`); if (e.where) L.push(`LOCATION:${icsText(e.where)}`); if (e.note) L.push(`DESCRIPTION:${icsText(e.note)}`);
    if (e.remind) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText('Due back tomorrow. ' + e.title)}`, 'TRIGGER:-P1D', 'END:VALARM');
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map((line) => { const out = []; let x = line; while (x.length > 74) { out.push(x.slice(0, 74)); x = ' ' + x.slice(74); } out.push(x); return out.join('\r\n'); }).join('\r\n') + '\r\n';
}
function gcalUrl(b, which, forClient) {
  const e = calEvents(b, forClient).find((x) => x.uid.endsWith(which === 'out' ? '-out' : '-back')); if (!e) return '#';
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${icsWhen(e.date, e.time)}/${addMins(e.date, e.time, e.mins)}`, ctz: 'America/New_York', details: e.note + (e.remind ? '\nDue back by ' + fmtTime(e.time) + '.' : ''), location: e.where || '' });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
function calButtons(b) {
  if (!b.pickup || !b.returnDate) return '';
  const fc = state.role !== 'admin';
  return `<div class="actions cal-btns"><button class="btn sm" data-act="icsJob" data-id="${esc(b.id)}">${icon('calendar', 14)} Add to calendar</button><a class="btn ghost sm" href="${esc(gcalUrl(b, 'out', fc))}" target="_blank" rel="noopener">Google: pickup</a><a class="btn ghost sm" href="${esc(gcalUrl(b, 'back', fc))}" target="_blank" rel="noopener">Google: return</a></div>`;
}

/* ================= money ================= */
const moneyShort = (n) => (Math.abs(n) >= 10000 ? '$' + (n / 1000).toFixed(0) + 'k' : Math.abs(n) >= 1000 ? '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : money(n));
/* What one line of a job earned: its rental and hold days, after the job's discount. Crew and tax are not the gear's. */
function lineEarn(b, ln, c) {
  if (ln.comp || b.favor) return 0;
  const poss = c.weekend ? 0 : lineRate(ln) * num(ln.qty) * num(state.settings.possessionPct, 50) / 100 * num(b.possessionDays);
  return (lineTotal(b, ln) + poss) * (1 - discountPct(b) / 100);
}
function costOf(it) { const g = state.gear[it.id] || {}; if (g.paid != null && g.paid !== '') return { v: num(g.paid) * Math.max(1, it.qty), paid: true }; if (it.resale != null) return { v: num(it.resale) * Math.max(1, it.qty), paid: false }; return null; }
function moneyStats(days) {
  const t = todayStr(); const from = days ? addDays(t, -days + 1) : null;
  const jobs = state.bookings.filter((b) => EARNED.has(b.status) && b.pickup && b.pickup <= t);
  const first = jobs.reduce((a, b) => (a && a < b.pickup ? a : b.pickup), '') || t;
  const span = days || Math.max(30, diffDays(first, t) + 1);
  const per = {}; const at = (id) => (per[id] = per[id] || { jobs: 0, unitDays: 0, earned: 0, life: 0, year: 0, last: '' });
  jobs.forEach((b) => {
    const c = chosen(b); const nights = Math.max(1, diffDays(b.pickup, bookingEnd(b))); const inWin = !from || b.pickup >= from; const inYear = b.pickup >= addDays(t, -364);
    const seen = new Set();
    includedLines(b).forEach((ln) => {
      const x = at(ln.id); const e = lineEarn(b, ln, c); x.life += e; if (inYear) x.year += e;
      if (!inWin) return;
      x.earned += e; x.unitDays += num(ln.qty) * nights; if (!seen.has(ln.id)) { x.jobs++; seen.add(ln.id); } if (b.pickup > x.last) x.last = b.pickup;
    });
  });
  const rows = state.cat.items.filter((i) => i.qty > 0 && i.cat !== 'Consumable').map((it) => {
    const x = per[it.id] || { jobs: 0, unitDays: 0, earned: 0, life: 0, year: 0, last: '' }; const cost = costOf(it);
    const util = Math.min(1, x.unitDays / (Math.max(1, it.qty) * span));
    const back = cost && cost.v ? x.life / cost.v : null; const rate = x.year / 365;
    const eta = cost && back != null && back < 1 && rate > 0 ? Math.ceil((cost.v - x.life) / rate) : null;
    return Object.assign({ it, util, cost, back, eta }, x);
  });
  const months = []; const d0 = parseYmd(t);
  for (let k = 11; k >= 0; k--) { const d = new Date(d0.getFullYear(), d0.getMonth() - k, 1); months.push({ key: ymd(d).slice(0, 7), label: d.toLocaleDateString('en-US', { month: 'short' }), long: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), v: 0 }); }
  const mIdx = Object.fromEntries(months.map((m, i) => [m.key, i]));
  let gear12 = 0, total12 = 0, n12 = 0, fund12 = 0;
  jobs.forEach((b) => { const c = chosen(b); const i = mIdx[b.pickup.slice(0, 7)]; if (i == null) return; months[i].v += c.gear; gear12 += c.gear; total12 += c.total; fund12 += c.fund; n12++; });
  const ahead = state.bookings.filter((b) => FIRM.has(b.status) && b.pickup > t).reduce((a, b) => a + chosen(b).gear, 0);
  return { rows, months, gear12, total12, n12, fund12, ahead, span, thisMonth: months[11].v };
}
function niceStep(max) { const raw = max / 4; const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); return [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= raw) || p * 10; }
function monthChart(months) {
  const max = Math.max(0, ...months.map((m) => m.v)); const step = niceStep(max || 1000); const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = []; for (let v = 0; v <= top + 1e-6; v += step) ticks.push(v);
  const peak = max > 0 ? months.findIndex((m) => m.v === max) : -1;
  return `<div class="colchart"><p class="sr-only">Gear rental earned each month, last 12 months. Highest: ${peak >= 0 ? esc(months[peak].long + ', ' + money(max)) : 'nothing yet'}. The table below has every month.</p><div class="cc-plot">
    ${ticks.map((v) => `<div class="cc-tick" style="bottom:${(v / top * 100).toFixed(2)}%"><span>${moneyShort(v)}</span></div>`).join('')}
    <div class="cc-cols">${months.map((m, i) => `<div class="cc-col" tabindex="0" role="img" aria-label="${esc(m.long)}: ${esc(money(m.v))}"><div class="cc-bar ${i === 11 ? 'now' : ''}" style="height:${(m.v / top * 100).toFixed(2)}%">${i === peak ? `<span class="cc-val">${moneyShort(m.v)}</span>` : ''}</div><span class="cc-tip" aria-hidden="true"><b>${esc(m.long)}</b>${esc(money(m.v))}</span></div>`).join('')}</div></div>
    <div class="cc-x" aria-hidden="true">${months.map((m) => `<span>${esc(m.label)}</span>`).join('')}</div>
    <details class="cc-table"><summary class="small">Show as a table</summary><table class="plain"><thead><tr><th>Month</th><th class="n">Gear rental</th></tr></thead><tbody>${months.map((m) => `<tr><td>${esc(m.long)}</td><td class="n">${money(m.v)}</td></tr>`).join('')}</tbody></table></details></div>`;
}
const meter = (f, label) => `<span class="meter" role="img" aria-label="${esc(label)}"><i style="width:${(Math.max(0, Math.min(1, f)) * 100).toFixed(1)}%"></i></span>`;
function vMoney() {
  const M = state.money; const st = moneyStats(M.period); const S = state.settings; const t = todayStr();
  const earned = st.rows.filter((r) => r.jobs || r.life).sort((a, b) => b.earned - a.earned || b.life - a.life);
  const shown = M.all ? st.rows.slice().sort((a, b) => b.earned - a.earned || a.it.name.localeCompare(b.it.name)) : earned.slice(0, 25);
  const turnedAway = new Set(); state.bookings.filter((b) => HOLDS.has(b.status)).forEach((b) => conflicts(b).forEach((c) => { if (c.kind === 'over') turnedAway.add(c.id); }));
  const more = st.rows.filter((r) => r.it.rec != null && (r.util >= 0.5 || turnedAway.has(r.it.id))).sort((a, b) => b.util - a.util).slice(0, 5);
  const idle = st.rows.filter((r) => r.it.rec != null && (!r.last || r.last < addDays(t, -180)) && r.cost && r.cost.v >= 300).sort((a, b) => b.cost.v - a.cost.v).slice(0, 5);
  const paid = st.rows.filter((r) => r.back != null && r.back >= 1).sort((a, b) => b.back - a.back).slice(0, 5);
  const period = (k, l) => `<button data-act="moneyPeriod" data-p="${k}" aria-pressed="${M.period === k}">${l}</button>`;
  const tile = (label, value, sub) => `<div class="stat"><span class="lbl">${label}</span><b class="val">${value}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;
  const nm = (r) => `<button class="linkish" data-act="item" data-id="${esc(r.it.id)}">${esc(r.it.name)}</button>`;
  return `<section class="view">
    ${hero('What the gear earns', 'The <em class="s">money</em>', 'Gear rental after discounts, by month and by piece. Crew pay and sales tax are left out: they are not the gear\u2019s.')}
    <div class="kpis">
      ${tile('Gear rental, last 12 months', money(st.gear12), `${plural(st.n12, 'job')}${st.ahead ? ` · ${money(st.ahead)} more booked ahead` : ''}`)}
      ${tile('This month', money(st.thisMonth), fmtDay(t, { month: 'long', year: 'numeric' }))}
      ${tile('Average job', st.n12 ? money(st.total12 / st.n12) : '—', 'everything billed, incl. crew and tax')}
      ${tile('Into the gear fund', money(st.fund12), `${num(S.fundPct)}% of gear rental`)}
    </div>
    <div class="card"><div class="hd"><h2 class="t">Gear rental by month</h2><span class="muted small">By the month each job went out</span></div><div class="bd">${monthChart(st.months)}</div></div>
    <div class="grid3">
      <div class="card"><div class="hd"><h3 class="t">Worth a second one</h3></div><div class="bd stack" style="gap:8px">${more.length ? more.map((r) => `<div class="sug"><div class="grow">${nm(r)}<div class="muted small">${turnedAway.has(r.it.id) ? 'Short on an upcoming job' : `Out ${Math.round(r.util * 100)}% of the time`}</div></div><button class="btn ghost sm" data-act="fundSuggest" data-id="${esc(r.it.id)}">Add to buying list</button></div>`).join('') : '<span class="muted small">Nothing is out more than half the time yet.</span>'}</div></div>
      <div class="card"><div class="hd"><h3 class="t">Sitting idle</h3></div><div class="bd stack" style="gap:8px">${idle.length ? idle.map((r) => `<div class="sug"><div class="grow">${nm(r)}<div class="muted small">${r.last ? 'Last out ' + esc(fmtDay(r.last)) : 'Not rented yet'} · ${r.cost.paid ? 'paid' : 'worth'} ${money(r.cost.v)}</div></div></div>`).join('') + '<span class="faint small">Sell it, or put it in a kit where it earns its keep.</span>' : `<span class="muted small">${PREVIEW ? 'What each piece is worth is hidden in the preview. Add what you paid on a piece to see it here.' : 'Everything worth $300 or more went out in the last six months.'}</span>`}</div></div>
      <div class="card"><div class="hd"><h3 class="t">Paid for itself</h3></div><div class="bd stack" style="gap:8px">${paid.length ? paid.map((r) => `<div class="sug"><div class="grow">${nm(r)}<div class="muted small">Earned ${money(r.life)} on ${money(r.cost.v)}</div></div><span class="pill good">${Math.round(r.back * 100)}%</span></div>`).join('') : '<span class="muted small">Nothing has earned back what it cost yet.</span>'}</div></div>
    </div>
    <div class="card"><div class="hd"><h2 class="t">Piece by piece</h2><div class="seg" role="group" aria-label="Period">${period(90, '90 days')}${period(365, '12 months')}${period(0, 'All time')}</div></div>
      <div class="tbl" tabindex="0"><table class="plain money-tbl"><thead><tr><th>Piece</th><th class="n">Jobs</th><th class="n">Days out</th><th>How busy</th><th class="n">Earned</th><th>Paid back</th></tr></thead><tbody>
        ${shown.length ? shown.map((r) => `<tr><td><div class="row" style="gap:10px;flex-wrap:nowrap">${thumb(r.it, true)}<div style="min-width:0">${nm(r)}<div class="muted small">${r.it.qty > 1 ? `${r.it.qty} in the pool` : 'One'}${r.last ? ' · last out ' + esc(fmtDay(r.last, { month: 'short', day: 'numeric' })) : ''}</div></div></div></td>
          <td class="n">${r.jobs}</td><td class="n">${Math.round(r.unitDays)}</td><td>${meter(r.util, `Out ${Math.round(r.util * 100)}% of the time`)}<span class="small muted"> ${Math.round(r.util * 100)}%</span></td><td class="n">${money(r.earned)}</td>
          <td>${r.back == null ? `<span class="faint small">${PREVIEW && !r.cost ? 'value hidden' : 'add what you paid'}</span>` : `${meter(r.back, `Paid back ${Math.round(r.back * 100)}%`)}<span class="small muted"> ${Math.round(r.back * 100)}%${r.eta ? ` · ~${r.eta > 60 ? Math.round(r.eta / 30) + ' mo' : r.eta + ' days'} to go` : ''}</span>`}</td></tr>`).join('')
          : `<tr><td colspan="6"><div class="empty"><b>No earnings in this period</b><span>Confirmed jobs count from the day they go out.</span></div></td></tr>`}
      </tbody></table></div>
      ${!M.all && st.rows.length > shown.length ? `<div class="bd" style="padding-top:8px"><button class="btn ghost sm" data-act="moneyAll">Show all ${st.rows.length} pieces</button></div>` : ''}
      <div class="bd" style="padding-top:0"><span class="faint small">Paid back compares everything a piece has earned with what you paid for it (add it on the piece), or with what it\u2019s worth when you haven\u2019t. The estimate to go uses the last 12 months\u2019 pace.</span></div></div>
  </section>`;
}

/* ================= clients ================= */
const normKey = (x) => String(x || '').trim().toLowerCase();
function clientIndex() {
  const map = new Map();
  const put = (k, seed) => { if (!map.has(k)) map.set(k, Object.assign({ key: k, email: '', name: '', company: '', phone: '', jobs: [], docs: [], rec: null, notes: '' }, seed)); return map.get(k); };
  const fill = (r, c) => { ['email', 'name', 'company', 'phone'].forEach((f) => { if (!r[f] && c[f]) r[f] = c[f]; }); };
  Object.values(state.clientRecs).forEach((rec) => { const em = normKey(rec.email); const r = put(em ? 'e:' + em : 'r:' + rec._id, {}); r.rec = rec; fill(r, rec); r.notes = rec.notes || ''; r.docs = r.docs.concat((rec.docs || []).map((d) => Object.assign({ recId: rec._id }, d))); });
  state.bookings.forEach((b) => {
    const c = b.client || {}; const em = normKey(c.email), co = normKey(c.company);
    const k = em ? 'e:' + em : co ? 'c:' + co : normKey(c.name) ? 'n:' + normKey(c.name) : ''; if (!k || b.example) return;
    const r = put(k, {}); fill(r, c); r.jobs.push(b);
  });
  return [...map.values()].map((r) => {
    const earned = r.jobs.filter((b) => EARNED.has(b.status)); const t = todayStr();
    const valid = (kind) => r.docs.filter((d) => d.kind === kind && d.status !== 'rejected').sort((a, b) => String(b.expires || '9999').localeCompare(String(a.expires || '9999')))[0] || null;
    return Object.assign(r, { earned: earned.length, spent: sum(earned, (b) => (b.bill && b.bill.total) || chosen(b).total), last: r.jobs.reduce((a, b) => (b.pickup > a ? b.pickup : a), ''), coi: valid('coi'), st121: valid('st121'), expired: r.docs.some((d) => d.kind === 'coi' && d.expires && d.expires < t) });
  }).sort((a, b) => String(b.last).localeCompare(String(a.last)) || (a.company || a.name).localeCompare(b.company || b.name));
}
function clientFor(b) { const c = b.client || {}; const em = normKey(c.email), co = normKey(c.company); return clientIndex().find((r) => (em && r.key === 'e:' + em) || (!em && co && r.key === 'c:' + co)) || null; }
function docPill(d, kind) {
  if (!d) return `<span class="pill">${kind === 'coi' ? 'No certificate' : 'No ST-121'}</span>`;
  const left = d.expires ? diffDays(todayStr(), d.expires) : null;
  const tone = left != null && left < 0 ? 'bad' : left != null && left <= 30 ? 'warn' : d.status === 'ok' ? 'good' : 'info';
  return `<span class="pill ${tone}">${kind === 'coi' ? 'Certificate' : 'ST-121'}${d.expires ? (left < 0 ? ' expired ' : ' to ') + esc(fmtDay(d.expires, { month: 'short', day: 'numeric', year: '2-digit' })) : ' on file'}</span>`;
}
function vClients() {
  const q = normKey(state.clientsQ); const all = clientIndex();
  const list = all.filter((r) => !q || [r.name, r.company, r.email, r.phone].some((x) => normKey(x).includes(q)));
  return `<section class="view">
    ${hero('Everyone you rent to', 'The <em class="s">clients</em>', `Their jobs and paperwork in one place. ${num(state.settings.returningPct) && state.settings.autoReturning ? `Returning clients get ${num(state.settings.returningPct)}% off by themselves.` : ''}`)}
    <div class="card"><div class="bd"><label class="field"><span>Search</span><input type="search" id="cl-q" data-ext="clientsq" value="${esc(state.clientsQ)}" placeholder="Name, company or email"></label></div></div>
    <div class="card">${state.dbState !== 'ready' ? dbGate('clients') : list.length ? `<div class="bd flush">${list.map((r) => `<div class="li click client-li" data-act="clientOpen" data-k="${esc(r.key)}" tabindex="0" role="button"><span class="av" aria-hidden="true">${esc(initials(r.company || r.name || r.email))}</span><div class="grow"><div class="ttl">${esc(r.company || r.name || r.email)}</div><div class="sub">${esc([r.company ? r.name : '', r.email].filter(Boolean).join(' · ') || 'No contact details')}</div></div>
        <div class="meta">${r.earned > 1 || (r.earned === 1 && r.jobs.length > 1) ? `<span class="pill good">Returning · ${plural(r.earned, 'job')}</span>` : `<span class="pill">${plural(r.jobs.length, 'job')}</span>`}${docPill(r.coi, 'coi')}${r.st121 ? docPill(r.st121, 'st121') : ''}<b class="num tot">${money(r.spent)}</b></div></div>`).join('')}</div>`
      : `<div class="empty"><b>${q ? 'Nobody matches' : 'No clients yet'}</b><span>${q ? 'Try another name or email.' : 'Clients appear here from their jobs and when they sign up on the storefront.'}</span></div>`}</div>
  </section>`;
}
EXTRA_DRAWERS.client = (d) => {
  const r = clientIndex().find((x) => x.key === d.key); if (!r) return '';
  const f = state.docAdd || (state.docAdd = { kind: 'coi', expires: '', insurer: '', limit: '', file: null });
  return `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="clTitle"><button class="btn ghost sm close" data-act="closeDrawer">Close</button>
    <div class="row"><span class="av lg" aria-hidden="true">${esc(initials(r.company || r.name || r.email))}</span><div class="grow"><h2 id="clTitle">${esc(r.company || r.name || r.email)}</h2><div class="muted small">${esc([r.company ? r.name : '', r.email, r.phone].filter(Boolean).join(' · '))}</div></div></div>
    <div class="chips">${r.earned ? `<span class="pill good">${plural(r.earned, 'job')} done · ${money(r.spent)}</span>` : ''}${r.rec && r.rec.uid ? '<span class="pill info">Has an account</span>' : ''}</div>
    <div><div class="eyebrow">Documents on file</div><div class="stack" style="gap:8px">${r.docs.length ? r.docs.map((x) => `<div class="doc-row">${icon('doc', 16)}<span class="grow small"><b>${esc(DOC_KIND[x.kind] || x.kind)}</b>${x.insurer ? ' · ' + esc(x.insurer) : ''}${x.limit ? ' · covers ' + money(num(x.limit)) : ''}<br><span class="muted">${esc(x.name || (x.from === 'team' ? 'Added by the team' : ''))}</span></span>${docExpiry(x)}
      ${x.status === 'ok' ? '<span class="pill good">Accepted</span>' : x.status === 'rejected' ? '<span class="pill bad">Not accepted</span>' : `<button class="btn sm dark" data-act="docStatus" data-k="${esc(r.key)}" data-rec="${esc(x.recId)}" data-d="${esc(x.id)}" data-s="ok">Accept</button><button class="btn ghost sm" data-act="docStatus" data-k="${esc(r.key)}" data-rec="${esc(x.recId)}" data-d="${esc(x.id)}" data-s="rejected">Reject</button>`}
      ${x.file || x.url ? `<button class="btn ghost sm" data-act="openDoc" data-path="${esc(x.file || '')}" data-url="${esc(x.url || '')}">Open</button>` : ''}</div>`).join('') : '<span class="muted small">Nothing yet.</span>'}</div></div>
    <details><summary class="small" style="cursor:pointer;font-weight:600">Add a document</summary><div class="form" style="grid-template-columns:1fr 1fr;margin-top:10px">
      <label class="field"><span>What</span><select data-ext="docadd" data-k="kind"><option value="coi" ${f.kind === 'coi' ? 'selected' : ''}>Insurance certificate</option><option value="st121" ${f.kind === 'st121' ? 'selected' : ''}>ST-121</option></select></label>
      <label class="field"><span>Expires</span><input type="date" data-ext="docadd" data-k="expires" value="${esc(f.expires)}"></label>
      ${f.kind === 'coi' ? `<label class="field"><span>Insurer</span><input type="text" data-ext="docadd" data-k="insurer" value="${esc(f.insurer)}"></label><label class="field"><span>Covers rented gear up to</span><input type="number" min="0" data-ext="docadd" data-k="limit" value="${esc(f.limit)}"></label>` : ''}
      <label class="field wide"><span>File (optional)</span><input type="file" accept="application/pdf,image/*" data-ext="docadd" data-k="file">${f.file ? `<small>Chosen: ${esc(f.file.name)}</small>` : ''}</label>
      <button class="btn dark wide" data-act="docAdd" data-k="${esc(r.key)}">Add it</button></div></details>
    <label class="field"><span>Notes</span><textarea rows="3" data-ext="clientnote" data-k="${esc(r.key)}" placeholder="How they like to work, who to call, anything that went wrong">${esc(r.notes)}</textarea></label>
    <div><div class="eyebrow">Jobs</div><div class="stack" style="gap:6px">${r.jobs.length ? r.jobs.sort((a, b) => String(b.pickup).localeCompare(String(a.pickup))).map((b) => `<button class="option-btn" data-act="openBooking" data-id="${esc(b.id)}"><b>${esc(b.project || b.ref)}</b><span>${pill(b.status)} · ${esc(fmtDay(b.pickup))} · ${money((b.bill && b.bill.total) || chosen(b).total)}</span></button>`).join('') : '<span class="muted small">No jobs yet.</span>'}</div></div>
  </aside>`;
};
/* The record a client's details and documents are kept in: their own account's if they have one, otherwise one keyed by email. */
function recFor(r) {
  if (r.rec) return { path: 'clients/' + r.rec._id, data: Object.assign({}, r.rec) };
  const id = 'e-' + docKey(r.email || r.company || r.name || 'client');
  return { path: 'clients/' + id, data: { email: r.email || '', name: r.name || '', company: r.company || '', phone: r.phone || '', docs: [] } };
}
async function saveRec(rec) { const d = Object.assign({}, rec.data); Object.keys(d).forEach((k) => { if (k[0] === '_') delete d[k]; }); d.updatedAt = new Date().toISOString(); await db.doc(rec.path).set(d); }
function onFileCoi(b) {
  const r = clientFor(b); if (!r || !r.coi || (b.coi && b.coi.docId === r.coi.id)) return '';
  const d = r.coi; const ok = !d.expires || d.expires >= (b.returnDate || '');
  return `<div class="doc-row">${icon('doc', 16)}<span class="grow small">On file: certificate${d.insurer ? ' from ' + esc(d.insurer) : ''}${d.limit ? ', covers ' + money(num(d.limit)) : ''}${d.expires ? `, ${ok ? 'good to' : 'expired'} ${esc(fmtDay(d.expires))}` : ''}.</span>${ok ? `<button class="btn sm" data-act="useCoi" data-k="${esc(r.key)}">Use it</button>` : ''}</div>`;
}
function onFileSt121(b) {
  const r = clientFor(b); if (!r || !r.st121) return '';
  return `<div class="doc-row">${icon('doc', 16)}<span class="grow small">On file: ST-121${r.st121.status === 'ok' ? ', accepted' : ''}${r.st121.expires ? ', to ' + esc(fmtDay(r.st121.expires)) : ''}.</span><button class="btn sm" data-act="useSt121" data-k="${esc(r.key)}">Use it</button></div>`;
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
  const sched = `<div class="tbl" tabindex="0"><table><thead><tr><th>Item</th><th>Owner</th><th class="n">Qty</th><th class="n">Day rate</th><th class="n">Hold day</th><th class="n">Replacement value</th></tr></thead><tbody>${m.rows.map((r) => `<tr><td>${esc(r.name)}${r.comped ? ' <em>(on the house)</em>' : ''}<br><small>${esc(r.id)}</small></td><td>${esc(OWNERS[r.own] ? OWNERS[r.own].name : '')}</td><td class="n">${r.qty}</td><td class="n">${money(r.day)}</td><td class="n">${money(r.poss)}</td><td class="n">${money(r.repl)}</td></tr>`).join('')}<tr class="total"><td colspan="3">Totals</td><td class="n">${money(m.tot.day)}</td><td class="n">${money(m.tot.poss)}</td><td class="n">${money(m.tot.repl)}</td></tr></tbody></table></div>`;
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
async function sha256hex(text) {
  if (!(window.crypto && crypto.subtle)) return '';
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function snapshotAgreement(b) {
  const prev = b.contract || {}; const text = agreementText(b);
  const history = (prev.history || []).slice(-4);
  if (prev.status === 'signed' && prev.signature) history.push({ signer: prev.signer, signedAt: prev.signedAt, hash: prev.signedHash || prev.hash || '', sentAt: prev.sentAt || '' });
  b.contract = { status: 'sent', sentAt: new Date().toISOString(), text, html: agreementHTML(b), hash: await sha256hex(text).catch(() => ''), history };
}
const contractStale = (b) => { const ct = b.contract || {}; return !!ct.text && ['sent', 'signed'].includes(ct.status) && agreementText(b) !== ct.text; };
const safeSig = (x) => (/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(x || '') ? x : '');
function sigBlock(ct) {
  return `<div class="esig"><img src="${esc(safeSig(ct.signature))}" alt="Signature of ${esc(ct.signer)}"><div><b>${esc(ct.signer)}</b><br>Signed electronically ${esc(fmtStamp(ct.signedAt))}${ct.signedFrom ? `<br><small>From ${esc(ct.signedFrom)}</small>` : ''}${ct.signedHash ? `<br><small>Document fingerprint ${esc(String(ct.signedHash).slice(0, 16))}…</small>` : ''}</div></div>`;
}
function signedCopy(b) { const ct = b.contract || {}; return standaloneDoc(`Rental agreement ${b.ref}`, (ct.html || agreementHTML(b)) + (ct.signature ? sigBlock(ct) : '')); }
function standaloneDoc(title, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font:14px/1.55 Georgia,serif;color:#1b1d20;max-width:820px;margin:40px auto;padding:0 24px}h2{font:700 28px/1.1 Arial,sans-serif}h3{font:700 15px Arial,sans-serif;margin:18px 0 4px}table{width:100%;border-collapse:collapse;font:12.5px Arial,sans-serif}th,td{border-bottom:1px solid #ccc;padding:6px;text-align:left}.n{text-align:right}.total td{font-weight:700;border-top:2px solid #000}.draft{font:600 11px Arial;letter-spacing:.1em;text-transform:uppercase;color:#a05a14}.sig{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px}.sig div{border-top:1px solid #000;padding-top:6px;font:12px Arial}.esig{display:flex;gap:16px;align-items:center;margin-top:24px;border-top:1px solid #000;padding-top:10px;font:12px Arial}.esig img{height:70px;background:#fff}</style></head><body>${inner}</body></html>`;
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
Object.assign(EXTRA_DRAWERS, {
  paysim() {
    const sim = state.pay.sim || {};
    return `<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="simTitle"><button class="btn ghost sm close" data-act="closeDrawer">Cancel</button>
      <div class="eyebrow" style="margin:0">${icon('lock', 14)} Checkout · simulated</div><h2 id="simTitle">${sim.kind === 'hold' ? 'Place a card hold' : 'Pay by card'}</h2>
      <div class="big">${money(num(sim.amount))}</div><span class="muted small">${esc(sim.ref || '')} · ${esc(PAY_KIND[sim.kind] || '')}</span>
      <div class="note">This is the preview, so no money moves. On the live site this opens Stripe's secure checkout page, and the payment shows up here by itself when it goes through.</div>
      <div class="form" style="grid-template-columns:1fr 1fr"><label class="field wide"><span>Card number</span><input type="text" value="4242 4242 4242 4242" disabled></label><label class="field"><span>Expiry</span><input type="text" value="12 / 34" disabled></label><label class="field"><span>CVC</span><input type="text" value="123" disabled></label></div>
      <button class="btn grad" data-act="simPay">${sim.kind === 'hold' ? 'Place the hold' : `Pay ${money(num(sim.amount))}`}</button></aside>`;
  },
});
const WRITES = new Set(['newBooking', 'quotePkg', 'budget', 'pickAdd', 'qty', 'rmLine', 'addCrew', 'crewPeople', 'rmCrew', 'deleteBooking', 'advance', 'contract', 'coiStatus', 'checkOut', 'checkIn', 'sendRequest', 'drawerAdd', 'sync', 'unsync', 'applyPoss', 'weekendToggle', 'applyReturning', 'fundUp', 'fundBuy', 'fundUnbuy', 'fundAdd', 'fundRemove']);
const ACT = {
  nav(el) { if (state.dirty) flushSave(); const v = el.dataset.v; if (!allowedView(v)) return; state.view = v; state.drawer = null; if (v === 'mine') state.portal.id = null; if (v === 'storefront') loadHolds(); render(); window.scrollTo(0, 0); },
  demoRole(el) { if (MODE !== 'preview') return; state.drawer = null; BE.auth.setRole(el.dataset.r); },
  authOpen(el) { state.auth = Object.assign(state.auth, { mode: (el && el.dataset && el.dataset.m) || 'in', msg: '', busy: false }); state.drawer = { kind: 'auth' }; renderDrawer(); focusFirst(); },
  authMode(el) { state.auth.mode = el.dataset.m; state.auth.msg = ''; renderDrawer(); focusFirst(); },
  async authSubmit() {
    const a = state.auth; if (a.busy) return;
    const email = String(a.email || '').trim(); const pw = a.password || '';
    if (a.mode !== 'newpw' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { a.msg = 'Enter your email address.'; a.tone = 'bad'; renderDrawer(); focusFirst(); return; }
    if ((a.mode === 'up' || a.mode === 'newpw') && pw.length < 8) { a.msg = 'Use at least 8 characters for the password.'; a.tone = 'bad'; renderDrawer(); return; }
    if (a.mode === 'in' && !pw) { a.msg = 'Enter your password.'; a.tone = 'bad'; renderDrawer(); return; }
    a.busy = true; a.msg = ''; renderDrawer();
    const done = (msg) => { a.then = null; state.drawer = null; a.password = ''; toast(msg); };
    try {
      if (a.mode === 'in') { await BE.auth.signIn(email, pw); done('Signed in.'); }
      else if (a.mode === 'up') { const r = await BE.auth.signUp(email, pw, String(a.name || '').trim()); if (r && r.needsConfirm) a.mode = 'check'; else done('Your account is ready.'); }
      else if (a.mode === 'reset') { await BE.auth.reset(email); a.mode = 'check'; }
      else if (a.mode === 'newpw') { await BE.auth.setPassword(pw); done('Password saved.'); }
    } catch (e) { a.msg = authMsg(e); a.tone = 'bad'; }
    a.busy = false; renderDrawer();
  },
  async authMagic() {
    const a = state.auth; const email = String(a.email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { a.msg = 'Enter your email address first.'; a.tone = 'bad'; renderDrawer(); focusFirst(); return; }
    try { await BE.auth.magic(email); a.mode = 'check'; a.msg = ''; } catch (e) { a.msg = authMsg(e); a.tone = 'bad'; }
    renderDrawer();
  },
  acctMenu() { state.drawer = { kind: 'acct' }; renderDrawer(); focusFirst(); },
  async signOut() { state.drawer = null; try { await BE.auth.signOut(); toast('Signed out.'); } catch (e) { toast((e && e.message) || 'Could not sign out.'); } },
  portal(el) { state.view = 'mine'; state.portal.id = el.dataset.id || null; state.sign = { name: (state.user && state.user.name) || '', consent: false, drawn: false, busy: false, dataUrl: '' }; state.upload = {}; render(); window.scrollTo(0, 0); },
  jump(el) { const t = document.getElementById(el.dataset.to); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); const f = t.querySelector('input,button,canvas'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 400); } },
  async clientCancel(el) { try { await BE.rpc('client_cancel', { p_id: el.dataset.id }); toast('Request cancelled.'); loadHolds(true); } catch (e) { toast((e && e.message) || 'That did not go through.'); } },
  sigClear() { state.sign.drawn = false; state.sign.dataUrl = ''; const c = $('#sigPad'); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); },
  async clientSign(el) {
    const b = state.bookings.find((x) => x.id === el.dataset.id); const sg = state.sign; if (!b || sg.busy) return;
    if (String(sg.name || '').trim().length < 2) { toast('Type your full name.'); const n = $('#sg-name'); if (n) n.focus(); return; }
    if (!sg.drawn || !sg.dataUrl) { toast('Draw your signature in the box.'); return; }
    if (!sg.consent) { toast('Tick the box to agree to sign electronically.'); return; }
    sg.busy = true; render();
    try {
      const hash = await sha256hex(b.contract.text);
      await BE.rpc('client_sign', { p_id: b.id, p_name: sg.name.trim(), p_signature: sg.dataUrl, p_hash: hash, p_consent: true });
      state.sign = { name: '', consent: false, drawn: false, busy: false, dataUrl: '' }; toast('Signed. Thank you.');
    } catch (e) { sg.busy = false; toast((e && e.message) || 'That did not sign. Try again.'); }
    render();
  },
  async uploadDoc(el) {
    const kind = el.dataset.kind; const u = state.upload; const f = u[kind];
    if (!f) { toast('Choose the file first.'); return; }
    if (!state.user) { ACT.authOpen(); return; }
    u.busy = kind; render();
    try {
      const up = await BE.files.clientDoc(f, state.user.id);
      await BE.rpc('client_add_doc', { p_kind: kind, p_file: up.path, p_name: up.name, p_expires: u[kind + 'Exp'] || null, p_booking: el.dataset.id || null });
      state.upload = {}; toast(kind === 'coi' ? 'Certificate sent. We will check it and let you know.' : 'ST-121 sent. Thank you.');
    } catch (e) { u.busy = ''; toast((e && e.message) || 'That upload did not work. Try again.'); }
    render();
  },
  async saveProfile() {
    const f = state.profile || {};
    try { await BE.rpc('client_save_profile', { p: f }); state.profile = null; toast('Saved.'); } catch (e) { toast((e && e.message) || 'That did not save.'); }
  },
  openBooking(el) { state.tab = el.dataset.tab || (state.view === 'booking' ? state.tab : 'plan'); openBooking(el.dataset.id); },
  async newBooking() { const b = newBooking(); state.tab = 'plan'; await createBooking(b, true); },
  async quotePkg(el) { const b = newBooking(); addPackageTo(b, el.dataset.id); if (el.dataset.crew) { const op = crewFor(el.dataset.id); if (op) addCrewTo(b, op.role); } state.tab = 'plan'; await createBooking(b, true); },
  tab(el) {
    const row = $('.tabs'); const before = row ? row.getBoundingClientRect().top : null;
    state.tab = el.dataset.t; render();
    const after = $('.tabs'); if (before != null && after) window.scrollBy(0, after.getBoundingClientRect().top - before);
  },
  bkFilter(el) { state.bk.filter = el.dataset.f; render(); },
  payMethod(el) { state.pay.method = el.dataset.m; render(); },
  icsJob(el) { const b = state.bookings.find((x) => x.id === el.dataset.id) || state.draft; if (!b) return; saveFile(`${b.ref}.ics`, icsDoc(calEvents(b, state.role !== 'admin'), `${b.project || b.ref}`)); },
  icsAll() { const t = todayStr(); const list = state.bookings.filter((b) => b.status !== 'cancelled' && b.pickup && b.returnDate && b.returnDate >= addDays(t, -30)); if (!list.length) { toast('No jobs to add yet.'); return; } saveFile(`${slug(state.settings.company || 'jobs')}-schedule.ics`, icsDoc([].concat(...list.map((b) => calEvents(b, false))), `${state.settings.company} jobs`)); },
  async feedMake() { const a = new Uint8Array(24); crypto.getRandomValues(a); const token = Array.from(a).map((x) => x.toString(16).padStart(2, '0')).join(''); try { await db.doc('secrets/calendar').set({ token, createdAt: new Date().toISOString() }); toast('Calendar link ready. Any older link stops working.'); } catch (e) { writeError(e); } },
  moneyPeriod(el) { state.money.period = num(el.dataset.p); render(); },
  moneyAll() { state.money.all = true; render(); },
  fundSuggest(el) { const it = state.cat.byId[el.dataset.id]; if (!it) return; const c = costOf(it); state.fundAdd = { name: `Another ${it.name}`, cost: c ? String(Math.round(c.v / Math.max(1, it.qty))) : '' }; state.view = 'fund'; render(); const n = $('#fund-cost'); if (n) { n.scrollIntoView({ block: 'center' }); n.focus(); } toast('Check the price, then press Add.'); },
  clientOpen(el) { state.docAdd = null; state.drawer = { kind: 'client', key: el.dataset.k }; renderDrawer(); focusFirst(); },
  async docStatus(el) {
    const r = clientIndex().find((x) => x.key === el.dataset.k); if (!r || !r.rec) return; const rec = recFor(r);
    rec.data.docs = (rec.data.docs || []).map((x) => (x.id === el.dataset.d ? Object.assign({}, x, { status: el.dataset.s, checkedAt: new Date().toISOString() }) : x));
    try { await saveRec(rec); toast(el.dataset.s === 'ok' ? 'Accepted.' : 'Marked not accepted.'); } catch (e) { writeError(e); }
  },
  async docAdd(el) {
    const r = clientIndex().find((x) => x.key === el.dataset.k); const f = state.docAdd; if (!r || !f) return;
    const rec = recFor(r); const entry = { id: 'd' + Date.now().toString(36) + uid6(), kind: f.kind, name: f.file ? f.file.name : '', expires: f.expires || '', insurer: f.insurer || '', limit: f.limit ? num(f.limit) : '', status: 'ok', from: 'team', at: new Date().toISOString() };
    try {
      if (f.file) {
        if (MODE === 'claude') { if (!assetsNs) throw { message: 'Files need upload access to this page.' }; const a = await assetsNs.upload(f.file); entry.url = a.url; }
        else { const up = await BE.files.clientDoc(f.file, (r.rec && r.rec.uid) || 'team'); entry.file = up.path; }
      }
      rec.data.docs = (rec.data.docs || []).concat([entry]); await saveRec(rec); state.docAdd = null; toast('Added.'); renderDrawer();
    } catch (e) { toast((e && e.message) || 'That did not save.'); }
  },
  useCoi(el) {
    const r = clientIndex().find((x) => x.key === el.dataset.k); const b = state.draft; if (!r || !r.coi || !b) return; const d = r.coi;
    b.coi = Object.assign({}, b.coi, { status: d.status === 'ok' ? 'received' : (b.coi && b.coi.status) === 'verified' ? 'verified' : 'received', insurer: d.insurer || (b.coi && b.coi.insurer) || '', equipLimit: d.limit || (b.coi && b.coi.equipLimit) || '', expires: d.expires || '', file: d.file || '', docId: d.id });
    scheduleSave(0); render(); toast('Certificate on file added. Check the list, then mark it verified.');
  },
  useSt121(el) { const r = clientIndex().find((x) => x.key === el.dataset.k); const b = state.draft; if (!r || !r.st121 || !b) return; b.tax = Object.assign({}, b.tax, { exempt: true, cert: r.st121.status === 'ok', certFile: r.st121.file || '', certDocId: r.st121.id }); scheduleSave(0); render(); toast(r.st121.status === 'ok' ? 'ST-121 on file: no sales tax.' : 'ST-121 added. Check it, then tick it.'); },
  async teamAdd() {
    const em = normKey(state.teamAdd.email); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('Enter their email address.'); return; }
    try { await db.doc('team/' + docKey(em)).set({ email: em, name: String(state.teamAdd.name || '').trim(), addedAt: new Date().toISOString(), addedBy: (state.user && state.user.email) || '' }); state.teamAdd = { email: '', name: '' }; toast(`${em} is on the team. They sign up with that email to get in.`); render(); } catch (e) { writeError(e); }
  },
  async teamRemove(el) { const em = el.dataset.e; if (normKey(em) === normKey(state.user && state.user.email) && !confirm('Remove yourself from the team? You will lose access to the desk.')) return; try { await db.doc('team/' + docKey(em)).delete(); toast(`${em} is off the team.`); } catch (e) { toast((e && e.message) || 'That did not save.'); } },
  async photoRemove(el) { const id = el.dataset.id; const list = photosOf(id).slice(); const [gone] = list.splice(num(el.dataset.i), 1); try { await savePhotos(id, list); await dropPhoto(gone && gone.ref); toast('Photo removed.'); } catch (e) { writeError(e); } render(); },
  async photoCover(el) { const id = el.dataset.id; const list = photosOf(id).slice(); const [x] = list.splice(num(el.dataset.i), 1); list.unshift(x); try { await savePhotos(id, list); } catch (e) { writeError(e); } render(); },
  labelsOpen(el) { const id = el && el.dataset && el.dataset.id; state.label = Object.assign({}, state.label, { scope: id ? 'item:' + id : state.label.scope.startsWith('item:') ? 'all' : state.label.scope }); state.drawer = { kind: 'labels' }; renderDrawer(); focusFirst(); },
  labelsPrint() {
    if (typeof qrcode !== 'function') { toast('The QR code maker did not load. Reload the page and try again.'); return; }
    const html = labelSheetHtml(labelItems(), state.label.size);
    if (MODE === 'claude') { saveFile(`gear-labels-${todayStr()}.html`, html); return; }
    const w = window.open('', '_blank'); if (!w) { saveFile(`gear-labels-${todayStr()}.html`, html); return; }
    w.document.open(); w.document.write(html); w.document.close();
  },
  scanStart() { const b = state.draft; if (!b) return; state.scan = { dir: b.status === 'out' ? 'back' : 'out', last: '', lastAt: 0, stream: null, timer: null }; state.drawer = { kind: 'scan' }; renderDrawer(); startCamera(); const m = $('#scanManual'); if (m && !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) m.focus(); },
  scanStop() { stopCamera(); state.scan = null; state.drawer = null; render(); },
  scanManual() { const inp = $('#scanManual'); const hit = parseScan(inp && inp.value); if (!hit) { toast('Type an ID like S-ELE-100.'); return; } if (tickUnit(hit.id, hit.unit) && inp) { inp.value = ''; inp.focus(); } },
  scanPick(el) { state.drawer = null; state.tab = 'handoff'; openBooking(el.dataset.id); tickUnit(el.dataset.item, num(el.dataset.u)); },
  copyText(el) { copy(el.dataset.t, 'Copied.'); },
  async payCard(el) {
    const b = state.bookings.find((x) => x.id === el.dataset.id); if (!b || state.pay.busy) return;
    const kind = el.dataset.kind; const due = amountDue(b);
    const amount = kind === 'hold' ? num((b.bill || {}).repl) : Math.max(0, round2(due.amount - due.pending));
    if (MODE === 'preview') { state.pay.sim = { id: b.id, kind, amount, ref: b.ref }; state.drawer = { kind: 'paysim' }; renderDrawer(); focusFirst(); return; }
    state.pay.busy = true; render();
    try { const r = await BE.fn('stripe-checkout', { bookingId: b.id, kind }); if (r && r.url) { location.href = r.url; return; } throw { message: 'Checkout did not open. Try again.' }; }
    catch (e) { toast((e && e.message) || 'Card payments are not available right now. Try Venmo or Zelle, or try again later.'); }
    state.pay.busy = false; render();
  },
  async simPay() {
    const sim = state.pay.sim; if (!sim) return;
    try { await BE.rpc('demo_card_paid', { p_id: sim.id, p_kind: sim.kind, p_amount: sim.amount }); state.drawer = null; state.pay.sim = null; toast(sim.kind === 'hold' ? 'The card hold is placed (simulated).' : `Paid ${money(sim.amount)} (simulated).`); }
    catch (e) { toast((e && e.message) || 'That did not go through.'); }
    render();
  },
  async payReport(el) {
    const b = state.bookings.find((x) => x.id === el.dataset.id); if (!b || state.pay.busy) return;
    const due = amountDue(b); const amount = state.pay.for === b.id && state.pay.amount !== '' ? num(state.pay.amount) : round2(due.amount - due.pending);
    if (!(amount > 0)) { toast('Enter the amount you sent.'); return; }
    state.pay.busy = true; render();
    try { await BE.rpc('client_report_payment', { p_id: b.id, p_method: el.dataset.m, p_kind: due.kind === 'deposit' ? 'deposit' : 'balance', p_amount: amount, p_note: state.pay.note || '' }); state.pay = Object.assign(state.pay, { amount: '', note: '', for: null }); toast('Thanks. We will confirm it as soon as it lands.'); }
    catch (e) { toast((e && e.message) || 'That did not go through. Try again.'); }
    state.pay.busy = false; render();
  },
  async payRecord() {
    const b = state.draft; if (!b) return; const r = state.payRec; const due = amountDue(b);
    const amount = r.amount !== '' ? num(r.amount) : Math.max(0, due.amount);
    if (!(amount > 0)) { toast('Enter the amount.'); return; }
    const pay = { id: 'p' + Date.now().toString(36) + uid6(), bookingId: b.id, ref: b.ref, method: r.method, kind: r.kind, amount: round2(amount), status: 'received', note: r.note || '', at: new Date().toISOString(), by: state.uid || null, byName: (state.user && (state.user.name || state.user.email)) || '' };
    if (await writePayment(pay)) { state.payRec = { method: r.method, kind: 'balance', amount: '', note: '' }; toast(`${money(amount)} recorded.`); render(); }
  },
  async payConfirm(el) {
    const p = state.payments.find((x) => x.id === el.dataset.p); if (!p) return;
    const next = Object.assign({}, p, { status: 'received', receivedAt: new Date().toISOString(), receivedBy: state.uid || null });
    if (await writePayment(next)) { toast(`${money(num(p.amount))} confirmed.`); render(); }
  },
  async payReject(el) {
    const p = state.payments.find((x) => x.id === el.dataset.p); if (!p) return;
    if (await writePayment(Object.assign({}, p, { status: 'void', voidAt: new Date().toISOString() }))) { toast('Marked as not received.'); render(); }
  },
  async holdAct(el) {
    const p = state.payments.find((x) => x.id === el.dataset.p); if (!p) return; const action = el.dataset.a;
    const amount = action === 'capture' ? num(state.holdAmt) : 0;
    if (action === 'capture' && !(amount > 0 && amount <= num(p.amount))) { toast(`Enter an amount up to ${money(num(p.amount))} to charge.`); return; }
    if (MODE === 'live' && p.stripe && p.stripe.intent) {
      try { await BE.fn('stripe-hold', { paymentId: p.id, action, amount }); state.holdAmt = ''; toast(action === 'release' ? 'Hold released.' : `${money(amount)} charged from the hold.`); } catch (e) { toast((e && e.message) || 'Stripe did not take that. Try again from the Stripe dashboard.'); }
      return;
    }
    const next = Object.assign({}, p, action === 'release' ? { status: 'released', releasedAt: new Date().toISOString() } : { status: 'captured', captured: amount, capturedAt: new Date().toISOString() });
    if (await writePayment(next)) { state.holdAmt = ''; toast(action === 'release' ? 'Hold released.' : `${money(amount)} charged from the hold.`); render(); }
  },
  calMove(el) { state.cal.start = addDays(state.cal.start, num(el.dataset.n)); render(); },
  calToday() { state.cal.start = mondayOf(todayStr()); render(); },
  invOwn(el) { state.inv.own = el.dataset.v; render(); },
  invSec(el) { const c = el.dataset.c; state.inv.open = Object.assign({}, state.inv.open, { [c]: !state.inv.open[c] }); render(); },
  invAll(el) { const on = el.dataset.v === '1'; state.inv.open = {}; if (on) CAT_ORDER.forEach((c) => (state.inv.open[c] = true)); render(); },
  kitSec(el) { const k = el.dataset.id; state.kitOpen = Object.assign({}, state.kitOpen, { [k]: !state.kitOpen[k] }); render(); },
  invFlag() { state.inv.flag = !state.inv.flag; render(); },
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
    const sendIt = to === 'quoted' && (!b.contract || b.contract.status === 'draft');
    const go = () => { scheduleSave(0); render(); toast(`${b.project || b.ref} is now ${STATUS[to].label.toLowerCase()}.${sendIt ? ' The quote and agreement are in their bookings.' : ''}`); };
    if (sendIt) snapshotAgreement(b).then(go); else go();
  },
  async contract(el) {
    const b = state.draft; b.contract = b.contract || {}; const to = el.dataset.s;
    if (b.contract.signature && to !== 'signed') { state.confirmResend = true; render(); return; }
    if (to === 'sent') await snapshotAgreement(b); else b.contract.status = to;
    if (to === 'signed' && !b.contract.signedOn) b.contract.signedOn = todayStr();
    scheduleSave(0); render();
    if (to === 'sent') toast('Agreement sent. A client with an account reads and signs it under My bookings.');
  },
  async resendAgreement() { const b = state.draft; state.confirmResend = false; await snapshotAgreement(b); scheduleSave(0); render(); toast('The updated agreement is out for signature.'); },
  keepSigned() { state.confirmResend = false; render(); },
  dlSigned(el) { const b = state.bookings.find((x) => x.id === el.dataset.id) || state.draft; if (!b) return; saveFile(`${b.ref}-rental-agreement-signed.html`, signedCopy(b)); },
  async openDoc(el) {
    if (el.dataset.url) { window.open(el.dataset.url, '_blank', 'noopener'); return; }
    const path = el.dataset.path; if (!path || !BE.files) { toast('Files open on the website version of the desk.'); return; }
    const w = window.open('', '_blank');
    try {
      const url = await BE.files.docUrl(path);
      if (/^data:/.test(url)) { const blob = await (await fetch(url)).blob(); const u = URL.createObjectURL(blob); if (w) w.location = u; else window.open(u, '_blank'); }
      else if (w) w.location = url; else window.open(url, '_blank');
    } catch (e) { if (w) w.close(); toast((e && e.message) || 'That file could not be opened.'); }
  },
  coiStatus(el) { const b = state.draft; b.coi = b.coi || {}; b.coi.status = el.dataset.s; if (el.dataset.s === 'requested') b.coi.requestedAt = new Date().toISOString(); scheduleSave(0); render(); },
  checkOut() { const b = state.draft; b.checkout = b.checkout || { out: {}, back: {}, notes: {} }; b.checkout.outAt = new Date().toISOString(); b.checkout.outBy = state.uid || null; if (b.fundPct == null) b.fundPct = num(state.settings.fundPct); b.status = 'out'; scheduleSave(0); render(); toast(`${b.project || b.ref} is out.`); },
  checkIn() { const b = state.draft; const late = Math.max(0, diffDays(b.returnDate, todayStr())); b.checkout.inAt = new Date().toISOString(); b.checkout.inBy = state.uid || null; b.late = late ? { days: late, fee: late * chosen(b).dayRate } : null; b.status = 'returned'; scheduleSave(0); render(); toast(late ? `Back ${plural(late, 'day')} late. The late charge is on the bill.` : `${b.project || b.ref} is back.`); },
  copyAgreement() { copy(agreementText(state.draft), 'Agreement copied.'); },
  copyCoi() { copy(coiRequestText(state.draft), 'Request copied.'); },
  dlAgreement() { const b = state.draft; saveFile(`${b.ref}-rental-agreement.html`, standaloneDoc(`Rental agreement ${b.ref}`, agreementHTML(b))); },
  dlSchedule() { const b = state.draft; const rows = scheduleRows(b); saveFile(`${b.ref}-gear-list.csv`, toCsv([['Item ID', 'Item', 'Owner', 'Qty', 'day_rate', 'possession_rate', 'replacement_value', 'On the house'], ...rows.map((r) => [r.id, r.name, OWNERS[r.own] ? OWNERS[r.own].name : '', r.qty, r.day, r.poss, r.repl, r.comped ? 'yes' : ''])])); },
  dlPoolSchedule() { const rows = state.cat.items.filter((i) => i.qty > 0); saveFile(`equipment-schedule-${todayStr()}.csv`, toCsv([['Item ID', 'Item', 'Category', 'Owner', 'Qty', 'Value each', 'Value total', 'Kit group', 'Serial number', 'Notes'], ...rows.map((i) => [i.id, i.name, i.cat, OWNERS[i.own] ? OWNERS[i.own].name : '', i.qty, i.resale || 0, (i.resale || 0) * i.qty, i.kit, serialsList(i.id).filter(Boolean).join('; '), i.resale ? '' : 'Value carried by the kit line'])])); },
  storeGroup(el) { state.store.group = el.dataset.g; render(); },
  cart(el) { const k = el.dataset.k; const st = state.store; const i = st.cart.findIndex((c) => c.key === k); if (i >= 0) st.cart.splice(i, 1); else st.cart.push({ key: k, qty: 1, crew: false }); st.sent = ''; render(); },
  uncart(el) { state.store.cart.splice(num(el.dataset.i), 1); render(); },
  async sendRequest() {
    const st = state.store; const f = st.form; const S = state.settings;
    if (!storeDatesOk()) { toast('Pick a pickup date and a return date on or after it.'); return; }
    if (!st.cart.length) { toast('Add a kit or a piece of gear first.'); return; }
    if (state.role === 'guest' && MODE !== 'claude') { state.afterAuth = 'sendRequest'; state.auth = Object.assign(state.auth, { mode: MODE === 'live' ? 'up' : 'in', msg: '', busy: false, then: 'sendRequest' }); state.drawer = { kind: 'auth' }; renderDrawer(); focusFirst(); return; }
    if (!f.name && !f.company) { toast('Add a name or company so we know who to quote.'); return; }
    const sd = Math.max(1, num(f.shootDays, 1));
    const b = newBooking({ status: 'request', source: 'storefront', project: f.project, client: { name: f.name, company: f.company, email: f.email, phone: f.phone }, pickup: f.pickup, returnDate: f.ret, shootStart: f.pickup < f.ret ? addDays(f.pickup, 1) : f.pickup, shootDays: sd,
      handoff: { out: f.handoff, back: f.handoff, address: '' }, protection: f.protection, discount: f.student ? { kind: 'student', pct: num(S.studentPct) } : { kind: 'none', pct: 0 }, tax: { exempt: !!f.exempt, cert: false } });
    b.possessionDays = suggestPossession(b);
    st.cart.forEach((c) => { const p = state.cat.pkgById[c.key]; if (p) { addPackageTo(b, c.key); if (c.crew) { const op = crewFor(c.key); if (op) addCrewTo(b, op.role); } } else addLineTo(b, c.key, num(c.qty, 1)); });
    b.lines.forEach((l) => (l.days = sd)); (b.crew || []).forEach((c) => (c.days = sd));
    if (state.role === 'client') {
      try { const r = await BE.rpc('submit_request', { p: b }); st.cart = []; st.form = Object.assign({}, st.form, { project: '' }); st.sentId = r.id; st.sent = `Thanks. Request ${r.ref} is in, and a quote will follow.`; loadHolds(true); render(); }
      catch (e) { toast((e && e.message) || 'The request did not go through. Try again.'); }
      return;
    }
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
  if (el.dataset.auth != null) { state.auth[el.dataset.auth] = el.value; return; }
  if (el.dataset.sign != null) { state.sign[el.dataset.sign] = el.type === 'checkbox' ? el.checked : el.value; return; }
  if (el.dataset.profile != null) { (state.profile = state.profile || {})[el.dataset.profile] = el.value; return; }
  if (el.dataset.upfile != null) { if (e.type === 'change') { state.upload[el.dataset.upfile] = el.files && el.files[0] || null; render(); } return; }
  if (el.dataset.upexp != null) { state.upload[el.dataset.upexp + 'Exp'] = el.value; return; }
  if (el.dataset.ext != null && FIELD_EXT[el.dataset.ext]) { FIELD_EXT[el.dataset.ext](el, e, texty); return; }
  if (e.type === 'change' && texty && el.dataset.b != null && state.draft && (el.dataset.b === 'client.email' || el.dataset.b === 'client.company')) { if (autoReturning(state.draft)) { toast(`Returning client: ${num(state.settings.returningPct)}% off applied.`); scheduleSave(); render(); } return; }
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
    if (path === 'discount.kind') { d.returningChecked = true; const S = state.settings; const p = { student: S.studentPct, returning: S.returningPct, referral: S.referralPct }[v]; d.discount.pct = p != null ? num(p) : v === 'none' ? 0 : num(d.discount.pct); }
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
  if (el.dataset.inv != null) { state.inv[el.dataset.inv] = el.value; if (full) render(); else { const t = $('#invBody'); if (t) t.innerHTML = invBody(invFiltered()); } return; }
  if (el.dataset.sf != null) { state.store.form[el.dataset.sf] = el.type === 'checkbox' ? el.checked : el.value; if (full) render(); return; }
  if (el.dataset.storecrew != null) { const c = state.store.cart.find((x) => x.key === el.dataset.storecrew); if (c) c.crew = el.checked; render(); return; }
  if (el.dataset.cartqty != null) { const c = state.store.cart[num(el.dataset.cartqty)]; if (c) c.qty = Math.max(1, num(el.value, 1)); requestRender(); return; }
  if (el.dataset.road != null) { state.road[el.dataset.road] = el.checked; render(); return; }
  if (el.dataset.home != null) { setHomePref(el.checked ? 'today' : 'welcome'); toast(el.checked ? 'The desk will open on Today.' : 'The desk will open on Start.'); return; }
  if (el.dataset.fund != null) { state.fundAdd[el.dataset.fund] = el.value; return; }
  if (el.dataset.buyprice != null) { state.buyPrice[el.dataset.buyprice] = el.value; }
}
const FIELD_EXT = {
  clientsq(el) { state.clientsQ = el.value; const host = $('main .view'); if (host) { render(); const q = $('#cl-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } } },
  docadd(el) { const f = state.docAdd = state.docAdd || { kind: 'coi' }; f[el.dataset.k] = el.type === 'file' ? (el.files && el.files[0]) || null : el.value; if (el.dataset.k === 'kind' || el.type === 'file') renderDrawer(); },
  clientnote(el, e) {
    if (e.type !== 'change') return; const r = clientIndex().find((x) => x.key === el.dataset.k); if (!r) return;
    const rec = recFor(r); rec.data.notes = el.value; saveRec(rec).then(() => toast('Notes saved.'), writeError);
  },
  teamadd(el) { state.teamAdd[el.dataset.k] = el.value; },
  sheetlink(el, e) { if (e.type !== 'change') return; const url = el.value.trim(); if (url && !/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) { toast('That should be the Apps Script link, starting https://script.google.com/.'); return; } db.doc('secrets/sheet').set({ url, updatedAt: new Date().toISOString() }).then(() => toast('Sheet link saved.'), writeError); },
  privatefile(el, e) { if (e.type !== 'change') return; const f = el.files && el.files[0]; el.value = ''; if (f) loadPrivateFile(f); },
  photos(el, e) { if (e.type !== 'change') return; const files = Array.from(el.files || []); el.value = ''; addPhotos(el.dataset.id, files); },
  gear(el) {
    const id = el.dataset.id; const k = el.dataset.k; const g = state.gear[id] = Object.assign({ itemId: id, serials: [] }, state.gear[id]);
    if (k === 'serial') { const list = (g.serials || []).slice(); list[num(el.dataset.n)] = el.value.trim(); g.serials = list; }
    else if (k === 'serials') g.serials = el.value.split('\n').map((x) => x.trim());
    else if (k === 'paid') g.paid = el.value === '' ? null : num(el.value);
    else g[k] = el.value;
    saveGearSoon(id);
  },
  label(el) { const k = el.dataset.k; state.label[k] = el.type === 'checkbox' ? el.checked : el.value; renderDrawer(); },
  scanid(el, e) { if (e.type === 'change') ACT.scanManual(); },
  pay(el) { state.pay[el.dataset.k] = el.value; if (el.dataset.for) state.pay.for = el.dataset.for; },
  payrec(el) { state.payRec[el.dataset.k] = el.value; },
  holdamt(el) { state.holdAmt = el.value; },
};
/* The team's full rate card, loaded once from rate-card.private.json. The stripped copy the storefront reads is
   written at the same time, so rates stay the same on both sides. */
function publicCatalog(src) {
  const keep = (n) => (/RATE IS PER LENS/.test(n || '') ? 'RATE IS PER LENS.' : /^Transport/.test(n || '') ? 'Transport, not billed.' : '');
  return { asOf: src.asOf, rows: src.rows.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5], null, null, r[8], null, '', '', keep(r[12]), '', null]), packages: src.packages, labor: (src.labor || []).map((l) => [l[0], l[1], null, l[3], null, '']), laborRules: src.laborRules || [] };
}
async function publishPublicCatalog(src) { if (MODE !== 'live' || !db) return; await db.doc('catalog/public').set({ payload: JSON.stringify(publicCatalog(src)), syncedAt: new Date().toISOString() }); }
async function loadPrivateFile(f) {
  let data = null;
  try { data = JSON.parse(await f.text()); } catch (_) { toast('That file is not the rate card export. Make it with tools/export-private.js.'); return; }
  if (!data || !Array.isArray(data.rows) || data.rows.length < 10 || !Array.isArray(data.packages)) { toast('That file does not look like the full rate card.'); return; }
  try {
    await db.doc('private/snapshot').set({ payload: JSON.stringify(data), asOf: data.asOf || '', loadedAt: new Date().toISOString(), loadedBy: (state.user && state.user.email) || '' });
    await publishPublicCatalog(data);
    toast(`Full rate card loaded: ${plural(data.rows.length, 'item')}.`);
  } catch (e) { writeError(e); }
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
  if (!db || !SNAP.sheetId && !(state.secrets.sheet && state.secrets.sheet.url)) return;
  state.syncing = true; state.syncMsg = ''; render();
  const get = (range) => mcpNs.callTool('Google Sheets', 'get_values', { spreadsheetId: SNAP.sheetId, range }, { cache: false });
  try {
    let inv, pk, lb;
    if (MODE === 'live') {
      const res = await fetch(state.secrets.sheet.url, { redirect: 'follow' }); if (!res.ok) throw new Error(`The sheet link answered ${res.status}. Check the Apps Script is deployed for anyone.`);
      const j = await res.json(); if (j.error) throw new Error(j.error);
      [inv, pk, lb] = [{ payload: { values: j.inventory } }, { payload: { values: j.packages } }, { payload: { values: j.labor } }];
    } else [inv, pk, lb] = await Promise.all([get('Inventory!A1:Q500'), get('Packages!A1:H20'), get('Labor!A1:F20')]);
    const rows = parseInventory(valuesOf(inv));
    const packages = valuesOf(pk).filter((r) => /^PKG-/.test(String(r[0] || ''))).map((r) => [r[0], r[1], r[2], r[3] || '']);
    const labor = valuesOf(lb).slice(1).filter((r) => r[0] && numOrNull(r[3]) != null).map((r) => [r[0], r[1], num(r[2]), num(r[3]), num(r[4]), r[5] || '']);
    if (rows.length < 10 || !packages.length || !labor.length) throw new Error('The sheet came back with fewer rows than expected, so nothing was changed.');
    const doc = { rows, packages, labor, asOf: todayStr(), syncedAt: new Date().toISOString(), syncedBy: state.uid || null };
    await db.doc('catalog/current').set({ payload: JSON.stringify(doc), syncedAt: doc.syncedAt });
    await publishPublicCatalog(Object.assign({}, SNAP, doc));
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
function use(name) { return HOSTED ? window.claude.use(name).catch(() => null) : Promise.resolve(null); }
function applySources() {
  let base = SNAPSHOT;
  if (state.role === 'admin' && state.privateDoc && state.privateDoc.payload) { try { const p = JSON.parse(state.privateDoc.payload); if (p && Array.isArray(p.rows) && p.rows.length) base = p; } catch (_) { /* keep the public card */ } }
  applySnapshotMeta(base);
  applyCatalog();
}
function applyCatalog() {
  let src = SNAP;
  const doc = state.role === 'admin' || MODE === 'claude' ? state.catalogDoc : state.catalogPublic;
  if (doc && doc.payload) { try { const p = JSON.parse(doc.payload); if (p.rows && p.rows.length) src = Object.assign({}, SNAP, { source: state.role === 'admin' ? 'sheet' : 'snapshot' }, p); } catch (_) { /* keep snapshot */ } }
  state.cat = buildCatalog(src);
}
const docsOf = (snap) => snap.docs.filter((x) => x.exists).map((x) => Object.assign({}, x.data(), { id: x.id }));
const byKey = (snap, key) => Object.fromEntries(snap.docs.filter((x) => x.exists).map((x) => { const d = x.data(); return [(key && d[key]) || x.id, Object.assign({ _id: x.id }, d)]; }));
function subscribe() {
  const d = db;
  d.collection('bookings').onSnapshot((snap) => {
    state.bookings = docsOf(snap);
    state.dbState = 'ready';
    if (state.view === 'booking' && state.draft) {
      const fresh = state.bookings.find((b) => b.id === state.draft.id);
      if (!fresh && !state.dirty && !saving && !snap.metadata.hasPendingWrites && !snap.metadata.fromCache) { state.draft = null; state.view = state.role === 'admin' ? 'bookings' : homeFor(state.role); toast('That job was deleted.'); }
      else if (fresh && !state.dirty && !saving && stable(fresh) !== stable(state.draft)) state.draft = clone(fresh);
    }
    processRoute();
    requestRender();
  }, () => { state.dbState = 'error'; requestRender(); });
  d.doc('settings/company').onSnapshot((s) => { if (s.exists && !settingsPending) state.settings = Object.assign({}, DEFAULTS, s.data()); requestRender(); }, () => {});
  d.doc('catalog/current').onSnapshot((s) => { state.catalogDoc = s.exists ? s.data() : null; applyCatalog(); requestRender(); }, () => {});
  d.doc('fund/plan').onSnapshot((s) => { state.fundPlan = Object.assign({ order: [], bought: {}, extra: [] }, s.exists ? s.data() : {}); requestRender(); }, () => {});
  d.collection('payments').onSnapshot((s) => { state.payments = docsOf(s); requestRender(); }, () => {});
  d.collection('photos').onSnapshot((s) => { state.photos = Object.fromEntries(Object.values(byKey(s, 'itemId')).map((x) => [x.itemId || x._id, x.list || []])); requestRender(); }, () => {});
  d.collection('gear').onSnapshot((s) => { state.gear = byKey(s, 'itemId'); requestRender(); }, () => {});
  d.collection('clients').onSnapshot((s) => { state.clientRecs = byKey(s); requestRender(); }, () => {});
  if (MODE === 'claude') return;
  d.doc('catalog/public').onSnapshot((s) => { state.catalogPublic = s.exists ? s.data() : null; applyCatalog(); requestRender(); }, () => {});
  d.collection('team').onSnapshot((s) => { state.team = docsOf(s).map((t) => Object.assign({ email: t.id }, t)); requestRender(); }, () => {});
  d.doc('private/snapshot').onSnapshot((s) => { state.privateDoc = s.exists ? s.data() : null; applySources(); requestRender(); }, () => {});
  d.collection('secrets').onSnapshot((s) => { state.secrets = byKey(s); requestRender(); }, () => {});
}
/* Who is this? The team is whoever the database says is an admin; everyone else signed in is a client. */
async function resolveRole() {
  let role = 'guest';
  if (MODE === 'claude') role = 'admin';
  else if (MODE === 'preview') role = BE.auth.role();
  else if (state.user) { try { role = (await BE.rpc('is_admin')) ? 'admin' : 'client'; } catch (_) { role = 'client'; } }
  const was = state.role; state.role = role; state.uid = state.user ? state.user.id : state.uid;
  if (role !== was) {
    if (role === 'client' && MODE === 'live') BE.rpc('claim_my_bookings').catch(() => {});
    if (!allowedView(state.view) || state.view === 'booking' && role !== 'admin') state.view = state.view === 'storefront' && role !== 'admin' ? 'storefront' : homeFor(role);
    if (role !== 'admin') { state.touring = false; state.draft = null; }
    state.drawer = state.drawer && state.drawer.kind === 'auth' && role === 'guest' ? state.drawer : null;
    applySources();
  }
  loadHolds(true);
  processRoute();
  requestRender();
  if (state.afterAuth && role !== 'guest') { const next = state.afterAuth; state.afterAuth = null; state.auth.then = null; if (next === 'sendRequest') setTimeout(() => ACT.sendRequest(), 50); }
}
async function onAuth(event, user) {
  state.user = user || null;
  if (event === 'PASSWORD_RECOVERY') { state.auth = Object.assign(state.auth, { mode: 'newpw', msg: '', tone: '' }); state.drawer = { kind: 'auth' }; }
  await resolveRole();
}
let holdsAt = 0;
async function loadHolds(force) {
  if (state.role === 'admin' || MODE === 'claude' || !BE.rpc) return;
  if (!force && Date.now() - holdsAt < 60000) return;
  holdsAt = Date.now(); const t = todayStr();
  try { state.holdsPublic = (await BE.rpc('busy_holds', { p_from: addDays(t, -7), p_to: addDays(t, 390) })) || []; requestRender(); } catch (_) { /* availability stays unknown */ }
}
async function connect() {
  if (MODE === 'claude') {
    use('downloads').then((d) => { downloadsNs = d; state.canDownload = !!d; if (d) requestRender(); });
    use('mcp').then((m) => { mcpNs = m; state.mcpReady = !!m; if (m) requestRender(); });
    use('assets').then((a) => { assetsNs = a; if (a) requestRender(); });
    use('user').then(async (u) => {
      userNs = u; if (!u) return;
      try { state.uid = await u.id(); } catch (_) { /* no id */ }
      try { const w = await u.can('data.write'); state.canWrite = w; if (w === false) state.readOnly = true; } catch (_) { /* unknown */ }
      requestRender();
    });
    const d = await use('db'); db = d; BE.db = d;
    if (!d) { state.dbState = 'off'; requestRender(); return; }
    subscribe(); return;
  }
  if (MODE === 'preview') Object.assign(BE, LOCAL, { mode: MODE });
  else {
    try { Object.assign(BE, await window.SGP_LIVE, { mode: MODE }); }
    catch (e) { state.dbState = 'off'; state.liveError = (e && e.message) || 'The site could not reach its database.'; requestRender(); return; }
  }
  BE.siteUrl = BE.siteUrl || (window.SGP_CONFIG && window.SGP_CONFIG.siteUrl) || (location.origin + location.pathname);
  downloadsNs = (window.SGP_LOCAL && window.SGP_LOCAL.downloads) || null; state.canDownload = !!downloadsNs;
  db = BE.db;
  BE.auth.onChange(onAuth);
  try { state.user = await BE.auth.current(); } catch (_) { state.user = null; }
  subscribe();
  await resolveRole();
}
/* Links into the site: #scan/<item>/<unit> from a label, #paid/<job>/<kind> back from card checkout, #job/<id>, #signin. */
function takeRoute() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (!h || /access_token|refresh_token|error_description|type=/.test(h)) return;
  state.pendingRoute = h;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { /* file: pages */ }
  processRoute();
}
function processRoute() {
  const h = state.pendingRoute; if (!h || state.dbState === 'wait') return;
  let m;
  if (h === 'signin' || h === 'signup') { state.pendingRoute = ''; if (state.role === 'guest') { state.auth.mode = h === 'signup' ? 'up' : 'in'; state.drawer = { kind: 'auth' }; } requestRender(); return; }
  if ((m = h.match(/^paid\/([\w-]+)\/(\w+)$/))) {
    if (state.role === 'guest' && MODE === 'live') return;
    state.pendingRoute = ''; toast(m[2] === 'hold' ? 'The card hold is placed. Thank you.' : 'Payment received. Thank you.');
    if (state.role === 'admin') { const b = state.bookings.find((x) => x.id === m[1]); if (b) { state.tab = 'handoff'; openBooking(b.id); return; } }
    else { state.view = 'mine'; state.portal.id = m[1]; }
    requestRender(); return;
  }
  if ((m = h.match(/^job\/([\w-]+)$/))) {
    if (state.role === 'guest') { if (MODE === 'live') { state.auth.mode = 'in'; state.drawer = { kind: 'auth' }; requestRender(); } return; }
    state.pendingRoute = '';
    if (state.role === 'admin') { if (state.bookings.some((b) => b.id === m[1])) openBooking(m[1]); return; }
    state.view = 'mine'; state.portal.id = m[1]; requestRender(); return;
  }
  if ((m = h.match(/^scan\/([A-Z?][-A-Z0-9]*?-\d+)(?:\/(\d+))?$/))) { state.pendingRoute = ''; scanRoute(m[1], num(m[2])); return; }
  state.pendingRoute = '';
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
    if (e.key === 'Escape' && state.drawer) { if (state.drawer.kind === 'scan') ACT.scanStop(); else ACT.closeDrawer(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act][tabindex]') && !/^(BUTTON|A|INPUT)$/.test(e.target.tagName)) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
  document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !editing()) render(); }, 0));
  window.addEventListener('pagehide', () => { if (state.dirty) flushSave(); });
  window.addEventListener('hashchange', takeRoute);
  takeRoute();
  render();
  connect();
}
init();
})();

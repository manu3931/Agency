/* The live site: src/config.js pointing at a Supabase project, played by tests/mock-supabase.js.

     node tests/live.js

   A visitor sees only the storefront and signs up (and is told to confirm their email); a client signs in,
   finds the job the team started for them, sends a request and starts a card checkout; the owner signs
   in to the whole desk, loads the full rate card, adds a photo and makes the calendar link. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });
const failures = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) failures.push(msg); };
const wait = (page, ms) => page.waitForTimeout(ms || 200);
const text = async (page, sel) => ((await page.$(sel)) ? (await page.textContent(sel)) || '' : '');

const ctx0 = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src', 'data.js'), 'utf8') + ';this.S = SNAPSHOT;', ctx0);
const fullCard = Object.assign({}, ctx0.S, { preview: false, owners: { M: { name: 'Mo Tester', short: 'Mo' }, C: { name: 'Cy Tester', short: 'Cy' }, S: { name: 'Sy Tester', short: 'Sy' } }, rows: ctx0.S.rows.map((r) => { const x = r.slice(); x[6] = 1000; return x; }) });
const cardFile = path.join(OUT, 'rate-card.private.json'); fs.writeFileSync(cardFile, JSON.stringify(fullCard));

const seed = {
  users: [
    { id: 'u-owner', email: 'owner@test.com', password: 'owner-pass-1', name: 'Olive Owner', confirmed: true },
    { id: 'u-client', email: 'client@test.com', password: 'client-pass-1', name: 'Cal Client', confirmed: true },
  ],
  docs: {
    'team/owner@test.com': { data: { email: 'owner@test.com', name: 'Olive Owner' } },
    'settings/company': { data: { company: 'Shared Gear Pool', payCard: true, payVenmo: 'poolgear', depositPct: 25 } },
    'bookings/b-team': { owner: 'u-client', data: { id: 'b-team', ref: 'SGP-261001-ABC', status: 'quoted', project: 'Team-made job', client: { name: 'Cal Client', email: 'client@test.com' }, pickup: '2026-10-16', pickupTime: '15:00', returnDate: '2026-10-19', returnTime: '10:00', shootDays: 1, shootStart: '2026-10-16', lines: [{ id: 'S-ELE-100', qty: 1, days: 1, tier: 'C' }], crew: [], protection: 'coi', coi: { status: 'none' }, tax: { exempt: false }, contract: { status: 'draft' }, deposit: { status: 'none' }, bill: { total: 400, deposit: 100, depositPct: 25, repl: 2000, budget: 'A', rows: [{ l: 'Gear rental', v: 367 }, { l: 'Total', v: 400, c: 'tot', b: true }] } } },
    'bookings/b-other': { owner: null, data: { id: 'b-other', ref: 'SGP-261001-ZZZ', status: 'confirmed', project: 'Someone else', client: { name: 'Other', email: 'other@test.com' }, pickup: '2026-10-16', returnDate: '2026-10-18', lines: [{ id: 'S-ELE-100', qty: 1, tier: 'C' }] } },
  },
};

function livePage() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const mock = fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8');
  html = html.replace('<head>', `<head><base href="file://${ROOT}/">`);
  html = html.replace('<script src="src/config.js"></script>', `<script>window.SGP_CONFIG = { supabaseUrl: 'https://mock.supabase.co', supabaseKey: 'sb_publishable_test', siteUrl: 'https://example.test/' }; window.__seed = ${JSON.stringify(seed)};</script><script>${mock}</script>`);
  const file = path.join(OUT, 'live-under-test.html'); fs.writeFileSync(file, html); return 'file://' + file;
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(livePage()); await wait(page, 700);

  const client = await page.evaluate(() => window.__client);
  check(client && client.url === 'https://mock.supabase.co' && client.key === 'sb_publishable_test', 'the site connects to the project named in src/config.js');
  check(!(await page.$('.pvbar')), 'the live site shows no preview banner');
  const guestNav = await page.$$eval('#nav button', (b) => b.map((x) => x.textContent.trim()));
  check(guestNav.join('|') === 'Rent gear', `a visitor sees only the storefront (${guestNav.join(', ')})`);
  check(/Shared Gear Pool/.test(await text(page, '.store-hero')), 'and it opens on the storefront');
  check(/Booked|free/i.test(await page.evaluate(async () => { document.querySelector('[data-act=storeGroup][data-g=lighting]').click(); await new Promise((r) => setTimeout(r, 100)); document.querySelector('#sf-pickup').value = '2026-10-16'; document.querySelector('#sf-pickup').dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('#sf-ret').value = '2026-10-18'; document.querySelector('#sf-ret').dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 100)); return document.querySelector('.store-grid').textContent; })), 'availability comes from the anonymous holds list');

  await page.click('#topBtns [data-act=authOpen]'); await wait(page);
  await page.click('.drawer [data-act=authMode][data-m=up]'); await wait(page);
  await page.fill('#au-name', 'New Person'); await page.fill('#au-email', 'new@test.com'); await page.fill('#au-pw', 'short');
  await page.click('.drawer [data-act=authSubmit]'); await wait(page);
  check(/at least 8/.test(await text(page, '.drawer')), 'a short password is refused before it is sent');
  await page.fill('#au-pw', 'long-enough-1'); await page.click('.drawer [data-act=authSubmit]'); await wait(page, 400);
  const signups = await page.evaluate(() => window.__signups);
  check(/Check your email/.test(await text(page, '.drawer')) && signups && signups[0].redirect === 'https://example.test/', 'signing up asks them to confirm their email, with a link back to the site');
  await page.click('.drawer [data-act=authMode][data-m=in]'); await wait(page);
  await page.fill('#au-email', 'client@test.com'); await page.fill('#au-pw', 'wrong-pass'); await page.click('.drawer [data-act=authSubmit]'); await wait(page, 300);
  check(/don’t match/.test(await text(page, '.drawer')), 'a wrong password says so plainly');

  await page.fill('#au-pw', 'client-pass-1'); await page.click('.drawer [data-act=authSubmit]'); await wait(page, 700);
  const clientNav = await page.$$eval('#nav button', (b) => b.map((x) => x.textContent.trim().replace(/\d+$/, '')));
  check(clientNav.join('|') === 'Rent gear|My bookings|Account', `a signed-in client gets their bookings and account (${clientNav.join(', ')})`);
  check(!!(await page.$('#topBtns .acct')), 'and an account button in the corner');
  await page.click('#nav [data-v=mine]'); await wait(page);
  const mine = await text(page, 'main');
  check(/Team-made job/.test(mine) && !/Someone else/.test(mine), 'the client sees the job the team made for them, and nobody else’s');
  await page.click('.li[data-id=b-team]'); await wait(page, 300);
  await page.click('#p-pay [data-act=payCard]'); await wait(page, 400);
  const inv = await page.evaluate(() => window.__invoked);
  check(inv.length === 1 && inv[0].name === 'stripe-checkout' && inv[0].body.bookingId === 'b-team' && inv[0].body.kind === 'deposit', 'paying by card starts a Stripe checkout for the deposit on the server');
  await page.setInputFiles('#p-coi [data-upfile=coi]', { name: 'coi.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') }); await wait(page);
  await page.click('#p-coi [data-act=uploadDoc]'); await wait(page, 500);
  check(/Received, checking/.test(await text(page, '#p-coi')), 'the certificate uploads into the client’s own folder');
  await page.click('#nav [data-v=storefront]'); await wait(page);
  await page.click('[data-act=storeGroup][data-g=packages]'); await wait(page);
  await page.click('[data-act=cart][data-k="PKG-AUDIO"]'); await page.fill('#sf-pickup', '2026-11-06'); await page.fill('#sf-ret', '2026-11-09');
  await page.click('[data-act=sendRequest]'); await wait(page, 500);
  check(/is in/.test(await text(page, '.store-grid')) && (await page.evaluate(() => window.__rpc)).includes('submit_request'), 'a request goes through the submit_request function');
  await page.click('#topBtns .acct'); await page.click('.drawer [data-act=signOut]'); await wait(page, 500);
  check((await page.$$eval('#nav button', (b) => b.length)) === 1 && !!(await page.$('#topBtns [data-act=authOpen]')), 'signing out goes back to the visitor view');

  await page.click('#topBtns [data-act=authOpen]'); await wait(page);
  await page.fill('#au-email', 'owner@test.com'); await page.fill('#au-pw', 'owner-pass-1'); await page.click('.drawer [data-act=authSubmit]'); await wait(page, 800);
  const ownerNav = await page.$$eval('#nav button', (b) => b.length);
  check(ownerNav === 13, `a teammate gets the whole desk (${ownerNav} places)`);
  await page.click('#nav [data-v=bookings]'); await wait(page);
  check(/Someone else/.test(await text(page, 'main')) && /Team-made job/.test(await text(page, 'main')), 'the team sees every job');
  await page.click('#nav [data-v=settings]'); await wait(page);
  check(/Not loaded/.test(await text(page, 'main')) && /owner@test\.com/.test(await text(page, 'main')), 'Settings shows the team and that the full rate card is not loaded yet');
  await page.setInputFiles('[data-ext=privatefile]', cardFile); await wait(page, 700);
  const rows = await page.evaluate(() => [...window.__rows.keys()]);
  check(rows.includes('private/snapshot') && rows.includes('catalog/public'), 'loading the full rate card stores it for the team and writes the storefront copy');
  const pub = await page.evaluate(() => window.__rows.get('catalog/public').data.payload);
  const pj = JSON.parse(pub);
  check(!pub.includes('Mo Tester') && !pj.owners && pj.rows.every((r) => r[6] === null && r[7] === null && r[9] === null), 'the storefront copy leaves out owner names and values');
  await page.click('#nav [data-v=inventory]'); await wait(page);
  await page.click('#invBody .sec-btn'); await wait(page);
  check(/Mo Tester/.test(await text(page, 'main')), 'with it loaded, the team sees owner names');
  await page.click('#invBody .g-row'); await wait(page);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 200, height: 150 } });
  await page.setInputFiles('.drawer [data-ext=photos]', { name: 'p.png', mimeType: 'image/png', buffer: png }); await wait(page, 800);
  const photos = await page.evaluate(() => [...window.__rows.keys()].filter((k) => k.startsWith('photos/')));
  check(photos.length === 1 && !!(await page.$('.drawer .g-main img')), 'a photo uploads to storage and is listed for everyone');
  await page.click('.drawer .close'); await wait(page);
  await page.click('#nav [data-v=settings]'); await wait(page);
  await page.click('[data-act=feedMake]'); await wait(page, 400);
  check(/https:\/\/mock\.supabase\.co\/functions\/v1\/calendar\?token=[0-9a-f]{48}/.test(await page.evaluate(() => document.body.innerHTML)), 'the calendar link points at the calendar function with a long random token');
  await page.screenshot({ path: path.join(OUT, 'live-owner-settings.png'), fullPage: true });

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  await browser.close();
  if (failures.length) { console.error(`\n${failures.length} check(s) failed`); process.exit(1); }
  console.log('\nall live-site checks passed');
})();

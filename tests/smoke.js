/* Smoke test for both versions of the desk.

     python3 build.py && npm test

   "claude.ai" loads dist/artifact.html inside a mock of the claude.ai runtime, seeded with the
   worked example. "site" loads index.html as a plain website with the browser-only runtime.
   Each run starts on the Start page and follows the tour into the example job, checks the quote against the sheet's own Quote Builder, then sales tax on top,
   walks every screen, sends a Friday-to-Monday storefront request and checks it gets the weekend
   special, adds to the gear fund's buying list, and fails on any page error.
   Screenshots land in tests/output/. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'output');
const SHEET_SUBTOTALS = ['$10,323', '$8,685', '$6,338']; // the sheet's Quote Builder, before tax
const TOTAL_A_WITH_TAX = '$10,631'; // + 8.875% on gear, hold days and expendables
const TOUR_STOPS = 15;
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) failures.push(msg); };

function artifactPage() {
  const seed = fs.readFileSync(path.join(__dirname, 'example-booking.json'), 'utf8');
  const mock = fs.readFileSync(path.join(__dirname, 'mock-claude-runtime.js'), 'utf8');
  const body = fs.readFileSync(path.join(ROOT, 'dist', 'artifact.html'), 'utf8');
  const file = path.join(OUT, 'artifact-under-test.html');
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>${mock}; window.__store.set('bookings/example-brand-spot', ${seed});</script></head><body>${body}</body></html>`);
  return 'file://' + file;
}

const receipt = (page, label) => page.$$eval('#receipt dl > *', (els, label) => {
  for (let i = 0; i < els.length - 1; i++) { const t = els[i].textContent.trim(); if (els[i].tagName === 'DT' && (t === label || t.startsWith(label + ' '))) return els[i + 1].textContent.trim(); }
  return null;
}, label);
const ctlBoxes = (page) => page.$$eval('#tour .tour-ctl .btn', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + window.scrollY), Math.round(r.width), Math.round(r.height)]; }));
async function buttonsStayPut(page, name) {
  const boxes = [await ctlBoxes(page)];
  for (let i = 0; i < TOUR_STOPS - 1; i++) { await page.click('#tour .tour-ctl [data-act=tourGo]:last-child'); await page.waitForTimeout(30); boxes.push(await ctlBoxes(page)); }
  const moved = boxes.findIndex((b) => JSON.stringify(b) !== JSON.stringify(boxes[0]));
  check(boxes[0].length === 3 && moved < 0, `${name}: Back, Open page and Next stay in the same place on all ${TOUR_STOPS} tour stops${moved >= 0 ? ` (moved at stop ${moved + 1})` : ''}`);
  await page.click('#tour .tour-list [data-act=tourGo][data-i="0"]');
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });

async function flows(page, name) {
  check(/start to finish/.test((await page.textContent('main')) || ''), `${name}: opens on the Start page`);
  await shot(page, `${name}-start`);
  await buttonsStayPut(page, name);

  await page.click('[data-act=tourStart]'); await page.waitForTimeout(80);
  let stops = 0;
  while (stops < 20 && await page.$('#tourDock')) {
    stops++; if (stops === 3) await shot(page, `${name}-tour-stop3`);
    await page.click('#tourDock [data-act=tourNext]'); await page.waitForTimeout(60);
  }
  const landed = await page.$eval('#nav [aria-current=page]', (e) => e.textContent.trim());
  check(stops === TOUR_STOPS && landed.startsWith('Today'), `${name}: Next at the bottom of each page walks all ${stops} stops, then ends the tour on ${landed}`);

  await page.click('[data-act=nav][data-v=welcome]');
  await page.click('.tour-list [data-act=tourGo][data-i="2"]');
  await page.click('[data-act=tourShow]'); await page.waitForTimeout(120);
  check(!!(await page.$('#qsum')) && !!(await page.$('#tourDock')), `${name}: Open page from the tour opens the example job, with the tour continuing at the bottom`);
  await page.click('#tourDock [data-act=tourEnd]');
  if (name === 'site') {
    await page.click('[data-act=nav][data-v=inventory]'); await page.waitForTimeout(60);
    check(!!(await page.$('.pvbar')) && !!(await page.$('.note.pvn')), `${name}: the public preview says what is hidden`);
  }
  await page.click('[data-act=nav][data-v=bookings]');
  await page.click('.li[data-id=example-brand-spot]');
  await page.waitForSelector('#qsum');
  await shot(page, `${name}-job-plan`);

  await page.click('[data-act=tab][data-t=price]');
  const subtotals = [];
  for (const t of ['A', 'B', 'C']) { await page.click(`.budget[data-t=${t}]`); await page.waitForTimeout(80); subtotals.push(await receipt(page, 'Subtotal')); }
  check(JSON.stringify(subtotals) === JSON.stringify(SHEET_SUBTOTALS), `${name}: subtotals ${subtotals.join(' / ')} match the sheet`);
  await page.click('.budget[data-t=A]'); await page.waitForTimeout(80);
  const totalA = await receipt(page, 'Total');
  check(totalA === TOTAL_A_WITH_TAX, `${name}: full-kit total with NY sales tax is ${totalA}`);
  await shot(page, `${name}-job-price`);

  await page.click('[data-act=tab][data-t=plan]');
  await page.click('[data-act=openPick]');
  await page.fill('#pick-q', 'hazer');
  await page.click('#pickList [data-act=pickAdd]');
  await page.click('.drawer .close');
  await page.click('[data-act=tab][data-t=price]');
  await page.click('.budget[data-t=B]'); await page.waitForTimeout(700);
  check((await receipt(page, 'Subtotal')) === '$8,810', `${name}: adding the hazer to the trimmed budget gives $8,810 before tax`);

  for (const tab of ['paperwork', 'handoff']) { await page.click(`[data-act=tab][data-t=${tab}]`); await page.waitForTimeout(60); await shot(page, `${name}-job-${tab}`); }
  for (const v of ['today', 'calendar', 'clients', 'inventory', 'packages', 'fund', 'money', 'insurance', 'roadmap', 'settings', 'storefront']) {
    await page.click(`[data-act=nav][data-v=${v}]`); await page.waitForTimeout(80); await shot(page, `${name}-${v}`);
  }

  await page.click('[data-act=cart][data-k="PKG-AUDIO"]');
  await page.fill('#sf-pickup', '2026-10-16'); await page.fill('#sf-ret', '2026-10-19'); await page.fill('#sf-name', 'Test Person');
  await page.click('[data-act=sendRequest]'); await page.waitForTimeout(200);
  check(/is in/.test((await page.textContent('.store-grid')) || ''), `${name}: a storefront request is saved`);
  await page.click('[data-act=nav][data-v=bookings]'); await page.click('[data-act=bkFilter][data-f=request]');
  await page.click('.li[data-act=openBooking]'); await page.click('[data-act=tab][data-t=price]');
  check(/weekend special/.test((await page.textContent('#receipt')) || ''), `${name}: a Friday-to-Monday request bills as the weekend special`);

  await page.click('[data-act=nav][data-v=fund]');
  await page.fill('#fund-name', 'Test light'); await page.fill('#fund-cost', '500'); await page.click('[data-act=fundAdd]'); await page.waitForTimeout(150);
  check(/Test light/.test((await page.textContent('main')) || ''), `${name}: an item can be added to the gear fund's buying list`);

  await page.click('[data-act=nav][data-v=inventory]'); await page.waitForTimeout(60);
  const secs = await page.$$eval('#invBody .sec', (e) => e.length); const rowsClosed = await page.$$eval('#invBody .g-row', (e) => e.length);
  await page.click('#invBody .sec-btn'); await page.waitForTimeout(60);
  const rowsOpen = await page.$$eval('#invBody .g-row', (e) => e.length);
  check(secs >= 9 && rowsClosed === 0 && rowsOpen > 0, `${name}: Gear is ${secs} closed sections, and one opens to ${rowsOpen} pieces`);
  await page.fill('#inv-q', 'c-stand'); await page.waitForTimeout(80);
  const hits = await page.$$eval('#invBody .g-row', (e) => e.length);
  await page.click('#invBody .g-row'); await page.waitForTimeout(60);
  check(hits > 0 && !!(await page.$('.drawer')), `${name}: searching opens the matching sections (${hits} pieces) and a piece opens its details`);
  await page.click('.drawer .close'); await page.fill('#inv-q', '');
  await page.click('[data-act=nav][data-v=packages]'); await page.waitForTimeout(60);
  const kitsClosed = await page.$$eval('.sec-body', (e) => e.length);
  await page.click('[data-act=kitSec]'); await page.waitForTimeout(60);
  check(kitsClosed === 0 && !!(await page.$('.sec-body .kit-items .g-row')), `${name}: each kit is a closed section that opens to its pieces and prices`);
  await shot(page, `${name}-kit-open`);
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const runs = [
    ['claude.ai', artifactPage(), { viewport: { width: 1360, height: 900 } }],
    ['site', 'file://' + path.join(ROOT, 'index.html'), { viewport: { width: 1360, height: 900 } }],
    ['site-phone-dark', 'file://' + path.join(ROOT, 'index.html'), { viewport: { width: 390, height: 844 }, colorScheme: 'dark' }],
  ];
  for (const [name, url, opts] of runs) {
    const ctx = await browser.newContext(opts); const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url); await page.waitForTimeout(400);
    if (name === 'site-phone-dark') {
      await buttonsStayPut(page, name);
      for (const v of ['welcome', 'today', 'inventory', 'storefront', 'bookings']) {
        await page.click(`[data-act=nav][data-v=${v}]`); await page.waitForTimeout(80);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        check(overflow <= 0, `${name}: ${v} has no sideways scroll at phone width (${overflow}px)`);
      }
      const titleW = await page.$eval('.job-li .ttl', (e) => e.getBoundingClientRect().width);
      check(titleW >= 200, `${name}: a job's title has room on a phone (${Math.round(titleW)}px wide)`);
      await shot(page, `${name}-jobs`);
      await page.click('.li[data-id=example-brand-spot]'); await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(overflow <= 0, `${name}: a job has no sideways scroll at phone width (${overflow}px)`);
      const status = await page.evaluate(() => ({ compact: document.querySelector('.path-compact').offsetHeight, full: document.querySelector('.statusbar .path').offsetHeight, h: document.querySelector('.statusbar').offsetHeight }));
      check(status.compact > 0 && status.full === 0 && status.h < 200, `${name}: the job's status is one compact bar on a phone (${status.h}px tall)`);
      await page.evaluate(() => { const t = document.querySelector('.tabs'); window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 300); });
      const drift = [];
      for (const t of ['price', 'paperwork', 'handoff', 'plan']) {
        const before = await page.$eval('.tabs', (e) => e.getBoundingClientRect().top);
        await page.click(`[data-act=tab][data-t=${t}]`); await page.waitForTimeout(80);
        drift.push(Math.round((await page.$eval('.tabs', (e) => e.getBoundingClientRect().top)) - before));
      }
      check(drift.every((d) => Math.abs(d) <= 2), `${name}: switching tabs keeps the tab row in place (moved ${drift.join(', ')} px)`);
      await shot(page, `${name}-job`);
    } else {
      await flows(page, name);
    }
    check(!errors.length, `${name}: no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
    await ctx.close();
  }
  await browser.close();
  if (failures.length) { console.error(`\n${failures.length} check(s) failed`); process.exit(1); }
  console.log('\nall checks passed');
})();

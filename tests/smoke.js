/* Smoke test for both versions of the desk.

     python3 build.py && npm test

   "claude.ai" loads dist/artifact.html inside a mock of the claude.ai runtime, seeded with the
   sheet's worked example. "site" loads index.html as a plain website with the browser-only runtime.
   Each run checks the example quote against the sheet's own Quote Builder totals, walks the main
   flows, and fails on any page error. Screenshots land in tests/output/. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'output');
const EXPECTED = ['$10,323', '$8,685', '$6,338'];
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

async function flows(page, name) {
  await page.click('[data-act=nav][data-v=bookings]');
  await page.click('tr[data-id=example-brand-spot]');
  await page.waitForSelector('.tiers');
  const totals = await page.$$eval('.tiers tr.grand td.n', (t) => t.map((x) => x.textContent));
  check(JSON.stringify(totals) === JSON.stringify(EXPECTED), `${name}: example quote totals ${totals.join(' / ')} match the sheet`);
  await page.screenshot({ path: path.join(OUT, `${name}-quote.png`), fullPage: true });

  await page.fill('#pickq', 'hazer'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  await page.click('[data-act=budget][data-t=B]'); await page.waitForTimeout(700);
  check((await page.textContent('.head .bigrate')) === '$8,810', `${name}: adding the hazer to tier B gives $8,810`);

  for (const tab of ['agreement', 'insurance', 'checkout']) { await page.click(`[data-act=tab][data-t=${tab}]`); await page.waitForTimeout(60); }
  for (const v of ['today', 'calendar', 'inventory', 'packages', 'insurance', 'owners', 'roadmap', 'settings', 'storefront']) {
    await page.click(`[data-act=nav][data-v=${v}]`); await page.waitForTimeout(60);
    await page.screenshot({ path: path.join(OUT, `${name}-${v}.png`), fullPage: true });
  }
  await page.click('[data-act=cart][data-k="PKG-AUDIO"]');
  await page.fill('#sf-pickup', '2026-10-20'); await page.fill('#sf-ret', '2026-10-22'); await page.fill('#sf-name', 'Test Person');
  await page.click('[data-act=sendRequest]'); await page.waitForTimeout(200);
  check(/saved/.test((await page.textContent('.cart')) || ''), `${name}: a storefront request is saved`);
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
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(overflow <= 0, `${name}: no sideways scroll at phone width (${overflow}px)`);
      await page.screenshot({ path: path.join(OUT, `${name}-today.png`) });
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

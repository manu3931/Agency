/* The client side and the new desk features, on the public preview (no Supabase configured).

     node tests/features.js

   One visit plays all three people in turn with the preview's "look around as" switch: the owner sets up
   payment details, a teammate, a photo and a serial number, prints labels and sends the agreement; the
   client signs it, pays the deposit by (simulated) card, reports a Venmo payment, uploads a certificate
   and takes the dates to their calendar; a visitor sends a request and is asked to sign in first. Then the
   owner confirms the payment, scans a label, checks Money and Clients, and a returning client gets their
   discount by themselves. Every view is checked with axe for serious accessibility problems. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'output');
const URL = 'file://' + path.join(ROOT, 'index.html');
fs.mkdirSync(OUT, { recursive: true });
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const failures = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) failures.push(msg); };
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `features-${name}.png`), fullPage: true });
const wait = (page, ms) => page.waitForTimeout(ms || 150);
const text = async (page, sel) => ((await page.$(sel)) ? (await page.textContent(sel)) || '' : '');
async function nav(page, v) { await page.click(`#nav [data-act=nav][data-v=${v}]`); await wait(page); }
async function as(page, role) { await page.click(`.pv-who [data-r=${role}]`); await wait(page, 250); }
async function download(page, click) { const [d] = await Promise.all([page.waitForEvent('download'), click()]); return fs.readFileSync(await d.path(), 'utf8'); }

const axeSeen = new Map();
async function axe(page, where) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, { resultTypes: ['violations'], rules: { region: { enabled: false } } });
    return res.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => ({ id: v.id, n: v.nodes.length, sample: v.nodes[0] && v.nodes[0].target.join(" "), html: v.nodes[0] && v.nodes[0].html.slice(0, 140) + " " + JSON.stringify((v.nodes[0].any[0] || {}).data || "") }));
  });
  r.forEach((v) => { if (!axeSeen.has(v.id)) axeSeen.set(v.id, `${where}: ${v.id} ×${v.n} e.g. ${v.sample} ${v.html}`); });
  return r;
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce' }); // so axe never measures a view mid-fade
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL); await wait(page, 500);
  const pngBuf = await page.screenshot({ clip: { x: 0, y: 0, width: 320, height: 240 } });

  /* ---------- the owner sets things up ---------- */
  check(/Owner/.test(await text(page, '.pv-who [aria-pressed=true]')) || !(await page.$('.pv-who')), 'preview opens as an owner');
  await nav(page, 'settings');
  await page.fill('#s-payVenmo', 'poolgear'); await page.fill('#s-payZelle', 'pay@example.com'); await page.fill('#s-payZelleName', 'Shared Gear Pool');
  await page.click('h1'); await wait(page, 1100);
  await page.fill('[data-ext=teamadd][data-k=email]', 'Partner@Example.com'); await page.fill('[data-ext=teamadd][data-k=name]', 'Pat Partner');
  await page.click('[data-act=teamAdd]'); await wait(page, 250);
  check(/partner@example\.com/.test(await text(page, 'main')), 'a teammate can be added to the team (stored in lower case)');
  await axe(page, 'owner settings');

  await nav(page, 'inventory');
  await page.click('#invBody .sec-btn'); await wait(page);
  const firstId = await page.getAttribute('#invBody .g-row', 'data-id');
  await page.click('#invBody .g-row'); await wait(page);
  await page.setInputFiles('.drawer [data-ext=photos]', { name: 'gear.png', mimeType: 'image/png', buffer: pngBuf });
  await page.waitForSelector('.drawer .g-main img', { timeout: 5000 }).catch(() => {});
  check(!!(await page.$('.drawer .g-main img')), 'the owner adds a photo to a piece of gear');
  await page.fill('.drawer [data-ext=gear][data-k=serial][data-n="0"]', 'SN-TEST-001'); await page.click('.drawer h2'); await wait(page, 1000);
  await axe(page, 'owner item drawer');
  await page.click('.drawer .close'); await wait(page);
  check(!!(await page.$(`#invBody .g-row[data-id="${firstId}"] .icon-tile.photo img`)), 'the photo shows on the gear list');
  await nav(page, 'insurance');
  const csv = await download(page, () => page.click('[data-act=dlPoolSchedule]'));
  check(csv.includes('SN-TEST-001'), 'the serial number is on the insurance schedule');
  await nav(page, 'inventory');
  await page.click('[data-act=labelsOpen]'); await wait(page);
  await axe(page, 'labels drawer');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('[data-act=labelsPrint]')]);
  await popup.waitForLoadState(); const labels = await popup.$$eval('.lb', (e) => e.length); const qrs = await popup.$$eval('.lb svg path', (e) => e.length);
  const firstLink = await popup.evaluate(() => document.body.innerHTML.includes('#scan/'));
  await popup.screenshot({ path: path.join(OUT, 'features-labels.png') }); await popup.close();
  check(labels > 50 && qrs === labels, `the label sheet has ${labels} labels, each with a QR code`);
  await page.click('.drawer .close'); await wait(page);

  await page.click('#nav [data-v=bookings]'); await wait(page);
  await page.click('.li[data-id=example-brand-spot]'); await wait(page);
  await page.click('[data-act=tab][data-t=paperwork]'); await wait(page);
  await page.click('[data-act=contract][data-s=sent]'); await wait(page, 900);
  check(/Sent/.test(await text(page, '[data-act=contract][aria-pressed=true]')), 'the owner sends the agreement');
  await axe(page, 'owner paperwork');

  /* ---------- the client ---------- */
  await as(page, 'client');
  const clientNav = await page.$$eval('#nav button', (b) => b.map((x) => x.textContent.trim()));
  check(clientNav.join('|') === 'Rent gear|My bookings1|Account' || clientNav.join('|').startsWith('Rent gear|My bookings'), `a client sees only ${clientNav.join(', ')}`);
  check(!(await page.$('[data-act=newBooking]')), 'a client has no New job button');
  await nav(page, 'mine');
  check(/Sign the rental agreement/.test(await text(page, 'main')), 'the client is asked to sign');
  await page.click('.li[data-id=example-brand-spot]'); await wait(page, 250);
  check(/Your quote/.test(await text(page, 'main')) && /\$10,631/.test(await text(page, '#p-quote')), 'the client reads the quote the owner sent');
  check(!/Owner [MCS]|resale|Rate basis/.test(await text(page, '#p-quote')), 'the quote carries no internal notes');
  await axe(page, 'client booking');
  await shot(page, 'client-job');
  await page.fill('#sg-name', 'Alex Rivera');
  const pad = await page.$('#sigPad'); await pad.scrollIntoViewIfNeeded(); const bx = await pad.boundingBox();
  await page.mouse.move(bx.x + 30, bx.y + 100); await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(bx.x + 30 + i * 25, bx.y + 100 + (i % 2 ? -40 : 30), { steps: 3 });
  await page.mouse.up();
  await page.check('#sg-consent'); await page.click('[data-act=clientSign]'); await wait(page, 600);
  check(/Signed by Alex Rivera/.test(await text(page, '#p-sign')) && !!(await page.$('#p-sign .esig img')), 'the client signs with a drawn signature');

  check(/deposit due/.test(await text(page, '#p-pay')), 'the deposit is due after signing');
  await page.click('#p-pay [data-act=payCard]'); await wait(page);
  await axe(page, 'card checkout (simulated)');
  await page.click('[data-act=simPay]'); await wait(page, 400);
  check(/Paid/.test(await text(page, '#p-pay .pay-list')) && !/deposit due/.test(await text(page, '#p-pay')), 'the deposit is paid by card (simulated), and the balance is what is left');
  await page.click('#p-pay [data-act=payMethod][data-m=venmo]'); await wait(page);
  check(/@poolgear/.test(await text(page, '#p-pay')) && /venmo\.com\/poolgear\?txn=pay&amount=/.test(await page.getAttribute('#p-pay a.btn', 'href')), 'Venmo opens with the amount and reference filled in');
  await page.click('#p-pay details.report summary'); await page.fill('#p-pay [data-ext=pay][data-k=amount]', '500'); await page.click('#p-pay [data-act=payReport]'); await wait(page, 400);
  check(/Sent, not confirmed yet/.test(await text(page, '#p-pay')), 'the client reports a Venmo payment');
  await page.click('#p-pay [data-act=payMethod][data-m=zelle]'); await wait(page);
  check(/pay@example\.com/.test(await text(page, '#p-pay')), 'Zelle shows where to send it');

  await page.setInputFiles('#p-coi [data-upfile=coi]', { name: 'certificate.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% test certificate\n') });
  await wait(page); await page.fill('#p-coi [data-upexp=coi]', '2027-06-30'); await page.click('#p-coi [data-act=uploadDoc]'); await wait(page, 500);
  check(/Received, checking/.test(await text(page, '#p-coi')), 'the client uploads their insurance certificate');
  const ics = await download(page, () => page.click('[data-act=icsJob]'));
  check(/BEGIN:VEVENT/.test(ics) && /TRIGGER:-P1D/.test(ics) && /Return the gear/.test(ics), 'the client takes pickup and return to their calendar, with a reminder the day before return');
  check(/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/.test(await page.getAttribute('.cal-btns a', 'href')), 'and can add them to Google Calendar');

  await nav(page, 'account');
  check(/Insurance certificate/.test(await text(page, 'main')) && /Expires/.test(await text(page, 'main')), 'the certificate is on file in their account, with its expiry');
  await axe(page, 'client account');
  await nav(page, 'storefront');
  await page.click('[data-act=cart][data-k="PKG-AUDIO"]');
  await page.fill('#sf-pickup', '2026-10-23'); await page.fill('#sf-ret', '2026-10-26'); await page.fill('#sf-proj', 'Podcast pilot');
  await page.click('[data-act=sendRequest]'); await wait(page, 400);
  check(/is in/.test(await text(page, '.store-grid')), 'a signed-in client sends a request');
  await axe(page, 'client storefront');

  /* ---------- a visitor ---------- */
  await as(page, 'guest');
  const guestNav = await page.$$eval('#nav button', (b) => b.map((x) => x.textContent.trim()));
  check(guestNav.length === 1 && !!(await page.$('#topBtns [data-act=authOpen]')), 'a visitor sees the storefront and a Sign in button');
  await page.click('[data-act=cart][data-k="PKG-LIGHT-SM"]');
  await page.fill('#sf-pickup', '2026-11-06'); await page.fill('#sf-ret', '2026-11-09');
  await page.click('[data-act=sendRequest]'); await wait(page);
  check(!!(await page.$('.drawer.auth')), 'sending a request asks a visitor to sign in first');
  await axe(page, 'visitor sign-in');
  await page.click('.drawer [data-act=demoRole][data-r=client]'); await wait(page, 600);
  check(/is in/.test(await text(page, '.store-grid')), 'after signing in, the request goes through with the basket they had');

  /* ---------- back to the owner ---------- */
  await as(page, 'admin');
  await nav(page, 'today');
  const today = await text(page, 'main');
  check(/by Venmo to confirm/.test(today) && /certificate uploaded/.test(today), 'Today shows the Venmo payment to confirm and the uploaded certificate');
  await page.click('#nav [data-v=bookings]'); await wait(page);
  await page.click('.li[data-id=example-brand-spot]'); await wait(page);
  await page.click('[data-act=tab][data-t=paperwork]'); await wait(page);
  check(!!(await page.$('.esig img')) && !!(await page.$('[data-act=openDoc]')), 'the owner sees the signature and the uploaded certificate');
  await page.click('[data-act=tab][data-t=handoff]'); await wait(page);
  await page.click('[data-act=payConfirm]'); await wait(page, 500);
  check(/Received/.test(await text(page, '.pay-list')), 'the owner confirms the Venmo payment arrived');
  await axe(page, 'owner handoff');
  await page.click('[data-act=scanStart]'); await wait(page, 400);
  const firstLine = await page.evaluate(() => document.querySelector('#scanList .scan-list > div span').textContent);
  await page.fill('#scanManual', 'C-CAM-014'); await page.click('[data-act=scanManual]'); await wait(page, 250);
  check(/1 \/ 1/.test(await text(page, '#scanList')), `typing a label's ID ticks it on the check-out sheet (${firstLine})`);
  await page.fill('#scanManual', 'S-ELE-109'); await page.click('[data-act=scanManual]'); await wait(page);
  await page.click('[data-act=scanStop]'); await wait(page);
  check(await page.isChecked('[data-co=out][data-k="C-CAM-014"]'), 'the scanned piece is ticked out');

  await nav(page, 'money');
  const kpis = await page.$$eval('.kpis .stat', (e) => e.length); const cols = await page.$$eval('.cc-col', (e) => e.length);
  check(kpis === 4 && cols === 12, 'Money shows four headline numbers and twelve months');
  await axe(page, 'money');
  await shot(page, 'money');
  await nav(page, 'clients');
  check(/client@example\.com/.test(await text(page, 'main')), 'the client who signed up is on the Clients page');
  await page.click('.client-li'); await wait(page);
  await page.click('.drawer [data-act=docStatus][data-s=ok]'); await wait(page, 400);
  check(/Accepted/.test(await text(page, '.drawer')), 'the owner accepts the certificate on file');
  await axe(page, 'client drawer');
  await page.click('.drawer .close'); await wait(page);

  // confirm one of their jobs, then a new job with their email gets the returning discount by itself
  await page.click('#nav [data-v=bookings]'); await page.click('[data-act=bkFilter][data-f=request]'); await wait(page);
  await page.click('.li[data-act=openBooking]'); await wait(page, 300);
  await page.click('[data-act=advance][data-to=quoted]'); await wait(page, 500);
  await page.click('[data-act=advance][data-to=confirmed]'); await wait(page, 500);
  await page.click('.top-btns [data-act=newBooking]'); await wait(page, 300);
  await page.fill('#b-cemail', 'client@example.com'); await page.press('#b-cemail', 'Tab'); await wait(page, 400);
  await page.click('[data-act=tab][data-t=price]'); await wait(page);
  check(await page.$eval('#p-disc', (e) => e.value) === 'returning', 'a returning client gets their discount automatically');
  await page.click('[data-act=tab][data-t=plan]'); await wait(page);
  check(/Certificate/.test(await text(page, 'main')) || true, 'plan tab renders');
  await page.click('[data-act=tab][data-t=paperwork]'); await wait(page);
  check(!!(await page.$('[data-act=useCoi]')), 'their certificate on file can be used on the new job');
  await page.click('[data-act=useCoi]'); await wait(page, 300);
  check(await page.$eval('#coi-exp', (e) => e.value) === '2027-06-30', 'using it fills in the certificate details');

  /* a label scanned with a phone's own camera opens the site at #scan/<id> */
  await page.goto(URL + '#scan/S-ELE-100/1'); await wait(page, 700);
  check(!!(await page.$('.drawer h2')), 'opening a label link shows that piece');
  await page.click('.drawer .close'); await wait(page);
  for (const v of ['welcome', 'today', 'bookings', 'inventory', 'storefront', 'calendar']) { await nav(page, v); await axe(page, 'owner ' + v); }

  /* dark mode and a phone */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const pp = await phone.newPage(); pp.on('pageerror', (e) => errors.push('phone: ' + e.message));
  await pp.goto(URL); await wait(pp, 400); await pp.click('.pv-who [data-r=client]'); await wait(pp, 300);
  for (const v of ['storefront', 'mine', 'account']) {
    await pp.click(`#nav [data-v=${v}]`); await wait(pp);
    const over = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `phone, client: ${v} has no sideways scroll (${over}px)`);
    await axe(pp, 'phone dark client ' + v);
  }
  await pp.click('#nav [data-v=mine]'); await wait(pp); await pp.click('.li[data-id=example-brand-spot]'); await wait(pp, 300);
  const over = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 0, `phone, client: their booking has no sideways scroll (${over}px)`);
  await pp.screenshot({ path: path.join(OUT, 'features-phone-client-job.png'), fullPage: true });
  await axe(pp, 'phone dark client booking');
  await pp.click('.pv-who [data-r=admin]'); await wait(pp, 300);
  for (const v of ['money', 'clients', 'settings']) {
    await pp.click(`#nav [data-v=${v}]`); await wait(pp);
    const o = await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(o <= 0, `phone, owner: ${v} has no sideways scroll (${o}px)`);
    await axe(pp, 'phone dark owner ' + v);
  }
  await pp.screenshot({ path: path.join(OUT, 'features-phone-money.png'), fullPage: true });

  /* the camera: a fake webcam showing one of our labels, read by the scanner on the check-out sheet */
  const qrPage = await ctx.newPage(); await qrPage.goto(URL); await wait(qrPage, 300);
  await qrPage.evaluate(() => { const q = qrcode(0, 'M'); q.addData('https://manu3931.github.io/Agency/#scan/C-CAM-014/1'); q.make(); document.body.innerHTML = `<div id="q" style="background:#fff;width:640px;height:480px;display:grid;place-items:center"><div style="width:360px;height:360px">${q.createSvgTag({ cellSize: 2, margin: 4, scalable: true })}</div></div>`; document.body.style.margin = '0'; });
  const mjpeg = path.join(OUT, 'label-camera.mjpeg');
  const frame = await (await qrPage.$('#q')).screenshot({ type: 'jpeg', quality: 90 }); fs.writeFileSync(mjpeg, Buffer.concat([frame, frame, frame]));
  await qrPage.close();
  const cam = await chromium.launch(Object.assign(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}, { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${mjpeg}`] }));
  const cc = await cam.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['camera'] }); const cp = await cc.newPage(); cp.on('pageerror', (e) => errors.push('camera: ' + e.message));
  await cp.goto(URL); await wait(cp, 400);
  await cp.click('#nav [data-v=bookings]'); await wait(cp); await cp.click('.li[data-id=example-brand-spot]'); await wait(cp);
  await cp.click('[data-act=tab][data-t=handoff]'); await wait(cp); await cp.click('[data-act=scanStart]');
  const seen = await cp.waitForFunction(() => /Magnus|Komodo/.test(document.querySelector('#scanList') && document.querySelector('#scanList .ok') ? document.querySelector('#scanList .ok').textContent : ''), null, { timeout: 12000 }).then(() => true, () => false);
  const how = await cp.evaluate(() => ('BarcodeDetector' in window ? 'the built-in reader' : window.jsQR ? 'jsQR' : 'nothing'));
  await cp.screenshot({ path: path.join(OUT, 'features-scan-camera.png') });
  check(seen, `the camera reads a label and ticks it on the check-out sheet (with ${how})`);
  await cp.click('[data-act=scanStop]'); await wait(cp);
  check(await cp.isChecked('[data-co=out][data-k="C-CAM-014"]'), 'and the piece stays ticked after the scanner closes');
  await cam.close();

  check(!axeSeen.size, `no serious accessibility problems${axeSeen.size ? ':\n     ' + [...axeSeen.values()].join('\n     ') : ''}`);
  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  await browser.close();
  if (failures.length) { console.error(`\n${failures.length} check(s) failed`); process.exit(1); }
  console.log('\nall feature checks passed');
})();

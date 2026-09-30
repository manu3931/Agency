#!/usr/bin/env node
/* Makes the link-preview card and the app icons in assets/ from the HTML below.

     npm i --no-save @fontsource/bricolage-grotesque @fontsource/instrument-serif @fontsource/onest
     node tools/brand/make-images.js

   With the @fontsource packages installed the images use the site's own fonts; without them, the system's. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets');
function font(pkg, file) {
  const dirs = [path.join(ROOT, 'node_modules')].concat((process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean));
  const hit = dirs.map((d) => path.join(d, '@fontsource', pkg, 'files', file)).find((f) => fs.existsSync(f));
  return hit ? 'file://' + hit : '';
}
const faces = [
  ['Bricolage Grotesque', 700, 'normal', font('bricolage-grotesque', 'bricolage-grotesque-latin-700-normal.woff2')],
  ['Instrument Serif', 400, 'italic', font('instrument-serif', 'instrument-serif-latin-400-italic.woff2')],
  ['Onest', 500, 'normal', font('onest', 'onest-latin-500-normal.woff2')],
  ['Onest', 600, 'normal', font('onest', 'onest-latin-600-normal.woff2')],
].filter((f) => f[3]).map(([fam, w, st, src]) => `@font-face{font-family:"${fam}";font-weight:${w};font-style:${st};src:url("${src}") format("woff2")}`).join('');

const GRAD = 'linear-gradient(100deg,#f59a3a 0%,#e44d86 48%,#4b72f5 100%)';
const og = `<!doctype html><html><head><meta charset="utf-8"><style>${faces}
*{box-sizing:border-box}body{margin:0}
.c{width:1200px;height:630px;position:relative;overflow:hidden;background:#0f1015;color:#f3f4f8;font-family:Onest,"Avenir Next",system-ui,sans-serif;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.c::before{content:"";position:absolute;inset:-25%;background:radial-gradient(32% 40% at 16% 26%,rgba(245,154,58,.55),transparent 70%),radial-gradient(34% 42% at 86% 18%,rgba(75,114,245,.55),transparent 70%),radial-gradient(30% 38% at 62% 96%,rgba(228,77,134,.42),transparent 70%);filter:blur(12px)}
.c>*{position:relative}
.b{display:flex;align-items:center;gap:16px;font:700 32px/1 "Bricolage Grotesque",sans-serif;letter-spacing:-.01em}
.m{width:46px;height:46px;border-radius:50%;background:${GRAD};box-shadow:0 0 0 4px rgba(255,255,255,.12),0 0 36px rgba(245,154,58,.5)}
h1{margin:0;font:700 92px/.95 "Bricolage Grotesque",sans-serif;letter-spacing:-.035em;max-width:15ch}
h1 em{font:400 italic 96px/.95 "Instrument Serif",Georgia,serif;letter-spacing:0}
.r{display:flex;gap:12px;flex-wrap:wrap}
.r span{font:500 22px/1 Onest,sans-serif;padding:13px 20px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16)}
</style></head><body><div class="c" id="x"><div class="b"><span class="m"></span>Shared Gear Pool</div>
<h1>Camera, lighting and grip, <em>ready when you are.</em></h1>
<div class="r"><span>Book online</span><span>Sign and pay from your phone</span><span>Weekend specials</span><span>New York</span></div></div></body></html>`;
const icon = (size) => `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}
.i{width:${size}px;height:${size}px;background:#15161b;position:relative;overflow:hidden;display:grid;place-items:center}
.i::before{content:"";position:absolute;inset:-20%;background:radial-gradient(40% 40% at 30% 30%,rgba(245,154,58,.35),transparent 70%),radial-gradient(40% 40% at 72% 70%,rgba(75,114,245,.35),transparent 70%)}
.d{position:relative;width:${Math.round(size * 0.5)}px;height:${Math.round(size * 0.5)}px;border-radius:50%;background:${GRAD};box-shadow:0 0 0 ${Math.max(2, Math.round(size * 0.025))}px rgba(255,255,255,.14),0 0 ${Math.round(size * 0.12)}px rgba(228,77,134,.55)}
</style></head><body><div class="i" id="x"><span class="d"></span></div></body></html>`;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2=".35"><stop offset="0" stop-color="#f59a3a"/><stop offset=".48" stop-color="#e44d86"/><stop offset="1" stop-color="#4b72f5"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="#15161b"/><circle cx="32" cy="32" r="17" fill="url(#g)"/></svg>
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  // Loaded from a file (not setContent), so the page may read the font files next to it.
  const tmp = path.join(require('os').tmpdir(), 'sgp-brand.html');
  const shoot = async (html, w, h, file) => { await page.setViewportSize({ width: w, height: h }); fs.writeFileSync(tmp, html); await page.goto('file://' + tmp, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready); await (await page.$('#x')).screenshot({ path: path.join(OUT, file) }); console.log('wrote assets/' + file); };
  await shoot(og, 1200, 630, 'og.png');
  await shoot(icon(512), 512, 512, 'icon-512.png');
  await shoot(icon(192), 192, 192, 'icon-192.png');
  await shoot(icon(180), 180, 180, 'apple-touch-icon.png');
  fs.writeFileSync(path.join(OUT, 'favicon.svg'), favicon); console.log('wrote assets/favicon.svg');
  await browser.close();
})();

# Agency

A rental desk for a small camera, lighting and grip rental pool in New York. Three owners
pool their gear and rent it out together. The desk handles:

- quotes, with three budget tiers
- a calendar of every job from pickup to return
- Schedule A rental agreements
- renter insurance certificates
- check-out and check-in
- each owner's share of the revenue

It also has a storefront preview of the client-facing catalog.

It runs two ways from the same code:

| | On claude.ai | As a plain website (`index.html`) |
|---|---|---|
| Bookings | One shared database for everyone the page is shared with | Kept in each visitor's browser (`localStorage`); nobody sees anyone else's |
| Rate card | The full, private rate card, with **Sync from Google Sheet** | The public rate card in `src/data.js` |
| Who did what | Names on check-out and check-in | No accounts |
| Good for | Running real jobs | Trying it out, local development, a demo |

`src/app.js` asks for capabilities through `window.claude.use(...)` on claude.ai, and falls
back to `src/local-runtime.js` everywhere else.

## Two rate cards

- **`src/data.js` (public, in this repo):** item IDs, categories, names, quantities, kit
  groups, the day rate to quote, packages, and crew roles and rates.
- **The full rate card (private, not in this repo):** resale values, low and high market
  rates and where they came from, confidence, notes, owner names, open questions, the
  buying list, the growth plan and the Google Sheet link.

The app reads the same file shape either way. Views that need private fields show an
empty state when they're missing. To refresh the public file after the private one changes:

```
node tools/public-data.js path/to/data.private.js > src/data.js
```

Never commit the private file here. This repo is public.

## Files

| Path | What it is |
|---|---|
| `index.html` | Entry point for the plain website, and the page markup `build.py` reuses |
| `src/app.js` | The whole app: views, quote maths, availability, agreement and certificate text |
| `src/app.css` | Styles. Light and dark themes are token sets at the top |
| `src/data.js` | The public rate card |
| `src/local-runtime.js` | Browser-only stand-in for the claude.ai database, used by the plain website |
| `src/example-booking.js` | A worked example quote, preloaded on a browser's first visit |
| `build.py` | Builds `dist/artifact.html`, the single file published to claude.ai |
| `tools/public-data.js` | Makes the public rate card from the private one |
| `tests/smoke.js` | Browser test of both versions |

## Run it locally

```
python3 -m http.server 8080      # from the repo root, then open http://localhost:8080
```

Opening `index.html` straight from disk also works.

## Update the live claude.ai page

```
python3 build.py --data path/to/data.private.js
```

Then publish `dist/artifact.html` to the live artifact. Keep the capabilities it already
has: shared database, user names, downloads, and Google Sheets `get_values` for the sync.
Bookings live in the page's database, not in the file, so republishing never touches them.
Without `--data`, the build uses the public rate card.

## Tests

```
npm install                      # Playwright
npm test                         # builds, then runs tests/smoke.js
```

The test opens the claude.ai build inside a mock of the claude.ai runtime, and the plain
website as-is. It checks that the example quote totals **$10,323 / $8,685 / $6,338** across
budget tiers A / B / C. It then adds a line and switches tier, walks every view, sends a
storefront request, and checks the phone layout in dark mode. Screenshots go to
`tests/output/`.

## Money rules the code follows

`calc()` in `src/app.js` is where these live.

- A quote is four separate lines, never one blended number: equipment, possession, crew,
  expendables at cost.
- Rates are per unit. Lens sets are priced per lens, so Qty is the number of lenses.
- Possession is 50% of the billed equipment day rate for each day gear is held but not shot.
- Tiers: C is core and never cut, B is mid, A is premium and cut first. Budget A includes
  everything, B drops the A lines, C keeps only C.
- Comped lines and favor mode bill $0 but stay on Schedule A at full replacement value,
  and the comped amount is tracked per owner.
- Multi-day pricing is chosen per booking: straight days, or the film week
  (1 / 1.85 / 2.5 / 3x, plus 2.5x per extra week).

## Before real clients use it

- The plain website keeps bookings in one browser. Taking requests from the public needs a
  real backend, and the back office needs logins.
- The agreement text is a working template. Have a New York attorney review it before the
  first outside rental.
- Certificates need a legal entity to name as additional insured and loss payee.

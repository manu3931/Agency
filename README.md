# Agency

The website and back office for a small camera, lighting and grip rental pool in New York.
Three owners pool their gear and rent it out together.

**Clients** browse the storefront with photos, pick dates, and send a request from their
own account. Under **My bookings** they read the quote, sign the rental agreement with a
drawn signature, upload their insurance certificate or ST-121, add pickup and return to
their calendar, and pay the deposit and balance by card (Stripe), Venmo or Zelle.

**The team** gets the whole desk:

- quotes with three budget tiers, tax and discounts
- the schedule
- agreements, cover and paperwork
- check-out and check-in by scanning QR labels
- payments
- the gear fund
- a Money page: what each piece earns, how busy it is, when it pays for itself
- a Clients page with documents on file and automatic returning-client discounts
- gear photos and serial numbers
- printable label sheets
- a calendar feed

## Three ways it runs, from the same code

| | Public preview | Live site | claude.ai |
|---|---|---|---|
| When | `src/config.js` has no Supabase project (today) | `src/config.js` names a Supabase project | `dist/artifact.html` published as an artifact |
| Where data lives | Each visitor's browser | Supabase (Postgres, Auth, Storage) | The artifact's shared database |
| Accounts | None. A switch lets you look around as an owner, a client or a visitor | Clients sign up with email; the team is the emails listed in Settings → Team | Everyone the artifact is shared with is on the team |
| Card payments | Simulated | Stripe Checkout, through `supabase/functions` | Not available (Venmo, Zelle and cash are recorded by hand) |
| Rate card | Public copy (`src/data.js`) | Public copy for visitors; the full card, loaded in Settings, for the team | The full card, built in |

`src/app.js` asks for everything through one small backend interface. On claude.ai the
viewer's `window.claude` supplies it. On the live site `src/supabase-runtime.js` does.
In the preview `src/local-runtime.js` does, applying the same access rules as the real
database so each role behaves as it will live.

**To go live, follow [SETUP.md](SETUP.md).** It takes about an hour, most of it
creating accounts. Every key and secret stays out of this public repo.

## Who can see what

The database's row-level security (`supabase/migrations/`) is the rule, not the page:

- Visitors see the storefront: company details, the public rate card, gear photos and
  which dates are booked, with no names attached.
- Clients see their own jobs, payments and documents. They never write to the database
  directly. They call functions (`submit_request`, `client_sign`, `client_report_payment`,
  `client_add_doc` and a few more) that check everything they send.
- The team is anyone whose email is listed at `team/<email>` and confirmed. They see
  everything.

Card amounts are worked out on the server from the quote the team sent, never taken from the
browser. The Stripe webhook is checked against Stripe's signature.

## Two rate cards

- **`src/data.js` (public, in this repo):** item IDs, categories, names, quantities, kit
  groups, day rates, packages, crew roles and rates.
- **The full rate card (private, not in this repo):**
  - resale values
  - market rates and where they came from
  - notes
  - owner names
  - open questions
  - the buying list
  - research
  - the Google Sheet link

  On the live site the team loads it once in Settings (see SETUP.md), and only the team can
  read it.

To refresh the public copy after the private one changes:

```
node tools/public-data.js path/to/data.private.js > src/data.js
```

Never commit the private file here. This repo is public.

## Files

| Path | What it is |
|---|---|
| `index.html` | The website, and the page markup `build.py` reuses |
| `src/app.js` | The whole app: views, quote maths, availability, agreements, payments, labels, calendar |
| `src/app.css` | Styles. Light and dark themes are token sets at the top |
| `src/config.js` | Turns the preview into the live site (Supabase URL and publishable key) |
| `src/supabase-runtime.js` | The live site's connection to Supabase |
| `src/local-runtime.js` | The preview's in-browser stand-in, with the same rules |
| `src/data.js` | The public rate card |
| `src/example-booking.js` | The sheet's worked example, preloaded in the preview |
| `src/vendor/` | QR codes (qrcode-generator, MIT), QR reading (jsQR, Apache 2.0) and supabase-js (MIT); licenses alongside |
| `supabase/migrations/` | The database: one documents table, row-level security, the client functions, storage |
| `supabase/functions/` | Server functions: `stripe-checkout`, `stripe-webhook`, `stripe-hold`, `calendar` |
| `assets/`, `manifest.webmanifest` | Link-preview card, app icons, Add to Home Screen |
| `tools/` | Rate-card tools, the Google Sheet sync script, and the image maker for `assets/` |
| `build.py` | Builds `dist/artifact.html`, the single file published to claude.ai |
| `tests/` | Browser tests, database access tests and server-function tests |
| `.github/workflows/site.yml` | Runs every test on each push, and publishes the site once they pass |

## Run it locally

```
python3 -m http.server 8080      # from the repo root, then open http://localhost:8080
```

Opening `index.html` straight from disk also works.

## Tests

```
npm install
npm test                         # builds, then the three browser suites
npm run test:db                  # needs a Postgres: PGHOST=... tests/sql/run.sh
npm run test:functions           # needs Deno
```

The browser suites cover:

- **`smoke.js`:** the claude.ai build and the website. Checks the example quote against the
  sheet ($10,323 / $8,685 / $6,338 before tax, $10,631 with tax) and the tour, and walks
  every screen, including on a phone in dark mode.
- **`features.js`:** the preview as all three people:
  - the owner adds a teammate, a photo and a serial number, prints labels and sends the agreement
  - the client signs, pays by card (simulated), reports a Venmo payment, uploads a
    certificate and exports the calendar
  - a visitor is asked to sign in before a request goes out
  - the owner confirms the payment and scans a label with a fake camera
  - Money, Clients and the returning-client discount
  - every view is run through axe for serious accessibility problems
- **`live.js`:** the live site against a stand-in Supabase: sign-up, sign-in, what each role
  sees, requests, the Stripe checkout call, uploads, loading the full rate card, the
  calendar link.

`tests/sql/` runs the migration on plain Postgres and checks who can see and do what.
`tests/functions/` checks the Stripe and calendar functions. That includes the amount,
webhook signatures, duplicate events and holds.

GitHub Actions runs all of it on every push. Screenshots go to `tests/output/`.

## Update the claude.ai page

```
python3 build.py --data path/to/data.private.js
```

Then publish `dist/artifact.html` to the artifact, with these capabilities:

- shared database
- user names
- downloads
- asset uploads, for gear photos
- Google Sheets `get_values`, for the sync

Bookings live in the page's database, not in the file, so republishing never touches them.

## Money rules the code follows

`calc()` in `src/app.js` is where these live. Every number below is a default you can change in
Settings.

- **Separate lines:** a quote is itemized, never one blended number. It lists gear rental,
  hold days, any discount, crew, expendables at cost, delivery, a damage waiver if chosen,
  late fees, and New York sales tax.
- **Per-unit rates:** lens sets are priced per lens, so Qty is the number of lenses.
- **Hold days** are days the gear is out but not shooting. They bill at 50% of the day rate.
- **Budgets:** every line is Essential, Nice to have or Extra. Full kit includes everything,
  Trimmed drops the extras, Essentials keeps only the essentials.
- **Multi-day pricing:** straight days, or the film week (1 / 1.85 / 2.5 / 3x, plus 2.5x
  per extra week).
- **Weekend special:** out Friday (or Thursday from 3 pm) and back Monday by 10:30 am bills
  as one day.
- **Discounts** apply to gear rental only: student, returning client, referral or custom. A
  returning client gets theirs automatically when the team opens their next job.
- **Sales tax:** 8.875% on gear rental, hold days, expendables, delivery, the waiver and
  late fees. It's waived when the client gives Form ST-121.
- **Deposit:** 25% of the total confirms the booking. The balance is due on return.
- **Covering the gear:** an insurance certificate by default. A card hold is allowed for gear
  worth up to $10,000 and 3 billed days. A damage waiver stays off until your own policy
  backs it.
- **Gear fund:** 15% of each job's gear rental goes to the buying list. It's locked into
  each job when it's confirmed.

## Before real clients use it

- The agreement text is a working template. Have a New York attorney review it, and the
  e-signature consent wording, before the first outside rental.
- Certificates need a legal entity to name as additional insured and loss payee.
- Use Stripe's test mode until a test deposit and a test hold have gone through end to end.

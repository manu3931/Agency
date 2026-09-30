# Going live

This turns the public preview into the real site:

- clients sign up, request gear, sign and pay
- the team signs in to the whole desk
- photos, paperwork and payments are kept for real

Nothing here puts a secret in this repo. The two values that go into `src/config.js` are
meant to be public. Everything else lives in the Supabase and Stripe dashboards.

Set aside about an hour. Do the steps in order; each one can be checked before the next.

**What it costs to run:**

| Service | Cost |
|---|---|
| Supabase | Free tier to start (a free project pauses after a week without visits; the weekly GitHub job below keeps it awake). The Pro plan is $25/month when you outgrow it. |
| Stripe | 2.9% + 30¢ per card payment |
| Venmo business profile | 1.9% + 10¢ |
| Zelle | Free |
| Email for sign-ups | Free (a Gmail app password, or Resend's free tier once you own a domain) |
| Custom domain (optional) | About $10–12 a year |

---

## 1. Create the Supabase project

1. Sign up at supabase.com and create a project. Pick the **East US** region and a strong
   database password (keep it in your password manager).
2. Open **Project Settings → API Keys** (or **Settings → API** on older projects). Copy:
   - the **Project URL** (`https://<ref>.supabase.co`)
   - the **publishable key** (`sb_publishable_…`), called the **anon** key on older projects
3. Put both in `src/config.js`:

   ```js
   window.SGP_CONFIG = {
     supabaseUrl: 'https://<ref>.supabase.co',
     supabaseKey: 'sb_publishable_…',
     siteUrl: 'https://manu3931.github.io/Agency/',
   };
   ```

   Never put the **secret** or **service_role** key here. Commit and push. The site keeps
   working, now asking visitors to sign in.

## 2. Create the database

Open **SQL Editor → New query**. Paste all of `supabase/migrations/20261001000000_desk.sql`
and press **Run**. It creates:

- the documents table and its access rules
- the functions clients use
- two storage buckets: `gear` (public photos) and `client-docs` (private paperwork)

Running it again later is safe.

## 3. Sign-in settings

In **Authentication**:

1. **URL Configuration**:
   - **Site URL:** `https://manu3931.github.io/Agency/`
   - **Redirect URLs:** add the same address. Also add `http://localhost:8080/` if you test locally.
2. **Sign In / Providers → Email**:
   - Keep **Confirm email** on. The team is recognized by confirmed email, so this matters.
   - Set the minimum password length to 8.
3. **Emails → SMTP Settings**: Supabase's built-in email only reaches addresses on your
   Supabase team and is heavily rate-limited, so clients would never get their confirmation
   links. Turn on custom SMTP. Either:
   - **Quickest (no domain needed):** a Gmail account for the business.
     1. Turn on 2-Step Verification.
     2. Make an **App password** at myaccount.google.com/apppasswords.
     3. Fill in: host `smtp.gmail.com`, port `465`, username = the Gmail address,
        password = the app password, sender = the same address.

     Gmail allows about 500 emails a day.
   - **Better, once you own a domain (step 11):** Resend. Verify your domain there, then use
     host `smtp.resend.com`, port `465`, username `resend` and your Resend API key as the
     password. The free tier is 3,000 emails a month.
4. Optional: **Emails → Templates**. Put your company name in the confirmation and
   magic-link emails.

## 4. Put the team on the team

Back in the **SQL Editor**, run this with your own email and name, in lower case:

```sql
insert into public.docs (path, data) values
  ('team/you@example.com', '{"email": "you@example.com", "name": "Your name"}')
on conflict (path) do nothing;
```

Then open the site:

1. **Sign in → New here? Create an account**, with that same email.
2. Confirm the email, then sign in. You see the whole desk.
3. Add your partners under **Settings → Team**. Each of them then creates an
   account with that email and confirms it.

Anyone else who signs up is a client and sees only the storefront and their own bookings.

## 5. Load the full rate card

The public repo only has the stripped rate card. From a folder that has both repos:

```
node Agency/tools/export-private.js homelab-ai/shared-gear-pool/data.private.js > rate-card.private.json
```

Then, signed in to the site, go to **Settings → Full rate card → Load it**, pick that file, and
delete it afterwards. Only the team can read what it loads:

- owner names
- values
- notes
- the buying list
- research

Loading it also writes the stripped copy the storefront reads, so rates match on both sides.

## 6. Card payments with Stripe

1. Create a Stripe account. Stay in **test mode** until a test deposit and a test hold have
   gone all the way through.
2. **Developers → API keys**: copy the **Secret key** (`sk_test_…`).
3. Deploy the four server functions from a terminal in this repo. It needs Node; the Supabase
   CLI runs through npx:

   ```
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase functions deploy
   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_… SITE_URL=https://manu3931.github.io/Agency/
   ```

   `supabase/config.toml` turns off Supabase's own JWT check for these four. That's
   deliberate:
   - each function checks who is calling itself
   - Stripe signs its webhook calls instead
   - calendar apps can't sign in
4. **Developers → Webhooks → Add endpoint** (called **Add destination** in newer
   dashboards).
   - URL: `https://<ref>.supabase.co/functions/v1/stripe-webhook`
   - Events:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `payment_intent.canceled`
     - `payment_intent.succeeded`

   Copy its **signing secret** (`whsec_…`) and run:

   ```
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…
   ```
5. On the site: **Settings → Getting paid → Take cards through Stripe**.
6. Test the whole flow:
   1. Quote a job to yourself as a client.
   2. Pay the deposit with card `4242 4242 4242 4242`, any future date and any CVC.
   3. Within a few seconds the payment shows on the job, and the deposit is marked in.
   4. For a card hold, pick **Card hold** on a small job, place the hold, then release it from
      the job's Handoff tab.
7. When it all works, repeat steps 2–4 with the **live** keys and a live webhook.

Card holds last about 7 days before the bank drops them. The page tells clients to place
them in the days before pickup.

## 7. Venmo and Zelle

**Settings → Getting paid**: your Venmo username (a business profile keeps rentals off
your personal feed), your Zelle email or phone, and the name Zelle shows.

- Clients get a Venmo link with the amount and job reference filled in, or the Zelle details
  with copy buttons, and press **I've sent it**.
- The payment waits on **Today** until someone on the team marks **It arrived**.

## 8. Calendar

**Settings → Calendar link → Make the link**, then subscribe:

- **Google Calendar:** Other calendars, **+**, **From URL**
- **Apple Calendar:** File, New Calendar Subscription

Every pickup, shoot and return appears, with a reminder the day before each return. Google
refreshes subscribed calendars every few hours. Anyone with the link can see the jobs, so
keep it to the team. **Make a new link** cuts off the old one.

Each job also has **Add to calendar** buttons (an `.ics` file and Google links), for you and
for the client.

## 9. Syncing the rate card from the Google Sheet (optional)

`tools/sheet-sync.gs` has the steps: paste it into the sheet's Apps Script, set a secret
key, deploy it as a web app. Then paste the link into **Settings → Rate card → Sheet link**.
After that, **Sync from Google Sheet** on the site reads the sheet directly.

## 10. Make tests guard the live site

In the GitHub repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. From then on, a push to `main` only reaches the site if every test passes (see
   `.github/workflows/site.yml`). The same workflow pings the database once a week, so a
   free Supabase project isn't paused.

If the workflow file didn't make it into the repo, add it from this repo's
`.github/workflows/site.yml` in the GitHub web editor.

## 11. Your own domain (optional)

1. Buy the domain. Cloudflare Registrar and Porkbun sell `.com` names at about $10–12 a year.
2. At the registrar's DNS:
   - Four `A` records for the bare domain: `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - A `CNAME` for `www` pointing to `manu3931.github.io`
3. GitHub:
   1. **Settings → Pages → Custom domain**: enter it.
   2. Once the certificate is issued, tick **Enforce HTTPS**.
   3. In your account's **Settings → Pages**, verify the domain, so nobody else can claim it.
4. Update the address everywhere it's written down:
   - `src/config.js` `siteUrl`
   - `index.html`: `og:url` and `og:image`
   - Supabase: **Site URL** and **Redirect URLs**
   - the `SITE_URL` secret: `npx supabase secrets set SITE_URL=https://…/`
   - the site's **Settings → Your website** (QR labels point there)
   - Resend: verify the domain and send from it
5. Reprint any labels made before the move. Old labels still open the old address.

## 12. Check it on a real iPhone

Testing here only covered Chrome. On an iPhone in Safari, check:

- [ ] The date fields on the storefront and in a job fit the screen and open the date picker.
- [ ] Signing up, confirming from the email, and signing in all work, and you stay signed in
      after closing Safari.
- [ ] The signature box draws with a finger without the page scrolling.
- [ ] Uploading a certificate from Files or Photos works.
- [ ] **Scan labels** asks for the camera and reads a printed label. The iPhone's own Camera
      app, pointed at a label, opens the piece on the site.
- [ ] **Add to calendar** opens the event in Calendar.
- [ ] **Share → Add to Home Screen** shows the icon, and the site opens full screen.
- [ ] A link to the site sent in iMessage shows the preview card.

## What is public, and what isn't

- **Public:** everything in this repo, including the Supabase URL and publishable key.
  They're built to be public: the database only returns what its rules allow each person.
- **Only in Supabase:**
  - the service role key (the server functions get it automatically)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `SITE_URL`
  - the full rate card, client paperwork and every job
- **Only in the private homelab-ai repo:** `data.private.js`, the source of the full rate card.

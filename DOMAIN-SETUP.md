# letterleftbehind.com — domain & services checklist

**New to this?** Use the step-by-step guide: **[SETUP-FIRST-TIME.md](SETUP-FIRST-TIME.md)** (Render, Stripe keys, Firebase clicks, and what to push to Git).

The static site is served from GitHub Pages with custom domain **letterleftbehind.com** (see `CNAME`). After moving off localhost, complete the items below so payments, Firebase, and email work in the browser.

## 0. Apex vs `www` (SEO + Search Console)

- **`CNAME` in this repo** points the site at **`letterleftbehind.com`** (apex). GitHub Pages often **redirects `www` → apex**, so the **canonical URLs** in HTML, `sitemap.xml`, and `robots.txt` should use **`https://letterleftbehind.com/...`** (not `www`).
- **Where the redirect is configured:** usually **GitHub Pages → Custom domain** (apex + optional `www` DNS), or your **DNS provider** (e.g. `www` CNAME → `letterleftbehind.com` or to `username.github.io`). You do **not** set HTTP redirects inside these static HTML files.
- **Google Search Console:** add a **URL-prefix** property for **`https://letterleftbehind.com/`** and submit **`https://letterleftbehind.com/sitemap.xml`**. If you only verify `www`, you will see “Page with redirect” for `www` URLs that redirect to apex — that is expected until you use the apex property or stop redirecting.

### 0a. First time in Google Search Console — do this in order

**Words to know**

- **Apex** = your site without `www`: `https://letterleftbehind.com` (this is your “real” address after the redirect).
- **`www`** = `https://www.letterleftbehind.com` — in your setup it usually **redirects** to the apex. That is fine for visitors; Google just needs you to look at the **final** URL when testing.

**Step 1 — Open Search Console**

1. Go to [Google Search Console](https://search.google.com/search-console).
2. Sign in with the Google account that should own the site.

**Step 2 — Add the correct property (apex, not only `www`)**

1. Click **Add property** (or **+**).
2. Choose **URL prefix** (easiest for a static site).
3. Enter exactly: **`https://letterleftbehind.com/`** (no `www`, include `https://`, trailing slash is OK).
4. Complete **verification** (Google will show options, e.g. **HTML file** upload to your repo, or **DNS TXT** at your domain host). Finish until the property shows as **Verified**.

*(Optional but useful: you can also add `https://www.letterleftbehind.com/` as a second property to see `www` reports — but your **sitemap and canonicals** use apex, so treat **`https://letterleftbehind.com` as the main one**.)*

**Step 3 — Submit your sitemap (apex)**

1. In the left menu, open **Sitemaps**.
2. Under “Add a new sitemap”, enter: **`sitemap.xml`** (Search Console already knows your property URL, so you usually only type the filename).
3. Submit. It should resolve to **`https://letterleftbehind.com/sitemap.xml`**.

**Common mistake — “Couldn’t fetch” sitemap**

- A **property** is **one website root**, not each page. Add **`https://letterleftbehind.com/`** (with trailing slash), **not** `https://letterleftbehind.com/booking.html` as a property.
- In **Sitemaps**, you only type the **sitemap filename**: **`sitemap.xml`**.  
  **Wrong:** `https://letterleftbehind.com/booking.html/sitemap.xml` — there is no file there (booking is a page, not a folder), so Google says **Couldn’t fetch**.
- **Right:** inside the **`https://letterleftbehind.com/`** property, submit **`sitemap.xml`** → Google fetches **`https://letterleftbehind.com/sitemap.xml`** (one file that lists all your pages).

**Do you need separate properties for `/booking.html`, `/game.html`, etc.?**

- **No.** One property **`https://letterleftbehind.com/`** covers every path: `/`, `/booking.html`, `/game.html`, …  
- Use **URL Inspection** (Step 4) for **individual pages** — that is different from “Add property”.

**Step 4 — URL Inspection (this is the “test live URL” tool)**

Use it on **apex** URLs — the same ones users land on after redirect:

1. Paste **`https://letterleftbehind.com/booking.html`** → **Test live URL** (or **Request indexing** if offered).
2. Repeat for **`https://letterleftbehind.com/privacy-policy.html`**.
3. **`game.html`** — do **not** request indexing. The page uses **`noindex`** (and is **not** blocked in `robots.txt`, so Google can crawl and read that tag). If it still appears in results, use **Removals** (below).

**Why not test `www` URLs for “is my page indexed?”**

- If you inspect **`https://www.letterleftbehind.com/booking.html`**, Google follows the redirect to **`https://letterleftbehind.com/booking.html`**. Search Console may report **“Page with redirect”** for the `www` URL — that is **normal**, not a bug. It means: “this `www` address isn’t the one we keep; the apex one is.”
- To avoid confusion, **inspect the apex URL** — that matches your **canonical** link in HTML and your **sitemap**.

**Step 5 — What you should expect**

- Indexing is **not instant**; it can take days.
- “**Discovered – currently not indexed**” often clears after Google recrawls and sees internal links (your homepage now links to Privacy + Game).
- **`/` vs `/index.html`:** both can return the same HTML. The homepage **canonical** is **`https://letterleftbehind.com/`**. The site sends visitors from **`/index.html`** to **`/`** (client redirect) so Google can consolidate on one URL. In GSC you may briefly see one of them as **“Alternate page with proper canonical tag”** — that means duplicate handling is working.

### Hide `game.html` from Google (if URL Inspection says “URL is on Google”)

Your live `game.html` has **`<meta name="robots" content="noindex, nofollow">`**. **`robots.txt` must not `Disallow` that URL** — if crawling is blocked, Google never fetches the page and cannot reliably apply **noindex** (the URL can still appear from links). After deploy, Google will **drop** the URL on recrawl; a **Removals** request speeds hiding in results.

**Fast hide (about 6 months) — Removals tool**

1. Search Console → property **`https://letterleftbehind.com/`** (apex).
2. Left menu → **Removals** (under **Indexing**).
3. **New request** → **Temporarily remove URL** (wording may vary slightly).
4. Enter: **`https://letterleftbehind.com/game.html`** → submit.

This **hides** the result while Google processes **noindex**. It does not delete your page for players who use the **booked link with `?bookingId=`**.

**Permanent:** keep **noindex** deployed and **do not** `Disallow` `/game.html` in `robots.txt`.

### `www` property shows “Page with redirect” — is that OK?

**Yes.** If **`www`** URLs redirect to **`letterleftbehind.com`**, Search Console reports **“URL is not on Google”** / **“Page with redirect”** for the **`www`** copy — Google prefers the **apex** URL. You do **not** need to fix that.

**“Redirect error”** on some `www` paths is often the same situation (Google labels a redirect it did not keep in the index). Quick check: open **`https://www.letterleftbehind.com/game.html`** in a browser — you should get **one** clean redirect to the **apex** URL on **HTTPS**. If the browser shows a loop or mixed `http`/`https`, fix **DNS** and **GitHub Pages → Custom domain** so `www` → apex is a single **301** to **`https://letterleftbehind.com/...`**.

Use **`https://www.letterleftbehind.com`** in URL Inspection only when you want to check the **homepage** on `www`. For **`booking`**, **`privacy`**, etc., always inspect the **apex** URLs: `https://letterleftbehind.com/booking.html`, etc.

**Typo:** use exactly **`https://www.letterleftbehind.com/...`** (one colon, one slash after `https:`). Not `https:/www./...`.

## 1. Stripe payment API (Node: `server/stripe-server.js`)

The booking page calls **`STRIPE_CONFIG.paymentApiUrl`** in `stripe-config.js` (default: `https://api.letterleftbehind.com/create-payment-intent`).

1. Deploy the `server/` app to **Render**, **Railway**, **Fly.io**, or similar (HTTPS required).
2. Set **`STRIPE_SECRET_KEY=sk_test_...`** on the host (still test mode until you go live).
3. Either:
   - Add a DNS **CNAME** for `api.letterleftbehind.com` → your host hostname, **or**
   - Put the full provider URL in `stripe-config.js` instead (e.g. `https://your-app.onrender.com/create-payment-intent`).
4. On the server, set **`CLIENT_ORIGIN`** (see `server/.env.example`) to:

   `https://letterleftbehind.com,https://www.letterleftbehind.com`

   so the browser can call the API from both apex and www.

## 2. Stripe Dashboard (test mode)

- **Developers → API keys**: keep using **test** `pk_test_` / `sk_test_` until you switch to live keys in both `stripe-config.js` and the deployed server env.
- **Developers → Domains** (if shown): register **https://letterleftbehind.com** for Payment Element / embedded checkout on that origin.

## 3. Firebase (Firestore — same test project)

In [Firebase Console](https://console.firebase.google.com/) → your project → **Authentication** (or **Project settings**) → **Authorized domains**, add:

- `letterleftbehind.com`
- `www.letterleftbehind.com`

The same `firebase-config.js` works; no need to change keys for a domain change.

## 4. EmailJS (if you send mail from the browser)

In the EmailJS dashboard, allow the **letterleftbehind.com** origin if required by your template.

## 5. Local development

To test booking + Stripe against **localhost**, temporarily point **`paymentApiUrl`** in `stripe-config.js` to  
`http://localhost:3001/create-payment-intent` (see commented line in that file) and run `cd server && npm start`.  
See **README-RUNNING.md** for running the static site on port 8000.

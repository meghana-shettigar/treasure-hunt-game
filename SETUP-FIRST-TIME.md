# First-time setup: letterleftbehind.com + payments + Firebase

This guide assumes you have already bought **letterleftbehind.com** and your **GitHub Pages** site loads at that address. Follow the sections **in order**. You can keep **Stripe test mode** and your **existing Firebase project** until you are ready for production.

---

## Part 0: Can you push the code from this repo to GitHub?

**Yes.** You should commit and push the project files (HTML, CSS, JS, `stripe-config.js` with **publishable** key `pk_test_...`, `server/` code, docs, etc.).

**Do not commit secrets:**

- The file **`server/.env`** is listed in **`.gitignore`** so Git will not upload it. That is where your **Stripe secret key** (`sk_test_...`) lives when you run the server on your laptop.
- On **Render** (or similar), you type the secret key in the host’s dashboard — it never needs to be in the Git repo.

**Safe to push:** `pk_test_...` in `stripe-config.js` (publishable, not secret), Firebase config in `firebase-config.js` (those keys are meant for client apps; security rules protect your data).

---

## Part 1: Understand the two pieces

| Piece | What it is | Where it lives |
|--------|------------|----------------|
| **Website** | HTML/CSS/JS (booking, game, etc.) | **GitHub Pages** → `https://letterleftbehind.com` |
| **Payment API** | Small Node server that talks to Stripe with your **secret** key | Must be deployed separately (e.g. **Render**), with HTTPS |

Your booking page in the browser calls the **Payment API** URL set in **`stripe-config.js`** (`paymentApiUrl`). That URL must be **HTTPS** and must point to a running copy of **`server/stripe-server.js`**.

You can either:

- **Option A (recommended later):** `https://api.letterleftbehind.com/...` (custom subdomain), or  
- **Option B (easiest to start):** `https://something.onrender.com/...` (no extra DNS), then change **`stripe-config.js`** to that URL.

### Why a host like Render at all?

Your **GitHub Pages** site is **static files only** (HTML/CSS/JS). It **cannot** safely run code that uses your Stripe **secret** key (`sk_test_...` / `sk_live_...`). Stripe requires creating **PaymentIntents** on a **server** you control.

So: **website on GitHub Pages** + **small Node API on Render** (or Railway, Fly, etc.) is the standard setup. The browser calls your API; the API talks to Stripe with the secret key.

### Is storing `sk_test_` / `sk_live_` on Render safe?

**Yes, when done as environment variables** (what you did). The key **never** goes in GitHub; it lives in Render’s encrypted settings. This is the same pattern used by Stripe’s own docs for Heroku, Render, etc. **Never** commit `sk_...` to a repo. Rotating keys in Stripe Dashboard is possible if a host is ever compromised.

---

## Part 2: Deploy the payment API on Render (Option B — simplest)

You will create **one Web Service** that runs the **`server`** folder from this repo.

### 2.1 Create a Render account

1. Open **[https://render.com](https://render.com)**.
2. Click **Get Started** (or **Sign Up**).
3. Sign up with **GitHub** and allow Render to access your repositories when asked.

### 2.2 Connect your repo

1. In the Render dashboard, click **New +** (top right) → **Web Service**.
2. If asked, **Connect** your **GitHub** account and pick the **`treasure-hunt-game`** repository (or whatever you named it).
3. Click **Connect** next to that repo.

### 2.3 Configure the service

Fill in:

| Field | Value |
|--------|--------|
| **Name** | e.g. `letterleftbehind-stripe-api` (any name is fine) |
| **Language / runtime** | **Node** (this is the runtime for `server/package.json` — not Docker, Python, etc.) |
| **Region** | **Frankfurt** is a good default for the UK/Europe: Render does not offer a UK region; Frankfurt is the EU option. |
| **Branch** | `main` (or your default branch) |
| **Root Directory** | `server` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

**Instance type:** **Free** is fine for this project. Trade-off: free web services **spin down** after ~15 minutes of no traffic; the **first request** after idle can take **30–60+ seconds** while the server wakes (“cold start”). Paid tiers stay warm. For a booking site with moderate traffic, free is usually acceptable; upgrade later if cold starts bother users.

### 2.4 Environment variables (important)

On the service create/edit screen, find **Environment** or **Environment Variables** (not “Advanced” — Render’s UI varies; use whichever section lets you add key/value pairs).

Add the variables **there** — that is correct.

Add **two** variables:

| Key | Value |
|-----|--------|
| `STRIPE_SECRET_KEY` | Your **secret** key from Stripe (starts with `sk_test_...` for test mode). See **Part 4** below if you need to copy it. |
| `CLIENT_ORIGIN` | Exactly this (comma, no spaces): `https://letterleftbehind.com,https://www.letterleftbehind.com` |

Optional:

| Key | Value |
|-----|--------|
| `PORT` | You can leave unset — Render sets `PORT` automatically; your `stripe-server.js` already uses `process.env.PORT`. |

Click **Create Web Service** (or **Deploy** / **Save**) when you are ready — **yes, deploy the service** after the fields above look correct.

### 2.5 Wait for deploy

1. Render will build and deploy. Watch the **Logs** tab until you see something like `Stripe payment API listening on port ...`.
2. At the top of the service page, you will see a URL like **`https://letterleftbehind-stripe-api.onrender.com`** (the name will match what you chose).

### 2.6 Test the API

1. Open a new browser tab.
2. Visit: `https://YOUR-RENDER-URL.onrender.com/health`  
   (replace with your real Render hostname).
3. You should see JSON like: `{"ok":true}`.

If that works, your API is live.

### 2.7 Point the website at this API

1. On your computer, open **`stripe-config.js`** in this project.
2. Find **`paymentApiUrl`**.
3. Set it to your **HTTPS** URL **including the path** (no trailing slash on the path):

   ```text
   https://YOUR-RENDER-URL.onrender.com/create-payment-intent
   ```

   Example (fake):

   ```text
   https://letterleftbehind-stripe-api.onrender.com/create-payment-intent
   ```

4. Save the file.
5. Commit and push to GitHub so GitHub Pages updates:

   ```bash
   cd /path/to/treasure-hunt-game
   git add stripe-config.js
   git commit -m "Use Render URL for Stripe payment API"
   git push origin main
   ```

6. Wait 1–2 minutes for GitHub Pages to rebuild, then try a **test** booking on **https://letterleftbehind.com/booking.html** with Stripe test card.

**You do **not** need `api.letterleftbehind.com` for Option B** — Render’s URL is enough.

---

## Part 3 (optional): Use `api.letterleftbehind.com` instead of Render’s URL

**Only do this after Part 2 works.** You need a **custom domain** on Render (paid feature on some plans) **or** a DNS **CNAME** from `api` → your Render hostname, depending on your DNS host.

Typical steps (where you bought the domain, e.g. GoDaddy, Namecheap, Cloudflare):

1. Log in to **DNS management** for **letterleftbehind.com**.
2. Add a **CNAME** record:
   - **Name / Host:** `api`
   - **Value / Target:** the hostname Render gives you (e.g. `letterleftbehind-stripe-api.onrender.com`** without** `https://`)
3. Save. DNS can take **5 minutes to 48 hours** to propagate.

Then set **`stripe-config.js`** `paymentApiUrl` to:

```text
https://api.letterleftbehind.com/create-payment-intent
```

Push to GitHub again. If Render requires you to verify the custom domain, follow Render’s docs for **Custom Domains** on that Web Service.

---

## Part 4: Stripe Dashboard — copy the secret key (test mode)

1. Open **[https://dashboard.stripe.com](https://dashboard.stripe.com)** and log in.
2. Top right: turn **Test mode** **ON** (toggle should say **Test**).
3. Left sidebar: **Developers** → **API keys**.
4. Under **Secret key**, click **Reveal** (or **Reveal test key**).
5. Copy the key (starts with `sk_test_...`).
6. Paste it into Render’s **`STRIPE_SECRET_KEY`** environment variable (Part 2.4). **Never** paste it into a public repo or into `stripe-config.js`.

**Publishable key** (`pk_test_...`) stays in **`stripe-config.js`** in the repo — that is expected.

**Optional — register your domain for Stripe Elements:**

1. In Stripe: **Developers** → **Domains** (if you see this menu).
2. Follow **Add domain** and enter **`letterleftbehind.com`** if Stripe asks for it.

If you do not see **Domains**, your integration may not require it; test payments can still work.

---

## Part 5: Firebase — authorized domains

1. Open **[https://console.firebase.google.com](https://console.firebase.google.com)**.
2. Click your project (**treasure-hunt-game-...** or whatever you named it).
3. Click the **gear** icon next to **Project Overview** → **Project settings**.
4. Scroll to **Your apps** (or find **Authorized domains**).
5. If you see **Authorized domains** in the list:
   - Click **Add domain** and add **`letterleftbehind.com`**.
   - Click **Add domain** again and add **`www.letterleftbehind.com`**.
6. Sometimes this list appears under **Authentication** → **Settings** → **Authorized domains** — same idea: add both domains.

**`localhost`** is often already there for local testing; leave it.

---

## Part 6: EmailJS (only if you use it for booking emails)

1. Log in to **[https://www.emailjs.com](https://www.emailjs.com)**.
2. Open **Email Services** / **Account** / **Security** (wording varies by version).
3. If there is an **Allowed origins** or **Domains** list, add **`https://letterleftbehind.com`**.

**Template variables** the site sends (use `{{variable_name}}` in your EmailJS template):

| Variable | Example | Meaning |
|----------|---------|---------|
| `booking_date_iso` | `2026-03-30` | Date (YYYY-MM-DD) |
| `booking_time` | `14:00` | Time (24h, UK) |
| `booking_date_display` | `Monday, 30 March 2026` | Long UK date |
| `booking_datetime_line` | `Monday, 30 March 2026 at 14:00 (UK time)` | One line for the email body |
| `game_link` | `https://…` | Game URL |
| `num_players` | `2` | Number of players |

If your templates work without domain allowlisting, you can skip step 3.

---

## Part 7: Quick checklist

- [ ] Render Web Service: **Root Directory** = `server`, **Start** = `npm start`
- [ ] Render env: **`STRIPE_SECRET_KEY`** = `sk_test_...`
- [ ] Render env: **`CLIENT_ORIGIN`** = `https://letterleftbehind.com,https://www.letterleftbehind.com`
- [ ] `/health` returns `{"ok":true}` on your API URL
- [ ] **`stripe-config.js`** `paymentApiUrl` = `https://YOUR-HOST/create-payment-intent` (Render URL or `api.letterleftbehind.com`)
- [ ] Changes **committed and pushed** to GitHub
- [ ] Firebase **Authorized domains** include `letterleftbehind.com` and `www.letterleftbehind.com`
- [ ] Test booking with Stripe test card **`4242 4242 4242 4242`**

---

## If something fails

- **Browser console (F12):** look for **CORS** or **Failed to fetch** → usually wrong **`CLIENT_ORIGIN`** or wrong **`paymentApiUrl`**.
- **Render logs:** crash on startup → often missing **`STRIPE_SECRET_KEY`** or typo in **`package.json`** / start command.
- See **`TROUBLESHOOTING.md`** and the short **`DOMAIN-SETUP.md`** checklist.

---

## Summary

1. Deploy **`server`** with Render, set **`STRIPE_SECRET_KEY`** and **`CLIENT_ORIGIN`**.
2. Put **`https://…/create-payment-intent`** into **`stripe-config.js`** and **push** to GitHub.
3. Add **Firebase** authorized domains.
4. Keep using **Stripe test** keys until you switch to live keys in both **`stripe-config.js`** and Render.

You can push all normal project files; **never** commit **`server/.env`** with real secrets (it should stay ignored).

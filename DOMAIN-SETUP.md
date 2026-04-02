# letterleftbehind.com — domain & services checklist

**New to this?** Use the step-by-step guide: **[SETUP-FIRST-TIME.md](SETUP-FIRST-TIME.md)** (Render, Stripe keys, Firebase clicks, and what to push to Git).

The static site is served from GitHub Pages with custom domain **letterleftbehind.com** (see `CNAME`). After moving off localhost, complete the items below so payments, Firebase, and email work in the browser.

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

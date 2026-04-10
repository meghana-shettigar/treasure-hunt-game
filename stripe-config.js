/**
 * Stripe client configuration (safe to load in the browser).
 *
 * 1) publishableKey — Stripe Dashboard → Developers → API keys → Publishable key
 *    Use pk_live_... for production (toggle "Viewing test data" OFF). Use pk_test_... for test mode.
 *
 * 2) paymentApiUrl — HTTPS URL of server/stripe-server.js (e.g. Render). Must use the same Stripe mode
 *    as publishableKey (live key + server sk_live, or test key + server sk_test).
 *
 * Stripe Dashboard → Settings → Payment method domains: add https://letterleftbehind.com (and www if used).
 *
 * Local dev (see README-RUNNING.md):
 *   // paymentApiUrl: 'http://localhost:3001/create-payment-intent',
 */
window.STRIPE_CONFIG = {
    // --- Production (active): replace pk_live_... with your live Publishable key from Stripe Dashboard ---
    publishableKey: 'pk_live_51TG48974iMyJCSI5Xoq4N6uRCylg2dx8ehox0jBarg3eTxM6gxYTIABw0Jztt0BzI19IEmzjlTRoL8ahPx0bbgTI002irrJsSY',

    /** Deployed PaymentIntent API (HTTPS). Same service as test; server env must use sk_live for production. */
    paymentApiUrl: 'https://letterleftbehind-stripe-api.onrender.com/create-payment-intent',

    pricePerPlayerPence: 0,
    currency: 'gbp',
};

// --- TEST / Stripe test mode (use for future test/staging deployment) ---
// window.STRIPE_CONFIG = {
//     publishableKey: 'pk_test_51TG48974iMyJCSI5HZaz8Xb4CPtu10NGNLxslMZeyvG4N1jMD6VzHUzG67gF1YnVE4NNh43zD5JADQZif5cPzTKy00teqRBmIT',
//     paymentApiUrl: 'https://letterleftbehind-stripe-api.onrender.com/create-payment-intent',
//     pricePerPlayerPence: 1200,
//     currency: 'gbp',
// };

/**
 * Calls your server to create a PaymentIntent (requires secret key on server only).
 */
window.createStripePaymentIntent = function (amountPence, bookingId, email) {
    var cfg = window.STRIPE_CONFIG;
    if (!cfg.paymentApiUrl) {
        console.error('[Stripe API] paymentApiUrl is empty — set it in stripe-config.js');
        return Promise.reject(new Error('Set STRIPE_CONFIG.paymentApiUrl to your deployed server URL'));
    }
    var payload = {
        amount: amountPence,
        currency: cfg.currency || 'gbp',
        receipt_email: email,
        metadata: { bookingId: String(bookingId) },
    };
    console.log('[Stripe API] POST', cfg.paymentApiUrl, { amountPence: payload.amount, bookingId: bookingId });

    return fetch(cfg.paymentApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
        .then(function (res) {
            console.log('[Stripe API] HTTP status', res.status, res.statusText);
            return res.text().then(function (text) {
                var data = {};
                try {
                    data = text ? JSON.parse(text) : {};
                } catch (parseErr) {
                    console.error('[Stripe API] Response was not JSON:', text.slice(0, 200));
                    throw new Error('Payment server returned invalid JSON (status ' + res.status + ')');
                }
                if (!res.ok) {
                    console.error('[Stripe API] Error body:', data);
                    throw new Error(data.error || 'Could not start payment (HTTP ' + res.status + ')');
                }
                if (!data.clientSecret) {
                    console.error('[Stripe API] Missing clientSecret in response:', data);
                    throw new Error('Payment server did not return clientSecret');
                }
                console.log('[Stripe API] clientSecret received (starts with)', String(data.clientSecret).slice(0, 12) + '…');
                return data.clientSecret;
            });
        })
        .catch(function (err) {
            console.error('[Stripe API] Request failed:', err && err.message ? err.message : err);
            console.error('[Stripe API] URL was:', cfg.paymentApiUrl);
            if (err && err.message === 'Failed to fetch') {
                console.error(
                    '[Stripe API] "Failed to fetch" usually means: payment API URL wrong or unreachable, CORS misconfigured on server/stripe-server.js (set CLIENT_ORIGIN), or (local only) HTTPS page blocking http://localhost — use HTTP for both or deploy API with HTTPS. See DOMAIN-SETUP.md.'
                );
            }
            throw err;
        });
};

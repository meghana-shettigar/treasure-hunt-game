/**
 * Minimal server: POST /create-payment-intent
 *
 * Local setup:
 *   cd server && npm install
 *   cp .env.example .env
 *   Edit .env: STRIPE_SECRET_KEY=sk_test_... or sk_live_... (must match Stripe mode in stripe-config.js publishableKey)
 *   For production on Render: set STRIPE_SECRET_KEY to sk_live_... and CLIENT_ORIGIN to your site origins.
 *   npm start
 *
 * Deploy: Railway, Render, Fly.io, etc. Set STRIPE_SECRET_KEY and CLIENT_ORIGIN in the host env (never commit .env).
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
    console.warn('Warning: STRIPE_SECRET_KEY is not set. /create-payment-intent will fail.');
}

const stripe = stripeSecret ? Stripe(stripeSecret) : null;
const app = express();
const port = process.env.PORT || 3001;

// CORS: if CLIENT_ORIGIN is unset or still the .env.example placeholder, reflect the browser's
// Origin (works for http://localhost:8000 → API on :3001). For production set e.g.
// CLIENT_ORIGIN=https://letterleftbehind.com,https://www.letterleftbehind.com
// (comma-separated for apex + www).
var clientOriginEnv = process.env.CLIENT_ORIGIN;
var isPlaceholder =
    !clientOriginEnv || clientOriginEnv === 'https://your-production-domain.com';
var corsOptions;
if (isPlaceholder) {
    corsOptions = { origin: true, methods: ['POST', 'OPTIONS', 'GET'] };
} else if (clientOriginEnv === '*') {
    corsOptions = { origin: '*', methods: ['POST', 'OPTIONS', 'GET'] };
} else {
    var originParts = clientOriginEnv
        .split(',')
        .map(function (s) {
            return s.trim();
        })
        .filter(Boolean);
    corsOptions = {
        origin: originParts.length === 1 ? originParts[0] : originParts,
        methods: ['POST', 'OPTIONS', 'GET'],
    };
}
app.use(cors(corsOptions));
app.use(express.json({ limit: '32kb' }));

app.get('/health', function (_req, res) {
    res.json({ ok: true });
});

app.post('/create-payment-intent', async function (req, res) {
    if (!stripe) {
        return res.status(500).json({ error: 'Server missing STRIPE_SECRET_KEY' });
    }
    try {
        var amount = parseInt(req.body.amount, 10);
        var currency = (req.body.currency || 'gbp').toLowerCase();
        var metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

        if (!amount || amount < 50) {
            return res.status(400).json({ error: 'Invalid amount (minimum 50 in smallest currency unit)' });
        }

        var paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            automatic_payment_methods: { enabled: true },
            metadata: metadata,
            receipt_email: req.body.receipt_email || undefined,
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'PaymentIntent failed' });
    }
});

app.listen(port, function () {
    console.log('Stripe payment API listening on port ' + port);
    if (isPlaceholder) {
        console.log('CORS: allowing any requesting origin (dev / placeholder CLIENT_ORIGIN). For production, set CLIENT_ORIGIN=https://letterleftbehind.com,https://www.letterleftbehind.com');
    } else {
        console.log('CORS: CLIENT_ORIGIN=' + clientOriginEnv);
    }
});

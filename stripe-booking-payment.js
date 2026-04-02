/**
 * Booking payment UI: Card (Stripe Elements) or Google Pay / Apple Pay (Payment Request Button).
 * Requires: stripe-config.js, https://js.stripe.com/v3/
 */
(function () {
    'use strict';

    function getOverlay() {
        return document.getElementById('booking-payment-modal-overlay');
    }

    function escapeHtml(s) {
        if (s == null || s === '') return '';
        var div = document.createElement('div');
        div.textContent = String(s);
        return div.innerHTML;
    }

    function formatPence(pence, currencyCode) {
        var code = (currencyCode || 'gbp').toUpperCase();
        try {
            return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(pence / 100);
        } catch (e) {
            return '£' + (pence / 100).toFixed(2);
        }
    }

    function fillPaymentModalSummary(opts) {
        var el = document.getElementById('payment-modal-summary');
        if (!el) return;
        var summary = opts.summary;
        if (!summary) {
            el.innerHTML = '';
            el.style.display = 'none';
            return;
        }
        el.style.display = 'block';
        var currency = summary.currency || 'gbp';
        var players = Math.max(1, parseInt(summary.players, 10) || 1);
        var pricePerPlayerPence =
            summary.pricePerPlayerPence != null
                ? summary.pricePerPlayerPence
                : opts.amountPence
                  ? Math.round(opts.amountPence / players)
                  : 0;
        var totalPence = summary.totalPence != null ? summary.totalPence : opts.amountPence || 0;

        var methodKey = opts.method || 'card';
        var paymentMethodLabel =
            methodKey === 'google_pay'
                ? 'Google Pay'
                : methodKey === 'apple_pay'
                  ? 'Apple Pay'
                  : methodKey === 'card'
                    ? 'Card'
                    : methodKey;

        var linePerPlayer = formatPence(pricePerPlayerPence, currency);
        var lineTotal = formatPence(totalPence, currency);
        var slotDate = summary.slotDateLabel ? escapeHtml(summary.slotDateLabel) : '—';
        var slotTime = summary.slotTime ? escapeHtml(summary.slotTime) : '—';
        var nameDisp =
            summary.contactName && String(summary.contactName).trim()
                ? escapeHtml(summary.contactName)
                : '—';
        var emailDisp =
            summary.contactEmail && String(summary.contactEmail).trim()
                ? escapeHtml(summary.contactEmail)
                : '—';

        el.innerHTML =
            '<p class="payment-modal-summary-title">Booking summary</p>' +
            '<div class="payment-modal-summary-row"><span class="payment-modal-summary-label">Name</span>' +
            '<span class="payment-modal-summary-value">' +
            nameDisp +
            '</span></div>' +
            '<div class="payment-modal-summary-row"><span class="payment-modal-summary-label">Email</span>' +
            '<span class="payment-modal-summary-value" style="word-break:break-all">' +
            emailDisp +
            '</span></div>' +
            '<div class="payment-modal-summary-row"><span class="payment-modal-summary-label">Slot date</span>' +
            '<span class="payment-modal-summary-value">' +
            slotDate +
            '</span></div>' +
            '<div class="payment-modal-summary-row"><span class="payment-modal-summary-label">Slot time</span>' +
            '<span class="payment-modal-summary-value">' +
            slotTime +
            '</span></div>' +
            '<div class="payment-modal-summary-row"><span class="payment-modal-summary-label">Players</span>' +
            '<span class="payment-modal-summary-value">' +
            players +
            '</span></div>' +
            '<div class="payment-modal-summary-row"><span class="payment-modal-summary-label">Game price (per player)</span>' +
            '<span class="payment-modal-summary-value">' +
            linePerPlayer +
            '</span></div>' +
            '<div class="payment-modal-summary-row"><span class="payment-modal-summary-label">Game price × players</span>' +
            '<span class="payment-modal-summary-value">' +
            linePerPlayer +
            ' × ' +
            players +
            ' = ' +
            lineTotal +
            '</span></div>' +
            '<div class="payment-modal-summary-total"><span>Total charged</span><span class="payment-total-amount">' +
            lineTotal +
            '</span></div>' +
            '<p class="payment-modal-summary-note"> You\'ll receive a game link after completing the payment successfully.' +
            '<br>Payments are processed by <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color);">Stripe</a>. ' +
            '</p>';
    }

    /**
     * After payment succeeds, keep the overlay up with a processing message until
     * booking.html finishes Firestore / game session work and calls hideModal().
     * Avoids flashing the main booking form for 1–2 seconds.
     */
    function showProcessingState() {
        var overlay = getOverlay();
        var titleEl = document.getElementById('payment-modal-title');
        var mount = document.getElementById('payment-modal-mount');
        var summaryEl = document.getElementById('payment-modal-summary');
        var errEl = document.getElementById('payment-modal-error');
        var payBtn = document.getElementById('payment-modal-pay-btn');
        var closeBtn = document.getElementById('payment-modal-close');
        if (errEl) errEl.textContent = '';
        if (payBtn) {
            payBtn.style.display = 'none';
            payBtn.onclick = null;
        }
        if (closeBtn) closeBtn.style.visibility = 'hidden';
        if (summaryEl) {
            summaryEl.innerHTML = '';
            summaryEl.style.display = 'none';
        }
        if (titleEl) titleEl.textContent = 'Processing your booking…';
        if (mount) {
            mount.innerHTML =
                '<div class="payment-modal-processing" role="status" aria-live="polite">' +
                '<p class="payment-modal-processing-lead">Payment received</p>' +
                '<p class="payment-modal-processing-sub">Setting up your game link — please wait…</p>' +
                '</div>';
        }
        if (overlay) {
            overlay.classList.remove('payment-overlay-hidden');
            overlay.style.display = 'flex';
            overlay.style.visibility = 'visible';
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = '';
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function hideModal() {
        var overlay = getOverlay();
        if (!overlay) return;
        overlay.classList.add('payment-overlay-hidden');
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        var closeBtn = document.getElementById('payment-modal-close');
        if (closeBtn) closeBtn.style.visibility = '';
        var mount = document.getElementById('payment-modal-mount');
        if (mount) mount.innerHTML = '';
        var summaryEl = document.getElementById('payment-modal-summary');
        if (summaryEl) {
            summaryEl.innerHTML = '';
            summaryEl.style.display = '';
        }
        var err = document.getElementById('payment-modal-error');
        if (err) err.textContent = '';
        var payBtn = document.getElementById('payment-modal-pay-btn');
        if (payBtn) {
            payBtn.style.display = 'none';
            payBtn.onclick = null;
        }
        var titleEl = document.getElementById('payment-modal-title');
        if (titleEl) titleEl.textContent = 'Complete payment';
    }

    window.BookingStripePayment = {
        showModal: function (opts) {
            console.log('[Stripe UI] showModal', { method: opts.method, amountPence: opts.amountPence });
            var cfg = window.STRIPE_CONFIG;
            if (!cfg || !cfg.publishableKey) {
                console.error('[Stripe UI] Missing publishableKey');
                return Promise.reject(new Error('Add your Stripe publishable key in stripe-config.js'));
            }

            var stripe = window.Stripe(cfg.publishableKey);
            var clientSecret = opts.clientSecret;
            var method = opts.method;
            var email = opts.email || '';
            var amountPence = opts.amountPence;
            var amountLabel = opts.amountLabel || 'Letter Left Behind booking';

            return new Promise(function (resolve, reject) {
                var overlay = getOverlay();
                var mount = document.getElementById('payment-modal-mount');
                var errEl = document.getElementById('payment-modal-error');
                var titleEl = document.getElementById('payment-modal-title');
                var payBtn = document.getElementById('payment-modal-pay-btn');
                var closeBtn = document.getElementById('payment-modal-close');

                if (!overlay || !mount || !titleEl) {
                    reject(new Error('Payment modal markup missing'));
                    return;
                }

                if (errEl) errEl.textContent = '';
                mount.innerHTML = '';
                fillPaymentModalSummary(opts);

                function onClose() {
                    hideModal();
                    reject(new Error('Payment cancelled'));
                }

                if (closeBtn) closeBtn.onclick = onClose;

                overlay.classList.remove('payment-overlay-hidden');
                overlay.style.display = 'flex';
                overlay.style.visibility = 'visible';
                overlay.style.opacity = '1';
                overlay.style.pointerEvents = '';
                overlay.setAttribute('aria-hidden', 'false');

                if (method === 'card') {
                    titleEl.textContent = 'Pay by card';
                    var elements = stripe.elements({ clientSecret: clientSecret });
                    var baseStyle = {
                        base: {
                            fontSize: '16px',
                            color: '#1a1a2e',
                            '::placeholder': { color: '#aab7c4' },
                        },
                        invalid: { color: '#e94560' },
                    };

                    // Split fields (cardNumber / cardExpiry / cardCvc) so MM/YY and CVC are always
                    // visible and not collapsed behind Link on one row.
                    var wrap = document.createElement('div');
                    wrap.className = 'stripe-split-card-wrap';
                    mount.appendChild(wrap);

                    var rowNum = document.createElement('div');
                    rowNum.className = 'stripe-split-row stripe-split-row-number';
                    wrap.appendChild(rowNum);

                    var rowExpCvc = document.createElement('div');
                    rowExpCvc.className = 'stripe-split-row stripe-split-row-exp-cvc';
                    wrap.appendChild(rowExpCvc);

                    var colExp = document.createElement('div');
                    colExp.className = 'stripe-split-col';
                    var colCvc = document.createElement('div');
                    colCvc.className = 'stripe-split-col';
                    rowExpCvc.appendChild(colExp);
                    rowExpCvc.appendChild(colCvc);

                    var cardNumber = elements.create('cardNumber', {
                        style: baseStyle,
                        placeholder: 'Card number',
                    });
                    var cardExpiry = elements.create('cardExpiry', {
                        style: baseStyle,
                        placeholder: 'MM / YY',
                    });
                    var cardCvc = elements.create('cardCvc', {
                        style: baseStyle,
                        placeholder: 'CVC',
                    });

                    cardNumber.mount(rowNum);
                    cardExpiry.mount(colExp);
                    cardCvc.mount(colCvc);

                    if (payBtn) {
                        payBtn.style.display = 'inline-block';
                        payBtn.textContent = 'Pay now';
                        payBtn.onclick = function () {
                            if (errEl) errEl.textContent = '';
                            stripe
                                .confirmCardPayment(clientSecret, {
                                    payment_method: {
                                        card: cardNumber,
                                        billing_details: { email: email },
                                    },
                                })
                                .then(function (result) {
                                    if (result.error) {
                                        if (errEl) errEl.textContent = result.error.message;
                                        return;
                                    }
                                    showProcessingState();
                                    resolve(result.paymentIntent);
                                });
                        };
                    }
                    return;
                }

                titleEl.textContent =
                    method === 'google_pay' ? 'Pay with Google Pay' : 'Pay with Apple Pay';

                var paymentRequest = stripe.paymentRequest({
                    country: 'GB',
                    currency: (cfg.currency || 'gbp').toLowerCase(),
                    total: {
                        label: amountLabel,
                        amount: amountPence,
                    },
                    requestPayerName: true,
                    requestPayerEmail: true,
                });

                paymentRequest.on('paymentmethod', function (ev) {
                    stripe
                        .confirmCardPayment(clientSecret, {
                            payment_method: ev.paymentMethod.id,
                            receipt_email: ev.payerEmail || email,
                        })
                        .then(function (result) {
                            if (result.error) {
                                ev.complete('fail');
                                if (errEl) errEl.textContent = result.error.message;
                                return;
                            }
                            ev.complete('success');
                            showProcessingState();
                            resolve(result.paymentIntent);
                        })
                        .catch(function (e) {
                            try {
                                ev.complete('fail');
                            } catch (ignore) {}
                            if (errEl) errEl.textContent = e.message || String(e);
                        });
                });

                paymentRequest.canMakePayment().then(function (result) {
                    if (!result) {
                        if (errEl) {
                            errEl.textContent =
                                method === 'google_pay'
                                    ? 'Google Pay is not available in this browser. Use Chrome (Android/desktop) or choose Card.'
                                    : 'Apple Pay is not available in this browser session. Use Safari on iPhone/iPad, or Mac Safari with Wallet set up, or choose Card. In Stripe Dashboard → Settings → Payment methods, add your domain for Apple Pay if you have not already.';
                        }
                        if (payBtn) payBtn.style.display = 'none';
                        return;
                    }
                    if (method === 'google_pay' && !result.googlePay) {
                        if (errEl) {
                            errEl.textContent =
                                'Google Pay is not available here. Try Chrome, or choose Card.';
                        }
                        if (payBtn) payBtn.style.display = 'none';
                        return;
                    }
                    if (method === 'apple_pay' && !result.applePay) {
                        if (errEl) {
                            errEl.textContent =
                                'Apple Pay cannot start here (browser or domain check). Try Safari on an Apple device, ensure HTTPS, register letterleftbehind.com under Stripe → Settings → Payment method domains, or choose Card.';
                        }
                        if (payBtn) payBtn.style.display = 'none';
                        return;
                    }

                    var elements = stripe.elements({ clientSecret: clientSecret });
                    var prBtn = elements.create('paymentRequestButton', {
                        paymentRequest: paymentRequest,
                        style: {
                            paymentRequestButton: {
                                theme: 'dark',
                                height: '48px',
                            },
                        },
                    });
                    prBtn.mount(mount);
                    if (payBtn) payBtn.style.display = 'none';
                });
            });
        },
    };
})();

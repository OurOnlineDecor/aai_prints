require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * ─────────────────────────────────────────────────────────────
 * Razorpay Payment Gateway Utility
 * Handles Order Creation, Signature Verification & Webhooks
 * ─────────────────────────────────────────────────────────────
 */

let razorpayInstance = null;

/**
 * Returns a configured Razorpay instance or null if credentials are not configured
 */
function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!key_id || !key_secret) {
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({ key_id, key_secret });
  }

  return razorpayInstance;
}

/**
 * Checks whether Razorpay credentials are actively configured
 */
function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

/**
 * Create a new Razorpay Order
 *
 * @param {Object} options
 * @param {number} options.amount - Amount in INR (will be converted to paise internally)
 * @param {string} [options.currency='INR'] - Currency code
 * @param {string} options.receipt - Merchant receipt / order number identifier (max 40 chars)
 * @param {Object} [options.notes={}] - Key-value metadata notes
 * @returns {Promise<Object>} Razorpay Order object
 */
async function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  const rzp = getRazorpayInstance();

  if (!rzp) {
    console.warn('[Razorpay] Keys not configured in .env. Razorpay order creation skipped.');
    return null;
  }

  // Razorpay expects amount in smallest currency unit (paise for INR)
  const amountInPaise = Math.round(Number(amount) * 100);

  const orderOptions = {
    amount: amountInPaise,
    currency: currency || 'INR',
    receipt: String(receipt || `rcpt_${Date.now()}`).slice(0, 40),
    notes: {
      platform: 'Aai Prints Web',
      ...notes,
    },
  };

  try {
    const rzpOrder = await rzp.orders.create(orderOptions);
    console.log(`[Razorpay] Created order ${rzpOrder.id} for ₹${amount} (Paise: ${amountInPaise})`);
    return rzpOrder;
  } catch (error) {
    console.error('[Razorpay] Order creation failed:', error?.error || error?.message || error);
    throw error;
  }
}

/**
 * Helper to securely compare strings in constant time to prevent timing attacks
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify Razorpay Payment Signature (HMAC-SHA256)
 *
 * Signature = HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)
 *
 * @param {Object} params
 * @param {string} params.razorpay_order_id - Razorpay Order ID
 * @param {string} params.razorpay_payment_id - Razorpay Payment ID
 * @param {string} params.razorpay_signature - Signature returned by Razorpay Checkout
 * @returns {boolean} True if signature is cryptographically valid
 */
function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) {
    console.warn('[Razorpay] RAZORPAY_KEY_SECRET is missing. Cannot verify signature.');
    return false;
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const isValid = safeEqual(expectedSignature, razorpay_signature);
  if (!isValid) {
    console.warn('[Razorpay] Signature mismatch detected.');
  }
  return isValid;
}

/**
 * Verify Razorpay Webhook Signature
 *
 * @param {string|Buffer} rawBody - Raw unparsed webhook request body
 * @param {string} signature - Value of 'x-razorpay-signature' header
 * @returns {boolean} True if webhook is authentic
 */
function verifyWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret || !signature || !rawBody) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return safeEqual(expectedSignature, signature);
}

/**
 * Fetch Payment Details from Razorpay API
 *
 * @param {string} paymentId - Razorpay payment ID (e.g., 'pay_xxx')
 * @returns {Promise<Object>} Payment entity
 */
async function fetchPaymentDetails(paymentId) {
  const rzp = getRazorpayInstance();
  if (!rzp || !paymentId) return null;

  try {
    return await rzp.payments.fetch(paymentId);
  } catch (err) {
    console.error(`[Razorpay] Failed to fetch payment ${paymentId}:`, err.message);
    return null;
  }
}

module.exports = {
  getRazorpayInstance,
  isRazorpayConfigured,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
};

/**
 * ─────────────────────────────────────────────────────────────
 * OurOnlineDecor — Google Sheets Real-Time Sync Service
 * Dispatches newly confirmed orders to Google Sheets via Webhook
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Formats order data into standard columns for Google Sheets
 * @param {Object} order - Complete order document or payload
 * @returns {Object} Clean key-value object representing spreadsheet columns
 */
function formatOrderForGoogleSheet(order) {
  if (!order) return {};

  const orderNum = order.orderNumber || order._id || 'PENDING';
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const addr = order.shippingAddress || {};
  const fullAddress = [
    addr.street,
    addr.apartment || addr.landmark,
    addr.city,
    addr.state,
    addr.postalCode ? `PIN: ${addr.postalCode}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsText = items
    .map((it) => {
      const qty = it.quantity || 1;
      const name = it.name || (it.product && it.product.name) || 'Home Decor Piece';
      const variant = it.variantName ? ` (${it.variantName})` : '';
      const price = Number(it.price || (it.product && it.product.basePrice) || 0);
      return `${qty}x ${name}${variant} - ₹${(price * qty).toLocaleString('en-IN')}`;
    })
    .join('; ');

  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  const pricing = order.pricing || {
    subtotal: order.subtotal || 0,
    discount: order.discount || 0,
    couponCode: null,
    shippingFee: order.shippingFee || 0,
    tax: order.tax || 0,
    total: order.total || order.totalAmount || 0,
  };

  const isCOD = (order.paymentMethod || '').toLowerCase() === 'cod';

  // 12% GST included in MRP: Tax = Subtotal * (12 / 112)
  const subtotalVal = Number(pricing.subtotal || pricing.total || 0);
  const calculatedTax = Number(
    pricing.tax != null && pricing.tax > 0
      ? pricing.tax
      : ((subtotalVal * 12) / 112).toFixed(2)
  );

  // Ensure phone has single-quote prefix so Google Sheets & Excel never parse '+' as formula
  const rawPhone = String(addr.phone || (order.user && order.user.phone) || '').trim();
  const safePhone = rawPhone ? (rawPhone.startsWith('+') ? `'${rawPhone}` : rawPhone) : '—';

  return {
    orderNumber: String(orderNum),
    date: orderDate,
    customerName: addr.fullName || (order.user && order.user.name) || 'Guest Customer',
    phone: safePhone,
    email: addr.email || (order.user && order.user.email) || '—',
    shippingAddress: fullAddress || 'Address on file',
    itemsOrdered: itemsText || 'No items listed',
    totalQuantity,
    paymentMethod: isCOD ? 'Cash on Delivery (COD)' : 'Online / Razorpay',
    paymentStatus: (order.paymentStatus || (isCOD ? 'Pending' : 'Paid')).toUpperCase(),
    subtotal: Number(pricing.subtotal || 0),
    discount: Number(pricing.discount || 0),
    couponCode: pricing.couponCode || '—',
    shippingFee: pricing.shippingFee === 0 || pricing.shippingFee === '0' ? 'FREE' : Number(pricing.shippingFee),
    tax: calculatedTax,
    totalAmount: Number(pricing.total || 0),
    fulfillmentStatus: (order.status || 'confirmed').toUpperCase(),
  };
}

/**
 * Dispatch an order to Google Sheets in the background
 * @param {Object} order - Order document
 * @returns {Promise<{ success: boolean, reason?: string, error?: string }>}
 */
async function syncOrderToGoogleSheet(order) {
  try {
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();

    if (!webhookUrl) {
      // Graceful no-op when URL is not yet configured
      return { success: false, reason: 'unconfigured' };
    }

    const payload = formatOrderForGoogleSheet(order);

    console.log(`[Google Sheets Sync] Sending Order #${payload.orderNumber} to Google Sheet...`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow', // Google Apps Script redirects HTTP 302 to output
    });

    if (response.ok) {
      console.log(`✅ [Google Sheets Sync] Order #${payload.orderNumber} successfully logged to Google Sheet!`);
      return { success: true };
    }

    const respText = await response.text().catch(() => '');
    console.warn(`[Google Sheets Sync] Webhook responded with status ${response.status}: ${respText}`);
    return { success: false, error: `Status ${response.status}` };
  } catch (err) {
    console.error('[Google Sheets Sync] Failed to log order to sheet:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  formatOrderForGoogleSheet,
  syncOrderToGoogleSheet,
};

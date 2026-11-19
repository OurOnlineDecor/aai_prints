require('dotenv').config();
const { BrevoClient } = require('@getbrevo/brevo');

/**
 * ─────────────────────────────────────────────────────────────
 * Brevo (Sendinblue) Transactional Email Service
 * Official Documentation: https://developers.brevo.com/guides/node-js
 * ─────────────────────────────────────────────────────────────
 */

let brevoClientInstance = null;

/**
 * Returns a cached instance of BrevoClient or creates a new one
 */
function getBrevoClient() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  if (!brevoClientInstance) {
    brevoClientInstance = new BrevoClient({ apiKey });
  }
  return brevoClientInstance;
}

/**
 * Normalize recipient(s) to Brevo's expected format: [{ email, name }]
 */
function normalizeRecipients(recipients) {
  if (!recipients) return [];
  if (typeof recipients === 'string') {
    return [{ email: recipients.trim() }];
  }
  if (Array.isArray(recipients)) {
    return recipients.map((r) => {
      if (typeof r === 'string') return { email: r.trim() };
      return { email: r.email?.trim(), name: r.name?.trim() || undefined };
    });
  }
  if (typeof recipients === 'object' && recipients.email) {
    return [{ email: recipients.email.trim(), name: recipients.name?.trim() || undefined }];
  }
  return [];
}

/**
 * Generic Transactional Email Sender
 *
 * @param {Object} options
 * @param {string|Array<Object|string>} options.to - Recipient(s)
 * @param {string} options.subject - Email subject line
 * @param {string} options.htmlContent - HTML body content
 * @param {string} [options.textContent] - Plaintext fallback
 * @param {Object} [options.sender] - Custom sender { name, email } (defaults to ENV)
 * @param {string|Object} [options.replyTo] - Reply-To email address
 * @param {Array} [options.bcc] - BCC recipient(s)
 * @param {Array} [options.cc] - CC recipient(s)
 * @param {number} [options.templateId] - Brevo template ID if using pre-designed templates
 * @param {Object} [options.params] - Dynamic template parameters
 * @returns {Promise<{ success: boolean, messageId?: string, skipped?: boolean, error?: string }>}
 */
async function sendEmail({
  to,
  subject,
  htmlContent,
  textContent,
  sender,
  replyTo,
  bcc,
  cc,
  templateId,
  params,
}) {
  const client = getBrevoClient();

  if (!client) {
    console.warn(
      '[Brevo Service] BREVO_API_KEY is not configured in .env. Email dispatch skipped.'
    );
    return {
      success: false,
      skipped: true,
      message: 'BREVO_API_KEY environment variable is missing.',
    };
  }

  const senderName = sender?.name || process.env.BREVO_SENDER_NAME || 'Aai Prints';
  const senderEmail = sender?.email || process.env.BREVO_SENDER_EMAIL || 'noreply@aaiprints.com';

  const formattedTo = normalizeRecipients(to);
  if (formattedTo.length === 0) {
    return {
      success: false,
      error: 'No valid recipient email provided.',
    };
  }

  // Handle redirect/admin email monitoring if configured
  let formattedBcc = bcc ? normalizeRecipients(bcc) : [];
  const redirectEmail = process.env.BREVO_REDIRECT_EMAIL?.trim();
  if (redirectEmail) {
    const isAlreadyRecipient = formattedTo.some(
      (r) => r.email.toLowerCase() === redirectEmail.toLowerCase()
    );
    const isAlreadyBcc = formattedBcc.some(
      (r) => r.email.toLowerCase() === redirectEmail.toLowerCase()
    );
    if (!isAlreadyRecipient && !isAlreadyBcc) {
      formattedBcc.push({ email: redirectEmail, name: 'Admin Archive' });
    }
  }

  const emailPayload = {
    sender: { name: senderName, email: senderEmail },
    to: formattedTo,
    subject: subject || 'Notification from Aai Prints',
  };

  if (templateId) {
    emailPayload.templateId = templateId;
    if (params) emailPayload.params = params;
  } else {
    emailPayload.htmlContent = htmlContent || `<p>${textContent || 'No content provided.'}</p>`;
    if (textContent) emailPayload.textContent = textContent;
  }

  if (replyTo) {
    emailPayload.replyTo =
      typeof replyTo === 'string'
        ? { email: replyTo.trim() }
        : { email: replyTo.email?.trim(), name: replyTo.name?.trim() };
  }

  if (formattedBcc.length > 0) {
    emailPayload.bcc = formattedBcc;
  }

  if (cc) {
    const formattedCc = normalizeRecipients(cc);
    if (formattedCc.length > 0) emailPayload.cc = formattedCc;
  }

  try {
    const response = await client.transactionalEmails.sendTransacEmail(emailPayload);
    const messageId = response?.messageId || response?.data?.messageId || 'SENT';
    console.log(`[Brevo Service] Email sent successfully to [${formattedTo.map((r) => r.email).join(', ')}] (MessageId: ${messageId})`);
    return {
      success: true,
      messageId,
    };
  } catch (error) {
    const errorDetails = error?.response?.body || error?.message || error;
    console.error('[Brevo Service] Failed to send email via Brevo:', errorDetails);
    return {
      success: false,
      error: error?.message || 'Failed to dispatch email via Brevo.',
      details: errorDetails,
    };
  }
}

/**
 * Standard Brand HTML Email Wrapper (Warm Cozy Home Goods aesthetic)
 */
function wrapBrandTemplate({ title, preheader = '', bodyContent, actionText, actionUrl }) {
  const brandBg = '#FFFCF5';
  const surfaceBg = '#F7F3EA';
  const textDark = '#39332E';
  const accentGold = '#D2B98C';
  const brandDarkGold = '#9E7E47';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Aai Prints'}</title>
  <style>
    body { margin:0; padding:0; background-color:${brandBg}; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:${textDark}; -webkit-font-smoothing:antialiased; }
    .container { max-width:600px; margin:32px auto; background-color:#ffffff; border:1px solid ${accentGold}; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(57,51,46,0.06); }
    .header { background-color:${surfaceBg}; padding:28px 24px; text-align:center; border-bottom:1px solid rgba(210,185,140,0.4); }
    .logo-text { font-size:24px; font-weight:700; letter-spacing:1px; color:${textDark}; text-transform:uppercase; margin:0; }
    .logo-sub { font-size:12px; letter-spacing:2px; color:${brandDarkGold}; text-transform:uppercase; margin-top:4px; }
    .content { padding:32px 28px; line-height:1.6; font-size:15px; color:${textDark}; }
    .action-wrap { text-align:center; margin:32px 0 16px; }
    .btn { display:inline-block; background-color:${accentGold}; color:#ffffff !important; text-decoration:none; padding:14px 28px; border-radius:6px; font-weight:600; font-size:14px; letter-spacing:0.5px; text-transform:uppercase; box-shadow:0 4px 12px rgba(210,185,140,0.3); }
    .footer { background-color:${surfaceBg}; padding:20px 24px; text-align:center; font-size:12px; color:#8C827A; border-top:1px solid rgba(210,185,140,0.3); }
    .footer a { color:${brandDarkGold}; text-decoration:none; }
  </style>
</head>
<body>
  <div style="display:none; font-size:1px; color:${brandBg}; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${brandBg}; padding:16px 0;">
    <tr>
      <td align="center">
        <div class="container">
          <div class="header">
            <h1 class="logo-text">AAI PRINTS</h1>
            <div class="logo-sub">Artisan Home Decor &amp; Devotional Frames</div>
          </div>
          <div class="content">
            ${bodyContent}
            ${
              actionText && actionUrl
                ? `<div class="action-wrap"><a href="${actionUrl}" class="btn" target="_blank">${actionText}</a></div>`
                : ''
            }
          </div>
          <div class="footer">
            <p style="margin:0 0 6px 0;">✦ Handcrafted Devotional Art • Premium Illuminated Backlit Frames ✦</p>
            <p style="margin:0;">&copy; ${new Date().getFullYear()} Aai Prints. All rights reserved.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send an Order Confirmation Email to the customer (and redirects copy to admin if configured)
 *
 * @param {Object} order - Complete order document
 * @param {Object} [recipientInfo] - Optional override { email, name }
 */
async function sendOrderConfirmationEmail(order, recipientInfo = {}) {
  const customerEmail = recipientInfo.email || order.shippingAddress?.email;
  const customerName = recipientInfo.name || order.shippingAddress?.fullName || 'Valued Collector';

  if (!customerEmail) {
    console.warn('[Brevo Service] Cannot send order confirmation: customer email is missing.');
    return { success: false, error: 'Recipient email missing' };
  }

  const itemsHtml = (order.items || [])
    .map((item) => {
      const price = item.price || item.unitPrice || 0;
      const qty = item.quantity || 1;
      const total = price * qty;
      return `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #ECE4D8; vertical-align:middle;">
          <strong>${item.name || item.product?.name || 'Artisan Frame'}</strong>
          ${item.variantName ? `<br><span style="font-size:12px; color:#8C827A;">Option: ${item.variantName}</span>` : ''}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #ECE4D8; text-align:center; vertical-align:middle;">
          ${qty}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #ECE4D8; text-align:right; vertical-align:middle;">
          ₹${total.toLocaleString('en-IN')}
        </td>
      </tr>`;
    })
    .join('');

  const pricing = order.pricing || {};
  const subtotal = pricing.subtotal || order.totalAmount || 0;
  const discount = pricing.discount || 0;
  const shippingFee = pricing.shippingFee === 0 ? 'FREE' : `₹${pricing.shippingFee || 0}`;
  const total = pricing.total || order.totalAmount || subtotal;

  const bodyContent = `
    <h2 style="margin-top:0; color:#39332E; font-size:20px;">Thank You for Your Order, ${customerName}!</h2>
    <p>We are delighted to confirm that your order <strong>#${order.orderNumber}</strong> has been received and is being prepared with artisan care.</p>
    
    <div style="background-color:#F7F3EA; border:1px solid #D2B98C; border-radius:8px; padding:16px 20px; margin:20px 0;">
      <div style="font-size:13px; text-transform:uppercase; letter-spacing:1px; color:#9E7E47; font-weight:600; margin-bottom:4px;">Order Reference</div>
      <div style="font-size:18px; font-weight:700; color:#39332E;">${order.orderNumber}</div>
      <div style="font-size:13px; color:#6B6158; margin-top:4px;">Placed on: ${new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
    </div>

    <h3 style="font-size:16px; margin:24px 0 8px; color:#39332E; border-bottom:2px solid #D2B98C; padding-bottom:6px;">Order Summary</h3>
    <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px; margin-bottom:16px;">
      <thead>
        <tr style="color:#8C827A; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
          <th align="left" style="padding-bottom:8px;">Item</th>
          <th align="center" style="padding-bottom:8px;">Qty</th>
          <th align="right" style="padding-bottom:8px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding-top:12px; text-align:right; color:#6B6158;">Subtotal:</td>
          <td style="padding-top:12px; text-align:right;">₹${subtotal.toLocaleString('en-IN')}</td>
        </tr>
        ${
          discount > 0
            ? `<tr>
                <td colspan="2" style="padding:4px 0; text-align:right; color:#2E7D32;">Discount (${pricing.couponCode || 'Promo'}):</td>
                <td style="padding:4px 0; text-align:right; color:#2E7D32;">−₹${discount.toLocaleString('en-IN')}</td>
              </tr>`
            : ''
        }
        <tr>
          <td colspan="2" style="padding:4px 0; text-align:right; color:#6B6158;">Shipping:</td>
          <td style="padding:4px 0; text-align:right;">${shippingFee}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:8px; text-align:right; font-weight:700; font-size:16px; color:#39332E;">Total Payable:</td>
          <td style="padding-top:8px; text-align:right; font-weight:700; font-size:16px; color:#39332E;">₹${total.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <h3 style="font-size:16px; margin:24px 0 8px; color:#39332E; border-bottom:2px solid #D2B98C; padding-bottom:6px;">Shipping Address</h3>
    <p style="margin:6px 0; line-height:1.5; font-size:14px; color:#4A433D;">
      <strong>${order.shippingAddress?.fullName}</strong><br>
      ${order.shippingAddress?.street}${order.shippingAddress?.apartment ? `, ${order.shippingAddress?.apartment}` : ''}<br>
      ${order.shippingAddress?.city}, ${order.shippingAddress?.state} – ${order.shippingAddress?.postalCode}<br>
      Phone: ${order.shippingAddress?.phone}
    </p>

    <p style="font-size:13px; color:#8C827A; margin-top:24px;">
      ✦ We will notify you once your order is safely packed and dispatched with tracking details.
    </p>
  `;

  const html = wrapBrandTemplate({
    title: `Order Confirmation #${order.orderNumber} – Aai Prints`,
    preheader: `Thank you! Your Aai Prints order #${order.orderNumber} is confirmed.`,
    bodyContent,
    actionText: 'View Storefront & Track Orders',
    actionUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  });

  return sendEmail({
    to: [{ email: customerEmail, name: customerName }],
    subject: `Order Confirmed: #${order.orderNumber} – Aai Prints`,
    htmlContent: html,
  });
}

/**
 * Send B2B / Wholesale Inquiry Alert & Acknowledgment
 *
 * @param {Object} inquiry - The created B2B inquiry record
 */
async function sendB2BInquiryNotification(inquiry) {
  const customerEmail = inquiry.email;
  const companyName = inquiry.companyName || 'Corporate Client';
  const contactPerson = inquiry.contactPerson || companyName;

  const redirectEmail = process.env.BREVO_REDIRECT_EMAIL?.trim();

  // 1. Send acknowledgment to the enterprise lead
  if (customerEmail) {
    const customerHtml = wrapBrandTemplate({
      title: 'Wholesale Inquiry Received – Aai Prints Enterprise Desk',
      preheader: `We received your inquiry for ${companyName}.`,
      bodyContent: `
        <h2 style="margin-top:0; color:#39332E;">Thank you for your Wholesale Inquiry</h2>
        <p>Dear ${contactPerson},</p>
        <p>We have successfully received your B2B / bulk customization inquiry for <strong>${companyName}</strong>.</p>
        <p>Our institutional sales desk is reviewing your requirements and will get back to you with custom tier pricing and lead times within <strong>24 business hours</strong>.</p>
        
        <div style="background-color:#F7F3EA; border:1px solid #D2B98C; border-radius:8px; padding:16px; margin:20px 0; font-size:14px;">
          <div><strong>Inquiry Type:</strong> ${inquiry.inquiryType || 'Bulk Order'}</div>
          <div><strong>City / State:</strong> ${inquiry.city || ''} ${inquiry.state ? `, ${inquiry.state}` : ''}</div>
          ${inquiry.targetBudget ? `<div><strong>Target Budget:</strong> ₹${inquiry.targetBudget}</div>` : ''}
          ${inquiry.notes ? `<div><strong>Requirements:</strong> ${inquiry.notes}</div>` : ''}
        </div>
      `,
      actionText: 'Explore Enterprise Catalog',
      actionUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/b2b`,
    });

    await sendEmail({
      to: [{ email: customerEmail, name: contactPerson }],
      subject: `Inquiry Received: ${companyName} – Aai Prints Enterprise`,
      htmlContent: customerHtml,
    }).catch((err) => console.warn('[Brevo Service] B2B lead confirmation failed:', err.message));
  }

  // 2. Send immediate lead alert to admin/redirect email if configured
  if (redirectEmail) {
    const adminHtml = wrapBrandTemplate({
      title: 'New B2B Lead Alert',
      preheader: `New wholesale inquiry from ${companyName}`,
      bodyContent: `
        <h2 style="margin-top:0; color:#C2410C;">⚡ New B2B Wholesale Inquiry</h2>
        <table width="100%" cellpadding="6" style="font-size:14px; border-collapse:collapse;">
          <tr><td><strong>Company:</strong></td><td>${companyName}</td></tr>
          <tr><td><strong>Contact Person:</strong></td><td>${contactPerson}</td></tr>
          <tr><td><strong>Email:</strong></td><td><a href="mailto:${customerEmail}">${customerEmail}</a></td></tr>
          <tr><td><strong>Phone:</strong></td><td>${inquiry.phone || 'N/A'}</td></tr>
          <tr><td><strong>GSTIN:</strong></td><td>${inquiry.gstin || 'Unspecified'}</td></tr>
          <tr><td><strong>Location:</strong></td><td>${inquiry.city || ''}, ${inquiry.state || ''}</td></tr>
          <tr><td><strong>Inquiry Type:</strong></td><td>${inquiry.inquiryType || 'bulk_order'}</td></tr>
          <tr><td><strong>Target Budget:</strong></td><td>${inquiry.targetBudget || 'Open'}</td></tr>
          <tr><td><strong>Notes:</strong></td><td>${inquiry.notes || 'None'}</td></tr>
        </table>
      `,
      actionText: 'View B2B Inquiries in Admin',
      actionUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/admin/b2b`,
    });

    return sendEmail({
      to: [{ email: redirectEmail, name: 'Admin Operations' }],
      subject: `[New B2B Lead] ${companyName} (${inquiry.city || 'India'})`,
      htmlContent: adminHtml,
    });
  }

  return { success: true };
}

/**
 * Send order status update notification to customer
 */
async function sendOrderStatusUpdateEmail(order, updateMessage = '') {
  const recipientEmail = order.shippingAddress?.email || (order.user && order.user.email);
  if (!recipientEmail) return { skipped: true };

  const customerName = order.shippingAddress?.fullName || 'Valued Customer';
  const statusLabels = {
    pending: 'Order Received',
    confirmed: 'Order Confirmed',
    processing: 'In Production & Framing',
    shipped: 'Shipped & Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  const statusTitle = statusLabels[order.status] || (order.status ? order.status.toUpperCase() : 'Updated');
  const subject = `Update on your order #${order.orderNumber}: ${statusTitle}`;

  const messageBlock = updateMessage && updateMessage.trim()
    ? `<div style="background: #f8fafc; border-left: 4px solid #D2B98C; padding: 14px 16px; margin: 18px 0; border-radius: 0 8px 8px 0; color: #334155; font-size: 14px;"><strong>Admin Note / Tracking Details:</strong><br/>${updateMessage.trim()}</div>`
    : '';

  const innerHtml = `
    <h2 style="color: #39332E; margin-top: 0; font-family: 'Cormorant', Georgia, serif; font-size: 26px;">Order Status Update</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Namaste <strong>${customerName}</strong>,</p>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">Your order <strong>#${order.orderNumber}</strong> status is now: <span style="background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 6px; font-weight: 700;">${statusTitle}</span></p>
    ${messageBlock}
    <p style="color: #64748b; font-size: 13.5px; line-height: 1.6; margin-top: 24px;">
      For any queries, contact our customer team at <a href="mailto:ouronlinedecor@aaiprints.com" style="color: #D2B98C; text-decoration: none; font-weight: 600;">ouronlinedecor@aaiprints.com</a> or via WhatsApp at <a href="https://wa.me/917014945523" style="color: #047857; text-decoration: none; font-weight: 600;">+91 70149 45523</a>.
    </p>
  `;

  const htmlContent = wrapBrandTemplate({
    preheader: `Update on order #${order.orderNumber}: ${statusTitle}`,
    content: innerHtml,
    actionText: 'View Storefront',
    actionUrl: process.env.CLIENT_URL || 'https://aaiprints.com',
  });

  return sendEmail({
    to: [{ email: recipientEmail, name: customerName }],
    subject,
    htmlContent
  }).catch((err) => {
    console.warn('[Brevo] Status update email error:', err.message);
    return { skipped: true, error: err.message };
  });
}

module.exports = {
  getBrevoClient,
  sendEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendB2BInquiryNotification,
  wrapBrandTemplate,
};

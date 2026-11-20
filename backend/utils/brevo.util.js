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
 * Supports single email strings, comma-separated lists, and recipient objects.
 */
function normalizeRecipients(recipients) {
  if (!recipients) return [];
  if (typeof recipients === 'string') {
    return recipients
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => ({ email: r }));
  }
  if (Array.isArray(recipients)) {
    return recipients.flatMap((r) => {
      if (typeof r === 'string') {
        return r
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => ({ email: s }));
      }
      if (r && typeof r === 'object' && r.email) {
        return r.email
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => ({ email: s, name: r.name?.trim() || undefined }));
      }
      return [];
    });
  }
  if (typeof recipients === 'object' && recipients.email) {
    return recipients.email
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ email: s, name: recipients.name?.trim() || undefined }));
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

  const senderName = sender?.name || process.env.BREVO_SENDER_NAME || 'OurOnlineDecor';
  const senderEmail = sender?.email || process.env.BREVO_SENDER_EMAIL || 'ouronlinedecor@aaiprints.com';

  const formattedTo = normalizeRecipients(to);
  if (formattedTo.length === 0) {
    return {
      success: false,
      error: 'No valid recipient email provided.',
    };
  }

  // Handle redirect/admin email monitoring if configured (supports comma-separated list)
  let formattedBcc = bcc ? normalizeRecipients(bcc) : [];
  const redirectEmails = (process.env.BREVO_REDIRECT_EMAIL || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  redirectEmails.forEach((adminEmail) => {
    const isAlreadyRecipient = formattedTo.some(
      (r) => r.email.toLowerCase() === adminEmail.toLowerCase()
    );
    const isAlreadyBcc = formattedBcc.some(
      (r) => r.email.toLowerCase() === adminEmail.toLowerCase()
    );
    if (!isAlreadyRecipient && !isAlreadyBcc) {
      formattedBcc.push({ email: adminEmail, name: 'Admin Archive' });
    }
  });

  const emailPayload = {
    sender: { name: senderName, email: senderEmail },
    to: formattedTo,
    subject: subject || 'Notification from OurOnlineDecor',
  };

  if (templateId) {
    emailPayload.templateId = templateId;
    if (params) emailPayload.params = params;
  } else {
    emailPayload.htmlContent = htmlContent || `<p>${textContent || 'No content provided.'}</p>`;
    if (textContent) emailPayload.textContent = textContent;
  }

  if (replyTo) {
    const rawEmail = typeof replyTo === 'string' ? replyTo : replyTo.email;
    const cleanEmail = rawEmail ? rawEmail.split(',')[0].trim() : null;
    if (cleanEmail) {
      emailPayload.replyTo =
        typeof replyTo === 'object' && replyTo.name
          ? { email: cleanEmail, name: replyTo.name.trim() }
          : { email: cleanEmail };
    }
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
 * Standard Professional Email Wrapper (Clean, modern e-commerce format)
 */
function wrapBrandTemplate({ title, preheader = '', bodyContent, content, actionText, actionUrl }) {
  const finalContent = bodyContent || content || '';
  const bgMain = '#F8FAFC';
  const textPrimary = '#0F172A';
  const textSecondary = '#475569';
  const borderColor = '#E2E8F0';
  const brandDark = '#0F172A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'OurOnlineDecor'}</title>
  <style>
    body { margin:0; padding:0; background-color:${bgMain}; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:${textPrimary}; -webkit-font-smoothing:antialiased; }
    .container { max-width:600px; margin:32px auto; background-color:#ffffff; border:1px solid ${borderColor}; border-radius:8px; overflow:hidden; }
    .header { background-color:#ffffff; padding:24px 28px; text-align:left; border-bottom:1px solid ${borderColor}; }
    .logo-text { font-size:20px; font-weight:700; letter-spacing:0.5px; color:${textPrimary}; text-transform:uppercase; margin:0; }
    .logo-sub { font-size:12px; color:${textSecondary}; margin-top:2px; }
    .content { padding:28px; line-height:1.6; font-size:14px; color:${textPrimary}; }
    .action-wrap { margin:28px 0 12px; }
    .btn { display:inline-block; background-color:${brandDark}; color:#ffffff !important; text-decoration:none; padding:12px 24px; border-radius:6px; font-weight:600; font-size:13px; letter-spacing:0.3px; }
    .footer { background-color:${bgMain}; padding:20px 28px; text-align:left; font-size:12px; color:${textSecondary}; border-top:1px solid ${borderColor}; line-height:1.5; }
    .footer a { color:${textPrimary}; text-decoration:underline; }
  </style>
</head>
<body>
  <div style="display:none; font-size:1px; color:${bgMain}; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${bgMain}; padding:24px 0;">
    <tr>
      <td align="center">
        <div class="container">
          <div class="header">
            <h1 class="logo-text">OURONLINEDECOR</h1>
            <div class="logo-sub">Home Decor &amp; Wall Art</div>
          </div>
          <div class="content">
            ${finalContent}
            ${
              actionText && actionUrl
                ? `<div class="action-wrap"><a href="${actionUrl}" class="btn" target="_blank">${actionText}</a></div>`
                : ''
            }
          </div>
          <div class="footer">
            <p style="margin:0 0 4px 0;">OurOnlineDecor &bull; Support: <a href="mailto:ouronlinedecor@aaiprints.com">ouronlinedecor@aaiprints.com</a> | +91 70149 45523</p>
            <p style="margin:0;">&copy; ${new Date().getFullYear()} OurOnlineDecor. All rights reserved.</p>
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
  const customerName = recipientInfo.name || order.shippingAddress?.fullName || 'Customer';

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
        <td style="padding:10px 0; border-bottom:1px solid #E2E8F0; vertical-align:middle;">
          <strong>${item.name || item.product?.name || 'Item'}</strong>
          ${item.variantName ? `<br><span style="font-size:12px; color:#64748B;">Option: ${item.variantName}</span>` : ''}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #E2E8F0; text-align:center; vertical-align:middle;">
          ${qty}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid #E2E8F0; text-align:right; vertical-align:middle;">
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
    <h2 style="margin-top:0; color:#0F172A; font-size:18px; font-weight:600;">Order Confirmation</h2>
    <p style="margin:0 0 14px 0; color:#334155;">Hello <strong>${customerName}</strong>,</p>
    <p style="margin:0 0 20px 0; color:#334155;">Thank you for your order. We have received order <strong>#${order.orderNumber}</strong> and it is currently being processed.</p>
    
    <div style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:14px 18px; margin:20px 0;">
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#64748B; font-weight:600;">Order Reference</div>
      <div style="font-size:16px; font-weight:700; color:#0F172A; margin-top:2px;">#${order.orderNumber}</div>
      <div style="font-size:12px; color:#64748B; margin-top:4px;">Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
    </div>

    <h3 style="font-size:14px; margin:24px 0 10px; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Order Summary</h3>
    <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px; margin-bottom:16px;">
      <thead>
        <tr style="color:#64748B; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #E2E8F0;">
          <th align="left" style="padding-bottom:8px;">Item</th>
          <th align="center" style="padding-bottom:8px;">Qty</th>
          <th align="right" style="padding-bottom:8px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding-top:12px; text-align:right; color:#64748B;">Subtotal:</td>
          <td style="padding-top:12px; text-align:right;">₹${subtotal.toLocaleString('en-IN')}</td>
        </tr>
        ${
          discount > 0
            ? `<tr>
                <td colspan="2" style="padding:4px 0; text-align:right; color:#15803D;">Discount (${pricing.couponCode || 'Promo'}):</td>
                <td style="padding:4px 0; text-align:right; color:#15803D;">−₹${discount.toLocaleString('en-IN')}</td>
              </tr>`
            : ''
        }
        <tr>
          <td colspan="2" style="padding:4px 0; text-align:right; color:#64748B;">Shipping:</td>
          <td style="padding:4px 0; text-align:right;">${shippingFee}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:8px; text-align:right; font-weight:700; font-size:15px; color:#0F172A;">Total:</td>
          <td style="padding-top:8px; text-align:right; font-weight:700; font-size:15px; color:#0F172A;">₹${total.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <h3 style="font-size:14px; margin:24px 0 10px; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">Shipping Address</h3>
    <p style="margin:4px 0; line-height:1.5; font-size:14px; color:#334155;">
      <strong>${order.shippingAddress?.fullName || customerName}</strong><br>
      ${order.shippingAddress?.street || ''}${order.shippingAddress?.apartment ? `, ${order.shippingAddress.apartment}` : ''}<br>
      ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode ? `– ${order.shippingAddress.postalCode}` : ''}<br>
      ${order.shippingAddress?.phone ? `Phone: ${order.shippingAddress.phone}` : ''}
    </p>

    <p style="font-size:13px; color:#64748B; margin-top:24px; padding-top:16px; border-top:1px solid #E2E8F0;">
      You will receive another update with tracking information once your order is dispatched.
    </p>
  `;

  const html = wrapBrandTemplate({
    title: `Order Confirmation #${order.orderNumber} – OurOnlineDecor`,
    preheader: `Your order #${order.orderNumber} has been received.`,
    bodyContent,
    actionText: 'Track Order',
    actionUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/orders`,
  });

  const plainTextSummary = [
    `Order Confirmation - #${order.orderNumber}`,
    '',
    `Hello ${customerName},`,
    '',
    `Thank you for your order. We have received order #${order.orderNumber} and it is currently being processed.`,
    '',
    `Order Details:`,
    ...(order.items || []).map((i) => `- ${i.name || 'Item'} (Qty: ${i.quantity || 1}) - ₹${((i.price || 0) * (i.quantity || 1)).toLocaleString('en-IN')}`),
    '',
    `Subtotal: ₹${subtotal.toLocaleString('en-IN')}`,
    discount > 0 ? `Discount: -₹${discount.toLocaleString('en-IN')}` : '',
    `Shipping: ${shippingFee}`,
    `Total: ₹${total.toLocaleString('en-IN')}`,
    '',
    `Shipping Address:`,
    `${order.shippingAddress?.fullName || customerName}`,
    `${order.shippingAddress?.street || ''}${order.shippingAddress?.apartment ? `, ${order.shippingAddress.apartment}` : ''}`,
    `${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || ''}`,
    order.shippingAddress?.phone ? `Phone: ${order.shippingAddress.phone}` : '',
    '',
    `Support: ouronlinedecor@aaiprints.com`,
  ].filter(Boolean).join('\n');

  return sendEmail({
    to: [{ email: customerEmail, name: customerName }],
    subject: `Order Confirmation: #${order.orderNumber} – OurOnlineDecor`,
    htmlContent: html,
    textContent: plainTextSummary,
    replyTo: process.env.BREVO_SENDER_EMAIL || 'ouronlinedecor@aaiprints.com',
  });
}

/**
 * Send B2B / Wholesale Inquiry Alert & Acknowledgment
 *
 * @param {Object} inquiry - The created B2B inquiry record
 */
async function sendB2BInquiryNotification(inquiry) {
  const customerEmail = inquiry.email;
  const companyName = inquiry.companyName || 'Inquiry';
  const contactPerson = inquiry.contactPerson || companyName;

  // 1. Send acknowledgment to the enterprise client
  if (customerEmail) {
    const customerHtml = wrapBrandTemplate({
      title: 'B2B Wholesale Inquiry Received – OurOnlineDecor',
      preheader: `We received your wholesale inquiry for ${companyName}.`,
      bodyContent: `
        <h2 style="margin-top:0; color:#0F172A; font-size:18px; font-weight:600;">Inquiry Received</h2>
        <p style="color:#334155;">Dear ${contactPerson},</p>
        <p style="color:#334155;">Thank you for contacting OurOnlineDecor regarding wholesale / bulk requirements for <strong>${companyName}</strong>.</p>
        <p style="color:#334155;">We have received your requirements and a representative from our team will get in touch with you within 1 business day.</p>
        
        <div style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:14px 18px; margin:20px 0; font-size:13px; line-height:1.6;">
          <div><strong>Inquiry Type:</strong> ${inquiry.inquiryType || 'Bulk Order'}</div>
          <div><strong>Location:</strong> ${inquiry.city || ''}${inquiry.state ? `, ${inquiry.state}` : ''}</div>
          ${inquiry.targetBudget ? `<div><strong>Budget / Quantity:</strong> ₹${inquiry.targetBudget}</div>` : ''}
          ${inquiry.notes ? `<div><strong>Details:</strong> ${inquiry.notes}</div>` : ''}
        </div>
      `,
      actionText: 'View B2B Catalog',
      actionUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/b2b`,
    });

    const plainTextCustomer = [
      `B2B Inquiry Received - ${companyName}`,
      '',
      `Dear ${contactPerson},`,
      '',
      `Thank you for contacting OurOnlineDecor regarding wholesale / bulk requirements for ${companyName}.`,
      `We have received your requirements and our team will get in touch with you within 1 business day.`,
      '',
      `Inquiry Type: ${inquiry.inquiryType || 'Bulk Order'}`,
      `Location: ${inquiry.city || ''}${inquiry.state ? `, ${inquiry.state}` : ''}`,
      inquiry.targetBudget ? `Budget / Quantity: ₹${inquiry.targetBudget}` : '',
      inquiry.notes ? `Details: ${inquiry.notes}` : '',
      '',
      `Support: ouronlinedecor@aaiprints.com`,
    ].filter(Boolean).join('\n');

    await sendEmail({
      to: [{ email: customerEmail, name: contactPerson }],
      subject: `Inquiry Received: ${companyName} – OurOnlineDecor`,
      htmlContent: customerHtml,
      textContent: plainTextCustomer,
      replyTo: process.env.BREVO_SENDER_EMAIL || 'ouronlinedecor@aaiprints.com',
    }).catch((err) => console.warn('[Brevo Service] B2B lead confirmation failed:', err.message));
  }

  // 2. Send immediate lead alert to admin/redirect emails
  const redirectEmails = (process.env.BREVO_REDIRECT_EMAIL || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (redirectEmails.length > 0) {
    const adminHtml = wrapBrandTemplate({
      title: 'New B2B Inquiry',
      preheader: `New inquiry from ${companyName}`,
      bodyContent: `
        <h2 style="margin-top:0; color:#0F172A; font-size:18px; font-weight:600;">New B2B Inquiry Received</h2>
        <table width="100%" cellpadding="6" style="font-size:13px; border-collapse:collapse; margin-top:12px;">
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="width:140px; color:#64748B;"><strong>Company:</strong></td><td>${companyName}</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="color:#64748B;"><strong>Contact Person:</strong></td><td>${contactPerson}</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="color:#64748B;"><strong>Email:</strong></td><td><a href="mailto:${customerEmail}">${customerEmail}</a></td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="color:#64748B;"><strong>Phone:</strong></td><td>${inquiry.phone || 'N/A'}</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="color:#64748B;"><strong>GSTIN:</strong></td><td>${inquiry.gstin || 'None provided'}</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="color:#64748B;"><strong>Location:</strong></td><td>${inquiry.city || ''}${inquiry.state ? `, ${inquiry.state}` : ''}</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="color:#64748B;"><strong>Inquiry Type:</strong></td><td>${inquiry.inquiryType || 'bulk_order'}</td></tr>
          <tr style="border-bottom:1px solid #E2E8F0;"><td style="color:#64748B;"><strong>Budget / Volume:</strong></td><td>${inquiry.targetBudget || 'Not specified'}</td></tr>
          <tr><td style="color:#64748B; vertical-align:top;"><strong>Details:</strong></td><td>${inquiry.notes || 'None'}</td></tr>
        </table>
      `,
      actionText: 'View B2B Leads',
      actionUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/admin/b2b`,
    });

    const plainTextAdmin = [
      `New B2B Inquiry: ${companyName}`,
      '',
      `Company: ${companyName}`,
      `Contact: ${contactPerson}`,
      `Email: ${customerEmail}`,
      `Phone: ${inquiry.phone || 'N/A'}`,
      `GSTIN: ${inquiry.gstin || 'None provided'}`,
      `Location: ${inquiry.city || ''}, ${inquiry.state || ''}`,
      `Type: ${inquiry.inquiryType || 'bulk_order'}`,
      `Budget / Volume: ${inquiry.targetBudget || 'Not specified'}`,
      `Details: ${inquiry.notes || 'None'}`,
    ].join('\n');

    return sendEmail({
      to: redirectEmails.map((email) => ({ email, name: 'Operations Team' })),
      subject: `[B2B Lead] ${companyName} (${inquiry.city || 'India'})`,
      htmlContent: adminHtml,
      textContent: plainTextAdmin,
      replyTo: customerEmail || undefined,
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

  const customerName = order.shippingAddress?.fullName || 'Customer';
  const statusLabels = {
    pending: 'Order Received',
    confirmed: 'Order Confirmed',
    processing: 'In Production',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  const statusTitle = statusLabels[order.status] || (order.status ? order.status.toUpperCase() : 'Updated');
  const subject = `Update on Order #${order.orderNumber}: ${statusTitle} – OurOnlineDecor`;

  const messageBlock = updateMessage && updateMessage.trim()
    ? `<div style="background:#F8FAFC; border-left:4px solid #0F172A; padding:12px 16px; margin:18px 0; border-radius:0 6px 6px 0; color:#334155; font-size:13px;"><strong>Tracking / Note:</strong><br/>${updateMessage.trim()}</div>`
    : '';

  const innerHtml = `
    <h2 style="color:#0F172A; margin-top:0; font-size:18px; font-weight:600;">Order Status Update</h2>
    <p style="color:#334155; font-size:14px; line-height:1.6;">Hello <strong>${customerName}</strong>,</p>
    <p style="color:#334155; font-size:14px; line-height:1.6;">Your order <strong>#${order.orderNumber}</strong> status is now: <span style="background:#F1F5F9; color:#0F172A; padding:3px 10px; border-radius:4px; font-weight:600; font-size:13px;">${statusTitle}</span></p>
    ${messageBlock}
    <p style="color:#64748B; font-size:13px; line-height:1.6; margin-top:24px; padding-top:16px; border-top:1px solid #E2E8F0;">
      For any questions regarding your delivery, contact us at <a href="mailto:ouronlinedecor@aaiprints.com" style="color:#0F172A; text-decoration:underline;">ouronlinedecor@aaiprints.com</a> or via phone at +91 70149 45523.
    </p>
  `;

  const htmlContent = wrapBrandTemplate({
    title: `Order #${order.orderNumber} Update – OurOnlineDecor`,
    preheader: `Update on order #${order.orderNumber}: ${statusTitle}`,
    bodyContent: innerHtml,
    actionText: 'View Order Status',
    actionUrl: `${process.env.CLIENT_URL || 'https://aaiprints.com'}/#/orders`,
  });

  const plainTextStatus = [
    `Order Status Update - #${order.orderNumber}`,
    '',
    `Hello ${customerName},`,
    '',
    `Your order #${order.orderNumber} status has been updated to: ${statusTitle}.`,
    updateMessage && updateMessage.trim() ? `\nNote / Tracking: ${updateMessage.trim()}` : '',
    '',
    `Support: ouronlinedecor@aaiprints.com | +91 70149 45523`,
  ].filter(Boolean).join('\n');

  return sendEmail({
    to: [{ email: recipientEmail, name: customerName }],
    subject,
    htmlContent,
    textContent: plainTextStatus,
    replyTo: process.env.BREVO_SENDER_EMAIL || 'ouronlinedecor@aaiprints.com',
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

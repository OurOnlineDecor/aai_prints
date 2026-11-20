require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const {
  sendEmail,
  sendOrderConfirmationEmail,
  sendB2BInquiryNotification,
  sendOrderStatusUpdateEmail,
} = require('../utils/brevo.util');

async function testAllSchemes() {
  console.log('====================================================');
  console.log('OurOnlineDecor — Brevo Transactional Email Verification');
  console.log('====================================================');
  console.log('API Key configured:', process.env.BREVO_API_KEY ? `${process.env.BREVO_API_KEY.slice(0, 15)}...` : 'NONE');
  console.log('Sender Name:', process.env.BREVO_SENDER_NAME);
  console.log('Sender Email:', process.env.BREVO_SENDER_EMAIL);
  console.log('Redirect / Admin Email:', process.env.BREVO_REDIRECT_EMAIL);
  console.log('----------------------------------------------------');

  const testRecipient = process.env.BREVO_REDIRECT_EMAIL || 'ouronlinedecor@gmail.com';

  // 1. Direct Ping Email
  console.log('\n[1/3] Triggering Generic Test Ping Email...');
  try {
    const resPing = await sendEmail({
      to: testRecipient,
      subject: 'OurOnlineDecor - Email Dispatch Test',
      htmlContent: `
        <div style="font-family:sans-serif; padding:20px; color:#0F172A; background:#FFFFFF;">
          <h2 style="color:#0F172A; margin-top:0;">Email Service Verified</h2>
          <p>This is a transactional email dispatch test for <strong>OurOnlineDecor</strong>.</p>
          <p style="color:#64748B; font-size:13px;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
      textContent: `OurOnlineDecor - Email Dispatch Test\n\nThis is a transactional email test.\nTimestamp: ${new Date().toISOString()}`,
    });
    console.log('Result [Ping]:', resPing);
  } catch (err) {
    console.error('Error [Ping]:', err.message);
  }

  // 2. Order Confirmation Email
  console.log('\n[2/3] Triggering Order Confirmation Scheme...');
  const sampleOrder = {
    orderNumber: 'OOD-2026-TEST01',
    totalAmount: 1799,
    status: 'confirmed',
    items: [
      {
        name: 'Backlit Canvas Wall Art Frame',
        variantName: '12x18 inch • Warm Light',
        price: 1899,
        quantity: 1,
      },
    ],
    pricing: {
      subtotal: 1899,
      discount: 100,
      couponCode: 'SAVE100',
      shippingFee: 0,
      total: 1799,
    },
    shippingAddress: {
      fullName: 'OurOnlineDecor Customer',
      email: testRecipient,
      street: '123 Heritage Art Boulevard',
      apartment: 'Suite 4B',
      city: 'Jaipur',
      state: 'Rajasthan',
      postalCode: '302001',
      phone: '+91 70149 45523',
    },
  };

  try {
    const resOrder = await sendOrderConfirmationEmail(sampleOrder);
    console.log('Result [Order Confirmation]:', resOrder);
  } catch (err) {
    console.error('Error [Order Confirmation]:', err.message);
  }

  // 3. B2B Wholesale Inquiry Notification
  console.log('\n[3/3] Triggering B2B Wholesale Inquiry Scheme...');
  const sampleInquiry = {
    companyName: 'Royal Heritage Luxury Hotels & Resorts',
    contactPerson: 'Purchasing Manager',
    email: testRecipient,
    phone: '+91 70149 45523',
    gstin: '08AAAAA0000A1Z5',
    city: 'Jaipur',
    state: 'Rajasthan',
    inquiryType: 'Corporate Gifting & Hospitality Decor',
    targetBudget: '1,50,000',
    notes: 'Need 60 custom LED backlit frames for executive rooms.',
  };

  try {
    const resB2B = await sendB2BInquiryNotification(sampleInquiry);
    console.log('Result [B2B Inquiry]:', resB2B);
  } catch (err) {
    console.error('Error [B2B Inquiry]:', err.message);
  }

  // 4. Order Status Update Email
  console.log('\n[4/4] Triggering Order Status Update Scheme (Dispatched)...');
  try {
    const resStatus = await sendOrderStatusUpdateEmail(
      {
        ...sampleOrder,
        status: 'shipped',
      },
      'Tracking Number: BLUEDART-EXP-98234190 • Estimated Delivery: Monday afternoon'
    );
    console.log('Result [Order Status Update]:', resStatus);
  } catch (err) {
    console.error('Error [Order Status Update]:', err.message);
  }

  console.log('\n====================================================');
  console.log('Verification dispatch complete.');
  console.log('====================================================');
}

testAllSchemes();

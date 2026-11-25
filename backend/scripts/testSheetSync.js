require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { syncOrderToGoogleSheet } = require('../services/googleSheets.service');

async function testSync() {
  const dummyOrder = {
    orderNumber: 'TEST-' + Math.floor(100000 + Math.random() * 900000),
    createdAt: new Date(),
    shippingAddress: {
      fullName: 'Test Customer',
      phone: '9876543210',
      email: 'test@example.com',
      street: '123 MG Road',
      apartment: 'Near City Center',
      city: 'Jaipur',
      state: 'Rajasthan',
      postalCode: '302001',
    },
    items: [
      {
        name: 'Handcrafted Brass Ganesha Idol',
        variantName: 'Antique Gold / 12 Inch',
        quantity: 1,
        price: 2499,
      },
      {
        name: 'Hand-Carved Wooden Wall Panel',
        variantName: 'Teak Finish',
        quantity: 2,
        price: 1250,
      },
    ],
    pricing: {
      subtotal: 4999,
      discount: 499,
      couponCode: 'WELCOME10',
      shippingFee: 0,
      total: 4500,
    },
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    status: 'confirmed',
  };

  console.log('Sending test order to Google Sheets...');
  const res = await syncOrderToGoogleSheet(dummyOrder);
  console.log('Result:', res);
}

testSync();

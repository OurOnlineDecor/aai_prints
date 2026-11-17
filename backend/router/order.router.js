const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getCheckoutPreview,
  createOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/order.controller');
const { protect, protectOptional, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { orderCreationLimiter } = require('../middlewares/rateLimit.middleware');

// ── Webhook Route (Raw/Public) ──
router.post('/razorpay-webhook', handleRazorpayWebhook);

// ── Public / Guest-Friendly Checkout & Payment Verification ──
router.post('/checkout-preview', protectOptional, getCheckoutPreview);
router.post(
  '/',
  orderCreationLimiter,
  protectOptional,
  [body('shippingAddress').isObject().withMessage('Shipping address is required')],
  validate,
  createOrder
);
router.post('/verify-payment', orderCreationLimiter, protectOptional, verifyPayment);

// ── Authenticated Customer Routes ──
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

// ── Admin Routes ──
router.get('/', protect, authorize('admin'), getAllOrders);
router.put(
  '/:id/status',
  protect,
  authorize('admin'),
  [
    body('status')
      .optional()
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid status')
  ],
  validate,
  updateOrderStatus
);

module.exports = router;

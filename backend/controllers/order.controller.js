const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const Coupon = require('../models/coupon.model');
const ApiError = require('../utils/apiError.util');
const ApiResponse = require('../utils/apiResponse.util');
const {
  isRazorpayConfigured,
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature
} = require('../utils/razorpay.util');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/brevo.util');

// Atomic stock decrement with auto-rollback on insufficient inventory
const decrementStockAtomically = async (orderItems) => {
  const decrementedItems = [];
  try {
    for (const item of orderItems) {
      let updateResult;
      if (item.variantId) {
        updateResult = await Product.updateOne(
          {
            _id: item.product,
            'variants._id': item.variantId,
            'variants.stock': { $gte: item.quantity }
          },
          { $inc: { 'variants.$.stock': -item.quantity } }
        );
      } else {
        updateResult = await Product.updateOne(
          {
            _id: item.product,
            stock: { $gte: item.quantity }
          },
          { $inc: { stock: -item.quantity } }
        );
        if (updateResult.modifiedCount === 0) {
          const B2BProduct = require('../models/b2bProduct.model');
          updateResult = await B2BProduct.updateOne(
            {
              _id: item.product,
              stock: { $gte: item.quantity }
            },
            { $inc: { stock: -item.quantity } }
          );
        }
      }

      if (updateResult.modifiedCount === 0) {
        throw new Error(
          `Insufficient stock for "${item.name}${item.variantName ? ` - ${item.variantName}` : ''}". It may have just sold out.`
        );
      }
      decrementedItems.push(item);
    }
    return true;
  } catch (err) {
    // Rollback any items that were decremented before the failure
    for (const item of decrementedItems) {
      if (item.variantId) {
        await Product.updateOne(
          { _id: item.product, 'variants._id': item.variantId },
          { $inc: { 'variants.$.stock': item.quantity } }
        ).catch(() => null);
      } else {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        ).catch(() => null);
        const B2BProduct = require('../models/b2bProduct.model');
        await B2BProduct.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        ).catch(() => null);
      }
    }
    throw err;
  }
};

// Helper to restock items for cancelled or refunded orders
const restockOrderItems = async (orderItems) => {
  for (const item of orderItems) {
    if (item.variantId) {
      await Product.updateOne(
        { _id: item.product, 'variants._id': item.variantId },
        { $inc: { 'variants.$.stock': item.quantity } }
      ).catch(() => null);
    } else {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      ).catch(() => null);
      const B2BProduct = require('../models/b2bProduct.model');
      await B2BProduct.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      ).catch(() => null);
    }
  }
};

// @desc    Checkout preview (validates cart, checks stock, applies coupon, calculates totals)
// @route   POST /api/v1/orders/checkout-preview
// @access  Private
const getCheckoutPreview = async (req, res, next) => {
  try {
    const { couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: 'items.product',
      select: 'name slug basePrice originalPrice images stock variants isActive isDeleted'
    });

    if (!cart || cart.items.length === 0) {
      return next(new ApiError(400, 'Your cart is empty'));
    }

    // Auto-prune dead/deleted products from cart
    const initialItemCount = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product && !item.product.isDeleted && item.product.isActive
    );
    if (cart.items.length !== initialItemCount) {
      await cart.save();
    }

    if (cart.items.length === 0) {
      return next(new ApiError(400, 'Your cart is empty or the items in it are no longer available'));
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of cart.items) {
      const product = item.product;
      let unitPrice = product.basePrice != null ? product.basePrice : (product.price || 0);
      let variantName = null;
      let availableStock = product.stock;

      if (item.variantId && product.variants && product.variants.length > 0) {
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          return next(new ApiError(400, `Option for ${product.name} is no longer available`));
        }
        unitPrice = variant.price;
        variantName = variant.name;
        availableStock = variant.stock;
      }

      if (availableStock < item.quantity) {
        return next(
          new ApiError(
            400,
            `Insufficient stock for "${product.name}${variantName ? ` - ${variantName}` : ''}". Only ${availableStock} left.`
          )
        );
      }

      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        productId: product._id,
        variantId: item.variantId,
        name: product.name,
        variantName,
        price: unitPrice,
        quantity: item.quantity,
        image: (product.images && product.images[0]) || null,
        itemTotal
      });
    }

    // Coupon calculation
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
      if (coupon) {
        const check = coupon.isValid(subtotal);
        if (check.valid) {
          discount = coupon.calculateDiscount(subtotal);
          appliedCoupon = coupon.code;
        }
      }
    }

    const FREE_SHIPPING_THRESHOLD = 499;
    const STANDARD_SHIPPING_FEE = 49;
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const total = Math.max(0, subtotal - discount + shippingFee);

    return ApiResponse.send(res, 200, {
      items: validatedItems,
      pricing: {
        subtotal,
        discount,
        couponCode: appliedCoupon,
        shippingFee,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        isFreeShippingEligible: subtotal >= FREE_SHIPPING_THRESHOLD,
        total
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Public (Guest or Authenticated)
const createOrder = async (req, res, next) => {
  let appliedCoupon = null;
  try {
    const { shippingAddress, couponCode, paymentMethod = 'razorpay', items: guestItems, shippingMethod = 'standard' } = req.body;

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
      return next(new ApiError(400, 'Please provide a complete shipping address'));
    }

    let cartItems = [];

    // Prioritize the actual checkout items passed from the client if provided
    if (Array.isArray(guestItems) && guestItems.length > 0) {
      for (const git of guestItems) {
        const prod = await Product.findOne({ _id: git.id || git.product || git._id, isActive: true, isDeleted: false });
        if (prod) {
          cartItems.push({
            product: prod,
            variantId: git.variantId || null,
            quantity: git.quantity || 1
          });
        }
      }
    } else if (req.user) {
      const cart = await Cart.findOne({ user: req.user._id }).populate({
        path: 'items.product',
        select: 'name slug basePrice originalPrice images stock variants isActive isDeleted'
      });

      if (cart && cart.items.length > 0) {
        // Auto-prune dead/deleted products
        const initialCount = cart.items.length;
        cart.items = cart.items.filter(
          (item) => item.product && !item.product.isDeleted && item.product.isActive
        );
        if (cart.items.length !== initialCount) {
          await cart.save();
        }
        cartItems = cart.items;
      }
    }

    if (cartItems.length === 0) {
      return next(new ApiError(400, 'Cannot place order with an empty cart'));
    }

    let subtotal = 0;
    const orderItems = [];

    // 1. Verify stock and calculate subtotal
    for (const item of cartItems) {
      const product = item.product;
      let unitPrice = product.basePrice != null ? product.basePrice : (product.price || 0);
      let variantName = null;
      let availableStock = product.stock;

      if (item.variantId && product.variants && product.variants.length > 0) {
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          return next(new ApiError(400, `Selected option for ${product.name} not found`));
        }
        unitPrice = variant.price;
        variantName = variant.name;
        availableStock = variant.stock;
      }

      if (availableStock < item.quantity) {
        return next(
          new ApiError(
            400,
            `Insufficient stock for "${product.name}${variantName ? ` - ${variantName}` : ''}".`
          )
        );
      }

      subtotal += unitPrice * item.quantity;
      orderItems.push({
        product: product._id,
        variantId: item.variantId || null,
        name: product.name,
        variantName,
        price: unitPrice,
        quantity: item.quantity,
        image: (product.images && product.images[0]) || null
      });
    }

    // 2. Atomic Coupon calculation and increment
    let discount = 0;
    if (couponCode) {
      const couponDoc = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        isActive: true
      });
      if (!couponDoc) {
        return next(new ApiError(400, 'Invalid coupon code'));
      }
      const check = couponDoc.isValid(subtotal);
      if (!check.valid) {
        return next(new ApiError(400, check.message));
      }

      const updatedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: couponDoc._id,
          $or: [
            { usageLimit: null },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
          ]
        },
        { $inc: { usedCount: 1 } },
        { new: true }
      );

      if (!updatedCoupon) {
        return next(new ApiError(400, 'Coupon usage limit has been reached'));
      }
      discount = couponDoc.calculateDiscount(subtotal);
      appliedCoupon = couponDoc.code;
    }

    const FREE_SHIPPING_THRESHOLD = 499;
    const STANDARD_SHIPPING_FEE = 49;

    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;

    const total = Math.max(0, subtotal - discount + shippingFee);

    // 3. Stock Allocation for COD
    let isStockDecremented = false;
    if (paymentMethod === 'cod') {
      try {
        await decrementStockAtomically(orderItems);
        isStockDecremented = true;
      } catch (err) {
        if (appliedCoupon) {
          await Coupon.updateOne({ code: appliedCoupon }, { $inc: { usedCount: -1 } }).catch(() => null);
        }
        return next(new ApiError(409, err.message));
      }
    }

    // 4. Create internal Order in MongoDB
    const orderNumber = `AAI-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await Order.create({
      orderNumber,
      user: req.user ? req.user._id : null,
      items: orderItems,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        email: shippingAddress.email || (req.user && req.user.email) || null,
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        apartment: shippingAddress.apartment || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode
      },
      pricing: {
        subtotal,
        discount,
        couponCode: appliedCoupon,
        shippingFee,
        total
      },
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
      paymentStatus: 'pending',
      paymentMethod,
      isStockDecremented
    });

    // 5. Clear cart if COD
    if (paymentMethod === 'cod' && req.user) {
      await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } }).catch(() => null);
    }

    // 6. Handle Razorpay Initialization
    let razorpayData = null;
    if (paymentMethod === 'razorpay') {
      if (isRazorpayConfigured()) {
        try {
          const rzpOrder = await createRazorpayOrder({
            amount: total,
            receipt: orderNumber,
            notes: {
              orderNumber,
              customerEmail: shippingAddress.email || (req.user && req.user.email) || 'guest'
            }
          });

          if (rzpOrder) {
            order.paymentDetails = {
              razorpayOrderId: rzpOrder.id
            };
            await order.save();

            razorpayData = {
              orderId: rzpOrder.id,
              amount: rzpOrder.amount,
              currency: rzpOrder.currency,
              keyId: process.env.RAZORPAY_KEY_ID
            };
          }
        } catch (rzpErr) {
          console.error('[Razorpay Order Creation Error]:', rzpErr.message);
          if (appliedCoupon) {
            await Coupon.updateOne({ code: appliedCoupon }, { $inc: { usedCount: -1 } }).catch(() => null);
          }
          return next(new ApiError(502, `Failed to initiate payment gateway: ${rzpErr.message}`));
        }
      } else {
        // Fallback / Simulated test mode when API keys are pending
        razorpayData = {
          isSimulated: true,
          orderId: `sim_order_${Date.now()}`,
          amount: Math.round(total * 100),
          currency: 'INR',
          keyId: 'rzp_test_simulated'
        };
        order.paymentDetails = {
          razorpayOrderId: razorpayData.orderId
        };
        await order.save();
      }
    }

    // 7. Send Brevo email if COD
    if (paymentMethod === 'cod') {
      sendOrderConfirmationEmail(order).catch((mailErr) => {
        console.warn('[Order Controller] Brevo order email error:', mailErr.message);
      });
    }

    return ApiResponse.send(
      res,
      201,
      { order, razorpay: razorpayData },
      paymentMethod === 'razorpay' ? 'Payment initiated' : 'Order placed successfully'
    );
  } catch (error) {
    if (appliedCoupon) {
      await Coupon.updateOne({ code: appliedCoupon }, { $inc: { usedCount: -1 } }).catch(() => null);
    }
    next(error);
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/v1/orders/my-orders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments({ user: req.user._id })
    ]);

    return ApiResponse.send(res, 200, { orders }, 'Orders retrieved', {
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details by ID
// @route   GET /api/v1/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) {
      return next(new ApiError(404, 'Order not found'));
    }

    // Guard: only owner or admin can view
    if (!order.user) {
      if (req.user.role !== 'admin') {
        return next(
          new ApiError(403, 'Access denied. Administrator privileges required to inspect guest orders.')
        );
      }
    } else if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(new ApiError(403, 'Access denied to this order'));
    }

    return ApiResponse.send(res, 200, { order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/v1/orders
// @access  Private/Admin
const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query)
    ]);

    return ApiResponse.send(res, 200, { orders }, 'All orders fetched', {
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Admin only)
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus, cancelReason, message, adminMessage } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ApiError(404, 'Order not found'));
    }

    const previousStatus = order.status;

    if (status) {
      // If cancelling an order, restock items only if stock was decremented
      if (status === 'cancelled' && order.status !== 'cancelled') {
        if (order.isStockDecremented) {
          await restockOrderItems(order.items);
          order.isStockDecremented = false;
        }
        if (order.pricing?.couponCode) {
          await Coupon.updateOne(
            { code: order.pricing.couponCode },
            { $inc: { usedCount: -1 } }
          ).catch(() => null);
        }
        order.cancelledAt = new Date();
        order.cancelReason = cancelReason || 'Cancelled by admin';
      }

      // If confirming an order where stock was deferred (e.g. online checkout)
      if (
        (status === 'confirmed' || status === 'processing') &&
        !order.isStockDecremented &&
        order.status !== 'cancelled'
      ) {
        await decrementStockAtomically(order.items);
        order.isStockDecremented = true;
        await Cart.updateOne({ user: order.user }, { $set: { items: [] } }).catch(() => null);
      }

      order.status = status;
    }

    if (paymentStatus) {
      // When payment is marked paid, ensure stock is decremented and cart cleared
      if (paymentStatus === 'paid' && !order.isStockDecremented && order.status !== 'cancelled') {
        await decrementStockAtomically(order.items);
        order.isStockDecremented = true;
        await Cart.updateOne({ user: order.user }, { $set: { items: [] } }).catch(() => null);
      }
      order.paymentStatus = paymentStatus;
    }

    const attachedMsg = (message !== undefined ? message : adminMessage !== undefined ? adminMessage : null);
    if (attachedMsg !== null) {
      order.adminMessage = attachedMsg.trim();
    }

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    if (status || attachedMsg) {
      order.statusHistory.push({
        status: order.status,
        message: attachedMsg ? attachedMsg.trim() : null,
        updatedAt: new Date()
      });
    }

    await order.save();

    // Send email notification to customer if status changed or message was added
    if (status !== previousStatus || attachedMsg) {
      sendOrderStatusUpdateEmail(order, attachedMsg ? attachedMsg.trim() : '').catch(() => null);
    }

    return ApiResponse.send(res, 200, { order }, 'Order status updated');
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay Payment Signature and finalize order
// @route   POST /api/v1/orders/verify-payment
// @access  Public (Guest or Authenticated)
const verifyPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      orderNumber,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const query = {};
    if (orderId) query._id = orderId;
    else if (orderNumber) query.orderNumber = orderNumber;
    else if (razorpay_order_id) query['paymentDetails.razorpayOrderId'] = razorpay_order_id;
    else {
      return next(new ApiError(400, 'Order identifier or Razorpay Order ID is required'));
    }

    const order = await Order.findOne(query);
    if (!order) {
      return next(new ApiError(404, 'Order not found for payment verification'));
    }

    if (order.paymentStatus === 'paid') {
      return ApiResponse.send(res, 200, { order }, 'Payment already verified for this order');
    }

    const isConfigured = isRazorpayConfigured();
    const isProduction = process.env.NODE_ENV === 'production';
    const allowMock = !isProduction && process.env.ENABLE_MOCK_PAYMENTS === 'true' && !isConfigured;

    if (isConfigured || isProduction) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return next(
          new ApiError(
            400,
            'Missing payment verification credentials (razorpay_payment_id, razorpay_order_id, razorpay_signature)'
          )
        );
      }

      const isValid = verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isValid) {
        order.paymentStatus = 'failed';
        await order.save();
        return next(
          new ApiError(400, 'Payment signature verification failed. Invalid or tampered signature.')
        );
      }
    } else if (allowMock) {
      console.warn(
        `[Razorpay Security]: Mock payment accepted for order ${order.orderNumber} (local non-production test only)`
      );
    } else {
      return next(
        new ApiError(500, 'Payment gateway is not currently configured on this server. Contact support.')
      );
    }

    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.paymentDetails = {
      razorpayOrderId: razorpay_order_id || order.paymentDetails?.razorpayOrderId || 'sim_order',
      razorpayPaymentId: razorpay_payment_id || `pay_${Date.now()}`,
      razorpaySignature: razorpay_signature || 'sim_sig',
      paidAt: new Date(),
    };

    if (!order.isStockDecremented) {
      try {
        await decrementStockAtomically(order.items);
        order.isStockDecremented = true;
      } catch (stockErr) {
        console.error('[Stock Error on Payment Capture]:', stockErr.message);
      }
    }

    if (order.user) {
      await Cart.updateOne({ user: order.user }, { $set: { items: [] } }).catch(() => null);
    }

    await order.save();

    sendOrderConfirmationEmail(order).catch((mailErr) => {
      console.warn('[Order Verify] Brevo email error:', mailErr.message);
    });

    return ApiResponse.send(res, 200, { order }, 'Payment verified and order confirmed successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Handle Razorpay Webhook Events
// @route   POST /api/v1/orders/razorpay-webhook
// @access  Public
const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

    // Enforce webhook signature validation unconditionally
    if (!secret || !signature) {
      console.warn('[Razorpay Webhook Rejected]: Missing webhook secret or x-razorpay-signature header');
      return res.status(401).json({ status: 'unauthorized', message: 'Missing webhook signature or server secret' });
    }

    const rawPayload = req.rawBody || JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(rawPayload, signature);
    if (!isValid) {
      console.warn('[Razorpay Webhook Rejected]: Invalid cryptographic signature');
      return res.status(400).json({ status: 'invalid_signature', message: 'Signature verification failed' });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    if (event === 'order.paid' || event === 'payment.captured') {
      if (orderId) {
        const order = await Order.findOne({ 'paymentDetails.razorpayOrderId': orderId });
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.status = 'confirmed';
          order.paymentDetails.razorpayPaymentId = paymentEntity.id;
          order.paymentDetails.paidAt = new Date();

          if (!order.isStockDecremented) {
            await decrementStockAtomically(order.items).catch(() => null);
            order.isStockDecremented = true;
          }

          if (order.user) {
            await Cart.updateOne({ user: order.user }, { $set: { items: [] } }).catch(() => null);
          }

          await order.save();
          sendOrderConfirmationEmail(order).catch(() => null);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Razorpay Webhook Error]:', err.message);
    return res.status(500).json({ status: 'error' });
  }
};

module.exports = {
  getCheckoutPreview,
  createOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};

import { api } from './api';

/**
 * Fetch authenticated customer's order history
 */
export async function fetchMyOrders() {
  try {
    const res = await api.get('/orders/my-orders');
    return res?.data?.orders || [];
  } catch (err) {
    console.warn('[OrderService] Could not fetch my orders:', err.message);
    return [];
  }
}

/**
 * Fetch all orders for store administrator
 */
export async function fetchAllOrdersAdmin({ status, page = 1, limit = 50 } = {}) {
  try {
    const query = new URLSearchParams();
    if (status && status !== 'All') query.append('status', status.toLowerCase());
    query.append('page', String(page));
    query.append('limit', String(limit));

    const res = await api.get(`/orders?${query.toString()}`);
    return {
      orders: res?.data?.orders || [],
      pagination: res?.pagination || { totalCount: (res?.data?.orders || []).length, currentPage: 1, totalPages: 1 },
    };
  } catch (err) {
    console.warn('[OrderService] Admin fetch orders failed:', err.message);
    return { orders: [], pagination: { totalCount: 0, currentPage: 1, totalPages: 1 } };
  }
}

/**
 * Admin: Update order status, payment status, and attach admin message
 */
export async function updateOrderStatusAdmin(orderId, { status, paymentStatus, message, cancelReason }) {
  const payload = {};
  if (status) payload.status = status;
  if (paymentStatus) payload.paymentStatus = paymentStatus;
  if (message !== undefined) payload.message = message;
  if (cancelReason) payload.cancelReason = cancelReason;

  const res = await api.put(`/orders/${orderId}/status`, payload);
  return res?.data?.order;
}

/**
 * Fetch single order by ID
 */
export async function fetchOrderById(orderId) {
  const res = await api.get(`/orders/${orderId}`);
  return res?.data?.order;
}

/**
 * Public: Track order using Order Number + Phone or Email
 */
export async function trackOrderGuest({ orderNumber, contact }) {
  const res = await api.post('/orders/track', { orderNumber, contact });
  return res?.data?.order;
}

/**
 * ─────────────────────────────────────────────────────────────
 * OurOnlineDecor — Orders Excel (.xlsx) Exporter Utility
 * Generates formatted, auto-column-width spreadsheets for instant download
 * ─────────────────────────────────────────────────────────────
 */

import * as XLSX from 'xlsx';

/**
 * Export orders array to a styled .xlsx Excel spreadsheet
 * @param {Array<Object>} orders - Array of order objects from database or state
 * @param {string} [filenamePrefix='OurOnlineDecor_Orders'] - File prefix
 */
export function exportOrdersToExcel(orders = [], filenamePrefix = 'OurOnlineDecor_Orders') {
  if (!Array.isArray(orders) || orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const rows = orders.map((ord, idx) => {
    const orderNum = ord.orderNumber || ord._id || `ORD-${idx + 1}`;
    const dateStr = ord.createdAt || ord.orderDate
      ? new Date(ord.createdAt || ord.orderDate).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '—';

    const addr = ord.shippingAddress || {};
    const fullAddress = [
      addr.street,
      addr.apartment || addr.landmark,
      addr.city,
      addr.state,
      addr.postalCode ? `PIN: ${addr.postalCode}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const items = Array.isArray(ord.items) ? ord.items : [];
    const itemsText = items
      .map((it) => {
        const qty = it.quantity || 1;
        const name = it.name || it.product?.name || 'Home Decor Piece';
        const variant = it.variantName ? ` (${it.variantName})` : '';
        const price = Number(it.price || it.product?.basePrice || 0);
        return `${qty}x ${name}${variant} - ₹${(price * qty).toLocaleString('en-IN')}`;
      })
      .join('; ');

    const totalQty = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
    const pricing = ord.pricing || {
      subtotal: ord.subtotal || 0,
      discount: ord.discount || 0,
      couponCode: null,
      shippingFee: ord.shippingFee || 0,
      total: ord.total || ord.totalAmount || 0,
    };

    const isCOD = (ord.paymentMethod || '').toLowerCase() === 'cod';

    return {
      'Order ID': String(orderNum),
      'Order Date (IST)': dateStr,
      'Customer Name': addr.fullName || ord.user?.name || 'Guest Customer',
      'Phone Number': String(addr.phone || ord.user?.phone || '—'),
      'Email Address': addr.email || ord.user?.email || '—',
      'Full Shipping Address': fullAddress || 'Address on file',
      'City': addr.city || '—',
      'State': addr.state || '—',
      'PIN Code': addr.postalCode || '—',
      'Items Purchased': itemsText || 'No items listed',
      'Total Items': totalQty,
      'Payment Mode': isCOD ? 'COD (Pay on Delivery)' : 'Online / Razorpay',
      'Payment Status': (ord.paymentStatus || (isCOD ? 'Pending' : 'Paid')).toUpperCase(),
      'Subtotal (₹)': Number(pricing.subtotal || 0),
      'Discount (₹)': Number(pricing.discount || 0),
      'Coupon Code': pricing.couponCode || '—',
      'Shipping Fee (₹)': pricing.shippingFee === 0 || pricing.shippingFee === '0' ? 0 : Number(pricing.shippingFee || 0),
      'Total Amount (₹)': Number(pricing.total || 0),
      'Fulfillment Status': (ord.status || 'confirmed').toUpperCase(),
      'Admin Update Note': ord.adminMessage || '—',
    };
  });

  // Create Worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set intelligent column widths based on content
  const colKeys = Object.keys(rows[0] || {});
  const colWidths = colKeys.map((key) => {
    let maxLen = key.length;
    for (const r of rows) {
      const valStr = String(r[key] != null ? r[key] : '');
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
  worksheet['!cols'] = colWidths;

  // Create Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  // Format today's date for filename
  const now = new Date();
  const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `${filenamePrefix}_${dateStamp}.xlsx`;

  // Trigger download in browser
  XLSX.writeFile(workbook, fileName);
}

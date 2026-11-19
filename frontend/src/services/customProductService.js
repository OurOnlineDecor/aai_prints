/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — Customization Products Service
 * Handles data fetching and WhatsApp order link construction
 * ─────────────────────────────────────────────────────────────
 */

import { api, API_BASE } from './api';

export { API_BASE };

// Fallback catalog products (empty by default; populated via Admin Catalog)
export const FALLBACK_CUSTOM_PRODUCTS = [];

/**
 * Fetch all active customizable products
 */
export async function fetchCustomProducts() {
  try {
    const data = await api.get('/custom-products');
    const prods = data?.data?.customProducts || data?.customProducts;
    if (Array.isArray(prods)) {
      return prods;
    }
    return [];
  } catch (err) {
    console.warn('[CustomProductService] Fetching from API failed:', err.message);
    return [];
  }
}

/**
 * Fetch single customizable product by slug or ID
 */
export async function fetchCustomProductBySlug(slugOrId) {
  try {
    const data = await api.get(`/custom-products/${slugOrId}`);
    return data?.data?.customProduct || data?.customProduct || null;
  } catch {
    return null;
  }
}

/**
 * Admin: Create new custom product
 */
export async function createCustomProduct(payload) {
  const data = await api.post('/custom-products', payload);
  return data?.data?.customProduct || data?.customProduct;
}

/**
 * Admin: Update custom product
 */
export async function updateCustomProduct(id, payload) {
  const data = await api.put(`/custom-products/${id}`, payload);
  return data?.data?.customProduct || data?.customProduct;
}

/**
 * Admin: Soft delete custom product
 */
export async function deleteCustomProduct(id) {
  const data = await api.delete(`/custom-products/${id}`);
  return data;
}

/**
 * Build pre-filled WhatsApp URL for instant custom ordering
 */
export function buildWhatsAppOrderUrl(product, customerNotes = '') {
  const phone = product?.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '917014945523';
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://aaiprints.com';
  const productUrl = `${siteOrigin}/#/custom/${product?.slug || ''}`;

  let message = `Namaste Aai Prints Team, 🙏\n`;
  message += `I would like to place an order for the following customized product:\n\n`;
  message += `*Product:* ${product?.name || 'Custom Product'}\n`;
  if (product?.price) {
    message += `*Price:* ₹${product.price.toLocaleString('en-IN')}\n`;
  }
  message += `*Product Link:* ${productUrl}\n\n`;

  if (product?.requirements) {
    message += `*Product Requirements:*\n${product.requirements}\n\n`;
  }

  if (customerNotes && customerNotes.trim()) {
    message += `*My Custom Details / Query:*\n${customerNotes.trim()}\n\n`;
  } else {
    message += `_I have attached my photos / custom details below for review._\n\n`;
  }

  message += `Please confirm the quotation and delivery timeline. Thank you!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

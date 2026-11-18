/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — Customization Products Service
 * Handles data fetching and WhatsApp order link construction
 * ─────────────────────────────────────────────────────────────
 */

import { api, API_BASE } from './api';

export { API_BASE };

// Fallback dummy products matching the 3 requested categories
export const FALLBACK_CUSTOM_PRODUCTS = [
  {
    _id: 'cust_01',
    name: 'Custom Backlit Acrylic LED Wall Frame',
    slug: 'custom-backlit-acrylic-led-wall-frame',
    images: [
      '/new-images/cat-backlit-led-frames.jpg',
      '/new-images/cat-framed-wall-art.jpg',
    ],
    category: 'Custom Frames',
    price: 1499,
    originalPrice: 2499,
    description:
      'High-grade imported cast acrylic backlit frame with brilliant LED luminescence. Handcrafted to order with custom photos, devotional motifs, or family blessings.',
    requirements:
      `• Required Photo: 1 or 2 high-resolution photos (portrait/landscape, min 1080p).
• Optional Custom Text: Family name, anniversary date, or sacred mantra (e.g. 'The Sharma Family' or 'ॐ नमः शिवाय').
• Custom Instructions: Choose LED backlighting tone (Warm Amber Gold, Crisp Natural White, or Ice Blue). Specify whether you need a wall-mounting hanging hook or an acrylic tabletop easel stand.`,
    whatsappNumber: '919876543210',
    isActive: true,
  },
  {
    _id: 'cust_02',
    name: 'Personalized Laser-Cut Silhouette Wooden Wall Clock',
    slug: 'personalized-silhouette-wooden-wall-clock',
    images: [
      '/new-images/cat-wall-clocks.jpg',
      '/new-images/cat-metal-wall-art.jpg',
    ],
    category: 'Custom Clocks',
    price: 1299,
    originalPrice: 1999,
    description:
      'Bespoke designer wall clock laser-crafted from premium engineered teak veneer. Features silent sweep movement and custom silhouette artwork tailored to your space.',
    requirements:
      `• Required Silhouette: Choose your silhouette theme (Family portrait outline, Devotional deity, or Couple silhouette).
• Optional Custom Text: Custom surname, couple names, or special date engraved cleanly at 6 o'clock.
• Custom Instructions: Specify preferred wood finish (Rich Teak Walnut or Natural Pine Oak). Clock hands style (Sleek Modern Gold or Classic Black Needle).`,
    whatsappNumber: '919876543210',
    isActive: true,
  },
  {
    _id: 'cust_03',
    name: 'Custom 3D Acrylic Car Dashboard Figurine',
    slug: 'custom-3d-acrylic-car-dashboard-figurine',
    images: [
      '/new-images/cat-dashboard-idols.jpg',
      '/new-images/cat-car-hangings.jpg',
    ],
    category: 'Custom Car Decor',
    price: 499,
    originalPrice: 899,
    description:
      'Pocket-sized laser-etched devotional idol or custom portrait figurine designed specifically for car dashboards. Fitted with heavy-duty non-slip 3M mounting pads.',
    requirements:
      `• Required Motif: Specify chosen deity, portrait silhouette, or custom emblem (e.g. Mahadev, Khatu Shyam Ji, Ram Lalla, or personalized silhouette).
• Optional Custom Text: Vehicle registration number or custom travel blessing engraved on the pedestal base.
• Custom Instructions: Mention pedestal base type (Standard Clear Acrylic or Warm Sand Wood Base). Heavy-duty reusable non-slip 3M adhesive included.`,
    whatsappNumber: '919876543210',
    isActive: true,
  },
];

/**
 * Fetch all active customizable products
 */
export async function fetchCustomProducts() {
  try {
    const data = await api.get('/custom-products');
    const prods = data?.data?.customProducts || data?.customProducts;
    if (prods && prods.length > 0) {
      return prods;
    }
    return FALLBACK_CUSTOM_PRODUCTS;
  } catch (err) {
    console.warn('[CustomProductService] Fetching from API failed, using fallback:', err.message);
    return FALLBACK_CUSTOM_PRODUCTS;
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
    return (
      FALLBACK_CUSTOM_PRODUCTS.find(
        (p) => p.slug === slugOrId || p._id === slugOrId
      ) || null
    );
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
  const phone = product?.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210';
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

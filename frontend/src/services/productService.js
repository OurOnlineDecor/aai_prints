/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — Product Service Layer & Architecture Abstraction
 * ─────────────────────────────────────────────────────────────
 * Centralizes all product catalogue queries, filtering, searching,
 * and live backend API synchronization with graceful local fallback.
 * ─────────────────────────────────────────────────────────────
 */

import { api } from './api';
import {
  products as localProducts,
  categories as localCategories,
  devotionalProducts as localDevotional,
  wallAndCarProducts as localWallAndCar,
} from '../data/products.js';

/**
 * Normalizes a product record from backend or local data
 * ensuring strict 1:1 compliance with the frontend contract.
 */
export function normalizeProduct(p) {
  if (!p) return null;
  const categoryName =
    typeof p.category === 'object' && p.category !== null
      ? p.category.name
      : p.category || '';
  const categorySlug =
    typeof p.category === 'object' && p.category !== null
      ? p.category.slug
      : '';

  return {
    ...p,
    id: p.id || p._id,
    _id: p._id || p.id,
    slug: p.slug || '',
    name: p.name || '',
    category: categoryName,
    categorySlug,
    subcategory: p.subcategory || '',
    price: p.price != null ? String(p.price) : String(p.basePrice || 0),
    originalPrice: p.originalPrice != null ? String(p.originalPrice) : null,
    image: p.image || (p.images && p.images[0]) || '/new-images/product-placeholder.jpg',
    images:
      p.images && p.images.length > 0
        ? p.images
        : p.image
        ? [p.image]
        : ['/new-images/product-placeholder.jpg'],
    availability: p.availability || (p.inStock !== false ? 'in_stock' : 'out_of_stock'),
    stockCount: p.stockCount != null ? p.stockCount : (p.stock || 0),
    rating: p.rating != null ? Number(p.rating) : (p.ratingAverage != null ? Number(p.ratingAverage) : 5.0),
    reviews: p.reviews != null ? Number(p.reviews) : (p.reviewCount != null ? Number(p.reviewCount) : 0),
    tag: p.tag || (p.badges && p.badges[0]) || '',
    isTrending: Boolean(p.isTrending ?? p.trending ?? false),
    trending: Boolean(p.isTrending ?? p.trending ?? false),
    createdAt: p.createdAt || null,
    variants: (p.variants || []).map((v) => ({
      ...v,
      id: v.id || v._id,
      label: v.label || v.name,
      inStock: v.inStock !== undefined ? v.inStock : (v.stock > 0),
      price: v.price != null ? Number(v.price) : undefined,
      originalPrice: v.originalPrice != null ? Number(v.originalPrice) : undefined,
    })),
    description: p.description || '',
    specifications: p.specifications instanceof Map
      ? Object.fromEntries(p.specifications)
      : (p.specifications || {}),
  };
}

// In-memory cache starting with local products for instantaneous first paint
let liveProductsCache = localProducts.map(normalizeProduct);

/**
 * Merge an array of normalized products into liveProductsCache
 * without duplicates, ensuring instant cache hits on future views.
 */
export function mergeIntoCache(items) {
  if (!Array.isArray(items)) return;
  items.forEach((p) => {
    if (!p) return;
    const pId = String(p.id || p._id || '');
    const pSlug = (p.slug || '').toLowerCase().trim();
    const idx = liveProductsCache.findIndex((existing) => {
      const eId = String(existing.id || existing._id || '');
      const eSlug = (existing.slug || '').toLowerCase().trim();
      return (pId && eId === pId) || (pSlug && eSlug === pSlug);
    });
    if (idx > -1) {
      liveProductsCache[idx] = { ...liveProductsCache[idx], ...p };
    } else {
      liveProductsCache.push(p);
    }
  });
}

/**
 * Safely extracts a numeric price from a price string (e.g. '1,299' -> 1299).
 */
export function parseNumericPrice(price) {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  const cleaned = String(price).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Synchronous getter returning all cached/normalized products.
 */
export function getAllProducts() {
  return liveProductsCache;
}

/**
 * Fetch only trending products for the homepage (avoids downloading entire catalogue)
 */
export async function fetchTrendingProducts(limit = 8) {
  try {
    const res = await api.get(`/products?trending=true&limit=${limit}`);
    if (res?.data?.products && Array.isArray(res.data.products) && res.data.products.length > 0) {
      const normalized = res.data.products.map(normalizeProduct);
      mergeIntoCache(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('[ProductService] Failed to fetch trending products:', err.message);
  }
  // Instant fallback to local data
  return liveProductsCache.filter((p) => p.isTrending || p.trending).slice(0, limit);
}

/**
 * Fetch only new arrival products for homepage or new-arrivals section
 */
export async function fetchNewArrivals(limit = 8) {
  try {
    const res = await api.get(`/products?sort=newest&limit=${limit}`);
    if (res?.data?.products && Array.isArray(res.data.products) && res.data.products.length > 0) {
      const normalized = res.data.products.map(normalizeProduct);
      mergeIntoCache(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('[ProductService] Failed to fetch new arrivals:', err.message);
  }
  return [...liveProductsCache]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, limit);
}

/**
 * Fetch paginated & filtered products for the Shop Page on demand
 */
export async function fetchCatalogProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') query.append('category', params.category);
  if (params.search) query.append('search', params.search);
  if (params.sort) query.append('sort', params.sort);
  if (params.minPrice) query.append('minPrice', params.minPrice);
  if (params.maxPrice) query.append('maxPrice', params.maxPrice);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit || 24);

  try {
    const res = await api.get(`/products?${query.toString()}`);
    if (res?.data?.products && Array.isArray(res.data.products)) {
      const normalized = res.data.products.map(normalizeProduct);
      mergeIntoCache(normalized);
      return {
        products: normalized,
        total: res.data.total || res.data.products.length,
        pages: res.data.pages || 1,
        page: res.data.page || 1
      };
    }
  } catch (err) {
    console.warn('[ProductService] Catalog fetch failed, using local filter:', err.message);
  }

  // Graceful local fallback
  const local = getProductsByCategory(params.category);
  return {
    products: local,
    total: local.length,
    pages: 1,
    page: 1
  };
}

/**
 * Async bridge: fetches live products from backend and updates cache.
 * Falls back to local dataset if API is unreachable.
 */
export async function fetchAllProducts() {
  try {
    const res = await api.get('/products?limit=100');
    if (res?.data?.products && Array.isArray(res.data.products)) {
      const normalized = res.data.products.map(normalizeProduct);
      liveProductsCache = normalized;
      return normalized;
    }
    return liveProductsCache;
  } catch (err) {
    console.warn('[ProductService] Backend unreachable, using cached/fallback products:', err.message);
    return liveProductsCache;
  }
}

/**
 * Find product by numeric ID or string ID.
 */
export function getProductById(id) {
  if (id == null) return null;
  const targetId = String(id).trim();
  return liveProductsCache.find((p) => String(p.id) === targetId || String(p._id) === targetId) || null;
}

/**
 * Async bridge for finding product by ID.
 */
export async function fetchProductById(id) {
  return Promise.resolve(getProductById(id));
}

/**
 * Find product by its URL slug.
 */
export function getProductBySlug(slug) {
  if (!slug) return null;
  const targetSlug = String(slug).toLowerCase().trim();
  return liveProductsCache.find((p) => p.slug && p.slug.toLowerCase() === targetSlug) || null;
}

/**
 * Async bridge to fetch full product details by slug from live API.
 */
export async function fetchProductBySlug(slug) {
  if (!slug) return null;
  try {
    const res = await api.get(`/products/${encodeURIComponent(slug)}`);
    if (res?.data?.product) {
      const normalized = normalizeProduct(res.data.product);
      mergeIntoCache([normalized]);
      return normalized;
    }
  } catch (err) {
    console.warn(`[ProductService] Failed to fetch product ${slug} from API:`, err.message);
  }
  return getProductBySlugOrId(slug);
}

/**
 * Lookup product by either URL slug or numeric ID.
 */
export function getProductBySlugOrId(identifier) {
  if (identifier == null) return null;
  return getProductBySlug(identifier) || getProductById(identifier) || null;
}

/**
 * Returns products matching category.
 */
export function getProductsByCategory(category) {
  if (!category || category === 'All') return liveProductsCache;
  const target = category.toLowerCase().trim();
  return liveProductsCache.filter(
    (p) =>
      (p.category && p.category.toLowerCase() === target) ||
      (p.subcategory && p.subcategory.toLowerCase() === target)
  );
}

/**
 * Returns products matching subcategory.
 */
export function getProductsBySubcategory(subcategory) {
  if (!subcategory) return liveProductsCache;
  const target = subcategory.toLowerCase().trim();
  return liveProductsCache.filter(
    (p) => p.subcategory && p.subcategory.toLowerCase() === target
  );
}

/**
 * Local search across cached products.
 */
export function searchProducts(query) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  return liveProductsCache.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
      (p.tag && p.tag.toLowerCase().includes(q))
  );
}

/**
 * Live instant autocomplete search calling backend API with fallback.
 */
export async function fetchInstantSearch(query) {
  if (!query || !query.trim()) return [];
  try {
    const res = await api.get(`/products/search/instant?q=${encodeURIComponent(query.trim())}`);
    if (res?.data?.matches) {
      return res.data.matches.map(normalizeProduct);
    }
  } catch (err) {
    console.warn('[ProductService] Instant search API failed, falling back to local search:', err.message);
  }
  return searchProducts(query).slice(0, 6);
}

/**
 * Returns related products, prioritizing same category while excluding current item.
 */
export function getRelatedProducts(productOrId, limit = 4) {
  const current =
    typeof productOrId === 'object' && productOrId !== null
      ? productOrId
      : getProductById(productOrId);

  if (!current) return liveProductsCache.slice(0, limit);

  const sameCategory = liveProductsCache.filter(
    (p) => p.id !== current.id && p.category === current.category
  );
  const otherProducts = liveProductsCache.filter(
    (p) => p.id !== current.id && p.category !== current.category
  );
  return [...sameCategory, ...otherProducts].slice(0, limit);
}

/**
 * Returns all unique categories available in the store.
 */
export function getCategories() {
  const cats = new Set(localCategories);
  liveProductsCache.forEach((p) => {
    if (p.category) cats.add(p.category);
  });
  return Array.from(cats);
}

/**
 * Returns subcategories for a given category (or all if omitted).
 */
export function getSubcategories(category) {
  const pool = category && category !== 'All'
    ? getProductsByCategory(category)
    : liveProductsCache;

  const subSet = new Set();
  pool.forEach((p) => {
    if (p.subcategory) subSet.add(p.subcategory);
  });
  return Array.from(subSet);
}

/**
 * Computes minimum and maximum prices across the entire product catalogue.
 */
export function getPriceBounds() {
  let min = Infinity;
  let max = -Infinity;

  liveProductsCache.forEach((p) => {
    const val = parseNumericPrice(p.price);
    if (val < min) min = val;
    if (val > max) max = val;
  });

  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
  };
}

/**
 * Curated product subsets for homepage sections.
 */
export function getDevotionalProducts() {
  return liveProductsCache.filter(
    (p) =>
      p.category === 'Backlit LED Frames' ||
      p.category === 'Desk Standees' ||
      p.category === 'Wall Hangings'
  );
}

export function getWallAndCarProducts() {
  return liveProductsCache.filter(
    (p) =>
      p.category === 'Metal Wall Art' ||
      p.category === 'Dashboard Idols' ||
      p.category === 'Car Hangings' ||
      p.category === 'Wall Clocks'
  );
}

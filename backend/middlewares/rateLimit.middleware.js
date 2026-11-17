const rateLimit = require('express-rate-limit');

/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — API Rate Limiting Middleware
 * Defends against brute-force, DDoS, credential stuffing & spam
 * ─────────────────────────────────────────────────────────────
 */

// Global general API rate limiter: 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

// Strict rate limiter for Authentication (Login / Register): 15 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many login or registration attempts. For security, please try again after 15 minutes.'
  }
});

// Strict rate limiter for Coupon Validation: 30 attempts per 15 minutes per IP
const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many coupon validation attempts. Please try again later.'
  }
});

// Order creation rate limiter: 40 orders per 15 minutes per IP
const orderCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many order requests. Please wait a few moments before trying again.'
  }
});

// B2B & Contact Inquiries limiter: 15 submissions per 15 minutes per IP
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many inquiry submissions. Please wait a few moments before submitting again.'
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  couponLimiter,
  orderCreationLimiter,
  inquiryLimiter
};

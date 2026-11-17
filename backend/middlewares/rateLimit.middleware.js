const rateLimit = require('express-rate-limit');

/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — API Rate Limiting Middleware
 * Defends against brute-force, DDoS, credential stuffing & spam
 * ─────────────────────────────────────────────────────────────
 */

// Global general API rate limiter: 300 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

// Strict rate limiter for Authentication (Login / Register): 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many login or registration attempts. For security, please try again after 15 minutes.'
  }
});

// Strict rate limiter for Coupon Validation: 25 attempts per 15 minutes per IP
const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many coupon validation attempts. Please try again later.'
  }
});

// Order creation rate limiter: 30 orders per 15 minutes per IP
const orderCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many order requests. Please wait a few moments before trying again.'
  }
});

// B2B & Contact Inquiries limiter: 10 submissions per 15 minutes per IP
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
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

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const apiRouter = require('./router');
const errorHandler = require('./middlewares/error.middleware');
const { globalLimiter } = require('./middlewares/rateLimit.middleware');
const mongoSanitizer = require('./middlewares/mongoSanitize.middleware');
const ApiError = require('./utils/apiError.util');

const app = express();

// Trust reverse proxy (Render, Vercel, Railway, Cloudflare) for accurate client IP and protocol detection
app.set('trust proxy', 1);

// Secure HTTP response headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false, // Prevents breaking Google Sign-In popup & OAuth flows
  })
);

// Request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// CORS configuration (allow verified production domains, Vercel, Render, Netlify, and localhost)
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://aaiprints.com',
  'https://www.aaiprints.com',
  'https://ouronlinedecor.com',
  'https://www.ouronlinedecor.com',
];

const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultOrigins]));

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalized = origin.replace(/\/+$/, '').toLowerCase();
  if (allowedOrigins.some((o) => o.toLowerCase() === normalized)) return true;
  // Allow all Vercel deployments (*.vercel.app)
  if (normalized.endsWith('.vercel.app') || normalized.includes('.vercel.app')) return true;
  // Allow all Render deployments (*.onrender.com)
  if (normalized.endsWith('.onrender.com') || normalized.includes('.onrender.com')) return true;
  // Allow all Netlify deployments (*.netlify.app)
  if (normalized.endsWith('.netlify.app') || normalized.includes('.netlify.app')) return true;
  // Allow local development
  if (process.env.NODE_ENV !== 'production' && (normalized.includes('localhost') || normalized.includes('127.0.0.1'))) {
    return true;
  }
  return false;
};

const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new ApiError(403, `CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie',
    'Set-Cookie',
    'x-csrf-token'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parsers with raw body preservation for cryptographic webhook signature verification
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize incoming request bodies and query params against NoSQL operator injection ($ and .)
app.use(mongoSanitizer);

// Cookie parser for reading httpOnly auth token
app.use(cookieParser());

// Root ping endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy', message: 'Aai Prints Backend API is active', version: 'v1' });
});

// Apply baseline rate limiting to all /api/v1 routes
app.use('/api/v1', globalLimiter);

// Mount API v1 router
app.use('/api/v1', apiRouter);

// 404 handler for undefined routes
app.use((req, res, next) => {
  next(new ApiError(404, `Cannot find ${req.method} ${req.originalUrl} on this server`));
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;

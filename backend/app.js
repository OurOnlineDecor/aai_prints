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

// Secure HTTP response headers (Defense-in-depth against MIME-sniffing, Clickjacking, XSS)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// CORS configuration (strictly allow verified origins, allow credentials for httpOnly cookies)
const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''));

const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultOrigins]));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        (process.env.NODE_ENV !== 'production' && normalizedOrigin.includes('localhost'))
      ) {
        return callback(null, true);
      }
      return callback(new ApiError(403, `CORS policy: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

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

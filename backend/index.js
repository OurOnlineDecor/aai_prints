require('dotenv').config();

const app = require('./app');
const connectDB = require('./db/connect');

const PORT = process.env.PORT || 5000;

// Validate critical secrets fail-fast in production
if (process.env.NODE_ENV === 'production') {
  const REQUIRED_ENV = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
  const missing = REQUIRED_ENV.filter((key) => !process.env[key] || process.env[key].length < 16);
  if (missing.length > 0) {
    console.error(`[FATAL CONFIG ERROR]: Missing or insufficient environment variables in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`[Uncaught Exception]: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start HTTP Server
  const server = app.listen(PORT, () => {
    console.log(`[Server running]: http://localhost:${PORT}`);
    console.log(`[API v1 base]: http://localhost:${PORT}/api/v1`);
    console.log(`[Environment]: ${process.env.NODE_ENV || 'development'}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection]: ${err.message}`);
    server.close(() => {
      process.exit(1);
    });
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('[Server]: Received kill signal, shutting down gracefully...');
    server.close(() => {
      console.log('[Server]: Closed out remaining connections.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();

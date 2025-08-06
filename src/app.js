/**
* File: backend/src/app.js
* Improved Express app with security, observability, versioned API, and robust error/shutdown handling.
*/

// 1) Load environment early
const dotenv = require('dotenv');
dotenv.config();

// 2) Imports
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');            // Security headers
const compression = require('compression');  // Response compression

// Routes
const userRoutes = require('./routes/userRoutes');

// Centralized error handler (must be (err, req, res, next))
const errorHandler = require('./middleware/errorHandler');

// 3) Constants & configuration
const ENV = process.env.NODE_ENV || 'development';
const isProd = ENV === 'production';

// Resolve PORT safely (fallback 3001)
const PORT = Number.isInteger(Number(process.env.PORT)) ? Number(process.env.PORT) : 3001;

// Versioned API prefix
const API_PREFIX = process.env.API_PREFIX || '/api';
const API_V1 = `${API_PREFIX}/v1`;

// CORS configuration
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
 .split(',')
 .map(o => o.trim())
 .filter(Boolean);

const corsOptions = {
 origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true, // true reflects request origin
 methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
 credentials: true,
 optionsSuccessStatus: 204
};

// 4) App initialization
const app = express();

// 5) Global middlewares (order matters)
// Security headers
app.use(helmet());

// Compression for text responses
app.use(compression());

// CORS
app.use(cors(corsOptions));

// Body parsers with sane limits to mitigate large payload attacks
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENC_LIMIT || '1mb' }));

// Request ID correlation
app.use(function requestId(req, res, next) {
 const headerId = req.get('x-request-id');
 req.id = headerId || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
 res.setHeader('x-request-id', req.id);
 next();
});

// Request logging (log after response to include status/time)
app.use(function requestLogger(req, res, next) {
 const start = Date.now();
 const { method, originalUrl } = req;

 res.on('finish', () => {
   const ms = Date.now() - start;
   const line = isProd
     ? `[${req.id}] ${method} ${originalUrl} -> ${res.statusCode} ${ms}ms`
     : `[${new Date().toISOString()}] [${ENV}] [${req.id}] ${method} ${originalUrl} -> ${res.statusCode} ${ms}ms`;
   console.log(line);
 });

 next();
});

// 6) Health and base info routes (useful for ops/load balancers)
app.get('/health', (req, res) => {
 res.status(200).json({
   status: 'ok',
   env: ENV,
   uptime: process.uptime(),
   timestamp: Date.now()
 });
});

app.get('/', (req, res) => {
 res.status(200).json({ message: 'Service is running', version: 'v1', base: API_V1 });
});

// 7) API routes
// Was: '/api/users' -> now versioned: '/api/v1/users'
app.use(`${API_V1}/users`, userRoutes);

// 8) 404 (Not Found) catcher
app.all('*', (req, res, next) => {
 const err = new Error(`Path not found: ${req.method} ${req.originalUrl}`);
 err.statusCode = 404;
 next(err);
});

// 9) Centralized error handler (kept last)
// We wrap your custom handler to ensure a fallback shape if it throws
app.use(function wrappedErrorHandler(err, req, res, next) {
 const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
 const fallbackPayload = {
   requestId: req.id,
   message: err.message || 'Internal Server Error',
   ...(isProd ? {} : { stack: err.stack })
 };

 try {
   return errorHandler(err, req, res, next);
 } catch (handlerErr) {
   console.error('Error in custom errorHandler:', handlerErr);
   return res.status(status).json(fallbackPayload);
 }
});

// 10) Start server with robust error/shutdown handling
const server = app.listen(PORT, () => {
 console.log(`Server listening on port ${PORT}`);
 console.log(`Environment: ${ENV}`);
 if (ALLOWED_ORIGINS.length) {
   console.log(`CORS restricted to: ${ALLOWED_ORIGINS.join(', ')}`);
 } else {
   console.log('CORS origin reflective (allows any origin)');
 }
});

// Handle server-level errors explicitly
server.on('error', (err) => {
 if (err && err.code === 'EADDRINUSE') {
   console.error(`Port ${PORT} is already in use.`);
 } else if (err && err.code === 'EACCES') {
   console.error(`Insufficient privileges to bind to port ${PORT}.`);
 } else {
   console.error('Server error:', err);
 }
 process.exit(1);
});

// Graceful shutdown
function shutdown(signal) {
 console.log(`${signal} received: closing server...`);
 server.close((closeErr) => {
   if (closeErr) {
     console.error('Error during server close:', closeErr);
     process.exit(1);
   }
   console.log('Server closed gracefully.');
   process.exit(0);
 });

 // Force exit after timeout
 setTimeout(() => {
   console.warn('Forced shutdown after timeout.');
   process.exit(1);
 }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 11) Export for tests
module.exports = app;
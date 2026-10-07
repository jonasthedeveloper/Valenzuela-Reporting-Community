const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit');
const { sanitizeBody } = require('./utils/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// Allowed browser origins:
//  • every origin listed in CLIENT_URL (.env, comma-separated) — always allowed;
//  • in development also any localhost/127.0.0.1 port and private LAN addresses,
//    so the app still works when opened via 127.0.0.1 or from a phone on the
//    same Wi-Fi. Production only ever allows the configured CLIENT_URL list.
const allowedOrigins = env.clientUrl
  .split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);

const isPrivateHost = (hostname) =>
  hostname === 'localhost'
  || hostname === '127.0.0.1'
  || hostname === '::1'
  || /^192\.168\./.test(hostname)
  || /^10\./.test(hostname)
  || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

const corsOrigin = (origin, callback) => {
  // No Origin header (curl, server-to-server) — nothing to restrict.
  if (!origin) return callback(null, true);
  try {
    const url = new URL(origin);
    const base = `${url.protocol}//${url.host}`;
    if (allowedOrigins.includes(base)) return callback(null, true);
    if (!env.isProd && (url.protocol === 'http:' || url.protocol === 'https:') && isPrivateHost(url.hostname)) {
      return callback(null, true);
    }
  } catch { /* malformed Origin — fall through to deny */ }
  return callback(null, false);
};

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeBody);
if (!env.isProd) app.use(morgan('dev'));

// Uploaded evidence photos and videos.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

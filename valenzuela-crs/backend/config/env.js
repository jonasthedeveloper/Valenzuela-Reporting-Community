// .env is the source of truth for this app — let it win over stray shell
// variables (some environments export PORT=0, which would otherwise silently
// bind the API to a random port).
require('dotenv').config({ override: true });

const int = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 5050),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: int(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'valenzuela_crs',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtlDays: int(process.env.JWT_REFRESH_TTL_DAYS, 7),
    rememberTtlDays: int(process.env.JWT_REMEMBER_TTL_DAYS, 30),
  },
  upload: {
    maxImageMb: int(process.env.UPLOAD_MAX_IMAGE_MB, 8),
    maxVideoMb: int(process.env.UPLOAD_MAX_VIDEO_MB, 40),
    maxFiles: int(process.env.UPLOAD_MAX_FILES, 6),
  },
  gemini: {
    // Never exposed to the browser — the Help Desk calls Gemini server-side only.
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  },
  resetTokenTtlMinutes: int(process.env.RESET_TOKEN_TTL_MINUTES, 60),
  isProd: (process.env.NODE_ENV || 'development') === 'production',
};

module.exports = env;

// .env is the source of truth for this app — let it win over stray shell
// variables (some environments export PORT=0, which would otherwise silently
// bind the API to a random port).
require('dotenv').config({ override: true });

const int = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// Optional TLS for hosted MySQL (Aiven, TiDB Serverless, RDS, Railway, …).
//   DB_SSL unset / false / 0  → no TLS — identical to the previous behaviour
//   DB_SSL=true / 1 / yes     → TLS with server-certificate verification
//   DB_SSL=skip-verify        → TLS without verification (last-resort debugging)
//   DB_SSL_CA=/path/to/ca.pem → extra CA bundle for verification (Aiven/TiDB);
//                               relative paths resolve from the backend folder.
const sslMode = String(process.env.DB_SSL || '').trim().toLowerCase();
let dbSsl = null;
if (sslMode === 'true' || sslMode === '1' || sslMode === 'yes' || sslMode === 'require') {
  dbSsl = { rejectUnauthorized: true };
} else if (sslMode === 'skip-verify' || sslMode === 'insecure') {
  dbSsl = { rejectUnauthorized: false };
}

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
    ssl: dbSsl,
    sslCaFile: process.env.DB_SSL_CA || '',
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
  storage: {
    // 'local' (default) keeps uploaded files on disk — the existing dev behaviour.
    // 's3' stores them in any S3-compatible bucket (Cloudflare R2, AWS S3, …) and
    // streams them back through GET /uploads/…, so URLs stored in the database
    // and every frontend call stay exactly the same.
    driver: String(process.env.STORAGE_DRIVER || '').trim().toLowerCase() === 's3' ? 's3' : 'local',
    s3: {
      endpoint: String(process.env.S3_ENDPOINT || '').trim(),
      region: process.env.S3_REGION || 'auto',
      bucket: String(process.env.S3_BUCKET || '').trim(),
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      forcePathStyle: ['1', 'true', 'yes', 'on'].includes(String(process.env.S3_FORCE_PATH_STYLE || '').toLowerCase()),
    },
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

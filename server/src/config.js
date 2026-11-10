'use strict';
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const env = process.env.NODE_ENV || 'development';
const basePath = (process.env.BASE_PATH || '/projects/shelfflow').replace(/\/+$/, '');

const config = {
  env,
  isProduction: env === 'production',
  port: Number(process.env.PORT || 3000),
  basePath,
  databaseUrl: process.env.DATABASE_URL || 'postgres://shelfflow:shelfflow@localhost:5432/shelfflow',
  session: {
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    ttlHours: Number(process.env.SESSION_TTL_HOURS || 12),
    secure: bool(process.env.COOKIE_SECURE, env === 'production'),
  },
  loanPeriodDays: Number(process.env.LOAN_PERIOD_DAYS || 14),
  maxLoanDays: Number(process.env.MAX_LOAN_DAYS || 30),
  uploads: {
    dir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './storage/uploads'),
    maxBytes: Number(process.env.MAX_UPLOAD_BYTES || 2 * 1024 * 1024),
  },
  openLibrary: {
    baseUrl: process.env.OPEN_LIBRARY_BASE_URL || 'https://openlibrary.org',
    userAgent: process.env.OPEN_LIBRARY_USER_AGENT || 'ShelfFlow/1.0 (contact@example.com)',
    timeoutMs: Number(process.env.OPEN_LIBRARY_TIMEOUT_MS || 6000),
    maxResponseBytes: Number(process.env.OPEN_LIBRARY_MAX_BYTES || 1024 * 1024),
  },
  seedPassword: process.env.SEED_PASSWORD || 'ShelfFlow!Demo2026',
};

if (config.isProduction && config.session.secret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production');
}

module.exports = config;

'use strict';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'postgres://shelfflow:shelfflow_dev@shelfflow-db:5432/shelfflow_test';
process.env.SESSION_SECRET = 'test-secret-0123456789abcdef0123456789';
process.env.COOKIE_SECURE = 'false';
process.env.UPLOAD_DIR = './storage/test-uploads';
process.env.LOAN_PERIOD_DAYS = '14';
process.env.OPEN_LIBRARY_TIMEOUT_MS = '2000';

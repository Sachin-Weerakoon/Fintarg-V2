// backend/src/test/setup.ts
// Test setup file to ensure safe dummy environment variables and test configuration.

process.env.NODE_ENV = 'test';

// Safe dummy values for testing when not provided via environment
if (!process.env.PORT) process.env.PORT = '5001';
if (!process.env.MONGODB_URI) process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/fintarg-test';
if (!process.env.MONGODB_DB) process.env.MONGODB_DB = 'fintarg-test';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'a-very-secure-dummy-jwt-secret-for-tests-32-chars';
if (!process.env.FRONTEND_ORIGIN) process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
if (!process.env.APP_ORIGIN) process.env.APP_ORIGIN = 'http://localhost:5000';
if (!process.env.COOKIE_NAME) process.env.COOKIE_NAME = 'fintarg_token_test';
// 32-byte key encoded as valid 44-char base64
if (!process.env.FILE_ENCRYPTION_KEY) process.env.FILE_ENCRYPTION_KEY = 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=';
if (!process.env.CRON_SECRET) process.env.CRON_SECRET = 'a-very-secure-dummy-cron-secret-for-tests-32-chars';
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'silent';

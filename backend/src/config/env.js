import dotenv from 'dotenv';

// Load .env file
dotenv.config();

function validateEnv() {
  const errors = [];

  const port = parseInt(process.env.PORT || '5000', 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    errors.push(`PORT must be a valid port number between 1 and 65535 (received: '${process.env.PORT}')`);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of 'development', 'production', or 'test' (received: '${nodeEnv}')`);
  }

  const mongoUri = process.env.MONGODB_URI || (nodeEnv === 'test' ? 'mongodb://127.0.0.1:27017/food_quality_test_db' : 'mongodb://127.0.0.1:27017/food_quality_db');
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    errors.push(`MONGODB_URI must be a valid mongodb connection string`);
  }

  const mlBaseUrl = process.env.ML_BASE_URL || 'http://127.0.0.1:8000';
  try {
    const url = new URL(mlBaseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push(`ML_BASE_URL must use http or https protocol (received: '${mlBaseUrl}')`);
    }
  } catch (err) {
    errors.push(`ML_BASE_URL must be a valid URL string (received: '${mlBaseUrl}'): ${err.message}`);
  }

  const mlTimeout = parseInt(process.env.ML_REQUEST_TIMEOUT_MS || '10000', 10);
  if (isNaN(mlTimeout) || mlTimeout <= 0) {
    errors.push(`ML_REQUEST_TIMEOUT_MS must be a positive integer (received: '${process.env.ML_REQUEST_TIMEOUT_MS}')`);
  }

  const corsOriginsRaw = process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173';
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const logLevel = process.env.LOG_LEVEL || 'info';
  const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  const rateLimitMaxPredictions = parseInt(process.env.RATE_LIMIT_MAX_PREDICTIONS || '30', 10);

  if (errors.length > 0) {
    const message = `Environment configuration validation failed:\n  - ${errors.join('\n  - ')}`;
    console.error(`[CONFIG ERROR] ${message}`);
    throw new Error(message);
  }

  return Object.freeze({
    port,
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    isDevelopment: nodeEnv === 'development',
    mongoUri,
    mlBaseUrl: mlBaseUrl.replace(/\/+$/, ''), // strip trailing slash
    mlTimeoutMs: mlTimeout,
    corsOrigins,
    logLevel,
    rateLimitWindowMs,
    rateLimitMaxPredictions
  });
}

export const env = validateEnv();

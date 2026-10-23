import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

// Mask credentials in connection string for safe logging
function maskMongoUri(uri) {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  } catch {
    return 'mongodb://***';
  }
}

export async function connectDB(customUri = null) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || env.mongoUri;
  const maskedUri = maskMongoUri(uri);

  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    isConnected = true;
    if (!env.isTest) {
      console.log(`[Database] MongoDB connected successfully to ${maskedUri}`);
    }

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      if (!env.isTest) {
        console.warn('[Database] MongoDB disconnected');
      }
    });

    return mongoose.connection;
  } catch (error) {
    isConnected = false;
    console.error(`[Database] MongoDB initial connection failed to ${maskedUri}:`, error.message);
    throw error;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    if (!env.isTest) {
      console.log('[Database] MongoDB disconnected gracefully');
    }
  }
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

export function getDBStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const stateCode = mongoose.connection.readyState;
  return {
    ready: stateCode === 1,
    status: states[stateCode] || 'unknown',
    database: mongoose.connection.name || null
  };
}

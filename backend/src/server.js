import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';

let server;

async function startServer() {
  try {
    console.log(`[Startup] AI Food Quality Predictor Backend starting in '${env.nodeEnv}' mode...`);

    // Connect to database
    await connectDB();

    // Start Express listener
    server = app.listen(env.port, () => {
      console.log(`[Startup] HTTP server listening on http://localhost:${env.port}`);
      console.log(`[Startup] Public API v1 base: http://localhost:${env.port}/api/v1`);
      console.log(`[Startup] Configured ML Service base: ${env.mlBaseUrl}`);
    });

  } catch (error) {
    console.error('[Startup Error] Failed to start application:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown handling
async function shutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('[Shutdown] Closed active HTTP connections.');
      try {
        await disconnectDB();
        console.log('[Shutdown] Cleanup completed cleanly. Exiting.');
        process.exit(0);
      } catch (err) {
        console.error('[Shutdown Error] Error during DB disconnect:', err.message);
        process.exit(1);
      }
    });

    // Force exit if graceful shutdown takes too long (10 seconds timeout)
    setTimeout(() => {
      console.error('[Shutdown Timeout] Forcing exit after timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// Start the server
startServer();

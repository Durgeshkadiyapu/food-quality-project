import { getDBStatus, isDBConnected } from '../config/database.js';
import { HTTP_STATUS } from '../constants/errorCodes.js';

export function getHealth(req, res) {
  const dbStatus = getDBStatus();
  const dbReady = isDBConnected();

  const isHealthy = dbReady;
  const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

  return res.status(statusCode).json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'ai-food-quality-backend',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          ready: dbStatus.ready,
          status: dbStatus.status,
          type: 'MongoDB'
        }
      }
    }
  });
}

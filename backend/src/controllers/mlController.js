import { mlService } from '../services/mlService.js';
import { HTTP_STATUS } from '../constants/errorCodes.js';

export async function getMLStatus(req, res) {
  const status = await mlService.getHealth();
  const httpCode = status.ready ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

  return res.status(httpCode).json({
    success: status.ready,
    data: {
      service: 'food_quality_ml_service',
      reachable: status.reachable,
      ready: status.ready,
      checked_at: new Date().toISOString(),
      details: status.details || null,
      error: status.error || null
    }
  });
}

export async function getMLCapabilities(req, res) {
  const capabilities = await mlService.getCapabilities();

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: capabilities
  });
}

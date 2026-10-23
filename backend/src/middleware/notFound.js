import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export function notFoundHandler(req, res, next) {
  next(AppError.notFound(`Route '${req.method} ${req.originalUrl}' not found.`, ERROR_CODES.ROUTE_NOT_FOUND));
}

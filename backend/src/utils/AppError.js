import { ERROR_CODES, HTTP_STATUS } from '../constants/errorCodes.js';

export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = ERROR_CODES.INTERNAL_SERVER_ERROR, details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) ? details : [details];
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = ERROR_CODES.BAD_REQUEST, details = []) {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, code, details);
  }

  static validationError(message, details = []) {
    return new AppError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static unsupportedFoodOrMode(message, details = []) {
    return new AppError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.UNSUPPORTED_FOOD_OR_MODE, details);
  }

  static notFound(message = 'Resource not found', code = ERROR_CODES.NOT_FOUND) {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, code);
  }

  static predictionNotFound(id) {
    return new AppError(`Prediction record with ID '${id}' was not found.`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.PREDICTION_NOT_FOUND);
  }

  static internal(message = 'Internal server error occurred.', details = []) {
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_SERVER_ERROR, details);
  }

  static databaseError(message = 'Database operation failed.', details = []) {
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR, details);
  }

  static mlServiceUnavailable(message = 'Prediction service is temporarily unavailable.') {
    return new AppError(message, HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.ML_SERVICE_UNAVAILABLE);
  }

  static mlUpstreamError(message = 'Received invalid response from machine learning service.', details = []) {
    return new AppError(message, HTTP_STATUS.BAD_GATEWAY, ERROR_CODES.ML_UPSTREAM_ERROR, details);
  }

  static mlGatewayTimeout(message = 'Machine learning inference request timed out.') {
    return new AppError(message, HTTP_STATUS.GATEWAY_TIMEOUT, ERROR_CODES.ML_GATEWAY_TIMEOUT);
  }
}

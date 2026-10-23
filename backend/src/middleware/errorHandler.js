import { AppError } from '../utils/AppError.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/errorCodes.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected internal server error occurred.';
  let details = [];

  // 1. JSON parse errors from body-parser/express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.MALFORMED_JSON;
    message = 'Malformed JSON in request body.';
    details = [{ problem: 'The request body could not be parsed as valid JSON.' }];
  }
  // 2. Custom AppError instances
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // 3. Mongoose CastError (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.INVALID_IDENTIFIER;
    message = `Invalid value for parameter '${err.path}'.`;
    details = [{ field: err.path, problem: `Cannot cast '${err.value}' to expected type ${err.kind}` }];
  }
  // 4. Mongoose Validation error
  else if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = 'Database model validation failed.';
    details = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      problem: e.message
    }));
  }
  // 5. Unhandled errors
  else {
    // Secure diagnostic logging
    console.error('[UNHANDLED EXCEPTION]', err);
    message = env.isDevelopment ? err.message : 'An unexpected internal server error occurred.';
  }

  // Construct standard error envelope
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      details
    }
  };

  return res.status(statusCode).json(errorResponse);
}

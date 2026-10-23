import { env } from '../config/env.js';

export function requestLogger(req, res, next) {
  if (env.isTest) {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const logMsg = `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms (${ip})`;

    if (statusCode >= 500) {
      console.error(logMsg);
    } else if (statusCode >= 400) {
      console.warn(logMsg);
    } else {
      console.log(logMsg);
    }
  });

  next();
}

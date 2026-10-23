import { AppError } from './AppError.js';

export function parsePaginationParams(query, defaultLimit = 20, maxLimit = 100) {
  let page = 1;
  let limit = defaultLimit;

  if (query.page !== undefined) {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw AppError.badRequest('Invalid page parameter. Must be a positive integer greater than or equal to 1.', 'INVALID_PAGINATION', [
        { field: 'page', problem: 'Must be an integer >= 1' }
      ]);
    }
    page = parsedPage;
  }

  if (query.limit !== undefined) {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw AppError.badRequest('Invalid limit parameter. Must be a positive integer between 1 and 100.', 'INVALID_PAGINATION', [
        { field: 'limit', problem: 'Must be an integer between 1 and 100' }
      ]);
    }
    if (parsedLimit > maxLimit) {
      throw AppError.badRequest(`Limit exceeds maximum allowed value of ${maxLimit}.`, 'INVALID_PAGINATION', [
        { field: 'limit', problem: `Maximum allowed limit is ${maxLimit}` }
      ]);
    }
    limit = parsedLimit;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function formatPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    total,
    page,
    limit,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1
  };
}

import { describe, it, expect } from 'vitest';
import { parsePaginationParams, formatPaginationMeta } from '../../src/utils/pagination.js';
import { AppError } from '../../src/utils/AppError.js';

describe('pagination Utility Unit Tests', () => {
  it('should return defaults when query is empty', () => {
    const { page, limit, skip } = parsePaginationParams({});
    expect(page).toBe(1);
    expect(limit).toBe(20);
    expect(skip).toBe(0);
  });

  it('should calculate skip accurately for custom page and limit', () => {
    const { page, limit, skip } = parsePaginationParams({ page: '3', limit: '15' });
    expect(page).toBe(3);
    expect(limit).toBe(15);
    expect(skip).toBe(30);
  });

  it('should reject non-positive or non-integer page', () => {
    expect(() => parsePaginationParams({ page: '0' })).toThrow(AppError);
    expect(() => parsePaginationParams({ page: '-2' })).toThrow(AppError);
    expect(() => parsePaginationParams({ page: 'abc' })).toThrow(AppError);
    expect(() => parsePaginationParams({ page: '1.5' })).toThrow(AppError);
  });

  it('should reject limit exceeding maximum', () => {
    expect(() => parsePaginationParams({ limit: '101' })).toThrow(AppError);
  });

  it('should correctly format pagination metadata', () => {
    const meta = formatPaginationMeta(45, 2, 20);
    expect(meta.total).toBe(45);
    expect(meta.page).toBe(2);
    expect(meta.limit).toBe(20);
    expect(meta.total_pages).toBe(3);
    expect(meta.has_next).toBe(true);
    expect(meta.has_prev).toBe(true);
  });

  it('should correctly format pagination metadata on first and last page', () => {
    const firstPage = formatPaginationMeta(10, 1, 20);
    expect(firstPage.total_pages).toBe(1);
    expect(firstPage.has_next).toBe(false);
    expect(firstPage.has_prev).toBe(false);
  });
});

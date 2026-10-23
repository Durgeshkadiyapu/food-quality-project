import { describe, it, expect } from 'vitest';
import { validatePredictionRequest } from '../../src/validators/predictionValidator.js';
import { mockValidPredictionRequest } from '../fixtures/mockData.js';
import { AppError } from '../../src/utils/AppError.js';
import { ERROR_CODES, HTTP_STATUS } from '../../src/constants/errorCodes.js';

describe('predictionValidator Unit Tests', () => {
  it('should successfully validate a correct prediction request', () => {
    const result = validatePredictionRequest(mockValidPredictionRequest);
    expect(result.fruit_type).toBe('Apple');
    expect(result.model_mode).toBe('proxy_real');
    expect(result.sensor_readings.MQ3_raw).toBe(2150);
    expect(result.sensor_readings.MQ135_raw).toBe(1800);
    expect(result.sensor_readings.temperature_C).toBe(28.5);
    expect(result.sensor_readings.humidity_pct).toBe(75.0);
    expect(result.out_of_training_range).toEqual([]);
  });

  it('should normalize case for fruit_type (e.g. apple -> Apple)', () => {
    const payload = {
      ...mockValidPredictionRequest,
      fruit_type: 'apple'
    };
    const result = validatePredictionRequest(payload);
    expect(result.fruit_type).toBe('Apple');
  });

  it('should flag out-of-training-range readings without rejecting physically valid inputs', () => {
    const payload = {
      ...mockValidPredictionRequest,
      sensor_readings: {
        MQ3_raw: 2150,
        MQ135_raw: 1800,
        temperature_C: 22.0, // below training min 28.5 °C
        humidity_pct: 50.0   // below training min 66.0 %
      }
    };
    const result = validatePredictionRequest(payload);
    expect(result.out_of_training_range).toContain('temperature_C');
    expect(result.out_of_training_range).toContain('humidity_pct');
  });

  it('should reject non-object body', () => {
    expect(() => validatePredictionRequest(null)).toThrow(AppError);
    expect(() => validatePredictionRequest([])).toThrow(AppError);
    expect(() => validatePredictionRequest('invalid string')).toThrow(AppError);
  });

  it('should reject missing fruit_type', () => {
    const payload = { ...mockValidPredictionRequest };
    delete payload.fruit_type;
    expect(() => validatePredictionRequest(payload)).toThrowError();
  });

  it('should reject unsupported model_mode', () => {
    const payload = { ...mockValidPredictionRequest, model_mode: 'unsupported_mode' };
    expect(() => validatePredictionRequest(payload)).toThrowError();
  });

  it('should reject unsupported food in proxy_real mode with 422 UNSUPPORTED_FOOD_OR_MODE', () => {
    const payload = { ...mockValidPredictionRequest, fruit_type: 'Orange', model_mode: 'proxy_real' };
    try {
      validatePredictionRequest(payload);
      expect.fail('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(err.code).toBe(ERROR_CODES.UNSUPPORTED_FOOD_OR_MODE);
      expect(err.message).toContain("Food 'Orange' is not supported in 'proxy_real' mode");
    }
  });

  it('should accept Orange in synthetic_demo mode', () => {
    const payload = { ...mockValidPredictionRequest, fruit_type: 'Orange', model_mode: 'synthetic_demo' };
    const result = validatePredictionRequest(payload);
    expect(result.fruit_type).toBe('Orange');
    expect(result.model_mode).toBe('synthetic_demo');
  });

  it('should reject NaN, Infinity, and null sensor readings', () => {
    const testCases = [
      { field: 'MQ3_raw', val: NaN },
      { field: 'MQ135_raw', val: Infinity },
      { field: 'temperature_C', val: -Infinity },
      { field: 'humidity_pct', val: null },
      { field: 'MQ3_raw', val: '2150' }, // numeric string rejected
      { field: 'MQ135_raw', val: true }   // boolean rejected
    ];

    for (const { field, val } of testCases) {
      const payload = {
        ...mockValidPredictionRequest,
        sensor_readings: {
          ...mockValidPredictionRequest.sensor_readings,
          [field]: val
        }
      };
      expect(() => validatePredictionRequest(payload)).toThrow(AppError);
    }
  });

  it('should reject readings violating physical sensor limits', () => {
    const outOfBounds = [
      { MQ3_raw: -1 },
      { MQ3_raw: 4096 },
      { MQ135_raw: -5 },
      { MQ135_raw: 5000 },
      { temperature_C: -41.0 },
      { temperature_C: 85.0 },
      { humidity_pct: -0.1 },
      { humidity_pct: 100.1 }
    ];

    for (const override of outOfBounds) {
      const payload = {
        ...mockValidPredictionRequest,
        sensor_readings: {
          ...mockValidPredictionRequest.sensor_readings,
          ...override
        }
      };
      expect(() => validatePredictionRequest(payload)).toThrow(AppError);
    }
  });
});

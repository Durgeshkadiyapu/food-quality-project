import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MLService } from '../../src/services/mlService.js';
import { mockValidMLResponse } from '../fixtures/mockData.js';
import { AppError } from '../../src/utils/AppError.js';
import { ERROR_CODES, HTTP_STATUS } from '../../src/constants/errorCodes.js';

describe('MLService Adapter Unit Tests', () => {
  let mlService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mlService = new MLService('http://127.0.0.1:8000', 1000);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should successfully call predict and return validated output', () => {
    const validated = mlService.validateMLResponse(mockValidMLResponse, 'Apple', 'proxy_real');
    expect(validated.predicted_class).toBe('Semi-Fresh');
    expect(validated.class_probabilities['Fresh']).toBeCloseTo(0.366273);
    expect(validated.model_version).toBe('1.0.0-proxy_real');
    expect(validated.reported_training_mode).toBe('proxy_real');
    expect(validated.warnings.length).toBeGreaterThan(0);
  });

  it('should map network connection failure (ECONNREFUSED) to 503 ML_SERVICE_UNAVAILABLE', async () => {
    global.fetch = vi.fn().mockRejectedValue({
      code: 'ECONNREFUSED',
      message: 'connect ECONNREFUSED 127.0.0.1:8000'
    });

    try {
      await mlService.predict({
        fruit_type: 'Apple',
        model_mode: 'proxy_real',
        sensor_readings: { MQ3_raw: 2150, MQ135_raw: 1800, temperature_C: 28.5, humidity_pct: 75.0 }
      });
      expect.fail('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(err.code).toBe(ERROR_CODES.ML_SERVICE_UNAVAILABLE);
    }
  });

  it('should map timeout (AbortError) to 504 ML_GATEWAY_TIMEOUT', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValue(abortErr);

    try {
      await mlService.predict({
        fruit_type: 'Apple',
        model_mode: 'proxy_real',
        sensor_readings: { MQ3_raw: 2150, MQ135_raw: 1800, temperature_C: 28.5, humidity_pct: 75.0 }
      });
      expect.fail('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(HTTP_STATUS.GATEWAY_TIMEOUT);
      expect(err.code).toBe(ERROR_CODES.ML_GATEWAY_TIMEOUT);
    }
  });

  it('should map upstream 422 validation error to 422 UNSUPPORTED_FOOD_OR_MODE', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: {
          code: 'unsupported_fruit_type',
          message: "Fruit 'Papaya' not supported in mode 'proxy_real'",
          details: [{ field: 'fruit_type', problem: 'Unsupported in mode' }]
        }
      })
    });

    try {
      await mlService.predict({
        fruit_type: 'Papaya',
        model_mode: 'proxy_real',
        sensor_readings: { MQ3_raw: 2150, MQ135_raw: 1800, temperature_C: 28.5, humidity_pct: 75.0 }
      });
      expect.fail('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(err.code).toBe(ERROR_CODES.UNSUPPORTED_FOOD_OR_MODE);
    }
  });

  it('should map invalid JSON response to 502 ML_UPSTREAM_ERROR', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      }
    });

    try {
      await mlService.predict({
        fruit_type: 'Apple',
        model_mode: 'proxy_real',
        sensor_readings: { MQ3_raw: 2150, MQ135_raw: 1800, temperature_C: 28.5, humidity_pct: 75.0 }
      });
      expect.fail('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(HTTP_STATUS.BAD_GATEWAY);
      expect(err.code).toBe(ERROR_CODES.ML_UPSTREAM_ERROR);
    }
  });

  it('should reject missing or invalid predicted_class in response', () => {
    expect(() => {
      mlService.validateMLResponse({ ...mockValidMLResponse, predicted_class: 'InvalidClass' }, 'Apple', 'proxy_real');
    }).toThrow(AppError);

    expect(() => {
      const copy = { ...mockValidMLResponse };
      delete copy.predicted_class;
      mlService.validateMLResponse(copy, 'Apple', 'proxy_real');
    }).toThrow(AppError);
  });

  it('should reject invalid or negative class probability scores', () => {
    expect(() => {
      mlService.validateMLResponse(
        {
          ...mockValidMLResponse,
          class_probabilities: { Fresh: -0.5, 'Semi-Fresh': 0.5, Spoiled: 1.0 }
        },
        'Apple',
        'proxy_real'
      );
    }).toThrow(AppError);

    expect(() => {
      mlService.validateMLResponse(
        {
          ...mockValidMLResponse,
          class_probabilities: { Fresh: NaN, 'Semi-Fresh': 0.5, Spoiled: 0.5 }
        },
        'Apple',
        'proxy_real'
      );
    }).toThrow(AppError);
  });

  it('should provide static capabilities when upstream ML service is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));
    const caps = await mlService.getCapabilities();
    expect(caps.source).toBe('static_authoritative');
    expect(caps.supported_modes).toContain('proxy_real');
    expect(caps.mode_food_support.proxy_real).toEqual(['Apple', 'Banana', 'Tomato']);
    expect(caps.disclaimer).toBeDefined();
  });
});

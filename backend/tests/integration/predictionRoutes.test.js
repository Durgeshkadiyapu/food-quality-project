import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { predictionService } from '../../src/services/predictionService.js';
import { mockValidPredictionRequest, mockPersistedPrediction } from '../fixtures/mockData.js';
import { AppError } from '../../src/utils/AppError.js';
import { ERROR_CODES } from '../../src/constants/errorCodes.js';

describe('Prediction Routes API Integration Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/predictions', () => {
    it('should create and return saved prediction with 201 Created', async () => {
      vi.spyOn(predictionService, 'createPrediction').mockResolvedValue(mockPersistedPrediction);

      const res = await request(app)
        .post('/api/v1/predictions')
        .send(mockValidPredictionRequest);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prediction_id).toBe(mockPersistedPrediction.prediction_id);
      expect(res.body.data.fruit_type).toBe('Apple');
      expect(res.body.data.predicted_class).toBe('Semi-Fresh');
      expect(res.body.data.class_probabilities).toBeDefined();
    });

    it('should return 422 UNSUPPORTED_FOOD_OR_MODE for unsupported fruit in mode', async () => {
      const res = await request(app)
        .post('/api/v1/predictions')
        .send({
          ...mockValidPredictionRequest,
          fruit_type: 'Papaya',
          model_mode: 'proxy_real'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.UNSUPPORTED_FOOD_OR_MODE);
      expect(res.body.error.message).toContain("Food 'Papaya' is not supported in 'proxy_real' mode");
    });

    it('should return 422 VALIDATION_ERROR for invalid sensor reading', async () => {
      const res = await request(app)
        .post('/api/v1/predictions')
        .send({
          ...mockValidPredictionRequest,
          sensor_readings: {
            ...mockValidPredictionRequest.sensor_readings,
            temperature_C: 99.9 // exceeding physical limit
          }
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should return 503 ML_SERVICE_UNAVAILABLE when ML service is down', async () => {
      vi.spyOn(predictionService, 'createPrediction').mockRejectedValue(
        AppError.mlServiceUnavailable()
      );

      const res = await request(app)
        .post('/api/v1/predictions')
        .send(mockValidPredictionRequest);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.ML_SERVICE_UNAVAILABLE);
    });

    it('should return 500 DATABASE_ERROR and not claim success if DB save fails', async () => {
      vi.spyOn(predictionService, 'createPrediction').mockRejectedValue(
        AppError.databaseError('Failed to persist prediction record to database.')
      );

      const res = await request(app)
        .post('/api/v1/predictions')
        .send(mockValidPredictionRequest);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.DATABASE_ERROR);
    });

    it('should return 400 MALFORMED_JSON when invalid JSON syntax is sent', async () => {
      const res = await request(app)
        .post('/api/v1/predictions')
        .set('Content-Type', 'application/json')
        .send('{"fruit_type": "Apple", invalid_json}');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.MALFORMED_JSON);
    });
  });

  describe('GET /api/v1/predictions', () => {
    it('should return 200 with list of records and pagination metadata', async () => {
      vi.spyOn(predictionService, 'getPredictions').mockResolvedValue({
        records: [mockPersistedPrediction],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          total_pages: 1,
          has_next: false,
          has_prev: false
        }
      });

      const res = await request(app)
        .get('/api/v1/predictions?page=1&limit=20&fruit_type=Apple');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const res = await request(app).get('/api/v1/predictions?page=invalid');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });
  });

  describe('GET /api/v1/predictions/:id', () => {
    it('should return 200 and prediction details for valid ID', async () => {
      vi.spyOn(predictionService, 'getPredictionById').mockResolvedValue(mockPersistedPrediction);

      const res = await request(app).get('/api/v1/predictions/507f1f77bcf86cd799439011');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prediction_id).toBe(mockPersistedPrediction.prediction_id);
    });

    it('should return 400 for malformed MongoDB ObjectId', async () => {
      const res = await request(app).get('/api/v1/predictions/not-a-valid-id');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.INVALID_IDENTIFIER);
    });

    it('should return 404 PREDICTION_NOT_FOUND if ID does not exist', async () => {
      vi.spyOn(predictionService, 'getPredictionById').mockRejectedValue(
        AppError.predictionNotFound('507f1f77bcf86cd799439011')
      );

      const res = await request(app).get('/api/v1/predictions/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.PREDICTION_NOT_FOUND);
    });
  });

  describe('404 Route Not Found', () => {
    it('should return 404 ROUTE_NOT_FOUND for non-existent endpoint', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.ROUTE_NOT_FOUND);
    });
  });
});

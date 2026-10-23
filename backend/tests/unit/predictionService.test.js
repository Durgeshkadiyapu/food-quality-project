import { describe, it, expect, vi } from 'vitest';
import { PredictionService } from '../../src/services/predictionService.js';
import { mockValidPredictionRequest, mockValidMLResponse, mockPersistedPrediction } from '../fixtures/mockData.js';
import { AppError } from '../../src/utils/AppError.js';
import { ERROR_CODES } from '../../src/constants/errorCodes.js';

describe('PredictionService Unit Tests', () => {
  it('should complete full lifecycle on valid request and persistence', async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({
        ...mockPersistedPrediction,
        toJSON: () => mockPersistedPrediction
      })
    };
    const mockML = {
      predict: vi.fn().mockResolvedValue({
        predicted_class: 'Semi-Fresh',
        class_probabilities: { Fresh: 0.366, 'Semi-Fresh': 0.566, Spoiled: 0.068 },
        fruit_type: 'Apple',
        model_version: '1.0.0-proxy_real',
        reported_training_mode: 'proxy_real',
        label_method: 'storage_day_proxy',
        warnings: ['Not validated for food safety'],
        out_of_training_range: [],
        spoilage_tendency_score: 35.1,
        raw_response: mockValidMLResponse
      })
    };

    const service = new PredictionService(mockRepo, mockML);
    const result = await service.createPrediction(mockValidPredictionRequest);

    expect(mockML.predict).toHaveBeenCalledTimes(1);
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(result.prediction_id).toBe('507f1f77bcf86cd799439011');
    expect(result.predicted_class).toBe('Semi-Fresh');
  });

  it('should NEVER persist to database if ML prediction fails', async () => {
    const mockRepo = {
      create: vi.fn()
    };
    const mockML = {
      predict: vi.fn().mockRejectedValue(AppError.mlServiceUnavailable())
    };

    const service = new PredictionService(mockRepo, mockML);

    await expect(service.createPrediction(mockValidPredictionRequest)).rejects.toThrow(AppError);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('should fail safely and NOT claim success if database save fails after ML inference', async () => {
    const mockRepo = {
      create: vi.fn().mockRejectedValue(new Error('Connection to replica set failed'))
    };
    const mockML = {
      predict: vi.fn().mockResolvedValue({
        predicted_class: 'Semi-Fresh',
        class_probabilities: { Fresh: 0.366, 'Semi-Fresh': 0.566, Spoiled: 0.068 },
        fruit_type: 'Apple',
        model_version: '1.0.0-proxy_real',
        reported_training_mode: 'proxy_real',
        label_method: 'storage_day_proxy',
        warnings: [],
        out_of_training_range: [],
        spoilage_tendency_score: 35.1,
        raw_response: {}
      })
    };

    const service = new PredictionService(mockRepo, mockML);

    try {
      await service.createPrediction(mockValidPredictionRequest);
      expect.fail('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(err.message).toContain('Failed to persist prediction record to database');
    }
  });

  it('should throw 404 PREDICTION_NOT_FOUND if record does not exist', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(null)
    };
    const service = new PredictionService(mockRepo, {});

    try {
      await service.getPredictionById('507f1f77bcf86cd799439011');
      expect.fail('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe(ERROR_CODES.PREDICTION_NOT_FOUND);
    }
  });
});

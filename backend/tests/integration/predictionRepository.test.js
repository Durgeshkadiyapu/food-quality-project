import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../../src/config/database.js';
import { predictionRepository } from '../../src/repositories/predictionRepository.js';
import { Prediction } from '../../src/models/Prediction.js';
import { AppError } from '../../src/utils/AppError.js';

describe('PredictionRepository Live MongoDB Integration Tests', () => {
  const TEST_DB_URI = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_quality_test_db';

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    await Prediction.deleteMany({});
  });

  afterAll(async () => {
    try {
      await Prediction.deleteMany({});
      await disconnectDB();
    } catch {
      // ignore
    }
  });

  it('should successfully persist a prediction record', async () => {
    const record = await predictionRepository.create({
      fruit_type: 'Apple',
      sensor_readings: { MQ3_raw: 2150, MQ135_raw: 1800, temperature_C: 28.5, humidity_pct: 75.0 },
      predicted_class: 'Fresh',
      class_probabilities: { Fresh: 0.85, 'Semi-Fresh': 0.10, Spoiled: 0.05 },
      requested_model_mode: 'proxy_real',
      reported_training_mode: 'proxy_real',
      model_version: '1.0.0-proxy_real',
      label_method: 'storage_day_proxy',
      warnings: ['Prototype disclaimer'],
      out_of_training_range: [],
      spoilage_tendency_score: 15.2,
      raw_ml_response: { raw: true },
      created_at: new Date('2026-10-20T10:00:00Z')
    });

    expect(record._id).toBeDefined();
    expect(record.fruit_type).toBe('Apple');
    expect(record.predicted_class).toBe('Fresh');
  });

  it('should retrieve a prediction by valid ObjectId', async () => {
    const created = await predictionRepository.create({
      fruit_type: 'Banana',
      sensor_readings: { MQ3_raw: 1500, MQ135_raw: 1200, temperature_C: 29.0, humidity_pct: 70.0 },
      predicted_class: 'Semi-Fresh',
      class_probabilities: { Fresh: 0.2, 'Semi-Fresh': 0.7, Spoiled: 0.1 },
      requested_model_mode: 'proxy_real',
      reported_training_mode: 'proxy_real',
      model_version: '1.0.0-proxy_real',
      created_at: new Date('2026-10-21T10:00:00Z')
    });

    const retrieved = await predictionRepository.findById(created._id.toString());
    expect(retrieved).not.toBeNull();
    expect(retrieved.fruit_type).toBe('Banana');
    expect(retrieved.predicted_class).toBe('Semi-Fresh');
  });

  it('should return null for valid but non-existent ObjectId', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const retrieved = await predictionRepository.findById(nonExistentId);
    expect(retrieved).toBeNull();
  });

  it('should reject invalid ObjectId format with 400 Bad Request', async () => {
    try {
      await predictionRepository.findById('invalid-id-string');
      expect.fail('Should have thrown AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_IDENTIFIER');
    }
  });

  it('should support pagination, sorting newest first, and multi-field filters', async () => {
    // Seed 3 Tomato records with different dates and classes
    await predictionRepository.create({
      fruit_type: 'Tomato',
      sensor_readings: { MQ3_raw: 3000, MQ135_raw: 2800, temperature_C: 30.0, humidity_pct: 80.0 },
      predicted_class: 'Spoiled',
      class_probabilities: { Fresh: 0.05, 'Semi-Fresh': 0.15, Spoiled: 0.8 },
      requested_model_mode: 'proxy_real',
      reported_training_mode: 'proxy_real',
      model_version: '1.0.0-proxy_real',
      created_at: new Date('2026-10-22T08:00:00Z')
    });

    await predictionRepository.create({
      fruit_type: 'Tomato',
      sensor_readings: { MQ3_raw: 1200, MQ135_raw: 1100, temperature_C: 29.5, humidity_pct: 72.0 },
      predicted_class: 'Fresh',
      class_probabilities: { Fresh: 0.9, 'Semi-Fresh': 0.08, Spoiled: 0.02 },
      requested_model_mode: 'proxy_real',
      reported_training_mode: 'proxy_real',
      model_version: '1.0.0-proxy_real',
      created_at: new Date('2026-10-22T12:00:00Z')
    });

    // 1. Test fruit_type filter
    const tomatoHistory = await predictionRepository.findWithPagination(
      { fruit_type: 'Tomato' },
      { skip: 0, limit: 10 }
    );
    expect(tomatoHistory.total).toBe(2);
    expect(tomatoHistory.records.length).toBe(2);
    // Verify newest first: the one at 12:00 should come before the one at 08:00
    expect(new Date(tomatoHistory.records[0].created_at).getTime()).toBeGreaterThan(
      new Date(tomatoHistory.records[1].created_at).getTime()
    );

    // 2. Test predicted_class filter
    const spoiledHistory = await predictionRepository.findWithPagination(
      { predicted_class: 'Spoiled' },
      { skip: 0, limit: 10 }
    );
    expect(spoiledHistory.total).toBe(1);
    expect(spoiledHistory.records[0].predicted_class).toBe('Spoiled');

    // 3. Test model_mode filter
    const proxyRealHistory = await predictionRepository.findWithPagination(
      { model_mode: 'proxy_real' },
      { skip: 0, limit: 10 }
    );
    expect(proxyRealHistory.total).toBeGreaterThanOrEqual(4);

    // 4. Test date range filter
    const dateFiltered = await predictionRepository.findWithPagination(
      {
        start_date: '2026-10-22T00:00:00Z',
        end_date: '2026-10-22T23:59:59Z'
      },
      { skip: 0, limit: 10 }
    );
    expect(dateFiltered.total).toBe(2);

    // 5. Test pagination limit
    const paged = await predictionRepository.findWithPagination(
      {},
      { skip: 0, limit: 2 }
    );
    expect(paged.records.length).toBe(2);
    expect(paged.total).toBeGreaterThanOrEqual(4);
  });
});

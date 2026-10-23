import mongoose from 'mongoose';
import { Prediction } from '../models/Prediction.js';
import { AppError } from '../utils/AppError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export class PredictionRepository {
  /**
   * Save a new prediction record
   */
  async create(predictionData) {
    try {
      const doc = new Prediction(predictionData);
      const saved = await doc.save();
      return saved;
    } catch (err) {
      throw AppError.databaseError(`Failed to persist prediction record: ${err.message}`, [
        { problem: err.message }
      ]);
    }
  }

  /**
   * Update existing item's health in place or insert if not present
   */
  async upsertByItemId(itemId, data) {
    if (!itemId || typeof itemId !== 'string' || itemId.trim() === '') {
      throw AppError.badRequest('Invalid item_id for upsert.', ERROR_CODES.INVALID_IDENTIFIER);
    }

    try {
      const doc = await Prediction.findOneAndUpdate(
        { item_id: itemId.trim() },
        {
          $set: {
            item_id: itemId.trim(),
            fruit_type: data.fruit_type,
            sensor_readings: data.sensor_readings,
            predicted_class: data.predicted_class,
            class_probabilities: data.class_probabilities,
            requested_model_mode: data.requested_model_mode,
            reported_training_mode: data.reported_training_mode,
            model_version: data.model_version,
            label_method: data.label_method,
            warnings: data.warnings,
            out_of_training_range: data.out_of_training_range,
            spoilage_tendency_score: data.spoilage_tendency_score,
            ...(data.batch_summary ? { batch_summary: data.batch_summary } : {}),
            ...(data.readings_count !== undefined ? { readings_count: data.readings_count } : {}),
            raw_ml_response: data.raw_ml_response,
            last_updated_at: new Date()
          },
          ...(data.readings_count === undefined ? { $inc: { readings_count: 1 } } : {}),
          $setOnInsert: { created_at: new Date() }
        },
        { upsert: true, new: true, runValidators: true }
      );
      return doc;
    } catch (err) {
      throw AppError.databaseError(`Failed to upsert item health: ${err.message}`, [
        { problem: err.message }
      ]);
    }
  }

  /**
   * Find a prediction by its MongoDB ObjectId
   */
  async findById(id) {
    if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
      throw AppError.badRequest(`Invalid prediction ID format: '${id}'`, ERROR_CODES.INVALID_IDENTIFIER, [
        { field: 'id', problem: 'Must be a valid 24-character hexadecimal MongoDB ObjectId' }
      ]);
    }

    try {
      const record = await Prediction.findById(id);
      return record;
    } catch (err) {
      throw AppError.databaseError(`Failed to retrieve prediction by ID: ${err.message}`);
    }
  }

  /**
   * Find predictions with filtering, pagination, and sorting (newest first)
   */
  async findWithPagination(filters = {}, pagination = { skip: 0, limit: 20 }) {
    const query = {};

    // Safe, parameterized filtering
    if (filters.fruit_type && typeof filters.fruit_type === 'string') {
      // Escape regex special chars to prevent regex injection
      const escaped = filters.fruit_type.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.fruit_type = new RegExp(`^${escaped}$`, 'i');
    }

    if (filters.predicted_class && typeof filters.predicted_class === 'string') {
      query.predicted_class = filters.predicted_class.trim();
    }

    if (filters.model_mode && typeof filters.model_mode === 'string') {
      query.requested_model_mode = filters.model_mode.trim();
    }

    if (filters.start_date || filters.end_date) {
      query.created_at = {};
      if (filters.start_date) {
        const startDate = new Date(filters.start_date);
        if (isNaN(startDate.getTime())) {
          throw AppError.badRequest('Invalid start_date query parameter. Must be a valid ISO-8601 date string.');
        }
        query.created_at.$gte = startDate;
      }
      if (filters.end_date) {
        const endDate = new Date(filters.end_date);
        if (isNaN(endDate.getTime())) {
          throw AppError.badRequest('Invalid end_date query parameter. Must be a valid ISO-8601 date string.');
        }
        query.created_at.$lte = endDate;
      }
    }

    try {
      const [records, total] = await Promise.all([
        Prediction.find(query)
          .sort({ created_at: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit)
          .lean({ virtuals: true }),
        Prediction.countDocuments(query)
      ]);

      // Format records cleanly
      const formattedRecords = records.map(r => {
        const id = r._id ? r._id.toString() : r.id;
        delete r._id;
        delete r.__v;
        delete r.raw_ml_response;
        return {
          prediction_id: id,
          ...r
        };
      });

      return {
        records: formattedRecords,
        total
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AppError.databaseError(`Failed to query prediction history: ${err.message}`);
    }
  }

  /**
   * Count total predictions matching query
   */
  async count(query = {}) {
    return Prediction.countDocuments(query);
  }
}

export const predictionRepository = new PredictionRepository();

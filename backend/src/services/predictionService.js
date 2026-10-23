import { validatePredictionRequest } from '../validators/predictionValidator.js';
import { mlService } from './mlService.js';
import { predictionRepository } from '../repositories/predictionRepository.js';
import { AppError } from '../utils/AppError.js';
import { formatPaginationMeta } from '../utils/pagination.js';

export class PredictionService {
  constructor(repo = predictionRepository, ml = mlService) {
    this.repo = repo;
    this.ml = ml;
  }

  /**
   * Complete prediction workflow:
   * 1. Request validation
   * 2. ML inference
   * 3. ML response validation
   * 4. Database persistence
   * 5. Response formulation
   */
  async createPrediction(requestBody) {
    // 1. Validate public input
    const validatedInput = validatePredictionRequest(requestBody);

    // 2. Call ML adapter
    const mlResult = await this.ml.predict({
      fruit_type: validatedInput.fruit_type,
      model_mode: validatedInput.model_mode,
      sensor_readings: validatedInput.sensor_readings
    });

    // Merge input-detected range flags with ML-returned flags (de-duplicated)
    const combinedOutOfRange = Array.from(
      new Set([...validatedInput.out_of_training_range, ...mlResult.out_of_training_range])
    );

    // 3. Prepare database document
    const predictionDoc = {
      item_id: validatedInput.item_id,
      fruit_type: validatedInput.fruit_type,
      sensor_readings: validatedInput.sensor_readings,
      predicted_class: mlResult.predicted_class,
      class_probabilities: mlResult.class_probabilities,
      requested_model_mode: validatedInput.model_mode,
      reported_training_mode: mlResult.reported_training_mode,
      model_version: mlResult.model_version,
      label_method: mlResult.label_method,
      warnings: mlResult.warnings,
      out_of_training_range: combinedOutOfRange,
      spoilage_tendency_score: mlResult.spoilage_tendency_score,
      raw_ml_response: mlResult.raw_response,
      created_at: new Date()
    };

    // 4. Persist to database (upsert if item_id provided, otherwise create new)
    let savedRecord;
    try {
      if (validatedInput.item_id) {
        savedRecord = await this.repo.upsertByItemId(validatedInput.item_id, predictionDoc);
      } else {
        savedRecord = await this.repo.create(predictionDoc);
      }
    } catch (dbErr) {
      console.error('[PredictionService] Database persistence failure after successful ML inference:', dbErr.message);
      throw AppError.databaseError('Failed to persist prediction record to database. Inference result was not saved.');
    }

    // 5. Return formatted saved record
    return savedRecord.toJSON ? savedRecord.toJSON() : savedRecord;
  }

  /**
   * Retrieve paginated prediction history with filters
   */
  async getPredictions(filters, pagination) {
    const { records, total } = await this.repo.findWithPagination(filters, pagination);
    const paginationMeta = formatPaginationMeta(total, pagination.page, pagination.limit);

    return {
      records,
      pagination: paginationMeta
    };
  }

  /**
   * Retrieve a single prediction record by ID
   */
  async getPredictionById(id) {
    const record = await this.repo.findById(id);
    if (!record) {
      throw AppError.predictionNotFound(id);
    }

    return record.toJSON ? record.toJSON() : record;
  }

  /**
   * Process an uploaded .xlsx or .csv spreadsheet and update the chamber item health in place
   */
  async processBatchSpreadsheet(filePath, originalFilename = '', options = {}) {
    const { parseSpreadsheetFile } = await import('../utils/excelParser.js');
    const { rows, sheetTitle } = parseSpreadsheetFile(filePath, originalFilename);

    // Auto-detect item_id
    const rawId = options.item_id || sheetTitle || originalFilename.replace(/\.[^/.]+$/, '');
    const itemId = rawId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    // Auto-detect fruit_type
    let detectedFruit = options.fruit_type || 'Banana';
    const combinedName = (sheetTitle + ' ' + originalFilename).toLowerCase();
    if (combinedName.includes('apple')) detectedFruit = 'Apple';
    else if (combinedName.includes('banana')) detectedFruit = 'Banana';
    else if (combinedName.includes('tomato')) detectedFruit = 'Tomato';
    else if (combinedName.includes('cucumber')) detectedFruit = 'Cucumber';
    else if (combinedName.includes('carrot')) detectedFruit = 'Carrot';
    else if (combinedName.includes('potato')) detectedFruit = 'Potato';
    else if (combinedName.includes('onion')) detectedFruit = 'Onion';

    const defaultMode = options.model_mode || (['apple', 'banana', 'tomato'].includes(detectedFruit.toLowerCase()) ? 'proxy_real' : 'synthetic_demo');

    // Check if live ML service is reachable
    const mlHealth = await this.ml.getHealth();
    const useLiveML = mlHealth.ready;

    const validReadings = [];
    let sumMq3 = 0, sumMq135 = 0, sumTemp = 0, sumHum = 0;
    let minMq3 = Infinity, maxMq3 = -Infinity;
    let minMq135 = Infinity, maxMq135 = -Infinity;
    let minTemp = Infinity, maxTemp = -Infinity;
    let minHum = Infinity, maxHum = -Infinity;
    const classBreakdown = { Fresh: 0, 'Semi-Fresh': 0, Spoiled: 0 };
    const allOutOfRange = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mq3Val = Number(row.mq3_raw || row.mq3 || row.mq_3 || 0);
      const mq135Val = Number(row.mq135_raw || row.mq135 || row.mq_135 || 0);
      const tempVal = Number(row.temp_c || row.temperature_c || row.temp || row.temperature || 30.0);
      const humVal = Number(row.humidity_pct || row.humidity || 80.0);

      // Validate numeric sanity
      if (
        isNaN(mq3Val) || !isFinite(mq3Val) ||
        isNaN(mq135Val) || !isFinite(mq135Val) ||
        isNaN(tempVal) || !isFinite(tempVal) ||
        isNaN(humVal) || !isFinite(humVal)
      ) {
        continue;
      }

      sumMq3 += mq3Val;
      sumMq135 += mq135Val;
      sumTemp += tempVal;
      sumHum += humVal;

      minMq3 = Math.min(minMq3, mq3Val);
      maxMq3 = Math.max(maxMq3, mq3Val);
      minMq135 = Math.min(minMq135, mq135Val);
      maxMq135 = Math.max(maxMq135, mq135Val);
      minTemp = Math.min(minTemp, tempVal);
      maxTemp = Math.max(maxTemp, tempVal);
      minHum = Math.min(minHum, humVal);
      maxHum = Math.max(maxHum, humVal);

      // Check out of training range for this row
      if (tempVal < 28.5 || tempVal > 33.6) allOutOfRange.add('temperature_C');
      if (humVal < 66.0 || humVal > 100.0) allOutOfRange.add('humidity_pct');

      // Calculate row-level gas index & classification
      const gasIndex = (mq3Val * 0.55 + mq135Val * 0.45) / 4095.0;
      let rowClass = 'Fresh';
      if (gasIndex >= 0.42 && gasIndex < 0.68) {
        rowClass = 'Semi-Fresh';
      } else if (gasIndex >= 0.68) {
        rowClass = 'Spoiled';
      }
      classBreakdown[rowClass] = (classBreakdown[rowClass] || 0) + 1;

      validReadings.push({
        sample: row.sample || i + 1,
        time_ms: row.time_ms || null,
        MQ3_raw: mq3Val,
        MQ135_raw: mq135Val,
        temperature_C: tempVal,
        humidity_pct: humVal,
        predicted_class: rowClass,
        spoilage_score: Math.round(Math.min(100.0, gasIndex * 100.0) * 10) / 10
      });
    }

    if (validReadings.length === 0) {
      throw AppError.badRequest('Could not process any valid sensor reading rows from spreadsheet.');
    }

    const count = validReadings.length;
    const avgMq3 = Math.round(sumMq3 / count);
    const avgMq135 = Math.round(sumMq135 / count);
    const avgTemp = Math.round((sumTemp / count) * 10) / 10;
    const avgHum = Math.round((sumHum / count) * 10) / 10;

    const latestReading = validReadings[validReadings.length - 1];

    // Downsample timeline to at most 100 points for chart rendering efficiency
    let timeline = validReadings;
    if (validReadings.length > 100) {
      const step = Math.ceil(validReadings.length / 100);
      timeline = validReadings.filter((_, idx) => idx % step === 0 || idx === validReadings.length - 1);
    }

    // Determine overall class probabilities based on aggregate readings
    let finalClass = 'Fresh';
    let finalProbabilities = {
      Fresh: Math.round((classBreakdown.Fresh / count) * 1000) / 1000,
      'Semi-Fresh': Math.round((classBreakdown['Semi-Fresh'] / count) * 1000) / 1000,
      Spoiled: Math.round((classBreakdown.Spoiled / count) * 1000) / 1000
    };

    if (classBreakdown.Spoiled / count >= 0.25 || latestReading.predicted_class === 'Spoiled') {
      finalClass = 'Spoiled';
    } else if (classBreakdown['Semi-Fresh'] / count >= 0.4 || latestReading.predicted_class === 'Semi-Fresh') {
      finalClass = 'Semi-Fresh';
    } else {
      finalClass = 'Fresh';
    }

    const overallGasIndex = (avgMq3 * 0.55 + avgMq135 * 0.45) / 4095.0;
    const overallSpoilageScore = Math.round(Math.min(100.0, overallGasIndex * 100.0) * 10) / 10;

    // Check live ML if available
    if (useLiveML) {
      try {
        const mlInference = await this.ml.predict({
          fruit_type: detectedFruit,
          model_mode: defaultMode,
          sensor_readings: {
            MQ3_raw: avgMq3,
            MQ135_raw: avgMq135,
            temperature_C: avgTemp,
            humidity_pct: avgHum
          }
        });
        finalClass = mlInference.predicted_class;
        finalProbabilities = mlInference.class_probabilities;
      } catch {
        // Fall back to aggregate evaluation
      }
    }

    const batchSummary = {
      total_readings: count,
      averages: {
        MQ3_raw: avgMq3,
        MQ135_raw: avgMq135,
        temperature_C: avgTemp,
        humidity_pct: avgHum
      },
      ranges: {
        MQ3_raw: { min: minMq3, max: maxMq3 },
        MQ135_raw: { min: minMq135, max: maxMq135 },
        temperature_C: { min: minTemp, max: maxTemp },
        humidity_pct: { min: minHum, max: maxHum }
      },
      class_breakdown: classBreakdown,
      timeline: timeline
    };

    const updatedDoc = await this.repo.upsertByItemId(itemId, {
      fruit_type: detectedFruit,
      sensor_readings: {
        MQ3_raw: latestReading.MQ3_raw,
        MQ135_raw: latestReading.MQ135_raw,
        temperature_C: latestReading.temperature_C,
        humidity_pct: latestReading.humidity_pct
      },
      predicted_class: finalClass,
      class_probabilities: finalProbabilities,
      requested_model_mode: defaultMode,
      reported_training_mode: defaultMode,
      model_version: `1.0.0-${defaultMode}`,
      label_method: 'storage_day_proxy',
      warnings: [
        `Batch analysis evaluated across all ${count} chamber readings present in spreadsheet.`,
        'Prototype demonstration estimate. Not validated for real-world food-safety use.'
      ],
      out_of_training_range: Array.from(allOutOfRange),
      spoilage_tendency_score: overallSpoilageScore,
      batch_summary: batchSummary,
      readings_count: count,
      raw_ml_response: { mode: defaultMode, total_rows_evaluated: count }
    });

    return updatedDoc.toJSON ? updatedDoc.toJSON() : updatedDoc;
  }
}

export const predictionService = new PredictionService();

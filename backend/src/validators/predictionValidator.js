import { AppError } from '../utils/AppError.js';
import {
  ERROR_CODES,
  SUPPORTED_MODES,
  MODE_FOOD_SUPPORT,
  PHYSICAL_RANGES,
  TRAINING_RANGES
} from '../constants/errorCodes.js';

export function validatePredictionRequest(body) {
  const details = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw AppError.badRequest('Request body must be a valid JSON object.', ERROR_CODES.BAD_REQUEST, [
      { field: 'body', problem: 'Expected a JSON object' }
    ]);
  }

  const { fruit_type, model_mode, sensor_readings, item_id } = body;

  // 1. Validate fruit_type
  if (fruit_type === undefined || fruit_type === null) {
    details.push({ field: 'fruit_type', problem: 'fruit_type is required.' });
  } else if (typeof fruit_type !== 'string' || fruit_type.trim() === '') {
    details.push({ field: 'fruit_type', problem: 'fruit_type must be a non-empty string.' });
  }

  // 2. Validate model_mode
  const allowedModes = Object.values(SUPPORTED_MODES);
  if (model_mode === undefined || model_mode === null) {
    details.push({ field: 'model_mode', problem: 'model_mode is required.' });
  } else if (typeof model_mode !== 'string' || !allowedModes.includes(model_mode.trim())) {
    details.push({
      field: 'model_mode',
      problem: `model_mode must be one of: ${allowedModes.join(', ')}.`
    });
  }

  // Check food & mode combination if both valid so far
  let canonicalFruitType = null;
  if (typeof fruit_type === 'string' && fruit_type.trim() !== '' && typeof model_mode === 'string' && allowedModes.includes(model_mode.trim())) {
    const trimmedMode = model_mode.trim();
    const supportedFruits = MODE_FOOD_SUPPORT[trimmedMode] || [];
    const matchedFruit = supportedFruits.find(
      f => f.toLowerCase() === fruit_type.trim().toLowerCase()
    );

    if (!matchedFruit) {
      throw AppError.unsupportedFoodOrMode(
        `Food '${fruit_type.trim()}' is not supported in '${trimmedMode}' mode. Supported foods: ${supportedFruits.join(', ')}`,
        [
          {
            field: 'fruit_type',
            problem: `Not supported in '${trimmedMode}'. Supported: ${supportedFruits.join(', ')}`
          }
        ]
      );
    }
    canonicalFruitType = matchedFruit;
  }

  // 3. Validate sensor_readings object
  if (sensor_readings === undefined || sensor_readings === null) {
    details.push({ field: 'sensor_readings', problem: 'sensor_readings object is required.' });
  } else if (typeof sensor_readings !== 'object' || Array.isArray(sensor_readings)) {
    details.push({ field: 'sensor_readings', problem: 'sensor_readings must be a JSON object.' });
  } else {
    // Validate each required measurement
    const requiredSensors = ['MQ3_raw', 'MQ135_raw', 'temperature_C', 'humidity_pct'];

    for (const sensorKey of requiredSensors) {
      const val = sensor_readings[sensorKey];

      if (val === undefined || val === null) {
        details.push({ field: `sensor_readings.${sensorKey}`, problem: `${sensorKey} is required.` });
        continue;
      }

      if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
        details.push({
          field: `sensor_readings.${sensorKey}`,
          problem: `${sensorKey} must be a valid, finite number (received: ${typeof val === 'string' ? `'${val}'` : val}).`
        });
        continue;
      }

      const bounds = PHYSICAL_RANGES[sensorKey];
      if (bounds && (val < bounds.min || val > bounds.max)) {
        details.push({
          field: `sensor_readings.${sensorKey}`,
          problem: `${sensorKey} must be between ${bounds.min} and ${bounds.max} (received: ${val}).`
        });
      }
    }
  }

  if (details.length > 0) {
    throw AppError.validationError('Prediction request validation failed.', details);
  }

  // Flag out-of-training-range readings (for warning/annotation purposes)
  const outOfTrainingRange = [];
  const temp = sensor_readings.temperature_C;
  const humidity = sensor_readings.humidity_pct;

  if (temp < TRAINING_RANGES.temperature_C.min || temp > TRAINING_RANGES.temperature_C.max) {
    outOfTrainingRange.push('temperature_C');
  }

  if (humidity < TRAINING_RANGES.humidity_pct.min || humidity > TRAINING_RANGES.humidity_pct.max) {
    outOfTrainingRange.push('humidity_pct');
  }

  return {
    item_id: item_id && typeof item_id === 'string' ? item_id.trim() : null,
    fruit_type: canonicalFruitType || fruit_type.trim(),
    model_mode: model_mode.trim(),
    sensor_readings: {
      MQ3_raw: sensor_readings.MQ3_raw,
      MQ135_raw: sensor_readings.MQ135_raw,
      temperature_C: sensor_readings.temperature_C,
      humidity_pct: sensor_readings.humidity_pct
    },
    out_of_training_range: outOfTrainingRange
  };
}

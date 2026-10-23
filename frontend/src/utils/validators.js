/**
 * Client-side sensor reading validation
 * Aligned with backend PHYSICAL_RANGES and TRAINING_RANGES
 */

export const SENSOR_BOUNDS = {
  MQ3_raw: { min: 0, max: 4095, name: 'MQ-3 Alcohol & Gas Sensor' },
  MQ135_raw: { min: 0, max: 4095, name: 'MQ-135 Air Quality Sensor' },
  temperature_C: { min: -40.0, max: 80.0, name: 'Ambient Temperature' },
  humidity_pct: { min: 0.0, max: 100.0, name: 'Relative Humidity' }
};

export const TRAINING_RANGES = {
  temperature_C: { min: 28.5, max: 33.6 },
  humidity_pct: { min: 66.0, max: 100.0 }
};

export function validateForm(values) {
  const errors = {};

  if (!values.fruit_type || values.fruit_type.trim() === '') {
    errors.fruit_type = 'Please select a food / fruit type.';
  }

  if (!values.model_mode || values.model_mode.trim() === '') {
    errors.model_mode = 'Please select an inference model mode.';
  }

  // Validate MQ-3
  if (values.MQ3_raw === '' || values.MQ3_raw === undefined || values.MQ3_raw === null) {
    errors.MQ3_raw = 'MQ-3 raw reading is required.';
  } else {
    const val = Number(values.MQ3_raw);
    if (isNaN(val) || !isFinite(val)) {
      errors.MQ3_raw = 'MQ-3 reading must be a valid number.';
    } else if (val < SENSOR_BOUNDS.MQ3_raw.min || val > SENSOR_BOUNDS.MQ3_raw.max) {
      errors.MQ3_raw = `MQ-3 reading must be between ${SENSOR_BOUNDS.MQ3_raw.min} and ${SENSOR_BOUNDS.MQ3_raw.max}.`;
    }
  }

  // Validate MQ-135
  if (values.MQ135_raw === '' || values.MQ135_raw === undefined || values.MQ135_raw === null) {
    errors.MQ135_raw = 'MQ-135 raw reading is required.';
  } else {
    const val = Number(values.MQ135_raw);
    if (isNaN(val) || !isFinite(val)) {
      errors.MQ135_raw = 'MQ-135 reading must be a valid number.';
    } else if (val < SENSOR_BOUNDS.MQ135_raw.min || val > SENSOR_BOUNDS.MQ135_raw.max) {
      errors.MQ135_raw = `MQ-135 reading must be between ${SENSOR_BOUNDS.MQ135_raw.min} and ${SENSOR_BOUNDS.MQ135_raw.max}.`;
    }
  }

  // Validate Temperature
  if (values.temperature_C === '' || values.temperature_C === undefined || values.temperature_C === null) {
    errors.temperature_C = 'Temperature reading is required.';
  } else {
    const val = Number(values.temperature_C);
    if (isNaN(val) || !isFinite(val)) {
      errors.temperature_C = 'Temperature must be a valid number.';
    } else if (val < SENSOR_BOUNDS.temperature_C.min || val > SENSOR_BOUNDS.temperature_C.max) {
      errors.temperature_C = `Temperature must be between ${SENSOR_BOUNDS.temperature_C.min}°C and ${SENSOR_BOUNDS.temperature_C.max}°C.`;
    }
  }

  // Validate Humidity
  if (values.humidity_pct === '' || values.humidity_pct === undefined || values.humidity_pct === null) {
    errors.humidity_pct = 'Humidity percentage is required.';
  } else {
    const val = Number(values.humidity_pct);
    if (isNaN(val) || !isFinite(val)) {
      errors.humidity_pct = 'Humidity must be a valid number.';
    } else if (val < SENSOR_BOUNDS.humidity_pct.min || val > SENSOR_BOUNDS.humidity_pct.max) {
      errors.humidity_pct = `Humidity must be between ${SENSOR_BOUNDS.humidity_pct.min}% and ${SENSOR_BOUNDS.humidity_pct.max}%.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function checkOutOfTrainingRange(temp, hum) {
  const flags = [];
  const t = Number(temp);
  const h = Number(hum);

  if (!isNaN(t) && (t < TRAINING_RANGES.temperature_C.min || t > TRAINING_RANGES.temperature_C.max)) {
    flags.push({
      field: 'temperature_C',
      name: 'Temperature',
      val: t,
      range: `${TRAINING_RANGES.temperature_C.min}–${TRAINING_RANGES.temperature_C.max} °C`
    });
  }

  if (!isNaN(h) && (h < TRAINING_RANGES.humidity_pct.min || h > TRAINING_RANGES.humidity_pct.max)) {
    flags.push({
      field: 'humidity_pct',
      name: 'Humidity',
      val: h,
      range: `${TRAINING_RANGES.humidity_pct.min}–${TRAINING_RANGES.humidity_pct.max}%`
    });
  }

  return flags;
}

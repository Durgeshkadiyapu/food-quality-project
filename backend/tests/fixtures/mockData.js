export const mockValidPredictionRequest = {
  fruit_type: 'Apple',
  model_mode: 'proxy_real',
  sensor_readings: {
    MQ3_raw: 2150,
    MQ135_raw: 1800,
    temperature_C: 28.5,
    humidity_pct: 75.0
  }
};

export const mockValidMLResponse = {
  predicted_class: 'Semi-Fresh',
  class_probabilities: {
    Fresh: 0.366273,
    'Semi-Fresh': 0.566125,
    Spoiled: 0.067602
  },
  fruit_type: 'Apple',
  model_version: '1.0.0-proxy_real',
  training_mode: 'proxy_real',
  label_method: 'storage_day_proxy_days1-2_fresh_days3-4_semi_day5plus_spoiled',
  warning: 'Model trained on real sensor readings from only 9 specimens ... Not validated for real-world use.',
  spoilage_tendency_score: 35.1,
  out_of_training_range: []
};

export const mockPersistedPrediction = {
  prediction_id: '507f1f77bcf86cd799439011',
  fruit_type: 'Apple',
  sensor_readings: {
    MQ3_raw: 2150,
    MQ135_raw: 1800,
    temperature_C: 28.5,
    humidity_pct: 75.0
  },
  predicted_class: 'Semi-Fresh',
  class_probabilities: {
    Fresh: 0.366273,
    'Semi-Fresh': 0.566125,
    Spoiled: 0.067602
  },
  requested_model_mode: 'proxy_real',
  reported_training_mode: 'proxy_real',
  model_version: '1.0.0-proxy_real',
  label_method: 'storage_day_proxy_days1-2_fresh_days3-4_semi_day5plus_spoiled',
  warnings: [
    'Model trained on real sensor readings from only 9 specimens ... Not validated for real-world use.'
  ],
  out_of_training_range: [],
  spoilage_tendency_score: 35.1,
  created_at: '2026-10-22T12:00:00.000Z'
};

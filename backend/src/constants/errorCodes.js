export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  MALFORMED_JSON: 'MALFORMED_JSON',
  INVALID_IDENTIFIER: 'INVALID_IDENTIFIER',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNSUPPORTED_FOOD_OR_MODE: 'UNSUPPORTED_FOOD_OR_MODE',
  NOT_FOUND: 'NOT_FOUND',
  PREDICTION_NOT_FOUND: 'PREDICTION_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  ML_SERVICE_UNAVAILABLE: 'ML_SERVICE_UNAVAILABLE',
  ML_UPSTREAM_ERROR: 'ML_UPSTREAM_ERROR',
  ML_INVALID_RESPONSE: 'ML_INVALID_RESPONSE',
  ML_GATEWAY_TIMEOUT: 'ML_GATEWAY_TIMEOUT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS'
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

export const SUPPORTED_MODES = {
  PROXY_REAL: 'proxy_real',
  SYNTHETIC_DEMO: 'synthetic_demo',
  COMBINED_DEMO: 'combined_demo'
};

export const MODE_FOOD_SUPPORT = {
  [SUPPORTED_MODES.PROXY_REAL]: ['Apple', 'Banana', 'Tomato'],
  [SUPPORTED_MODES.SYNTHETIC_DEMO]: [
    'Apple', 'Banana', 'Tomato', 'Orange', 'Mango', 'Strawberry',
    'Grape', 'Papaya', 'Guava', 'Pineapple', 'Watermelon', 'Peach',
    'Pear', 'Plum', 'Cucumber', 'Carrot', 'Potato', 'Onion'
  ],
  [SUPPORTED_MODES.COMBINED_DEMO]: [
    'Apple', 'Banana', 'Tomato', 'Orange', 'Mango', 'Strawberry',
    'Grape', 'Papaya', 'Guava', 'Pineapple', 'Watermelon', 'Peach',
    'Pear', 'Plum', 'Cucumber', 'Carrot', 'Potato', 'Onion'
  ]
};

export const PREDICTED_CLASSES = ['Fresh', 'Semi-Fresh', 'Spoiled'];

// Physical sensor bounds
export const PHYSICAL_RANGES = {
  MQ3_raw: { min: 0, max: 4095 },
  MQ135_raw: { min: 0, max: 4095 },
  temperature_C: { min: -40.0, max: 80.0 },
  humidity_pct: { min: 0.0, max: 100.0 }
};

// Known training ranges for proxy_real
export const TRAINING_RANGES = {
  temperature_C: { min: 28.5, max: 33.6 },
  humidity_pct: { min: 66.0, max: 100.0 }
};

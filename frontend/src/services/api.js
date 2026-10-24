/**
 * AI Food Quality Predictor — Unified API Client
 * Communicates strictly with the Express.js Backend API.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
const DEFAULT_TIMEOUT_MS = 15000;

class ApiError extends Error {
  constructor(message, status, code = 'API_ERROR', details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Universal fetch wrapper with timeout, JSON parsing, and unified error mapping
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  const isFormData = options.body instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const errorObj = data?.error || {};
      const errorMessage = errorObj.message || data?.message || `Request failed with HTTP ${response.status}`;
      const errorCode = errorObj.code || (response.status === 429 ? 'TOO_MANY_REQUESTS' : 'HTTP_ERROR');
      const details = errorObj.details || [];
      throw new ApiError(errorMessage, response.status, errorCode, details);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your network connection and retry.', 408, 'REQUEST_TIMEOUT');
    }
    // Network refusal or offline
    throw new ApiError(
      'Unable to connect to the backend server. Please verify the Node.js API service is running.',
      0,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Health & readiness endpoint
 * GET /api/v1/health
 */
export async function getHealth() {
  return request('/health');
}

/**
 * Python ML service live status probe
 * GET /api/v1/ml/status
 */
export async function getMLStatus() {
  return request('/ml/status');
}

/**
 * Supported model modes, food types, and training bounds
 * GET /api/v1/ml/capabilities
 */
export async function getCapabilities() {
  return request('/ml/capabilities');
}

/**
 * Submit manual sensor readings for ML quality classification
 * POST /api/v1/predictions
 */
export async function createPrediction(payload) {
  return request('/predictions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Retrieve paginated prediction history with filters
 * GET /api/v1/predictions
 */
export async function getPredictions(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.fruit_type) query.append('fruit_type', params.fruit_type);
  if (params.predicted_class) query.append('predicted_class', params.predicted_class);
  if (params.model_mode) query.append('model_mode', params.model_mode);
  if (params.start_date) query.append('start_date', params.start_date);
  if (params.end_date) query.append('end_date', params.end_date);

  const queryString = query.toString();
  return request(`/predictions${queryString ? `?${queryString}` : ''}`);
}

/** Request class-specific SHAP explanations through the Node API. */
export async function getPredictionExplanation(payload) {
  return request('/ml/explain', { method: 'POST', body: JSON.stringify(payload) });
}

/**
 * Retrieve a single saved prediction by MongoDB ID
 * GET /api/v1/predictions/:id
 */
export async function getPredictionById(id) {
  if (!id) {
    throw new ApiError('Prediction ID is required', 400, 'INVALID_IDENTIFIER');
  }
  return request(`/predictions/${encodeURIComponent(id)}`);
}

/**
 * Upload an Arduino chamber Excel or CSV log file
 * POST /api/v1/predictions/upload
 */
export async function uploadSpreadsheet(formData) {
  return request('/predictions/upload', {
    method: 'POST',
    body: formData
  });
}

export { ApiError, BASE_URL };


/** Generate grounded storage advice using the backend-only Groq integration. */
export async function getFoodAdvice(payload) {
  return request('/advisor/recommendations', {
    method: 'POST',
    timeoutMs: 25000,
    body: JSON.stringify(payload)
  });
}

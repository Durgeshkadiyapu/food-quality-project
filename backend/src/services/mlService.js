import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { PREDICTED_CLASSES, SUPPORTED_MODES, MODE_FOOD_SUPPORT } from '../constants/errorCodes.js';

export class MLService {
  constructor(baseUrl = env.mlBaseUrl, timeoutMs = env.mlTimeoutMs) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  /**
   * Helper to perform fetch with explicit timeout and error mapping
   */
  async _fetchWithTimeout(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });
      return response;
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        throw AppError.mlGatewayTimeout(`ML service request timed out after ${this.timeoutMs}ms.`);
      }
      if (
        err.code === 'ECONNREFUSED' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'ECONNRESET' ||
        err.message?.includes('fetch failed')
      ) {
        throw AppError.mlServiceUnavailable('Prediction service is temporarily unavailable.');
      }
      throw AppError.mlServiceUnavailable(`Unable to communicate with ML service: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check ML service health status
   */
  async getHealth() {
    try {
      const response = await this._fetchWithTimeout('/health', { method: 'GET' });
      
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = { raw_status: response.statusText };
      }

      const isHealthy = response.ok && (data.status === 'ok' || data.status === 'healthy' || response.status === 200);

      return {
        reachable: true,
        status_code: response.status,
        ready: isHealthy,
        details: data
      };
    } catch (err) {
      if (err instanceof AppError) {
        return {
          reachable: false,
          status_code: err.statusCode,
          ready: false,
          error: err.message
        };
      }
      return {
        reachable: false,
        status_code: 503,
        ready: false,
        error: err.message
      };
    }
  }

  /**
   * Fetch ML model capabilities, supported foods, and modes
   */
  async getCapabilities() {
    let response;
    // Try /model-info first (documented primary route in food_quality_ml_service), then /capabilities
    try {
      response = await this._fetchWithTimeout('/model-info', { method: 'GET' });
    } catch {
      try {
        response = await this._fetchWithTimeout('/capabilities', { method: 'GET' });
      } catch (err) {
        // Return static authoritative capabilities conforming to verified model spec
        return this.getStaticCapabilities();
      }
    }

    if (!response || !response.ok) {
      return this.getStaticCapabilities();
    }

    try {
      const data = await response.json();
      return {
        source: 'ml_service',
        supported_modes: data.modes || Object.values(SUPPORTED_MODES),
        mode_food_support: data.supported_fruits || MODE_FOOD_SUPPORT,
        model_versions: data.model_versions || { proxy_real: '1.0.0-proxy_real' },
        training_ranges: data.feature_ranges || {
          temperature_C: { min: 28.5, max: 33.6 },
          humidity_pct: { min: 66.0, max: 100.0 }
        },
        disclaimer: 'Model predictions are prototype estimates derived from experimental proxy data and are NOT a food-safety guarantee.'
      };
    } catch {
      return this.getStaticCapabilities();
    }
  }

  /**
   * Fallback authoritative static capabilities conforming to ML package specification
   */
  getStaticCapabilities() {
    return {
      source: 'static_authoritative',
      supported_modes: Object.values(SUPPORTED_MODES),
      mode_food_support: MODE_FOOD_SUPPORT,
      model_versions: {
        [SUPPORTED_MODES.PROXY_REAL]: '1.0.0-proxy_real',
        [SUPPORTED_MODES.SYNTHETIC_DEMO]: '1.0.0-synthetic_demo',
        [SUPPORTED_MODES.COMBINED_DEMO]: '1.0.0-combined_demo'
      },
      training_ranges: {
        temperature_C: { min: 28.5, max: 33.6 },
        humidity_pct: { min: 66.0, max: 100.0 }
      },
      disclaimer: 'Model predictions are prototype estimates derived from experimental proxy data and are NOT a food-safety guarantee.'
    };
  }

  /**
   * Send inference request to Python POST /predict
   */
  async predict({ fruit_type, model_mode, sensor_readings }) {
    // Map strictly to the 5 ML input fields accepted by FastAPI Pydantic schema
    const mlPayload = {
      fruit_type,
      MQ3_raw: sensor_readings.MQ3_raw,
      MQ135_raw: sensor_readings.MQ135_raw,
      temperature_C: sensor_readings.temperature_C,
      humidity_pct: sensor_readings.humidity_pct,
      training_mode: model_mode
    };

    const response = await this._fetchWithTimeout('/predict', {
      method: 'POST',
      body: JSON.stringify(mlPayload)
    });

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw AppError.mlUpstreamError('ML service returned invalid or non-JSON response.');
    }

    // Handle non-2xx HTTP responses
    if (!response.ok) {
      if (response.status === 422) {
        const errorDetail = data?.error?.message || data?.detail || 'Upstream validation error in ML service';
        throw AppError.unsupportedFoodOrMode(errorDetail, data?.error?.details || []);
      }
      if (response.status === 503) {
        throw AppError.mlServiceUnavailable('ML inference service or model artifact is currently unavailable.');
      }
      throw AppError.mlUpstreamError(`Upstream ML service returned HTTP error ${response.status}.`, [
        { status: response.status }
      ]);
    }

    // Validate the ML response contract
    return this.validateMLResponse(data, fruit_type, model_mode);
  }

  /** Request genuine, class-specific SHAP values from the Python ML service. */
  async explain({ fruit_type, model_mode, sensor_readings }) {
    const payload = {
      fruit_type,
      MQ3_raw: sensor_readings.MQ3_raw,
      MQ135_raw: sensor_readings.MQ135_raw,
      temperature_C: sensor_readings.temperature_C,
      humidity_pct: sensor_readings.humidity_pct,
      training_mode: model_mode
    };
    const response = await this._fetchWithTimeout('/explain', { method: 'POST', body: JSON.stringify(payload) });
    let data;
    try { data = await response.json(); }
    catch { throw AppError.mlUpstreamError('ML service returned invalid SHAP response.'); }
    if (!response.ok) {
      const message = data?.error?.message || data?.detail || `SHAP explanation failed with HTTP ${response.status}`;
      if (response.status === 503) throw AppError.mlServiceUnavailable(message);
      throw AppError.mlUpstreamError(message);
    }
    if (data?.available !== true || !data?.class_contributions || typeof data.class_contributions !== 'object') {
      throw AppError.mlUpstreamError('ML service returned an invalid SHAP explanation contract.');
    }
    return data;
  }

  /**
   * Rigorously validate the ML inference output
   */
  validateMLResponse(data, requestedFruit, requestedMode) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw AppError.mlUpstreamError('ML prediction response must be a JSON object.');
    }

    const {
      predicted_class,
      class_probabilities,
      fruit_type,
      model_version,
      training_mode,
      label_method,
      warning,
      warnings,
      spoilage_tendency_score,
      out_of_training_range
    } = data;

    // Validate predicted_class
    if (!predicted_class || typeof predicted_class !== 'string') {
      throw AppError.mlUpstreamError('ML response missing or invalid predicted_class.');
    }
    if (!PREDICTED_CLASSES.includes(predicted_class)) {
      throw AppError.mlUpstreamError(`Unknown predicted_class '${predicted_class}' returned by ML service.`);
    }

    // Validate class_probabilities
    if (!class_probabilities || typeof class_probabilities !== 'object' || Array.isArray(class_probabilities)) {
      throw AppError.mlUpstreamError('ML response missing or invalid class_probabilities.');
    }

    const cleanedProbabilities = {};
    for (const [cls, score] of Object.entries(class_probabilities)) {
      if (typeof score !== 'number' || isNaN(score) || !isFinite(score) || score < 0) {
        throw AppError.mlUpstreamError(`Invalid class probability for class '${cls}': ${score}`);
      }
      cleanedProbabilities[cls] = score;
    }

    // Normalize warnings to string array
    const normalizedWarnings = [];
    if (typeof warning === 'string' && warning.trim() !== '') {
      normalizedWarnings.push(warning.trim());
    }
    if (Array.isArray(warnings)) {
      for (const w of warnings) {
        if (typeof w === 'string' && w.trim() !== '' && !normalizedWarnings.includes(w.trim())) {
          normalizedWarnings.push(w.trim());
        }
      }
    }

    // Normalize out_of_training_range
    const normalizedRangeFlags = Array.isArray(out_of_training_range)
      ? out_of_training_range.filter(f => typeof f === 'string')
      : [];

    // Validate spoilage_tendency_score if present
    let cleanedSpoilageScore = null;
    if (spoilage_tendency_score !== undefined && spoilage_tendency_score !== null) {
      if (typeof spoilage_tendency_score === 'number' && !isNaN(spoilage_tendency_score) && isFinite(spoilage_tendency_score)) {
        cleanedSpoilageScore = spoilage_tendency_score;
      }
    }

    return {
      predicted_class,
      class_probabilities: cleanedProbabilities,
      fruit_type: fruit_type || requestedFruit,
      model_version: model_version || '1.0.0-proxy_real',
      reported_training_mode: training_mode || requestedMode,
      label_method: label_method || 'storage_day_proxy',
      warnings: normalizedWarnings,
      out_of_training_range: normalizedRangeFlags,
      spoilage_tendency_score: cleanedSpoilageScore,
      raw_response: data
    };
  }
}

export const mlService = new MLService();
